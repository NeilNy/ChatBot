#!/usr/bin/env python3
"""Cornhub Agent 联网搜索代理。

只监听 127.0.0.1，由 nginx 的 /search 反向代理暴露给前端。
凭证从 systemd 的 EnvironmentFile 读取（WEB_SEARCH_API_KEY），不进入前端和 git。

接口：
  GET /health
  GET /search?q=杭州今天天气
返回：
  {"query": "...", "count": 2, "results": [{"title","url","snippet","site","published"}]}
"""

from __future__ import annotations

import email
import html
import importlib.util
import io
import json
import os
import re
import subprocess
import tempfile
import time
import zipfile
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

API_URL = "https://open.feedcoopapi.com/search_api/web_search"
API_KEY = os.environ.get("WEB_SEARCH_API_KEY", "").strip()
HOST = "127.0.0.1"
PORT = int(os.environ.get("SEARCH_PORT", "8790"))
RESULT_COUNT = 5
MAX_QUERY_CHARS = 200
PER_IP_PER_MINUTE = 12
GLOBAL_PER_MINUTE = 60
SNIPPET_CHARS = 800
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_TEXT_CHARS = 60000
STS2_SCRIPT = "/home/ubuntu/.hermes/skills/gaming/sts2-analytics/scripts/sts2_api.py"
STS2_MAX_OUTPUT = 20000
STS2_COMMANDS = {
    "card", "overview", "versions", "cards", "relics", "monsters", "curses",
    "upgrades", "encounters", "leaderboard", "player-search", "player-profile", "run",
}
TEXT_EXTS = {
    "txt", "md", "markdown", "csv", "tsv", "json", "jsonl", "log", "html", "htm",
    "xml", "yaml", "yml", "ini", "conf", "toml", "py", "js", "jsx", "ts", "tsx",
    "css", "scss", "less", "go", "java", "c", "h", "cpp", "hpp", "cc", "cs",
    "rs", "rb", "php", "sh", "bash", "zsh", "sql", "swift", "kt", "lua", "r",
}


class UnsupportedFormat(Exception):
    pass

_hits: dict[str, deque[float]] = defaultdict(deque)
_global_hits: deque[float] = deque()
_lock = Lock()


def _rate_limited(ip: str) -> bool:
    """简单的滑动窗口限流，防止公开站点被刷爆豆包搜索额度。"""
    now = time.time()
    with _lock:
        bucket = _hits[ip]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        while _global_hits and now - _global_hits[0] > 60:
            _global_hits.popleft()
        if len(bucket) >= PER_IP_PER_MINUTE or len(_global_hits) >= GLOBAL_PER_MINUTE:
            return True
        bucket.append(now)
        _global_hits.append(now)
        # 清掉长期不活跃的 IP，避免字典无限增长
        if len(_hits) > 5000:
            for key in [k for k, v in _hits.items() if not v][:1000]:
                _hits.pop(key, None)
        return False


def search(query: str) -> list[dict[str, str]]:
    if not API_KEY:
        raise RuntimeError("WEB_SEARCH_API_KEY is not configured")
    body = json.dumps(
        {"Query": query, "SearchType": "web", "Count": RESULT_COUNT, "NeedSummary": True},
        ensure_ascii=False,
    ).encode("utf-8")
    request = Request(
        API_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Traffic-Tag": "skill_web_search_common",
            "Authorization": f"Bearer {API_KEY}",
        },
    )
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    items = (payload.get("Result") or {}).get("WebResults") or []
    results: list[dict[str, str]] = []
    for item in items:
        title = (item.get("Title") or "").strip()
        url = (item.get("Url") or "").strip()
        snippet = (item.get("Summary") or item.get("Snippet") or "").strip()
        if not title and not snippet:
            continue
        results.append(
            {
                "title": title or url,
                "url": url,
                "snippet": snippet[:SNIPPET_CHARS],
                "site": (item.get("SiteName") or "").strip(),
                "logo": (item.get("LogoUrl") or "").strip(),
                "published": (item.get("PublishTime") or "").strip(),
            }
        )
    return results


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "gb18030", "big5", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", "replace")


def _pdf_text(data: bytes) -> str:
    try:
        proc = subprocess.run(
            ["pdftotext", "-layout", "-", "-"],
            input=data,
            capture_output=True,
            timeout=45,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.decode("utf-8", "replace")
    except (OSError, subprocess.TimeoutExpired):
        pass
    # 扫描版 PDF 没有文字层时，退回 pypdf 再试一次
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _run_cmd_temp(cmd: list[str], data: bytes, ext: str) -> str:
    with tempfile.TemporaryDirectory() as folder:
        path = os.path.join(folder, f"upload.{ext}")
        with open(path, "wb") as handle:
            handle.write(data)
        proc = subprocess.run([*cmd, path], capture_output=True, timeout=25)
        if proc.returncode != 0:
            message = proc.stderr.decode("utf-8", "replace").strip()
            raise RuntimeError(message[:200] or f"{cmd[0]} failed")
        return proc.stdout.decode("utf-8", "replace")


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        info = archive.getinfo("word/document.xml")
        if info.file_size > 30 * 1024 * 1024:
            raise ValueError("document.xml too large")
        xml = archive.read(info).decode("utf-8", "replace")
    xml = re.sub(r"</w:p\s*>", "\n", xml)
    xml = re.sub(r"<w:tab\s*/>", "\t", xml)
    return html.unescape(re.sub(r"<[^>]+>", "", xml))


def _pptx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = [
            name
            for name in archive.namelist()
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
        ]
        names.sort(key=lambda name: int(re.search(r"(\d+)", name).group(1)))
        parts: list[str] = []
        for name in names:
            info = archive.getinfo(name)
            if info.file_size > 10 * 1024 * 1024:
                continue
            xml = archive.read(info).decode("utf-8", "replace")
            parts.extend(html.unescape(text) for text in re.findall(r"<a:t>(.*?)</a:t>", xml, re.S))
    return "\n".join(parts)


def _xlsx_text(data: bytes) -> str:
    import openpyxl

    workbook = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    lines: list[str] = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(values_only=True):
            cells = [str(cell) for cell in row if cell is not None]
            if cells:
                lines.append("\t".join(cells))
            if len(lines) >= 3000:
                break
        if len(lines) >= 3000:
            break
    workbook.close()
    return "\n".join(lines)


def _load_sts2_module():
    spec = importlib.util.spec_from_file_location("sts2_api", STS2_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load sts2_api")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _arg_value(args: list[str], flag: str) -> str | None:
    for index, arg in enumerate(args[:-1]):
        if arg == flag:
            return args[index + 1]
    return None


def extract_text(filename: str, data: bytes) -> tuple[str, bool]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        text = _pdf_text(data)
    elif ext == "doc":
        text = _run_cmd_temp(["antiword", "-w", "0"], data, ext)
    elif ext == "docx":
        text = _docx_text(data)
    elif ext == "ppt":
        text = _run_cmd_temp(["catppt"], data, ext)
    elif ext == "pptx":
        text = _pptx_text(data)
    elif ext == "xls":
        text = _run_cmd_temp(["xls2csv"], data, ext)
    elif ext == "xlsx":
        text = _xlsx_text(data)
    elif ext in TEXT_EXTS:
        text = _decode_text(data)
    else:
        raise UnsupportedFormat(ext or "unknown")

    text = text.replace("\x00", "").strip()
    truncated = len(text) > MAX_TEXT_CHARS
    return text[:MAX_TEXT_CHARS], truncated


class Handler(BaseHTTPRequestHandler):
    server_version = "CornhubSearch/1.0"

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _read_upload(self) -> tuple[str, bytes]:
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError as exc:
            raise ValueError("invalid content length") from exc
        if length <= 0:
            raise ValueError("missing body")
        if length > MAX_UPLOAD_BYTES + 2 * 1024 * 1024:
            raise ValueError("body too large")
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            raise ValueError("multipart required")
        body = self.rfile.read(length)
        raw = (
            b"Content-Type: "
            + content_type.encode("utf-8")
            + b"\r\nMIME-Version: 1.0\r\n\r\n"
            + body
        )
        message = email.message_from_bytes(raw)
        for part in message.walk():
            filename = part.get_filename()
            if filename:
                payload = part.get_payload(decode=True) or b""
                safe_name = os.path.basename(filename.replace("\\", "/"))
                return safe_name, payload
        raise ValueError("file field missing")

    def _handle_sts2(self) -> None:
        """运行 sts2_api.py 的白名单命令，把文本结果交给模型工具循环。"""
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if _rate_limited(ip):
            self._json(429, {"ok": False, "error": "rate_limited"})
            return
        if not os.path.isfile(STS2_SCRIPT):
            self._json(500, {"ok": False, "error": "sts2_script_missing"})
            return
        try:
            length = int(self.headers.get("Content-Length") or "0")
            if length <= 0 or length > 64 * 1024:
                raise ValueError("invalid body")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            command = payload.get("command")
            args = payload.get("args") or []
            if not isinstance(command, str) or command not in STS2_COMMANDS:
                raise ValueError("unsupported command")
            if not isinstance(args, list) or len(args) > 16:
                raise ValueError("invalid args")
            clean: list[str] = []
            for arg in args:
                if (
                    not isinstance(arg, str)
                    or len(arg) > 200
                    or any(ord(char) < 32 for char in arg)
                ):
                    raise ValueError("invalid args")
                clean.append(arg)
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(400, {"ok": False, "error": "bad_request", "message": str(exc)[:200]})
            return

        try:
            proc = subprocess.run(
                ["/usr/bin/python3", STS2_SCRIPT, command, *clean],
                capture_output=True,
                timeout=30,
                cwd=os.path.dirname(STS2_SCRIPT),
            )
        except subprocess.TimeoutExpired:
            self._json(504, {"ok": False, "error": "sts2_timeout"})
            return
        except OSError as exc:
            self._json(500, {"ok": False, "error": "sts2_failed", "message": str(exc)[:200]})
            return

        text = (proc.stdout or proc.stderr).decode("utf-8", "replace").strip()
        payload: dict = {
            "ok": proc.returncode == 0,
            "command": command,
            "text": text[:STS2_MAX_OUTPUT],
            "truncated": len(text) > STS2_MAX_OUTPUT,
        }
        # 玩家档案额外返回结构化数据，前端用游戏风内嵌块渲染
        if command == "player-profile":
            name = _arg_value(clean, "--name")
            if name:
                try:
                    profile = _load_sts2_module().api("/api/player/profile", {"name": name})
                    if isinstance(profile, dict):
                        payload["data"] = profile
                except Exception as exc:  # noqa: BLE001 - UI 缺数据时退回纯文本
                    payload["data_error"] = str(exc)[:200]
        self._json(200, payload)

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        path = urlparse(self.path).path
        if path == "/sts2":
            self._handle_sts2()
            return
        if path != "/extract":
            self._json(404, {"error": "not_found"})
            return

        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if _rate_limited(ip):
            self._json(429, {"error": "rate_limited"})
            return

        try:
            filename, data = self._read_upload()
        except ValueError as exc:
            self._json(400, {"error": "bad_upload", "message": str(exc)[:200]})
            return
        if len(data) > MAX_UPLOAD_BYTES:
            self._json(413, {"error": "file_too_large"})
            return

        try:
            text, truncated = extract_text(filename, data)
        except UnsupportedFormat:
            self._json(415, {"error": "unsupported_format"})
            return
        except subprocess.TimeoutExpired:
            self._json(504, {"error": "extract_timeout"})
            return
        except Exception as exc:  # noqa: BLE001 - 返回给前端统一展示
            self._json(422, {"error": "extract_failed", "message": str(exc)[:200]})
            return

        self._json(
            200,
            {
                "filename": filename,
                "text": text,
                "chars": len(text),
                "truncated": truncated,
            },
        )

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._json(200, {"ok": True, "configured": bool(API_KEY)})
            return
        if parsed.path != "/search":
            self._json(404, {"error": "not_found"})
            return

        query = (parse_qs(parsed.query).get("q") or [""])[0].strip()
        if not query:
            self._json(400, {"error": "missing_query"})
            return
        if len(query) > MAX_QUERY_CHARS:
            self._json(400, {"error": "query_too_long"})
            return

        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if _rate_limited(ip):
            self._json(429, {"error": "rate_limited"})
            return

        try:
            results = search(query)
        except HTTPError as exc:
            self._json(502, {"error": "upstream_http", "status": exc.code})
            return
        except (URLError, TimeoutError, RuntimeError, ValueError) as exc:
            self._json(502, {"error": "upstream_failed", "message": str(exc)[:200]})
            return

        self._json(200, {"query": query, "count": len(results), "results": results})

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        # 只记录路径和状态，搜索词留在 query 里，不写入日志
        print(f"{self.address_string()} {self.command} {urlparse(self.path).path} {code}", flush=True)

    def log_message(self, fmt: str, *args) -> None:
        # 屏蔽默认实现，避免把完整请求行（含搜索词）写进 journal
        return


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"cornhub-search listening on http://{HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
