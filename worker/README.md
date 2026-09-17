# AI 解读 Worker 部署

这个 Worker 接收结构化卦象资料，执行来源校验和原子限流，再调用 Cloudflare Workers AI。它不建立问题或解读数据库；SQLite Durable Object 只保存匿名计数。

## 准备

需要 Cloudflare 账户和 Node.js。进入 Worker 目录并登录：

```powershell
cd worker
npx wrangler@latest login
```

复制配置：

```powershell
Copy-Item wrangler.jsonc.example wrangler.jsonc
```

在 `wrangler.jsonc` 中把 `ALLOWED_ORIGINS` 设为网站的准确 Origin。Origin 只包含协议和主机名，不包含路径，例如：

```text
https://guanxiang-zhouyi-evf.pages.dev
https://guanxiang-zhouyi-global.netlify.app
```

多个 Origin 用英文逗号分隔。本地开发默认允许 `http://127.0.0.1:4175` 和 `http://localhost:4175`。

## 私有盐值

生成一个不可公开的随机值，并通过 Wrangler 写入 secret：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes) | npx wrangler@latest secret put RATE_LIMIT_SALT
```

不要把这个值写进仓库。它只用于对来源 IP 做单向哈希，Durable Object 中不会出现原始 IP。

## 测试和部署

`wrangler.jsonc.example` 中的 `v1` migration 会创建 `ReadingRateLimiter` SQLite Durable Object。首次部署直接执行 migration；后续 schema 变化只能追加新的 migration tag，不能改写已部署的 tag。

本地运行：

```powershell
npx wrangler@latest dev
```

部署：

```powershell
npx wrangler@latest deploy
```

部署完成后 Wrangler 会输出 `workers.dev` 地址。生产浏览器不直接调用该地址，而由 Pages 或 Netlify 的同源 `/api/reading` 代理转发。

Pages Function 和 Worker 必须配置相同的 `PROXY_SECRET`。Netlify Function 使用另一随机值：在 Netlify 中命名为 `PROXY_SECRET`，在 Worker 中命名为 `NETLIFY_PROXY_SECRET`。Worker 只有在对应 secret 匹配时才信任代理传来的访客 IP；值必须通过服务商的 secret 配置写入，不得放入 `wrangler.jsonc` 或前端代码。具体命令见根目录的 `DEPLOYMENT.md`。

## 限额

默认配置为：

- 每个匿名 IP 哈希每小时 5 次；
- 全站每个 UTC 日 50 次；
- 单次最多约 900 个输出 token。

可在 `wrangler.jsonc` 的 `vars` 中调整。Durable Object 以事务方式更新计数；还应在 Cloudflare 账户中设置可接受的 Workers AI 使用边界。

`Origin` 校验主要限制普通浏览器跨站调用，不是用户身份认证。公开网站仍可能被脚本伪造请求来源，因此不能取消限流或平台侧预算。

## 隐私

Worker 源码不会主动记录问题、卦象、模型输出或原始 IP，也不会把上游错误正文返回前端。Cloudflare 平台本身如何处理请求，仍以你的 Cloudflare 账户设置和服务条款为准。
