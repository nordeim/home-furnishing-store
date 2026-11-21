本会话从 session_47 之后继续（工作区完整保留：仓库在 `f43c960`，node_modules 与 Chromium 不变，`pg/` 树存活但 postmaster 已僵死）。先处理环境，再走完整工作流。

工作区刷新：`git fetch` 发现远端领先 1 个提交（用户添加的 session_47 日志）→ fast-forward 到 `f43c960`。五份根文档 + session_46/session_47/task140 计划/worklog 精读完毕，对照代码库验证。

环境恢复的第一个陷阱：PostgreSQL 进程在沙箱回收后"名存实亡"——`pg_isready` 回答 accepting connections，但任何真实查询都挂死（psql 需要 timeout 强杀）。kill 僵死进程后用幂等的 `docs/setup_pg_z.sh` 重启（数据目录完好，无需 initdb），直接 SQL 验证种子（24/8/3/72，reviews 5，inventory 1379，零残留）。

基线门控全部复绿，与文档记录完全一致：lint 0/0 · typechecks ×2 · 205/205 unit · 137/137 e2e（冷生产构建）· 运行后零残留。参考仓库 homenest-store-s 静默（第十七次"无需移植"）。

审计：一个深度代码 subagent（0 CRITICAL / 0 HIGH / 0 MEDIUM / 3 LOW / 8 INFO）+ 逐行人工复核（lesson-46 纪律）。Task-140 的六处修复全部干净、无回归。可执行发现：F-1 LOW Header 商店选择器默认值是手抄的显示标签 "Tampines"（F-3 类的第 6 个站点，大小写敏感的 pin 对它失明）；F-2 LOW checkout 成功路径在 clear() 之后插值未校验的 `orderNumber`（违约信封会清空购物袋并导航到 /order/undefined）；F-3 LOW track-order 成功渲染在嵌套字段上崩溃；F-4 INFO-promoted 无 CSP 头；F-5 INFO 恢复性 refetch 缺 no-store；F-7 INFO 十一个死导出关键字。延迟登记册裁决：TRUST_PROXY 可晋级（验证过的直连部署 XFF 轮换绕过），GET 节流维持延迟（无昂贵 GET；页面同样未节流——部分覆盖），完整 nonce CSP 维持延迟（静默无水合陷阱），jsdom 维持延迟。

浏览器审计（agent-browser，生产服务器）：第二个环境陷阱在此爆发——手工 `next start` 未钉 env 时，Next 从工作区父目录的沙箱残留 `.env`（`DATABASE_URL=file:/home/z/my-project/db/custom.db`）取值，中毒的服务器以静态目录降级模式运行：/api/products 200 返回"看起来真实"的数据而 /api/health 诚实地 500。诊断靠三件套：/proc/PID/environ（进程 env 里的 SQLite URL）、health/products 分歧（降级签名）、仓库内本无 .env。残留文件已隔离，干净重启以 health 200 + environ 复核。第三个陷阱：`pkill -f "next start"` 杀不死真名 `next-server` 的进程——孤儿进程占据 :3100，下一个启动实例死于 EADDRINUSE，混合日志让幸存者看起来像新实例。

在健康服务器上重跑分类学：移动抽屉 8/8 PASS（条件挂载模式成立，无 Tailwind v4 display bug；F-4 光标修复实测 pointer；19 条路由 390px 无横向溢出；水合与徽章语义干净复现——最初一次 0→2 观察是 eval 伪影，清存储后单次复现为 0→1）。SEO/站点地图实测复核：42 URL、robots 一致、noindex ×6、OG 1200×627、JSON-LD 完整、安全头齐全——无 CSP（F-4 的证据）。

计划：docs/plans/2026-11-21-task141-remediation-plan.md（发现 → ToDo、测试接缝、执行顺序；F-6 层级位置与 F-8 方法盲默认值评估后登记不折腾）。

TDD 执行（每个行为变更前观察到 RED；七个切片）：
- A（F-1）：第 4 消费者 fs-pin TRUE RED → `storeName(STORES[0].slug)`（今日字节等价）+ 注释同步改写 → GREEN。
- B（F-2）：路由兑现 e2e 探针 TRUE RED（导航到 /order/undefined）→ `typeof orderNumber !== "string"` 在 clear()/导航之前加入拒绝集 → GREEN（scoped 警报 + URL 停留 + 购物袋保留）。
- C（F-3）：路由兑现探针 TRUE RED（渲染崩溃）→ 嵌套形状门（order?.orderNumber 字符串 + items 数组）→ GREEN。
- D（F-4）：security-headers 规范扩展 TRUE RED（头缺失）→ 四指令 reduced CSP 进入 next.config.ts（刻意不含 default-src/script-src/img-src——nonce CSP 维持延迟）→ GREEN。
- E（F-5）：fs-pin TRUE RED → refetch 加 `{ cache: "no-store" }`（Task-140 F-1 pin 的正则按前缀形式同步放宽）→ GREEN。
- F（F-7）：十一个关键字摘除（外部引用普查各为 0；typecheck 门控即载体）。审查中发现 sed 漏了 rate-limit.ts 的两个——在 G 切片补齐（教训：机械清扫要用原始发现清单复核，不能只信编译器绿）。
- G（TRUST_PROXY——本周期头条晋级）：三门测试矩阵（unset → 即使有 XFF 也 direct；非 "1" 值 → direct；"1" → 最右跳）——两个 fail-closed 成员 TRUE RED，晋级行为 pin 按设计 GREEN-on-arrival（变异诚实）→ clientIp 门（调用时读取 env）+ 两个既有 XFF pin 重包装于 vi.stubEnv 之下 + playwright webServer.env 钉 TRUST_PROXY:"1"（16 个 XFF 身份探针保住各自桶）+ .env.example 注释块（绝不成为活动赋值）+ env-doc pin 锁步（"唯一变量"表述改为"唯一必需变量"）→ GREEN。

截图 120-124（dev server）：主页、聚焦的商店选择器（派生默认值）、track-order scoped 错误面、checkout 接缝派生默认值、390×844 移动抽屉。全部验证非空白（22-73% 非白）；120/121 首次字节相同，以聚焦环重新区分（951 像素差异）。

六文档锁步（docs-counts pin 从 18 红清零）：AGENTS（211/140、Task-141 pins 段落、8 条新 Pin map 行、gotoHydrated 51/53）· CLAUDE · README · PAD v1.26.0（修订块 + 计数位 + env 表新增可选 TRUST_PROXY 行）· SKILL v2.15.0（frontmatter、门链、lessons 71-72：成功路径插值字段必须在副作用前校验的类 + XFF 信任必须显式声明且 fail-closed 的类、Appendix B 26 计划/125 PNG/132+8）· DEPLOYMENT（门链 + TRUST_PROXY 注记）· .env.example 更新（注释的可选 TRUST_PROXY 块——诚实默认保持未设）。

最终门控：lint 0/0 · typechecks ×2 · **211/211 unit × 3 时区** · **140/140 e2e**（冷构建，TRUST_PROXY=1 webServer env）· 零 DB 残留（orders 0，order_items 0，reviews 5，inventory 72 @ 1379）。

计划附录记录了 7 项执行发现，包括：e2e 计数差 3 而非 2（CSP pin 是新测试——文档按 fs 现实清扫）；gotoHydrated 差 3（F-2 探针带两个调用点）；父目录 .env 陷阱；pkill 模式不匹配 next-server；僵死 postmaster 对 pg_isready 说谎；字节相同的截图对；以及 sed 清扫漏文件。

**Task-141 已交付——所有门控绿。**

本周期总结（Verified / Reasoned / Assumed）：

**基线（全部 Verified）**：fast-forward 到 `f43c960` · 僵死 postmaster 幂等重启（种子直接 SQL 验证）· 基线门控 205/205 + 137/137 与文档一致 · 参考仓库静默（第十七次）。

**审计 → 3 LOW + 3 INFO 修复 + 2 项登记册晋级（全部 TDD，TRUE RED）**：
- **F-1 LOW** — Header 商店选择器默认值经由显示接缝派生（第 6 个手抄站点关闭）。
- **F-2 LOW** — checkout 成功信封门到达 orderNumber 字段（refuse 先于 clear()/导航）。
- **F-3 LOW** — track-order 嵌套形状门（scoped 错误而非渲染崩溃）。
- **F-4 INFO 晋级** — reduced CSP 四指令（登记册 CSP 拆分的晋级半；nonce 半维持延迟）。
- **F-5 INFO** — 恢复性 refetch no-store。
- **F-7 INFO** — 十一个死导出关键字退役。
- **G（头条）** — TRUST_PROXY fail-closed 门：XFF 信任需要精确 "1" 声明，其余值（含未设）落入共享 "direct" 桶——直连部署的速率限制绕过关闭；e2e webServer 显式 opting-in。

**最终门控**：lint 0/0 · typechecks ×2 · 211/211 unit × 3 时区 · 140/140 e2e（冷启动）· 零残留 · 截图 120-124 验证非空白 · `.env.example` 更新（唯一活动变量不变 + 注释的可选门，pin 绿）· 六文档同步（PAD v1.26.0，SKILL v2.15.0 lessons 71-72）。

关键产出物：[Task-141 计划](/home/z/my-project/home-furnishing-store/docs/plans/2026-11-21-task141-remediation-plan.md) · [session_48 日志](/home/z/my-project/home-furnishing-store/docs/session_48.md) · [SKILL.md](/home/z/my-project/home-furnishing-store/home-furnishing-store_SKILL.md) · [截图](/home/z/my-project/home-furnishing-store/docs/screenshots/)

下一周期候选：常设延迟登记册（完整 nonce CSP、GET 节流→边缘/代理层、jsdom 层、商店选择器接线、F-6 层级位置、F-8 方法感知默认值）。TRUST_PROXY 与 reduced CSP 已关闭。
