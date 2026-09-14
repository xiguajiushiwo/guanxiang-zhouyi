# 观象周易项目扩展设计

## 目标

把现有的周易研读与大衍筮法工具扩展为一个可靠、可学习、可长期记录的本地研读应用，同时保持完整十八变为默认占筮流程。

## 已确认范围

1. 新手引导与使用说明。
2. 筮法透明度面板，逐变展示策数和公式。
3. 结果解释分层：原文、传统规则、卦象结构、易理提示、个人札记。
4. 底本、版本、异文状态和来源信息。
5. 六十四卦比较，以及互卦、错卦、综卦。
6. 学习路径。
7. 段落批注、收藏、标签和复习状态。
8. PWA 离线使用。
9. 记录备份提醒、导入冲突处理和数据迁移。
10. 内容校勘工具。
11. 算法、内容、数据和浏览器自动化测试。

## 产品边界

- 完整十八变保留为默认模式；快速演蓍只是节奏较快的替代入口。
- 所有预测性表述必须标为研读与自省用途，不把后人规则伪装成《周易》原文。
- 经典文本使用本地 JSON，不要求运行时访问远程站点。
- 校勘第一版只处理项目明确录入的对照文本，不自动抓取远程内容。
- 用户记录默认只保存在浏览器本地，导出由用户主动触发。

## 数据模型

- contentMeta: edition、source、retrievedAt、variantStatus。
- classicSection: wingId、sectionIndex、number、hexagram、text、anchorId。
- relation: hexagramNumber、wingId、sectionIndex、kind、excerpt。
- journalRecord: id、question、lines、originalIndex、changedIndex、moving、note、tags、reviewState、createdAt、updatedAt、mode。
- annotation: id、sourceType、sourceId、quote、note、createdAt、updatedAt。
- derivedHexagram: original、changed、mutual、opposite、inverse。

## 阶段设计

### 阶段一：可信度与可理解性

实现新手引导、筮法透明度、结果分层和版本信息。完成后用户可以理解流程、复核每一变、区分原文与解释，并看到明确的底本状态。

### 阶段二：研读深度

实现卦象比较、互错综关系、学习路径和个人批注系统。完成后用户可从一次占筮进入持续研读。

### 阶段三：可靠存储与离线

实现 PWA 缓存、备份提醒、导入冲突合并、旧记录迁移和恢复测试。

### 阶段四：校勘与质量

实现人工录入的对照底本、段落差异视图、校对状态和全套自动化测试。

## 非功能要求

- 320px 宽度无页面级横向溢出。
- prefers-reduced-motion 下所有非必要动画关闭。
- 关键按钮和段落链接可键盘操作。
- 所有导入数据必须经过严格校验，错误数据不得进入本地记录。
- 每阶段都必须有独立的自动化验证和浏览器冒烟流程。
