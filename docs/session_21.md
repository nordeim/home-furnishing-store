我将开始执行这项全面的审计→修复→测试→文档→交付工作流。让我先制定任务计划并检查工作区。
仓库已克隆。现在正在读取核心文档：
Reading README, Architecture Document and SKILL:
正在阅读 Project_Architecture_Document.md 和 home-furnishing-store_SKILL.md：
Now reading the session logs and task126 plan:
我现在已经了解了完整的情况：任务 126 已在 `33dea5e` 完成，当前周期为任务 127。让我阅读 task126 计划和技能目录，然后并行开始安装和 PostgreSQL 的设置。
现在，让我同步开始 `npm install` 并设置 `PostgreSQL`。首先，检查技能目录：
正在设置 PostgreSQL。我先检查一下配置脚本和 rootless-postgresql 技能：
数据库快照丢失了子目录（已记录的 skill lesson 31 陷阱）。让我查看一下 `rootless-postgresql` skill 以获取恢复步骤：
快照导致 9 个运行时子目录丢失。根据 Task-125 的先例进行恢复——从全新的 `initdb` 模板中重新创建这些目录，同时保留数据：
The subdirs are restored and the log suggests the server started. Let me verify:
`pg_tblspc` 也缺失了。正在恢复它并重新启动：
`pg_logical` 子目录在嵌套时也缺失了。正在执行全面的递归 no-clobber 合并：
PostgreSQL 正在运行。正在验证数据库契约和状态：
数据库完全匹配 Task-126 记录的结束状态：9 个表，零残留（0 个订单 / 5 个种子评论），且所有 Task-126 DDL 均完好无损（`orders_idempotency_key_unique`、`reviews_product_idx`、`inventory_product_store_uq`，无冗余的 `products_slug_idx`）。正在检查 npm install：
安装完成 (420 个包)。PostgreSQL 已根据合约准备就绪。正在更新 TODO 状态并运行基准检查：
Lint 0/0，typechecks 已通过，156/156 个单元测试。现在正在检查 Playwright chromium 的情况（文档中提到的陷阱）：
已确认的陷阱再次出现：缓存中是 chromium-1200，但 Playwright 1.65 需要 1255。正在后台安装，同时我开始进行审计：
该仓库偏离了 skill 的栈（根据设计采用 Drizzle/无 auth），因此适用审计方法论。让我检查一下具体的 Task-126 变更集（最近的代码变更）：
现在我将并行启动两个审计 agent（深度代码审计 + 参考仓库审查），同时我会亲自进行浏览器验证：
两次审计均已完成，审计结果报告非常扎实。按照既定的规范要求，在开始规划前，我必须在代码行级别重新验证每一项主要发现。让我先检查一下 `chromium` 的安装情况，然后再进行验证：
现在我来在行级验证主要发现 —— M-1（PDP &amp; 回归）：
M-1 已验证 —— 属实：可见的回归问题。现在验证 M-2（checkout String 强制转换）：
M-2 verified with executed proof. Now L-1 through L-4 and the L-6/L-7 docs claims:
现在验证 R-1 和 R-2 的参考发现：
所有主要发现均已验证。让我检查一下其余细节 —— `route` 的 `refusal mapping`、`family copy`、`DEPLOYMENT.md`、`campaignEnd`：
DEPLOYMENT.md 已经涵盖了 I-4 —— 拒绝该发现。现在检查 e2e baseline 的进度和 storefront spec 的 hydration scope：
**E2E 基线：104/104 已通过。** 所有基线检查门均已通过。正在验证零数据库残留并确定 hydration-gate 的作用域：
无残留（0 个订单 / 5 个种子评论）。基准线完全绿灯：**lint 0/0 · typechecks clean · 156/156 unit · 104/104 e2e · zero DB residue**。现在开始 dev-server 浏览器验证（移动端导航分类法 + Tailwind v4 检查）：
Test 1 PASS (drawer opens, aria-expanded=true)。Test 2: navigate + auto-close:
测试 3 通过（F-7 参数关闭保持）。测试 4-5：Esc 关闭 + 切换：
测试 4-5 通过。测试 6：桌面端 ≥1024px 时隐藏汉堡按钮：
Test 7 PASS (hydration live). Test 8: utility strip + live verification of the M-1 `&amp;` regression:
M-1 已在浏览器中实时确认。现在进行 SEO/sitemap 检查：
Mobile drawer taxonomy 8/8 PASS — no Tailwind v4 bug. All verification complete. Now writing the Task-127 remediation plan:
Plan written. Starting **Slice A (F-1)** — e2e RED first for the PDP `&amp;` regression. Finding the right spec location:
Adding the F-1 e2e pin (RED first):
现在观察针对 F-1 的 RED。开发服务器正在运行——直接用它来测试 RED：
SSR HTML 确认了该 Bug。正在针对生产构建运行 spec RED：
RED 已观察到。现在进入 GREEN 阶段 —— 修复模板字面量：
F-1 GREEN。**Slice B (F-2)**：checkout typeof 校验。正在查找 sibling typeqty 规范以进行扩展：
在 typeqty 块之后添加 F-2 探测（使用 shared net）：
RED 状态已确认 (201 → 应为 422)。GREEN 状态 — 向 checkout 路由添加 typeof 类型保护：
现在是 deliverySlot 的守卫（在它的 String-coercion 默认值之前）：
F-2 GREEN。**F-3**：`?max=` 保护。首先添加 e2e RED：
F-3 GREEN. **Slice D (F-4)**：衍生文案补全。首先找到 GST e2e pin：
现在开始实现 F-4 衍生文案。先检查每个站点的当前 imports：
Applying all F-4 derivations:
接下来是 Footer、offers 页面和 family 页面：
现在 family 页面 (3处):
现在更新这两个 e2e GST pins以进行派生（Task-124 F-14 模式）：
仅剩一个文档注释（非面向用户）——没问题。正在运行受影响的 spec 以确认 F-4 GREEN：
F-4 GREEN (12/12)。**Slice E (F-5)**：replay 所有权。正在查找幂等性 spec：
在 replay test 之后添加 F-5 replay-ownership probe：
RED 状态已确认 —— 被劫持的重放收到了 200 和受害者的订单号。GREEN 状态 —— 实现 email-bound 重放 + hoist：
实现 email-bound replay 和 hoist：
现在移除旧的 `in-place` `fast-path` 并更新 `23505` `race catch`：
旧的 fast-path 已成功移除。现在正使用 ownership gate 更新 race path：
劫持现在已正确拒绝，但空购物袋重放得到 422。正在检查路由的空购物袋处理：
路由在 placeOrder 被调用前拒绝了空包。将 key 提取提前，并让规范重放处理 key 的情况：
现在移除旧提取位置处重复的 key 提取：
F-5 GREEN（所有 3 个幂等性规格）。正在验证 boundary 同级节点是否仍通过：
所有同级用例已通过。**Slice F (F-6)**：mint fallback。正在读取现有的 mint pins：
正在添加 F-6 单元测试（优先进行 RED）：
RED 已观察到 (`kmwn8ho0ize229nqn` = Math.random 路径)。GREEN — 实现 crypto 回退：
15 个失败全部是 `docs-counts` 锁定 —— 这是预期的进行中的红灯（docs 同步在最后进行，与 Task-126 模式相同）。正在验证 F-6 本身是否通过：
F-6 GREEN. **Slice G (F-7)**：campaignEnd SGT 准则。正在读取现有的 pins：
检查 PDP 的 `priceValidUntil` 组合和 `e2e` pin，以设计一致的修复方案：
正在添加 F-7 单元测试（红色优先）：
RED 已确认。GREEN 状态 — 在 `utils.ts` 中实现 SGT 活动：
现在更新 PDP 的 `priceValidUntil` 以渲染 SGT 日历日期（而不是 UTC）：
更新 e2e priceValidUntil pin，以相同方式导出确切日期：
F-7 GREEN。**Slice H (F-9)**：针对 20 个交互优先规范的 gotoHydrated 转换。重新识别（行号已发生偏移）：
转换已完成，且 `typechecks` 也已通过。正在运行完整的桌面端测试套件作为中间检查点：
100/100 桌面端已通过。**Slice I (F-8 + F-10)**：docs-truth 清理 —— dotenv 归因 ×5：
已清除 Dotenv。现在进行文档同步——首先获取准确的 fs 计数：
已确认 Fs 实际情况：**161 个单元 / 108 个端到端 (e2e)**。现在开始清理所有五个操作文档：
Docs-counts 已通过 (20/20)。正在编写 PAD v1.12.0 修订块：
接下来是 AGENTS.md 中 Task-127 的 pin 列表：
现在处理 CLAUDE.md 中 Task-127 的衔接段落：
现在是 README 中 current-cycle 段落的内容：
现在正在更新 `SKILL.md` —— 新的课程和版本号升级：
SKILL.md 已更新至 v2.1.0，并新增了第 42-44 课的内容。正在撰写 worklog Task-127 条目：
现在进行最终的完整校验。Lint、类型检查、单元测试：
冷构建已通过。完整的端到端（e2e）套件（两个项目）：
**全量验证通过：lint 0/0 · 类型检查无误 · 161/161 单元测试 · 108/108 端到端测试（冷启动） · 无数据库残留。** 现在正在捕获已修改表面的截图：
所有 6 张截图均已验证无空白。正在检查 .env.example 的契约并写入 session_20.md：
正在检查 SSH wrapper 的手册以进行推送：
已了解操作手册 —— 此仓库必须使用 `--remote` 参数进行覆盖。正在检查沙箱中的 ssh 二进制文件：
No ssh binary — deploying the Appendix A shim. First install paramiko:
Shim 已就绪。现在正在提交任务 127 的更改集：
已在 main 分支提交了 `ac93496`，工作区干净。现在正在设置用于推送的 SSH 密钥（在仓库外部，权限为 0600）：
Dry-run 状态为绿色（已认证，处于 fast-forward 状态）。正在执行正式推送：
推送已独立验证 — 远端 main = `ac93496` = 本地 HEAD。Key 已销毁。最终验证与收尾：
**任务 127 已完成 — 已推送至 `main` 分支 `ac93496`，并独立验证了远端，密钥已销毁。**

## 周期摘要

**设置与基准**：全新克隆至 `33dea5e`；通过恢复快照丢失的 initdb 运行时子目录（对 `base/`/`pg_wal` 进行无覆盖递归合并 — SKILL lesson-31 类；DDL 完好），复原了 rootless PostgreSQL 17.12；所有五个操作员文档和会话文档已验证。基准检查通过：**lint 0/0 · 156/156 unit · 104/104 e2e (cold) · 零 DB 残留**。

**实时浏览器验证 (agent-browser)**：移动端抽屉分类 8/8，位于 390×844/1440×900，包括 F-7 参数关闭回归检查 — **无 Tailwind v4 错误**；水合实时验证；站点地图 42 个 URL / robots 一致。

**审计**（深度扫描 + homenest 参考；每个标题均在行级别重新验证，M-1 在浏览器中确认，M-2 通过执行强制转换证明再次证明）：10 项发现，2 项以证据否决。homenest：自 2026-10-23 以来零新增 src/tests（7/7 次提交仅涉及 skills）— 移植了其重放所有权和 `getRandomValues` 生成规范。

**TDD 救助**（在每次更改前观察到 RED）：
- **F-1 MEDIUM** — Task-126 实体回归：每个 PDP 都渲染了 "Click &amp; Collect"（模板字面量不会解码实体）
- **F-2 MEDIUM** — checkout 自由文本 String() 强制转换：一个数组类型化的 payload 成功下单 (201)；现在为 422
- **F-5** — 仅持有的重放向泄露的密钥泄露了受害者的订单号；现在受电子邮件绑定（两条路径）+ 在验证前提升的快速路径
- **F-3/F-4/F-6/F-7** — `?max=` 守卫，13 个派生复制站点 (GST/threshold/FLAT20/family)，加密 mint 回退，campaignEnd 在新加坡日历上
- **F-9** — 21 个交互优先的 e2e 块通过 `gotoHydrated` 进行路由

**已交付**：lint 0/0 · **161/161 unit · 108/108 e2e (cold)** · 零残留 · 6 张截图 · `.env.example` 合约已验证并提交 · 文档同步 (PAD v1.12.0, SKILL v2.1.0 第 42–44 课) · 计划 + 工作日志 + session_20。
