# 经典资料与维护

经文与传文保留原文；后世解读规则、现代易理介绍及 AI 输出分别展示，不冒充经典原句。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `hexagram-catalog.mjs` | 六十四卦的顺序、名称、图形及基本说明 |
| `hexagram-texts.json` | 64 卦卦辞与 386 条爻辞（含乾坤用九、用六） |
| `ten-wings.json` | 十翼 10 篇、256 段原文 |
| `principles.json`、`principles-en.json` | 易理专题与英文辅助说明 |
| `relations.json` | 由十翼文本生成的卦文关联索引 |

底本按《十三经注疏·周易正义》通行次序整理，电子转录来自 [bollwarm/ZHOUYI](https://github.com/bollwarm/ZHOUYI/blob/master/lib/ZHOUYI.pm)。具体来源、检索日期与统计保存在各 JSON 的元数据中。当前不提供完整异文校勘。

## 重新导入

以下命令会联网读取上游并**覆盖对应数据文件**，仅在有意更新资料时运行。正常开发和构建不需要重新抓取：

```bash
node import-hexagram-texts.mjs
node import-verified-wings.mjs
npm run build:relations
npm run validate
```

提交前检查文本差异、段落数和来源信息。导入脚本保留已知转录错误的校正表；`validate-content.mjs` 检查完整性与已知乱码，不能替代人工校勘。

## 缓存与发布

经典资料被 Service Worker 缓存用于离线阅读。内容或模块发生变动时，更新相应资源版本与缓存版本，然后执行生产构建。构建只复制当前已验证数据，不联网导入、不调用 AI。
