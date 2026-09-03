# TL2 Wiki

《火炬之光 II》资料站，使用 React、TypeScript 与 Vite 构建。

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

数据来源于 Steam 版本游戏 (用 GUTS 获取所有细节). 一个本地项目 `tl2-wiki-data` 数据整理成 `sqlite` 数据库, 本项目使用该数据库生成浏览器使用的 JSON 并复制必要图标.

- `public/data/equipment.json`：4,029 件蓝色及以上稀有度装备、饰品、宠物装备与镶嵌物；其中包括 63 组玩家可见数值随周目变化的基础物品及其 189 条 NG+ 派生记录，包含应用继承覆盖和等级曲线后的最终有效三语装备、套装效果。
- `public/data/class-skills.json`：4 个职业、12 棵技能树、120 个技能和 1,800 条技能等级记录，含技能图标、官方说明、阶段奖励和结构化每级效果。
- `public/data/skill-graphs.json`：职业技能实际引用的角色、怪物与法力消耗等级曲线，用于页面中的固定数值换算。
- `public/data/spell-books.json`：194 条技能书等级记录，配有 38 类游戏图标；标题与说明均直接使用数据库中的官方三语文本。只存在于数据中、正常游戏无法获取的记录带有 `unobtainable` 标签，前端不予展示。
- `public/data/phase-beasts.json`：6 个室外区域和 15 条官方三语挑战提示。
- `public/data/meta.json`：生成计数、语言范围和已知数据缺口。
- `public/game-icons/`：已提交的 1,123 个物品与技能图标，运行时直接加载。

刷新数据：

```bash
npm run data:refresh
```

转换器位于 `scripts/import-tl2-db.mjs`.

## GitHub Pages

仓库包含 `.github/workflows/deploy-pages.yml`，向 `main` 推送时触发 GitHub Pages 部署。
