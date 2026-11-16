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

import json
import os
import time
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
