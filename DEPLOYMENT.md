# 公网部署

网站由 GitHub Pages 托管，AI 接口由 Cloudflare Worker 托管。未配置 Worker 时，本地规则解读、经典原文、起卦和历史记录仍可正常使用。

## 1. 部署 GitHub Pages

把仓库推送到 GitHub，在仓库中打开 `Settings > Pages`：

1. `Source` 选择 `Deploy from a branch`。
2. 分支选择 `main`，目录选择 `/ (root)`。
3. 保存并等待 Pages 给出公网地址。

本项目没有前端构建步骤，仓库根目录的 `index.html` 会直接发布。项目型 Pages 地址通常是：

```text
https://YOUR-USER.github.io/REPOSITORY/
```

## 2. 部署 AI Worker

按照 [worker/README.md](worker/README.md) 创建 KV、设置 `RATE_LIMIT_SALT` 并部署 Worker。记下最终的 HTTPS 地址。

编辑 `index.html` 尾部的公开配置：

```html
<script>window.GUANXIANG_AI_ENDPOINT='https://guanxiang-ai-reading.YOUR-SUBDOMAIN.workers.dev';</script>
```

这个 URL 不是密钥，可以公开。Cloudflare 账户凭据、KV ID 以外的 secret 和 `RATE_LIMIT_SALT` 不得写入前端。

同时把 Worker 配置中的 `ALLOWED_ORIGINS` 改成 GitHub Pages 的 Origin。即使网站位于 `/REPOSITORY/` 路径，Origin 仍然只是：

```text
https://YOUR-USER.github.io
```

修改 Worker 配置后重新执行：

```powershell
cd worker
npx wrangler@latest deploy
```

## 3. 检查跨域配置

将下面两个地址替换为实际值：

```powershell
curl.exe -i -X OPTIONS "https://YOUR-WORKER.workers.dev" -H "Origin: https://YOUR-USER.github.io" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"
```

正常响应状态为 `204`，并包含：

```text
access-control-allow-origin: https://YOUR-USER.github.io
```

未在 `ALLOWED_ORIGINS` 中列出的来源应返回 `403`。

## 4. 上线验收

1. 打开 Pages 网站并完成一次快速演蓍。
2. 确认结果页先立即出现“本地规则解读”。
3. 点击“生成 AI 深度解读”，确认文本在模型尚未结束时已经逐段出现，页面没有进度条。
4. 等待完成，刷新页面或打开占问记录，确认完整 AI 解读可以恢复。
5. 临时断开网络再打开已有页面，确认本地解读与经典资料仍可阅读。
6. 连续超过每小时单 IP 限额，确认页面显示“请求过于频繁”，本地解读不消失。
7. 把 `window.GUANXIANG_AI_ENDPOINT` 暂时改为空字符串，确认 AI 按钮显示“AI 服务尚未配置”，其他功能不受影响。

## 5. 自定义域名

在 `Settings > Pages > Custom domain` 填入域名，并按 GitHub 提示配置 DNS。启用 `Enforce HTTPS` 后，还需要把 Worker 的 `ALLOWED_ORIGINS` 更新为新域名，例如：

```text
https://www.example.com
```

域名变更后重新部署 Worker。不要把带路径、末尾斜杠或 HTTP 版本误填为生产 Origin。

## 6. 更新网站

每次推送到 Pages 所用分支后，GitHub 会自动更新静态网站。`service-worker.js` 的缓存版本发生变化时，已打开的网站会提示刷新以使用新版本。
