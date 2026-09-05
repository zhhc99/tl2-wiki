# TL2 Wiki

《火炬之光 II》资料站，使用 React、TypeScript 与 Vite 构建。

## 本地运行

```bash
npm install
npm run dev
```

完整检查（与 Pages CI 相同）：

```bash
npm run check
```

## 数据

数据来源于 Steam 版本游戏 (用 GUTS 获取所有细节). 一个本地项目 `tl2-wiki-data` 数据整理成 `sqlite` 数据库, 本项目使用该数据库生成浏览器使用的 JSON 并复制必要图标.

- `public/data/equipment.json`：蓝色及以上稀有度装备、饰品、宠物装备与镶嵌物，包含 NG+ 派生记录及最终有效的三语装备、套装效果。
- `public/data/class-skills.json`：职业、技能树、技能等级、图标、官方说明、阶段奖励和结构化每级效果。
- `public/data/skill-graphs.json`：职业技能实际引用的角色、怪物与法力消耗等级曲线，用于页面中的固定数值换算。
- `public/data/spell-books.json`：技能书等级、游戏图标及官方三语文本；正常游戏无法获取的记录不会在前端展示。
- `public/data/phase-beasts.json`：室外区域及官方三语挑战提示。
- `public/data/meta.json`：生成计数、语言范围和已知数据缺口。
- `public/game-icons/`：已提交的物品与技能图标，运行时直接加载。

仅在修改数据库契约、导入器或数据规则时刷新数据：

```bash
npm run data:refresh
```

转换器位于 `scripts/import-tl2-db.mjs`。`public/data/*.json` 与
`public/game-icons/` 是生成物，不应直接全文读取或编辑；数据核对应优先使用
SQLite 精确查询及 `npm run data:validate` 的摘要。

## GitHub Pages

仓库包含 `.github/workflows/deploy-pages.yml`，向 `main` 推送时触发 GitHub Pages 部署。
