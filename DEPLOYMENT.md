# 公网部署

Cloudflare Pages 生产网站：

```text
https://guanxiang-zhouyi-evf.pages.dev
```

代码仓库仍位于：

```text
https://github.com/xiguajiushiwo/guanxiang-zhouyi
```

浏览器只请求同源的 `/api/reading`。Pages Function 再通过仅保存在 Cloudflare 中的 `PROXY_SECRET` 转发给 AI Worker，因此前端不保存密钥，也不直接依赖本地网络能否访问 `workers.dev`。

## Liara 伊朗镜像

面向伊朗网络的完整镜像部署在：

```text
https://guanxiang-zhouyi.liara.run
```

Liara 的 Node 服务同时提供 `dist/` 静态文件和同源 `/api/reading`。API 请求由 Liara 服务器转发至现有 AI Worker，浏览器不会直接连接 `workers.dev`。创建及部署使用 Liara CLI 9：

```powershell
npx --yes @liara/cli@9 login --browser edge
npx --yes @liara/cli@9 app list --output json
npx --yes @liara/cli@9 create --app guanxiang-zhouyi --platform node --plan free --feature-plan free --read-only true
npx --yes @liara/cli@9 deploy --app guanxiang-zhouyi --platform node --port 4175 --build-location iran --no-app-logs
npx --yes @liara/cli@9 logs --app guanxiang-zhouyi
```

若创建接口返回 `402`、`free_plan_platform` 或 `free_plan_count`，必须由账户所有者充值或在 Liara 中选择可用计划；不要静默更换应用 ID 或绕过服务商的账户要求。

Liara 环境变量 `PROXY_SECRET` 与 Worker secret `LIARA_PROXY_SECRET` 必须使用同一个独立随机值。随机值只能通过 Liara 控制台的环境变量字段，或经认证的 Liara API 请求正文写入；随后在内存中把同一值通过标准输入传给：

```powershell
Push-Location worker
$liaraProxySecret | npx wrangler@latest secret put LIARA_PROXY_SECRET
Pop-Location
Remove-Variable liaraProxySecret
```

不要把值放进命令参数、终端日志、源文件、构建产物或 Git。部署前确认 `worker/wrangler.jsonc` 的 `ALLOWED_ORIGINS` 含准确来源 `https://guanxiang-zhouyi.liara.run`，然后在 `worker/` 内执行 `npx wrangler@latest deploy`。

回滚应用时，在 Liara 控制台的 Releases/Deployments 页面重新发布上一个正常版本；当前 CLI 若提供 release rollback 命令，也可选择同一个历史 release。回滚 Worker 使用 Cloudflare 的版本回滚功能。Liara 镜像未明确退役前，保留 Worker 中的 Liara Origin 和 `LIARA_PROXY_SECRET`。Cloudflare Pages 与 Netlify 部署保持在线，互不覆盖。

## 首次创建

```powershell
npx wrangler@latest pages project create guanxiang-zhouyi --production-branch main
npm run build:pages
npx wrangler@latest pages deploy dist --project-name guanxiang-zhouyi --branch main --commit-dirty=true
```

根目录的 `functions/api/reading.js` 会随 Pages 一起部署，`dist/` 只包含生产网站文件。

## 私密配置

生成一个随机值，并把同一个值分别写入 Pages 和 AI Worker：

```powershell
$proxyBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($proxyBytes)
$proxySecret = [Convert]::ToBase64String($proxyBytes)
$proxySecret | npx wrangler@latest pages secret put PROXY_SECRET --project-name guanxiang-zhouyi
Push-Location worker
$proxySecret | npx wrangler@latest secret put PROXY_SECRET
Pop-Location
Remove-Variable proxySecret
```

不要把该值写入代码、文档或 Git。Worker 还必须保留原有的 `RATE_LIMIT_SALT`。

## 更新网站

```powershell
npm run validate
npm run build:pages
npx wrangler@latest pages deploy dist --project-name guanxiang-zhouyi --branch main --commit-dirty=true
```

修改 AI Worker 后，在 `worker/` 中执行：

```powershell
npx wrangler@latest deploy
```

## 上线验收

1. 打开 `https://guanxiang-zhouyi-evf.pages.dev`，确认中文首页和 `Language` 菜单正常。
2. 完成一次快速演蓍，确认本地解读立即出现。
3. 生成 AI 深度解读，确认内容逐段显示并可在历史记录中恢复。
4. 检查窄屏布局、十翼定位、札记与下一卦流程。
5. 断网重开已访问页面，确认经典资料和本地解读仍可使用。

本地 `127.0.0.1` 默认不连接生产 AI；`*.pages.dev`、`*.netlify.app` 和 `*.liara.run` 会自动使用同源 `/api/reading`。
