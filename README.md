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

主要数据源为本地 `tl2-wiki-data/database/tl2.sqlite`。转换器会读取规范化 SQLite 数据库，生成浏览器使用的 JSON，并把独立物品与技能图标复制到 `public/game-icons`。原始数据目录约 221 MB，已加入 `.gitignore`；生成后的站点数据和图标随项目提交，普通构建不依赖原始数据库。

- `public/data/equipment.json`：5,483 件玩家可用的装备、饰品、宠物装备与镶嵌物，名称和游戏内说明采用官方简中、繁中与英文文本；另有 5 件明确标为 `NO_DROP` 或 `DON'T USE` 的内部道具未进入站点。
- `public/data/class-skills.json`：4 个职业、12 棵技能树、120 个技能和 1,800 条技能等级记录，含技能图标、官方说明、阶段奖励和每级效果参数。
- `public/data/spell-books.json`：194 条技能书等级记录，配有 38 类游戏图标；可匹配的标题与说明使用官方三语文本。
- `public/data/phase-beasts.json`：6 个室外区域和 15 条官方三语挑战提示。
- `public/data/meta.json`：生成计数、语言范围和已知数据缺口。

`scripts/item-enrichment.json` 保留上一轮跨库规范化得到的精确装备需求、最终伤害/护甲范围和英文效果文本；新数据库中可精确匹配的 4,363 件装备使用这些补充数值，其余记录保留新数据库的原始定义。`scripts/spell-books-source.json` 保留新数据库明确排除的 194 条技能书物品记录，再通过图标和技能定义补充官方多语言文本。

刷新数据：

```bash
npm run data:refresh
```

转换器位于 `scripts/import-tl2-db.mjs`，只读取 `tl2-wiki-data` 和上述两份已提交的规范化补充数据。

## 已知数据缺口

- 3,504 件装备的游戏源文件没有说明文本；站点不会为它们编写替代说明。
- 7,599 条站点展示的装备效果没有官方中文文本；中文界面按规则回退英文，底层 10,914 条原始结构化词缀效果仍保留数值。
- 13 条技能书物品标题和 114 条说明没有可精确匹配的官方中文文本，继续显示英文原文。
- 4 条职业简介只有已确认的官方简体中文文本；繁体中文界面按规则回退英文简介。
- 1,120 件新增装备没有旧跨库的最终数值补充；名称、分类、等级、图标和原始词缀完整，但最终伤害/护甲范围可能只有游戏定义中的基础参数。
- 技能的最终伤害与法力消耗会随角色等级、武器 DPS、专注等运行时状态变化；站点展示每级定义和缩放系数，不制造脱离角色状态的单一结果。
- 20 个相位兽房间中有 5 个源布局没有 `PHASEROOM_INTRO` 提示，因此挑战列表只展示其余 15 条可验证的官方文本。

## GitHub Pages

仓库包含 `.github/workflows/deploy-pages.yml`。在仓库设置中把 Pages 的 Source 设为 GitHub Actions，推送到 `main` 后即可发布。
