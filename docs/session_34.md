我将开始执行 task133 的修复工作流。先建立任务清单，然后逐步推进。
工作区已存在，执行 `git pull` 刷新：
工作区已更新至 246bf8c。现在精读 5 份核心文档：
文件读取被嵌套截断，改为分段直读源文件：
AGENTS.md 已精读。现在读 CLAUDE.md：
现在读 README.md：
现在读 Project_Architecture_Document.md（分段精读）：
PAD 已精读。现在读 home-furnishing-store_SKILL.md：
5 份核心文档已精读完毕。现在读会话与修复计划文档：
session_31/32 已读——Task 133 已交付推送（601e7f3），本次周期为 **Task 134**。现在读 task133 修复计划与 worklog：
所有会话文档已精读。当前状态确认：**Task 133 已交付推送，本周期为 Task 134**。现在对照代码库验证文档声明：
环境检查发现关键点：DATABASE_URL 陷阱（gotcha #10）再次出现——shell 导出了 SQLite 残留值。PG 正在运行。先处理陷阱并验证数据库契约：
`.env.example` 契约完好。现在用直接 SQL 验证 PG DDL 契约与种子数量：
数据库契约完全验证：9 表、种子 8/24/3/72/5/0/0/6/3、库存 1379、4 索引齐全、零残留。现在运行基线门禁：
179/179 单元测试通过，与文档一致。现在跑 e2e 基线（冷生产构建）：
120/120 e2e 通过。验证运行后零残留：
基线全绿，与文档记录的 Task-133 终态完全一致。更新任务状态，进入审计阶段：
参照仓库 homenest-store-s 静默确认（HEAD 4771c3d，ff65bd2 后零 src/tests 变更——第十个“无可移植”周期）。读取 web-application 技能：
web-application 技能已加载。先查看最近改动的范围（Task-133 提交），再启动双审计代理：
Task-133 改动面已确认。启动双审计代理（深代码审计 + 文档真相审计，既定模式）：
双审计返回。按 lesson-46 纪律，先逐行复核每个发现，再规划。复核代码审计发现：
F-1 确认：cart 重复载荷仅有单元 pin，e2e 探针缺失。复核 F-2（URIError 防护）：
F-2 确认：防护正确但无测试 pin。复核 F-3（stepper 上限禁用）与 F-4/F-5：
代码发现全部逐行确认。复核文档审计发现：
全部发现逐行复核完毕。现在启动 dev server 进行 agent-browser 移动端抽屉分类学检查与 SEO 验证：
视口就绪，无溢出。运行抽屉分类学 T1（打开 + aria-expanded）：
T1 通过（展开=true，标签切换为 Close menu）。T2：抽屉内导航 + 自动关闭：
T2 通过（导航至 /shop，抽屉自动关闭）。T3：F-7 参数导航关闭回归检查：
T3 通过（参数导航关闭保持）。T4/T5：Escape 关闭与切换：
T4/T5 通过。T6：桌面 1440×900 下汉堡隐藏：
T6 通过（display:none, 0×0）。T7：水合 + 加购徽标（回到移动端）：
T7 通过（水合=true，徽标 "Shopping bag, 1 item"）。T8 已验证无溢出。**移动端抽屉分类学 8/8 通过——无 Tailwind v4 bug**。现在检查 SEO/sitemap/robots：
SEO 全部通过（42 URL 无 lastmod、robots 一致、og 1200×627、noindex 全覆盖、404 品牌+状态码）。审计与浏览器验证完成。现在定位计划所需的测试锚点：
谓词契约确认（qty 1-99 合法，种子探针可行）。最后验证 TZ fs-pin 加宽后无现存违规：
TZ pin 加宽无现存违规。检查 addLine 的导出情况以确定单元 pin 位置：
addLine 为模块内部函数——fs-pin 是既定模式（server-data.test.ts 先例）。检查 cart 空状态与 order 页 not-found 文案以设计探针：
所有锚点就绪。现在撰写 Task-134 修复计划：
现在检查 distill 技能为后续 SKILL 重建做准备，然后写计划：
distill 模板已确认（增量更新模式）。现在撰写 Task-134 修复计划：
计划已写入。锚点已全部验证（cart 空标题、business 默认值、wishlist 探针结构、PDP Qty 标签）。开始 TDD 执行——**Slice A（F-1）：cart 重复载荷 e2e 探针**：
验证 cart 页面的行渲染元素与空状态结构（确保定位器正确）：
探针定位器确认。运行新探针（GREEN-on-arrival 预期）：
GREEN-on-arrival 确认。现在做 honest-RED 变异演示（注释掉 Set 检查）：
RED 确认（变异树渲染 "Your bag (2)"，探针失败）。恢复字节一致并复验：
**Slice A 完成**。**Slice B（F-2）：/order/%ZZ 探针**——定位 lowercase 探针结尾：
验证撇号字符一致性（现有探针 vs 页面源码）：
发现关键细节：页面渲染直撇号（`&apos;` = U+0027），而现有探针用了排版撇号（U+2019）——我的探针必须用直撇号：
我的探针 1137 行用了排版撇号将永远匹配不上；且现有 Task-133 探针 1121 行的否定断言实为永久 no-op（同类于 Task-131 的坏定位器）。一并修正为直撇号正则：
探针失败——查看失败详情：
真实 RED！先在 dev server 上直接复现，判断 500 来源：
dev 上原始 `%ZZ` 是 Next 平台层 400（请求根本到不了页面组件）。查看 Playwright 失败上下文确认 500 的真实来源：
"Internal Server Error"——生产构建对畸形 URL 返回裸 500（框架层，组件守卫未及触达）。启动生产构建精确定位：
`%E0%A4%A` 也是 500 且无日志。检查 order 页是否有 generateMetadata 在 try 外解码：
平台层定位完成：**原始畸形百分号 URL（`%ZZ`、`%E0%A4%A`）在 Next 16 路由层即抛错（prod 裸 500 / dev 400），根本到不了应用代码**——浏览器 URL 解析器会把孤立 `%` 规范化为 `%25ZZ`（200 正常）。这是平台行为，不可应用层修复。探针改为 pin 浏览器可达形态 `%25ZZ`（该路径真正穿过页面级 URIError 守卫）：
探针更新为 `%25ZZ`。先确定 Next 16 传参是否已解码（决定守卫是否真正被穿过）——查 Next 源码：
Next 的 route-matcher 在路由层即解码参数（DecodeError → 平台 500），页面拿到的是**已解码**值——`%25ZZ` → Next 解码为 `%ZZ` → 页面再解码 → URIError → **页面守卫真正被穿过**。运行探针并做变异验证：
变异保持 GREEN——这证明**页面收到的是原始（仍编码）参数**，而任何会让页面 decode 抛错的输入，在路由层就已被 Next 的 DecodeError 拦截（平台 500）。页面级 URIError 守卫在本 Next 版本上实为防御性纵深（不可经公共接口触达）。恢复变异并诚实修正探针注释：
**Slice B 完成**（探针 GREEN + 平台层发现已记录 + 守卫死代码实况已诚实标注）。**Slice C（F-3）：stepper 上限——真 RED 优先**。先写三个上限 pin：
三个上限 pin 已写。运行观察真 RED：
三个 pin 全部真 RED。现在 GREEN——三处加 disabled 属性：
**Slice C 完成**（3×真 RED→GREEN）。**Slice D（F-4）：addLine 下限钳制 fs-pin**——先看 local-store.test.ts 的既有 fs-pin 风格：
在元素验证块后新增 addLine 钳制 fs-pin（先 RED）：
RED 确认。GREEN——应用钳制修复：
**Slice D 完成**。**Slice E（F-5）：MAX_INT4 注释真相修正**：
**Slice E 完成**。**Slice F（F-6）：TZ fs-pin 加宽**——定位现行正则：
加宽 pin GREEN。变异演示（单引号 Z-less 字面量须 RED；`.500Z` 字面量须不误报）：
变异演示暴露回溯陷阱：可选组可匹配空，让前瞻测试到了 `.`——需在否定前瞻中也加入 `.`。修正正则：
仍被标记？用 node 独立验证正则行为：
找到真正的洞：`\d+` 可回吐数字（".500"→".50"，前瞻测试到数字"0"通过）。将 `\d` 加入否定前瞻即可移植地封堵：
全部 10 用例通过。应用最终正则并更新注释：
变异演示完美：单引号 Z-less 被标记（引号类加宽生效），`.500Z` 不再误报（前瞻修正生效）。移除临时字面量并复验：
17 个失败应为 docs-counts lockstep 预期红（计数已从 179/120 → 180/125，文档未扫）。验证：
全部 17 个为 lockstep 预期红。确认权威计数（unit 180 / e2e 125）后跑代码阶段完整门禁：
e2e=125 确认。停掉临时 server，跑完整门禁（冷构建 + 三 TZ 单元 + 全量 e2e）：
三 TZ 一致（各 17 个 lockstep 红）。确认通过计数：
**代码阶段门禁全绿**（冷构建 + 三TZ 一致 + e2e 125/125 + 零残留）。进入文档阶段——D-1：README 门禁行补全：
D-2：README 基线计数修正（177/116 → 177/117）：
D-3：SKILL §11 lockstep 清单补 DEPLOYMENT.md：
D-4：AGENTS/PAD 摘要补 server-data fs-pin，然后全量 lockstep。先从 pin 失败信息获取全部计数站点：
逐文档 lockstep 扫描。先更新 AGENTS.md（计数 + D-4 摘要 + Task-134 段落 + Pin map）：
现在扩展 AGENTS Pin map（新增 Task-134 行）：
AGENTS.md 完成。更新 CLAUDE.md：
CLAUDE.md 完成。更新 README.md（计数 + Task-134 周期段落，最新优先）：
README.md 完成。更新 PAD（版本头 + v1.19.0 修订块 + 计数 + D-4）：
现在更新 PAD 计数站点（§1.2/§7.1/§7.4/§9.2/§11 + D-4）：
PAD 完成。更新 SKILL.md（版本 + 计数 + 前言 + lessons 57-58 + Appendix B）：
现在追加 lessons 57-58（先看 §12 尾部）：
现在更新 SKILL Appendix B 行（计划 19、截图 90、计数 180/125）：
SKILL 完成。更新 DEPLOYMENT.md：
**Lockstep 恢复（22/22 绿）**。补充计划的执行后记（诚实记录两项执行中发现）：
计划完成。启动 dev server 截取本周期截图（85-89）：
5 张截图全部验证非空白（密度 0.253-0.876），共 90 PNG。验证 .env.example 未变（pin 已含于 180/180）：
撰写 worklog Task-134 条目与 session_33 日志：
session_33 完成。停止 dev server，跑最终完整门禁：
**最终门禁全绿**（冷构建 + 三TZ 180/180 + e2e 125/125 + 零残留）。准备提交：
提交为 250e391。现在按 runbook 设置 SSH 密钥并推送：
设置密钥（仓库外，0600）并验证 shim：
显示层被脱敏（skill lesson 1）。用 od 验证实际字节：
密钥完好（ed25519，指纹 ih6tiqXs…）。Dry-run（带强制性 --remote 覆盖）：
**推送成功并验证**——远端 main @ 250e391。清理密钥材料并做最终核验：
全部完成。密钥已粉碎，仓库零密钥残留，工作树干净，远端已验证。
**Task 134 已交付并推送 — 远端 `main @ 250e391` 验证通过。**

## 周期总结

**基线**：工作区刷新（`git pull → 246bf8c`，Task-133 代码 + session_32 日志）；rootless PostgreSQL 17.12 存活运行（无需 lesson-31 恢复），DDL 契约 + 种子量直接 SQL 验证（库存 1379、4 索引、零残留）；基线门禁全绿 179 单元 / 120 e2e；处理了 `DATABASE_URL` 陷阱（gotcha #10）。

**浏览器验证**：移动抽屉分类学 **8/8 通过**（390×844/1440×900，含水合哨兵与 F-7 参数导航回归）——**无 Tailwind v4 bug**；sitemap 42 URL、robots 一致、og:image 1200×627 三面验证、noindex 全覆盖、品牌化 404。

**审计→10 项发现**（双代理 + 逐行复核），TDD 执行（每项行为变更前观察到 RED；每个 GREEN-on-arrival pin 均变异证明）：

- **F-1 MEDIUM** — cart 重复载荷 e2e 探针补齐（Task-133 只 pin 了 wishlist 一半）
- **F-2** — `/order/` 解码角 pin，执行中发现**平台层真相**：原始畸形 URL 在 Next 16 路由层即被拒（prod 500/dev 400，浏览器解析器会先规范化），页面级 URIError 守卫实为不可达纵深——诚实改记 + pin 浏览器可达形态；顺带修复 Task-133 探针的排版撇号永久 no-op 断言
- **F-3** — 三处 stepper 上限禁用（真 RED→GREEN）
- **F-4/F-5** — addLine 下限钳制（fs-pin）+ MAX_INT4 注释真相
- **F-6** — TZ pin 加宽，变异演示抓出**第二个回溯分岔**（`\d+` 回吐数字），前瞻拒绝 `.` 与数字后双双封堵
- **D-1..D-4** — README 门禁行补 `typecheck:tests`（真正的第六文档离群点）等四处文档真相

**最终门禁**：lint 0/0 · typechecks 干净 · **180/180 单元 × 3 时区一致** · **125/125 e2e（冷构建）** · 零 DB 残留。文档六件套 lockstep、SKILL v2.8.0（lessons 57-58）、PAD v1.19.0、截图 85-89、`.env.example` 契约不变。参照仓库 homenest-store-s 静默（第十个“无可移植”周期）。

遗留登记簿新增一行：原始畸形百分号 URL 类由平台层应答（curl/手工可达，浏览器不可达），作为文档化平台行为保留。
