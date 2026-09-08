# tl2-wiki 的 SEO 结构

使用 React Router 7 (Framework Mode) 实现 (面向 github pages 部署的) SEO 友好性.

## 技术规范

- 实现层: React Router 7 Framework Mode / Pre-Rendering 官方文档
- SEO 验收层: Google Search Central – SEO Guide for Web Developers + JavaScript SEO Basics

## 行为约定

### 多语言

- `/` -> `en`
- `/zh/` -> `zh-CN`
- `/zh-tw/` -> `zh-TW`

### SSG 范围

所有一级页面 route 都 prerender 一个静态入口, hydration 后保持 client-side routing (soft navigation). 这样做的好处是:

- 页面行为仍像 SPA, 方便各种检索
- 允许具体的装备, 技能等页面得到 SEO

具体页面的 SEO 通过对所有语言的页面做 SSG 实现. SSG 的范围:

- unique/legendary 的非 pet 装备 (物品)
- 4 个职业的全部技能

这可以降低几百 MB 的构建尺寸. 注意, 虽然只对部分页面做 SSG, 但其他装备仍采用 client-side routing 的做法.

### slug 规则

- 装备: `/items/{familyId}/`. `familyId` 直接使用数据库 `wiki_equipment.family_id`.
- 职业技能: `/classes/{classSlug}/skills/{skillSlug}/`. 职业 slug 用现有稳定 class ID，skillSlug 由英文技能名生成.

### SEO 友好

需要满足以下 SEO 友好性:

- 页面有正常 `<title>` 和 meta description.
- 实体页面的 `<h1>` 是实体名而不是上级 SPA 标题. 注意这和 SPA 并不冲突, React 可以在 Soft Navigation 时直接更新 H1.
- 配置 `sitemap.xml`.

## 其他注意事项

- 大入口页 hydration 成本必须低.
- 大文件应该仅在需要时加载.
- SPA + 实体页 SSG 不意味着大量重复数据, 应避免.
- `The `envFile` option is deprecated, please use `envDir: false` instead. (x3)` 该警告来自 `@react-router/dev@7.18.3`, 和项目无关. 没有升级 RR 版本的计划.
