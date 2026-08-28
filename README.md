# TL2 Wiki

一个可发布到 GitHub Pages 的《火炬之光 II》双语资料站。技术栈为 React、TypeScript 和 Vite。

## 本地运行

```bash
npm install
npm run dev
```

生产检查：

```bash
npm run typecheck
npm run build
```

## 数据

站点交叉使用两套已有数据库，并经本项目脚本清洗、关联后转换为浏览器可读取的 JSON：

- [Awkward-im/Torchlight](https://github.com/Awkward-im/Torchlight) 的基础游戏 SQLite 数据：物品、技能书和职业技能原始记录。
- [TIDBI-eng v1.05](http://www.dethguild.com/torchlight_item_database.php)：装备精确伤害/护甲范围、需求、物品效果和套装奖励。

- `public/data/equipment.json`：4,366 条装备及镶嵌物记录，其中 4,364 条完成跨库精确匹配，关联 7,147 条物品效果。
- `public/data/spell-books.json`：194 条技能书等级记录。
- `public/data/class-skills.json`：4 个职业、12 棵技能树、120 个职业技能。
- `public/data/meta.json`：数据来源、生成时间、数量和筛选条件。

刷新数据需要 Node.js 22.12 或更高版本，并由系统提供 `curl` 和 `7z`：

```bash
npm run data:refresh
```

转换器位于 `scripts/import-tl2-db.mjs`，使用 Node 内置 SQLite 读取器和 `mdb-reader` 读取 Access 数据库，保留来源字段并执行统一分类、清洗、跨库关联、内部模板剔除和技能树映射。生成的 JSON 已提交，普通构建不依赖原始数据库。

## 内容与本地化

- 编辑性角色、机制和相位兽内容位于 `src/data.ts`。
- UI 翻译与语言注册表位于 `src/i18n.ts`。
- 相位兽本地插图位于 `public/images/phase-beast.webp`，不依赖第三方图片外链。
- 原始数据库仅含英文展示文本；站点在中文界面中保留这些英文物品名和说明，避免将机器翻译冒充官方汉化。
- 自行确定的实现细节、字段映射与数据限制见 [DECISIONS.md](./DECISIONS.md)。

## GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`。在 Settings → Pages 中把 Source 设为 **GitHub Actions**，推送到 `main` 后即可自动发布。

本项目为非官方爱好者项目。《火炬之光 II》及相关名称和内容归其权利人所有。
