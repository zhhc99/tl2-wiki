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
- [Official TRANSLATIONS (v.39)](https://steamcommunity.com/sharedfiles/filedetails/?id=405160259)：从官方游戏数据提取的简体中文职业与技能文本。

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

- 官方职业信息、机制说明和相位兽内容位于 `src/data.ts`。
- UI 翻译与语言注册表位于 `src/i18n.ts`。
- 从官方语言包精确匹配出的职业技能对照位于 `scripts/official-zh.json`；120 个技能说明和 118 个技能名已有官方中文，其余标题回退英文。
- 相位兽本地插图位于 `public/images/phase-beast.webp`，不依赖第三方图片外链。
- 对官方语言包中无法确认的文本，中文界面保留英文，不使用自译内容填充。
- 自行确定的实现细节、字段映射与数据限制见 [DECISIONS.md](./DECISIONS.md)。

## GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`。在 Settings → Pages 中把 Source 设为 **GitHub Actions**，推送到 `main` 后即可自动发布。
