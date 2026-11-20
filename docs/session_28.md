我将开始执行这项完整的 task130 修复任务。首先检查工作区状态并刷新仓库。
工作区已存在，执行 `git pull` 刷新：
仓库已更新至 task130 提交。现在精读 5 份核心文档：
现在阅读 README.md 和 Project_Architecture_Document.md：
现在读取 home-furnishing-store_SKILL.md 和会话文档：
session_25 和 session_26 已明确：Task 130 已交付推送（`3bd3c2f`），当前周期为 Task 131。现在读取 task130 修复计划与 worklog：
文档审阅完成。当前状态明确：Task 130 已交付（169 unit / 116 e2e），本周期为 **Task 131**。现在建立任务清单并验证代码库对齐：
测试计数与文档声明一致（169 unit / 116 e2e / 38+2 gotoHydrated）。现在检查 Task-130 改动集（本周期审计重点）：
代码库与文档完全对齐。现在设置 PostgreSQL：
PG 服务器进程仍在运行。直接验证连接与数据库契约：
数据库契约完整：9 表、DDL 索引齐全、种子精确（24/8/3/72/5/0/0/3/6）、库存总量 1379 = 种子公式期望值、零残留。本周期无需 lesson-31 恢复。现在运行基线门禁：
Lint 0/0、typechecks 干净、169/169 unit 全绿。检查 chromium（文档记载的陷阱）并运行 e2e 基线：
chromium-1255 已安装。运行 e2e 基线（后台），同时检查参考仓库：
参考仓库出现 src 改动（`ff65bd2`）—— 打破了连续六个周期的静默。检查其日期与内容：
`ff65bd2` 是 2026-10-23 的旧提交（HEAD 4771c3d 的祖先）。但 Task-130 审计声称该查询为空——检查差异来源：
参考仓库结论：远端仍停在 `4771c3d`（11-01，fetch 无新对象）——绝对静默。但发现 Task-130 审计的边界日漏洞：`ff65bd2`（10-23 当天）含 src 改动（not-found CSP nonce 修复），被 `--since=2026-10-23` 边界恰好漏掉。NORDHEM 无 CSP（文档化缓期），该类不适用，但将 404 表面列入审计检查点。

现在读取审计技能并检查 e2e 进度：
e2e 仍在构建生产包。同时启动双代理审计（只读，不冲突）：
双代理审计完成。按 lesson-46 纪律，现在逐行复核 headline findings：
e2e 日志仍为空，检查进程状态：
后台进程被沙箱回收。改为前台运行 e2e（10 分钟超时）：
**e2e 基线 116/116 全绿**。验证 DB 零残留：
基线完整：lint 0/0 · typechecks 干净 · 169/169 unit · 116/116 e2e · 零残留（1379=种子量）。进入浏览器验证阶段：
运行移动端抽屉分类测试（8 项纪律）@390×844：
T1 通过。T2/T3：抽屉导航自动关闭 + 参数关闭回归：
T2 结果可疑（URL 未变）。重新验证——先快照抽屉内实际链接：
T2/T3 通过。T4/T5：Escape 关闭 + 切换：
T6 通过（display:none，0×0 矩形 —— 无 Tailwind v4 bug）。T7b/T8：水合交互 + 水平溢出：
**移动端分类 8/8 全过 — 无 Tailwind v4 bug**。现在 SEO/sitemap + 404 表面 + L-1 现场验证：
SEO 全部通过。现在现场验证 L-1（wishlist 徽章与标题的分脑）：
**L-1 现场证实**：标题诚实显示 "(1)"，但头部徽章显示 "2 items" —— 分脑真实存在。清理状态并验证 L-2 的第三处 `"tampines"` 字面量：
浏览器验证全部通过。现在为修复计划做设计侦察——docs-counts pin 机制、clampInt 语义、安静产品、wishlist 页面结构：
现在读 wishlist 页面与 F-8 现有 pin，完成 L-1 修复设计：
设计侦察完成。撰写 Task-131 修复计划：
计划已写入。执行前最后验证两处关键引用（route :95 有限过滤 + server-data :241）：
验证完毕（route :95 有限过滤确认 F-5 不可达性）。开始 TDD 执行。先读现有 mintIdempotencyKey 的 stub 模式以镜像其风格：
镜像既定 stub 模式。写 Slice A 的 RED 测试（orderNumber 后缀加密 pins）：
实现设计精化：4 字节 → uint32 → base36（保持 ~2^31 熵，恒定 6 字符）。修正测试块（stub 用 `vi.spyOn`，期望值手工推导）：
现在运行 RED 验证（当前代码应失败 3 项）：
**RED 已观察：3/3 失败**（优先级测试直接命中 utils.ts:166 的 Math.random）。实现 GREEN：
**Slice A GREEN（72/72）**。Slice B（F-2）：先写 fs-pin RED：
RED 已观察（2 处出现 → pin 失败）。清理测试文件的笨拙结构后实施 GREEN：
我新增的注释文本本身含该表达式字面量，被 pin 误计。改写注释措辞：
**Slice B GREEN（2/2，恰好 1 处出现）**。Slice C（F-3）：oversell spec 产品迁移：
注释文本含特殊字符导致精确匹配失败。用更小的唯一片段分步编辑：
第一次编辑已部分应用（注释已更新）。现在补上 slug 替换（4 行上下文消歧）：
Slice C 完成（wokhey tampines=9 < 99 ✓）。发现现有 F-8 pin 中一处损坏的选择器（`main aref=...]` 缺 `[h`）——一并修复。Slice D（F-1）：先写 RED：
再用小片段编辑（避开不可见字符差异）：
行 424 已含修复后的选择器——编辑实际已应用。检查当前 spec 块完整状态：
状态混乱——直接以行号定位当前真实内容：
od 与 rg 输出矛盾。直接 od 整行 423-425 确认字节真相：
输出互相矛盾——用 git diff 获取文件真实状态：
git diff 确认：仅 Slice C 落地，Slice D 未应用（od 显示系渲染误导——SKILL 教训 1 的重演，以 git diff 为准）。改用 Python 脚本精准应用 Slice D：
Python 精确匹配也找不到——显示层确实在撒谎。用 Python repr 获取字节真相：
行内容完全一致却匹配失败——检查行尾符：
**真相大白**：注释行实际缩进为 2 空格（`  //`），而所有显示工具都呈现为 4 空格——显示层统一撒谎。用正确缩进更新脚本：
显示层持续不可靠。放弃逐字匹配，改用基于行号的稳健脚本：
直接探测文件中可匹配的子串：
两次 Python 探测互相矛盾——怀疑有进程在修改文件。检查 mtime 与进程：
文件稳定（mtime 不变，无可疑进程）——这是 SKILL 教训 1 的“显示层撒谎”。改用完全绕开歧义区域的行级替换 + grep -c 数字验证：
过滤逻辑写反了（`must_not` 应为 `must_contain`）。修正：
Slice D pin 已落地（grep 计数验证：1/1/2）。运行该 spec 观察 RED（note 断言应失败）：
RED 已观察（1 failed）。确认失败断言为 note：
RED 精确确认（note 未找到）。实现 GREEN——wishlist 页面差异说明：
再给 Header 徽章补上设计语义注释：
**Slice D GREEN**。Slice E（F-5/F-6）：clampInt 换用 + ensureSeed 注释限定：
Slice E 完成。运行中间门禁（typecheck/lint/unit 应为 174）：
11 个失败应为 docs-counts 锁步 RED（预期中——文档仍写 169/9 文件，现实已是 174/10 文件）。确认：
全部 11 个失败均为 docs-counts 单元计数 pin（e2e pin 全过）——锁步机制正常。Slice F：先扩展 pin 至 DEPLOYMENT.md：
运行 pin 文件观察 DEPLOYMENT RED：
RED 确认。修复 DEPLOYMENT.md（gate chain + 版本戳 + XFF + dotenv + origin）：
origin 锚点未匹配（且脚本未写入——原子失败）。用 repr 探测实际文本：
再次显示层作祟。改用行级替换处理 origin 段：
dotenv 有 2 处（审计记录的 ：69 与 ：362）。两处都修：
探测所有 dotenv 行的实际措辞：
origin 段行换行与显示不符。探测实际行结构：
行结构定位错误（nordhem.sg 与 "is hardcoded in" 同行）。修正替换范围：
DEPLOYMENT.md 修复完成。验证新 pin 转绿（其余 docs 锁步 RED 保持至 sweep）：
Slice F 完成（DEPLOYMENT pin 绿，其余 11 个为锁步预期 RED）。代码切片全部完成。运行完整门禁（冷构建 + e2e 全套）：
**代码阶段全门禁通过**（冷构建 ✓ lint 0/0 ✓ 116/116 e2e ✓ 零残留）。进入 Slice H 文档锁步。先定位全部计数位点：
全部位点已定位。开始 AGENTS.md 锁步更新（计数 + 范围 + 措辞 + Task-131 pin 清单 + Pin map 节）：
CLAUDE.md 锁步：
frontmatter 无引号。修正锚点：
README.md 锁步（新 Task-131 段落 + 计数）：
PAD v1.16.0 锁步（修订块 + 计数 + 登记行）：
SKILL 更新前，按用户要求读取蒸馏技能：
按蒸馏模式更新 SKILL 前，先截图（代码已定型）。重启 dev server 并捕获 5 张新截图：
验证 5 张截图非空白（像素比纪律）：
视觉抽查关键截图 70（本周期唯一用户可见变更）：
DOM 验证三表面共存（标题(1) + note + 徽章2）。现在应用 SKILL v2.5.0 更新：
探针字符串未更新（替换本身已成功）。正确探针验证：
附录 B 行格式破坏了 pin 正则。调整为 "(176) — 10 files” 格式：
**docs-counts pin 22/22 全绿——六文档锁步恢复**。运行完整单元套件：
**176/176 全绿**。.env.example 契约无漂移。写 worklog Task-131 条目与 session_27 日志：
运行最终完整门禁（先停 dev server）：
**最终门禁全绿**。现在提交并推送。检查 git 状态与 SSH wrapper 用法：
Runbook 明确。先提交，然后通过 wrapper 推送（`--remote` 覆盖为强制）：
提交为 `6fef812`。无 ssh 二进制——按 Runbook 附录 A 设置 paramiko shim：
bin/ssh shim 已存在（上会话遗留）。准备密钥并验证：
干跑成功（`9e6ccc3..6fef812` fast-forward）。执行真实推送：
**Task 131 已交付并推送至 `main` 分支（`6fef812`，远端已验证，操作员密钥已安全销毁）。**

## 周期总结

**工作区与基线**：`git pull` → `9e6ccc3`；rootless PostgreSQL 17.12 经历沙箱回收后**仍在运行**（该系列首次无需 lesson-31 恢复），DDL + 种子量直接 SQL 验证（库存 1379 = 种子公式）；基线门禁全绿（lint 0/0 · 169/169 unit · 116/116 e2e 冷跑 · 零残留）。

**浏览器验证**：移动端抽屉 8/8 通过（390×844 + 1440×900，**无 Tailwind v4 bug**）、水合哨兵、sitemap 42 URLs、og:image 1200×627、404 表面品牌页正常。

**双代理审计 → 13 项发现，全部 TDD 先行修复**：
- **F-1（核心）** wishlist 计数分脑——F-8 修复只落了一半表面（徽章 "2 items" 对标题 "(1)"，浏览器实证）。徽章按设计保留 saved 计数，页面新增差异说明行，e2e 双表面 pin；顺带修复了 pin 中损坏的 `aref=]` 选择器（永久空转断言）
- **F-2** decrement 改用 `fulfilStore` seam + 新第 10 个单元文件结构性 fs-pin
- **F-4** orderNumber 后缀改用 crypto 字节（uint32→base36，恒 6 字符，~2³¹ 熵）
- **F-3** oversell 探针 katong→wokhey 消除 fullyParallel 残留窗口
- **F-7/F-8** DEPLOYMENT.md 计数腐烂（79/34）与 XFF 首跳误导——docs-counts pin 扩至第六文档
- 参考仓库边界日提交 `ff65bd2` 已评估不适用（NORDHEM 无 CSP，404 已实证正常）

**最终门禁**：lint 0/0 · typechecks 干净 · **176/176 unit** · **116/116 e2e（冷跑）** · **零 DB 残留（种子量验证）**。文档六件套 + SKILL v2.5.0（新增教训 51-52）+ AGENTS Pin map 节 + worklog + session_27 + 计划归档 + 5 张截图（70-74）全部锁步，`.env.example` 契约无漂移。

**后续建议**：常备缓期清单（TRUST_PROXY、CSP、jsdom 层、store-picker 接线）仍待未来周期；另发现本会话显示层多次错误渲染字节（SKILL 教训 1 复现）——建议后续代理优先使用行号定位 + grep 计数验证编辑锚点。
