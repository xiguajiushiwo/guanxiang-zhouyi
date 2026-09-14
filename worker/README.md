# AI 解读 Worker 部署

这个 Worker 接收结构化卦象资料，执行来源校验和限流，再调用 Cloudflare Workers AI。它不建立问题或解读数据库；KV 仅保存自动过期的匿名计数。

## 准备

需要 Cloudflare 账户和 Node.js。进入 Worker 目录并登录：

```powershell
cd worker
npx wrangler@latest login
```

创建限流 KV：

```powershell
npx wrangler@latest kv namespace create RATE_LIMITS
```

复制配置并把命令返回的 namespace ID 填入 `kv_namespaces[0].id`：

```powershell
Copy-Item wrangler.jsonc.example wrangler.jsonc
```

在 `wrangler.jsonc` 中把 `ALLOWED_ORIGINS` 的示例地址替换成网站的准确 Origin。Origin 只包含协议和主机名，不包含仓库路径，例如：

```text
https://example.github.io
https://www.example.com
```

多个 Origin 用英文逗号分隔。本地开发默认允许 `http://127.0.0.1:4175` 和 `http://localhost:4175`。

## 私有盐值

生成一个不可公开的随机值，并通过 Wrangler 写入 secret：

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes) | npx wrangler@latest secret put RATE_LIMIT_SALT
```

不要把这个值写进仓库。它只用于对来源 IP 做单向哈希，KV 键中不会出现原始 IP。

## 测试和部署

本地运行：

```powershell
npx wrangler@latest dev
```

部署：

```powershell
npx wrangler@latest deploy
```

部署完成后 Wrangler 会输出类似 `https://guanxiang-ai-reading.<subdomain>.workers.dev` 的地址。把它配置到网站的 `window.GUANXIANG_AI_ENDPOINT`。

## 限额

默认配置为：

- 每个匿名 IP 哈希每小时 5 次；
- 全站每个 UTC 日 50 次；
- 单次最多约 900 个输出 token。

可在 `wrangler.jsonc` 的 `vars` 中调整。KV 计数用于成本保护，不是严格原子计费系统；还应在 Cloudflare 账户中设置可接受的 Workers AI 使用边界。

`Origin` 校验主要限制普通浏览器跨站调用，不是用户身份认证。公开网站仍可能被脚本伪造请求来源，因此不能取消限流或平台侧预算。

## 隐私

Worker 源码不会主动记录问题、卦象、模型输出或原始 IP，也不会把上游错误正文返回前端。Cloudflare 平台本身如何处理请求，仍以你的 Cloudflare 账户设置和服务条款为准。
