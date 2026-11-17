# 联网搜索代理

`server.py` 是 OpenCode Go 部署使用的搜索服务：只依赖 Python 标准库，监听 `127.0.0.1:8790`，由 nginx 的 `/search` 反向代理暴露给前端。

- 搜索源：火山引擎豆包搜索（`https://open.feedcoopapi.com/search_api/web_search`）
- 凭证：只放在 systemd 的 `EnvironmentFile` 里，不进入前端、不进入 git
- 限流：单 IP 12 次/分钟，全局 60 次/分钟
- 返回：`{"query","count","results":[{"title","url","snippet","site","published"}]}`

另外提供 `POST /extract`，把 OpenCode 不支持的文档转成纯文本：

- 支持 PDF（`pdftotext`）、DOC（`antiword`）、DOCX（XML）、PPT（`catppt`）、PPTX（XML）、XLS（`xls2csv`）、XLSX（`openpyxl`）、文本/代码
- 文档单文件上限 20MB，提取文本最多 60000 字
- 图片仍限制 5MB（base64 内联）
- 扫描版 PDF（没有文字层）提取不到内容，需要改用图片上传

另外提供 `POST /sts2`，执行 `sts2-analytics` skill 的白名单命令：

- 脚本：`/home/ubuntu/.hermes/skills/gaming/sts2-analytics/scripts/sts2_api.py`
- 命令：`overview/cards/card/relics/monsters/curses/upgrades/encounters/leaderboard/player-search/player-profile/run/versions`
- 请求：`{"command":"cards","args":["--character","IRONCLAD","--page-size","10"]}`
- 超时 30 秒，返回文本最多 20000 字

## 部署

1. 写入凭证（示例，不要把真实 Key 提交到仓库）：

   ```bash
   printf 'WEB_SEARCH_API_KEY=your-key\nSEARCH_PORT=8790\n' | sudo tee /etc/cornhub-search.env
   sudo chmod 600 /etc/cornhub-search.env
   ```

2. systemd：

   ```ini
   [Unit]
   Description=Cornhub Agent web search proxy
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=simple
   User=ubuntu
   Group=ubuntu
   EnvironmentFile=/etc/cornhub-search.env
   ExecStart=/usr/bin/python3 /home/ubuntu/ChatBot/search-service/server.py
   Restart=always
   RestartSec=3
   NoNewPrivileges=true
   PrivateTmp=true

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now cornhub-search
   curl http://127.0.0.1:8790/health
   ```

3. nginx（放在 agent.cornhub.art 的 server 块里）：

   ```nginx
   location = /search {
       proxy_pass http://127.0.0.1:8790;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_read_timeout 30s;
   }

   # 放在 server 块里：20MB 文档 + multipart 开销，留到 40MB
   client_max_body_size 40m;

   location = /extract {
       proxy_pass http://127.0.0.1:8790;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_read_timeout 60s;
       proxy_send_timeout 60s;
   }

   location = /sts2 {
       proxy_pass http://127.0.0.1:8790;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_read_timeout 60s;
       proxy_send_timeout 60s;
   }
   ```

## 前端构建

OpenCode Go 使用同源代理注入密钥，前端只持有占位 Key：

```bash
PA_API_ORIGIN='' \
PA_API_BASE_PATH='/api' \
PA_VERIFY_PATH='/api/models' \
PA_API_VENDOR=opencode \
PA_PROXY_MODE=true \
PA_CHAT_MODEL='deepseek-v4.1-flash' \
PA_PUBLIC_PATH='/' \
pnpm build
```

`PA_PUBLIC_PATH=/` 让资源使用 `/static/...` 绝对路径，配合 nginx 的 `try_files ... /index.html` 支持会话深链接 `/a/chat/s/<session-id>`；默认 `auto` 保留上游的 `file://` 用法。

前端声明 `search_web` 客户端工具；模型返回 `tool_use` 后，浏览器调用 `/search`，再把 `tool_result` 回传给模型继续生成。单条回复最多执行 3 次搜索。
