我将开始执行这个全面任务。首先检查工作区状态并刷新仓库。
仓库已克隆。让我建立任务清单并开始评审文档。
仓库最新提交为 Task 122。现在评审核心文档。
Sessions 9/10 记录了 Task 122 的交付。现在读取 task122 修复计划和 worklog 尾部。
现在查看 README、SKILL.md 结构与技能目录。
项目状态已理解。现在开始 Task 123 周期。先并行启动 npm install 并读取关键技能。
技能已读取。之前的会话已将 PG 安装到 `/home/z/my-project/pg`(repo 契约:端口 5432,postgres/app_db)。检查其状态。
PG 已安装但未运行。启动它并验证数据库契约。
PG 数据目录似乎有损坏(pg_notify 目录缺失)。检查数据目录完整性。
数据目录缺少 initdb 创建的空目录(沙箱重置时丢失)。重建它们。
还缺 `pg_logical` 子目录。递归重建所有缺失子目录。
PG 已恢复运行。验证数据库状态和 npm install 进度。
psql 挂起。检查 PG 日志是否有问题。
DB 就绪但需要密码(scram TCP)。使用 PGPASSWORD 重试。
9 张表完好。检查种子数据和 npm install。
PG 完全恢复，种子数据完整(24/8/72/3/6/3/5)。等待 npm install,同时克隆参考仓库并读取审计技能。
npm install 似乎已完成。验证并运行基线检查。
基线 lint/typecheck/unit 全绿。现在后台启动 e2e 基线并检查 Playwright 浏览器。
缓存中是 chromium-1200,而 repo 锁定版本需要 chromium-1255。安装固定的浏览器版本。
e2e 基线运行中。同时读取 web-application 技能的审计方法论。
审计方法论已掌握。检查 e2e 基线进度，然后并行委派深度审计。
参考仓库已克隆。现在并行委派两个 Explore 代理：深度代码审计 + 参考仓库评审。
两个审计均已返回：16 项发现(2 MEDIUM / 10 LOW / 4 INFO)+ 参考模式。检查 e2e 基线并逐行验证关键发现。
Task-122 的 inventory unique 约束 e2e 在基线失败了。调查原因 — 检查数据库索引状态。
**基线发现**： 活动数据库缺少 Task-122 的 inventory unique 索引 — pgdata 快照早于索引推送。检查 schema 并重新推送。
确认：schema 定义了 `inventory_product_store_uq`,但恢复的 DB 快照早于索引推送。同时 e2e 基线运行留下了新的 journey 残留(23:39 的订单)— 正是审计发现 M-1 的实时例证。重新推送 schema 并检查库存漂移。
索引已恢复。现在检查 makan 库存漂移(每次 e2e journey 都会扣减)。
种子按 `p.id` 派生各店库存。查询 MAKAN 当前库存与种子值的漂移。
MAKAN tampines 漂移了 4 单位(种子 24 → 现在 20)。检查 e2e 是否有库存值 pin,然后清理所有残留。
无硬性库存数量 pin(availability 派生)。写清理脚本：重置库存到种子公式值 + 删除所有测试订单残留。
DB 基线已清洁。重跑 F-12 e2e 确认索引修复，同时逐行验证审计发现。
M-2 已在行级验证(第 25 行的 "applied" 消息与第 61 行的 effectivePromo 门控矛盾)。批量验证其余发现。
L-1、L-2 已验证。继续验证 L-3 至 L-10。
M-1 已验证：journey spec 无任何清理。检查 F-12 重测结果和文档声明 L-6/L-7。
所有审计发现已验证。现在启动 dev server 并用 agent-browser 检查移动端导航(用户特别关注项)。
页面已加载。执行移动端抽屉分类测试：打开菜单。
抽屉正常打开。测试导航+自动关闭。
导航+自动关闭通过。测试 Escape 关闭和 toggle。
Escape 和 toggle 通过。桌面视口检查 hamburger 隐藏。
移动端导航分类全部通过，无 Tailwind v4 bug。验证 hydration 和 SEO 端点。
Hydration 验证通过(购物袋徽章实时更新)。现在浏览器复现 M-2(购物车促销消息矛盾)。
购物车仍是 1 件 — eval 点击未生效。使用正确的 ref 交互。
促销已应用($258 > $150 门槛)。现在降到 1 件($129 < 门槛)复现 M-2 矛盾。
**M-2 已在浏览器复现**：$129 袋子上 "WELCOME10 applied" 消息与消失的折扣行矛盾。检查 utility strip 和 SEO 端点。
Utility strip(374<390)和 robots/sitemap 均正常。验证 sitemap 无 lastModified、无 order 页。
所有证据已收集。更新任务清单，然后细读需要修复的文件以设计方案。
读取 checkout 页面的 SLOTS 定义和现有 e2e 的冻结计时器模式，为方案设计做准备。
读取 checkout route 的 placeOrder 流程、catalog 的 findPromo、utils 的 orderNumber、cart-store 的 promo 验证器。
读取 sgTomorrowISO(为 orderNumber SGT 修复建模)和 health e2e pin。
验证 F-5 的探测词(categorySlug 是否真的从 API 搜索中遗漏)。
F-5 证实："outdoor" 文本命中 0,类别命中 2 — API 召回确实分歧。读取 PDP 页面设计 F-10。
读取 ReviewSection 组件了解标题计数派生方式。
所有设计输入已就绪。现在编写 Task-123 修复计划。
计划已写入。开始执行 Slice 1(journey 清理 + Reviews regex + promo 清除 RED)。先看 oversell 清理模式。
实施 Slice 1。先改 journey spec(清理 + promo RED 断言 + Reviews regex)。
修改正确。停止 dev server(避免 .next 冲突)，运行 journey spec 观察 F-6 RED。
**F-6 RED 确认**(promo 残留 "MAKAN15")。实现修复：clear() 同时清除 promo。
检查 clear() 的所有调用方，确保清除 promo 不会破坏其他流程。
唯一调用方是 checkout 成功路径。重跑 journey spec 验证 GREEN + 零残留。
清理生效(orders:0, makan:24)但测试仍失败。查看失败原因。
发现 spec bug:localStorage 中存的是字符串 "null"。检查 local-store 的持久化逻辑。
持久化契约是 JSON.stringify(null)="null" 字符串 — 修复 spec 断言为解析后的值。
**Slice 1 GREEN**:journey 通过 + 零 DB 残留。开始 Slice 2(F-2 促销真值)：先写 `findPromoMinimumCents` 的 RED 单元测试。
在 effectivePromo 块后追加 `findPromoMinimumCents` 的 RED 单元测试。
单元测试 RED 状态确认（3 个失败）。在 `catalog.ts` 中实现 `findPromoMinimumCents`。
实现 cart 页面的诚实消息逻辑。先看 promoMsg 的渲染部分和 imports。
现在写 e2e RED spec(在 cart 未改 rewiring 前观察 RED)。找到合适的插入位置。
在 F-5 spec 后追加 F-2 e2e RED spec。
**F-2 e2e RED 确认**。现在重写 cart 页面的消息派生逻辑。
**Slice 2 GREEN**(3/3 通过)。开始 Slice 3(F-3 边界 + F-9 health 信封)。先写 isValidDeliverySlot 单元 RED。
编写 F-3 + F-12 的 RED 单元测试。先检查 tsconfig 的索引访问设置。
检查第 118 行的真实字节(已知的 `[m` 显示陷阱)。
这是已知的 `[m` 显示陷阱 — 用字符码验证真实字节。
字符码证实文件完好(`{SLOTS[method]` — 显示层吃掉 `[m`)。现在写 F-3/F-12 的 RED 单元测试。
6 个 RED 确认。在 utils.ts 实现两个接缝。
单元 GREEN(46/46)。现在重新接线 checkout 页面与路由。
写 F-3 e2e spec(放在 Task-121 F-7 边界块后)。先读该块模式。
检查现有 e2e 中所有 checkout POST 的 deliverySlot 值是否与新验证兼容。
三处现有 spec 发送 "Click & Collect — today 2pm"(不在 click-collect 槽位集内)。检查它们期望的结果。
三个探针 payload 用了 UI 从不发送的槽位值(早于 Task-119 F-22 的槽位集，因无一致性校验而未更新)。将它们对齐到真实槽位 "Today 2pm"。
第 4 处是 storeSlug 探针(storeSlug 检查先于槽位检查，仍以正确原因通过)。统一对齐全部 4 处。
现在添加 F-3 e2e spec,并通过 git stash 诚实观察 RED。
验证 placeOrder 的递减来源(express 应递减 tampines)。
递减源确认。用 git stash 观察 F-3 的诚实 RED。
**F-3 RED 确认**(junk slot → 201)。恢复修复后运行 GREEN。
两个 spec 通过，但 RED 运行留下了残留订单(正是 gotcha #13)。清理并加固 junk spec 的防御性清理。
残留已清。实施 F-9(health 信封)。先检查 docker-compose 的 healthcheck 消费方式。
docker-compose 的 healthcheck 是 pg_isready(不消费应用路由)。实施 F-9 路由 + pin + 文档三处更新。
F-9 GREEN。Slice 4:F-5(API 召回)+ F-4(搜索错误框)。先写 F-5 e2e RED。
验证 balcony & outdoor 类别的两个产品 slug。
修正 spec 的预期 slug(veranda-balcony-set / monstera-planter-duo)。
**F-5 RED 确认**(q=outdoor 返回 0)。实施 API 过滤器修复。
F-5 GREEN。F-4:读取 Task-121 F-1 的冻结 debounce spec 模式。
编写 F-4 e2e spec(冻结 debounce + 路由中止模式)。
**F-4 RED 确认**。实施修复：错误框门控对齐 settledFor。
仍失败。检查是哪个阶段。
`.first()` 抓到了 header 的搜索框(页面上有三个 "Search products" 输入框 — 已记录的陷阱)。作用域改为 #main。
**F-4 GREEN**。Slice 5(F-10 reviewCount 饱和)：先写 e2e RED spec。查 HAVBRIS 的 product id。
在 Task-121 F-6 块后追加 F-10 spec(21 条探针评论 → 计数 21)。
**F-10 RED 确认**(标题显示 20 而非 21)。实现 getReviewCount + ReviewSection total prop。
更新 PDP 页面与 ReviewSection 组件。
**F-10 GREEN**(3/3)。Slice 6 小接缝：F-13(promo 验证器长度)先写 RED。
实现 F-13:导出 `isValidPromoPayload` 验证器(镜像写边界 32 字符上限)。先写 RED。
F-13 GREEN。F-7:修复两个错误边界的 digest 对比度。
F-7 完成。运行全量单元 + 类型检查 + lint,统计新测试总数。
修复 F-10 spec 的类型标注，并查看 15 个失败(应为 docs-counts pin 的 working-red)。
docs-counts pin 处于 working-red(按设计)。统计真实测试总数。
新总数：**128 unit / 78 e2e**。运行完整 e2e 套件验证整体 GREEN。
**e2e 78/78 GREEN**。验证全量运行后 DB 零残留。
零残留确认。开始 Slice 7 文档锁步。先定位所有计数声明位置。
查看 docs-counts pin 的检查模式，确保扫清所有 live-tense 声明。
理解了 pin 的精确模式。开始逐文件扫描 — 先 AGENTS.md。
probe 匹配 — 失败的应该是 g13 断言。检查 g13 块的精确字节。
找到原因：续行有 3 个空格缩进。修正后重扫 AGENTS.md。
将 README 的当前周期段落替换为 Task 123 描述。
结束标记是反引号而非引号。修正后重试。
现在扫描 CLAUDE.md(计数 + F-8 ARIA/cn 修正 + Task-123 接缝段)。
CLAUDE.md 的 ARIA 替换未生效(换行不匹配)。检查实际字节并修复。
探针在 `role=` 后缺少闭合反引号。修正后完成替换。
现在扫描 PAD(修订块 v1.8.0 + 计数 + 登记行)。
查找 delivery-decrement 递延行以补充会计漂移后果，并追加 Task-123 登记行。
行内是未转义的 `||`。修正脚本。
PAD 完成。现在更新 SKILL.md(v1.7.0)。先看其结构。
**128/128 unit GREEN** — 五份运维文档计数全部锁步。现在追加 worklog Task 123 条目。
Worklog 完成。运行最终全量门禁(冷构建 + e2e)。
**全量门禁 GREEN**(128/128 unit · 78/78 e2e · 零残留)。现在清理 .next、启动 dev server 并用 Playwright 脚本捕获变更表面的截图。
7 张截图全部非空白。视觉验证关键的新 UI 状态(23 — 诚实通知)。
改用 agent-browser 的 DOM 验证替代(确认通知文本真实渲染)。
浏览器验证两种渲染状态完全正确。清理浏览器袋状态，验证 .env.example,准备提交。
无密钥泄露。最终提交前再做一次完整检查并提交。
已提交 `c3c1fb3`。现在读取 SSH wrapper 使用说明并执行 push。
无系统 ssh — 使用工作区 bin/ 中的 paramiko shim(附录 A 模式)。
paramiko shim 就绪。物化密钥(仓库外，0600)、验证指纹、dry-run。
Dry-run 通过(71b60d8..c3c1fb3 快进)。执行真实 push。
**Push 已验证**(remote main @ c3c1fb3 == local HEAD)。销毁密钥并独立验证。
独立验证通过(remote main @ c3c1fb3)。写 session_11.md 并作为后续提交推送。
**Task 123 complete — both commits pushed to `main` and remote-verified (`c3c1fb3` fix + `ec107cd` session log).**

## What was done

**Setup & baseline** — Fresh clone (`71b60d8`); all five operator docs + session_9/10 + the Task-122 plan reviewed against the codebase. Rootless PostgreSQL 17.12 restored, with two snapshot-loss discoveries fixed: the Task-122 `inventory_product_store_uq` index was missing (F-12 e2e failed at baseline 71/72 → re-pushed → green), and initdb empty directories were lost (recreated; new SKILL lesson 31). Baseline residue cleaned: 8 stale probe orders deleted, makan stock restored to seed values.

**Audit** (web-application skill + homenest-store-s reference) — 16 findings, every headline verified at line level; the cart promo-message contradiction browser-reproduced live. Mobile drawer taxonomy: **ALL PASS** (open/navigate+auto-close/Escape/toggle/hamburger-hidden≥1024) — **no Tailwind v4 bug**; hydration, utility strip, sitemap (42 indexable URLs, no lastModified) and robots all verified.

**TDD remediation** (12 fixes + 2 register notes, plan archived in `docs/plans/`):
- **F-1**: flagship e2e journey now self-cleans (order + inventory restore) — the suite runs residue-free, verified by direct SQL after the full run
- **F-2**: `findPromoMinimumCents` + honest below-minimum notice ("WELCOME10 needs a $150.00 minimum") — the message no longer contradicts the hidden discount row
- **F-3/F-9**: shared `DELIVERY_SLOTS` seam with boundary coherence validation; `/api/health` aligned to the standard envelope
- **F-4/F-5**: search error box settled-gated; API recall parity (categorySlug)
- **F-6/F-10/F-12/F-13**: promo dies with its order; true review count (`count(*)`); SGT order-number dates; 32-char promo predicate
- **F-7/F-8/F-11/F-14**: digest contrast, docs claim accuracy (real ARIA stance, `cn` dropped), regex-accepted review pin, PAD register notes

**Gates**: lint 0/0 · typechecks clean · **128/128 unit · 78/78 e2e** · cold build 29 routes · zero DB residue · 7 fresh screenshots (`docs/screenshots/23–29`) · docs lockstep across all five docs (PAD v1.8.0, SKILL v1.7.0) · `.env.example` verified. Push executed via the SSH wrapper with the mandatory `--remote` override, verified independently, and both key copies shredded.

The deferred register (store-picker wiring, delivery decrement redistribution, unthrottled GETs, xff posture) remains documented for a future cycle.
