import fs from 'node:fs'
import path from 'node:path'

const client = path.resolve('build/client')
const pages = path.resolve('build/pages')
const routes = path.join(client, 'tl2-wiki')

fs.rmSync(pages, { recursive: true, force: true })
fs.cpSync(client, pages, { recursive: true })
fs.cpSync(routes, pages, { recursive: true })
fs.rmSync(path.join(pages, 'tl2-wiki'), { recursive: true })
fs.renameSync(path.join(pages, '__spa-fallback.html'), path.join(pages, '404.html'))

const urls = fs
  .readdirSync(pages, { recursive: true })
  .filter((file) => file === 'index.html' || String(file).endsWith('/index.html'))
  .map((file) => {
    const route = String(file).replace(/index\.html$/, '')
    return `  <url><loc>https://zhhc99.github.io/tl2-wiki/${route}</loc></url>`
  })
fs.writeFileSync(
  path.join(pages, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
fs.writeFileSync(
  path.join(pages, 'robots.txt'),
  'User-agent: *\nAllow: /\nSitemap: https://zhhc99.github.io/tl2-wiki/sitemap.xml\n',
)

for (const name of ['assets', 'data', 'game-icons', 'images', 'favicon.ico'])
  fs.cpSync(path.join(client, name), path.join(routes, name), { recursive: true })
