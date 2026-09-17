# 公网部署

生产网站由 Cloudflare Pages 托管：

```text
https://guanxiang-zhouyi-evf.pages.dev
```

代码仓库仍位于：

```text
https://github.com/xiguajiushiwo/guanxiang-zhouyi
```

浏览器只请求同源的 `/api/reading`。Pages Function 再通过仅保存在 Cloudflare 中的 `PROXY_SECRET` 转发给 AI Worker，因此前端不保存密钥，也不直接依赖本地网络能否访问 `workers.dev`。

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

本地 `127.0.0.1` 默认不连接生产 AI；只有 `*.pages.dev` 会自动使用同源 `/api/reading`。
