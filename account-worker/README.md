# 观象账号服务

基于 Cloudflare Workers 与 D1，提供注册、登录、会话和占问记录同步。浏览器通过 Pages / Node 的同源 `/api/account/*` 代理访问，不直接携带 Worker secret。

## 首次部署

在 `account-worker/` 中执行，已部署的维护者请继续使用现有本机配置，不要覆盖数据库绑定：

```powershell
npx wrangler@latest login
Copy-Item wrangler.jsonc.example wrangler.jsonc
npx wrangler@latest d1 create guanxiang-accounts
```

将返回的数据库 ID 填入本机 `wrangler.jsonc`，并将 `ALLOWED_ORIGINS` 改为自己网站的准确来源。该配置被 Git 忽略，示例文件保留可复用的结构。

通过 Wrangler 设置 secrets，然后迁移和部署：

```powershell
npx wrangler@latest secret put SESSION_SECRET
npx wrangler@latest secret put ACCOUNT_PROXY_SECRET
npx wrangler@latest d1 migrations apply DB --remote
npx wrangler@latest deploy
```

代理侧也需配置同一个 `ACCOUNT_PROXY_SECRET`。Pages 的上游地址在 `functions/api/account/[[path]].js`，Node / Liara 通过 `ACCOUNT_WORKER_URL` 配置；部署到自己的账户时应相应调整。

## 数据与维护

`migrations/` 保留 D1 表结构迁移。密码哈希与会话由服务端管理；记录在已有 payload 中保存，合并规则处理双方追加的进展、解读版本和关联状态。修改同步语义时，先验证兼容性，再按顺序发布账号服务与前端。

在仓库根目录运行 `npm run validate`，会包含账号 Worker、记录合并及代理检查。完整服务架构见 [部署说明](../DEPLOYMENT.md)。
