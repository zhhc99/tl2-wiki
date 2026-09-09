import { readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const pages = resolve(import.meta.dirname, '../build/pages')
const files = readdirSync(pages, { recursive: true })
  .map(String)
  .filter((name) => statSync(resolve(pages, name)).isFile())
const size = (name) => statSync(resolve(pages, name)).size
const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`
const failures = []

const total = files.reduce((sum, name) => sum + size(name), 0)
const totalLimit = 250 * 1024 * 1024
if (total > totalLimit) failures.push(`build/pages: ${mib(total)} > ${mib(totalLimit)}`)

const checkMatches = (label, pattern, limit) => {
  const matches = files.filter((name) => pattern.test(name))
  if (!matches.length) failures.push(`${label}: no matching build files`)
  for (const name of matches)
    if (size(name) > limit)
      failures.push(`${relative(pages, resolve(pages, name))}: ${mib(size(name))} > ${mib(limit)}`)
}

checkMatches(
  'entry HTML',
  /^(?:(?:zh|zh-tw)\/)?(?:items|builds|gambling)\/index\.html$/,
  128 * 1024,
)
checkMatches('skill HTML', /\/skills\/[^/]+\/index\.html$/, 128 * 1024)
checkMatches('skill data', /\/skills\/[^/]+\.data$/, 128 * 1024)

const arcgapsVice = 'items/arcgaps-vice/index.html'
if (!files.includes(arcgapsVice)) failures.push(`${arcgapsVice}: missing prerendered page`)
else if (
  !/<h1>Arcgap(?:&#x27;|')s Vice<\/h1>/.test(readFileSync(resolve(pages, arcgapsVice), 'utf8'))
)
  failures.push(`${arcgapsVice}: entity name is not the H1`)

if (files.includes('robots.txt')) failures.push('robots.txt: should not be generated')

if (failures.length) throw new Error(`Build output check failed:\n${failures.join('\n')}`)
console.log(`Build output checks passed (${mib(total)})`)
