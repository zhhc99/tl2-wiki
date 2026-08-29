# TL2 Wiki

《火炬之光 II》简体中文、繁体中文和英文资料站，使用 React、TypeScript 与 Vite 构建，可部署到 GitHub Pages。

## 本地运行

```bash
npm install
npm run dev
```

完整检查：

```bash
npm run data:validate
npm run typecheck
npm run build
```

## 数据

主要数据源为本地 `tl2-wiki-data/database/tl2.sqlite`（schema version 5）。转换器会读取规范化 SQLite 数据库，生成浏览器使用的 JSON，并把物品与技能图标复制到 `public/game-icons`。整个 `tl2-wiki-data/` 原始数据目录已由根目录 `.gitignore` 排除；生成后的站点数据和图标随项目提交，普通构建和 GitHub Pages 部署不依赖原始数据库。

- `tl2-wiki-data/database/tl2.sqlite`：规范化主库，包含装备、词缀、套装、技能书、职业技能、地图和相位兽房间；只在刷新数据时使用，不提交。
- `tl2-wiki-data/images/`：主库对应的物品与技能原图；只在刷新数据时使用，不提交。
- `tl2-wiki-data/exports/`：数据库内容的 JSONL 导出，供核对和离线分析使用；站点不直接读取，不提交。
- `public/data/equipment.json`：3,840 件蓝色及以上稀有度装备、饰品、宠物装备与镶嵌物，包含应用继承覆盖和等级曲线后的最终有效三语装备、套装效果。
- `public/data/class-skills.json`：4 个职业、12 棵技能树、120 个技能和 1,800 条技能等级记录，含技能图标、官方说明、阶段奖励和结构化每级效果。
- `public/data/skill-graphs.json`：职业技能实际引用的角色、怪物与法力消耗等级曲线，用于页面中的固定数值换算。
- `public/data/spell-books.json`：194 条技能书等级记录，配有 38 类游戏图标；标题与说明均直接使用数据库中的官方三语文本。
- `public/data/phase-beasts.json`：6 个室外区域和 15 条官方三语挑战提示。
- `public/data/meta.json`：生成计数、语言范围和已知数据缺口。
- `public/game-icons/`：已提交的 1,123 个物品与技能图标，运行时直接加载。

`scripts/item-enrichment.json` 保留跨库规范化得到的最终伤害/护甲范围、属性需求、攻击速度和少量来源说明；当前页面中的 3,242 件装备可精确匹配这些补充数值。装备与套装效果分别采用 schema v5 的 `item_display_effects`、`set_display_effects`。`scripts/spell-books-source.json` 只保留 194 条技能书的分组、层级和类型分类；名称、说明、等级、需求与图标均按 GUID 读取主库。这两份规范化补充数据均已提交。

刷新数据：

```bash
npm run data:refresh
```

转换器位于 `scripts/import-tl2-db.mjs`，只读取本地 `tl2-wiki-data` 和上述两份已提交的规范化补充数据。页面运行时只请求 `public/data/*.json` 与 `public/game-icons/`，没有外部数据库或网络 API 依赖。

## 页面功能

- 配装面板包含 12 个装备栏、职业/等级选择、495 点以内的属性分配、装备与套装固定属性汇总、需求检查，以及包含装备词缀的完整属性检视。装备经过预览确认后才会加入栏位，配置会保存在当前浏览器。
- 赌博面板按物品类型、等级和孔数计算四档底层价格，并分别列出向下、向上取整后的八个整数结果。
- 装备页不展示白色装备和孔数；孔数特殊规则集中在机制页。

## 已知数据缺口

- 2,017 件当前展示装备的游戏源文件没有说明文本；站点不会为它们编写替代说明。
- schema v5 已为当前展示的 6,446 条最终有效装备效果提供完整英文、官方简中和官方繁中文本。
- 4 条职业简介只有已确认的官方简体中文文本；繁体中文界面按规则回退英文简介。
- 598 件当前展示装备没有跨库的最终伤害/护甲补充；名称、分类、等级、图标，以及数据库已有的最终有效效果仍然保留。
- 技能的固定数值现可按角色等级换算；武器 DPS 百分比和专注等仍取决于角色当前装备与属性，因此保留为组成值，不合并成一个假定配装下的最终伤害。
- 20 个相位兽房间中有 5 个源布局没有 `PHASEROOM_INTRO` 提示，因此挑战列表只展示其余 15 条可验证的官方文本。

## GitHub Pages

仓库包含 `.github/workflows/deploy-pages.yml`，Vite 使用相对资源基路径。首次部署时在仓库 Settings → Pages 中把 Source 设为 GitHub Actions；之后推送到 `main`，工作流会执行 `npm ci`、`npm run build` 并发布 `dist/`。由于生成后的 JSON 和图标已经提交，CI 不需要被忽略的 SQLite 原库。

当前工作目录（含被忽略的数据库与 `node_modules`）约 437 MB；Git 跟踪内容约 23 MB，适合直接提交并通过 Pages artifact 部署。具体取舍见 `docs/implementation-notes.md`。
