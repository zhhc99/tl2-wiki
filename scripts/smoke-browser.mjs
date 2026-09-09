const endpoint = process.argv[2] || 'http://127.0.0.1:9222'
const siteUrl = process.argv[3] || 'http://127.0.0.1:4173/tl2-wiki'
const targets = await fetch(`${endpoint}/json`).then((response) => response.json())
const target = targets.find((item) => item.type === 'page')
if (!target) throw new Error('Browser page target not found')

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.onopen = resolve
  socket.onerror = reject
})

let id = 0
const pending = new Map()
const requestUrls = []
socket.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.method === 'Network.requestWillBeSent') requestUrls.push(message.params.request.url)
  if (!message.id || !pending.has(message.id)) return
  pending.get(message.id)(message)
  pending.delete(message.id)
}
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const requestId = ++id
    pending.set(requestId, resolve)
    socket.send(JSON.stringify({ id: requestId, method, params }))
  })
await call('Network.enable')
await call('Storage.clearDataForOrigin', {
  origin: new URL(siteUrl).origin,
  storageTypes: 'local_storage',
})
const evaluate = async (expression) => {
  const response = await call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  return response.result?.result.value
}
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out: ${expression}`)
}
const visit = async (path) => {
  const url = `${siteUrl}${path}`
  await call('Page.navigate', { url })
  await waitFor(
    `location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && Boolean(document.querySelector('main'))`,
  )
  await waitFor(
    `Object.keys(document.querySelector('main')).some((key) => key.startsWith('__reactProps'))`,
  )
}
const fullEquipmentRequests = () =>
  requestUrls.filter((url) => new URL(url).pathname.endsWith('/data/equipment.json')).length
const routeDataRequests = () =>
  requestUrls.filter((url) => new URL(url).pathname.endsWith('.data')).length

await visit('/')
if (!(await evaluate(`document.body.textContent.includes('4,029')`)))
  throw new Error('English home page did not hydrate')

await visit('/items/nargothrels-band/')
if (fullEquipmentRequests() !== 0)
  throw new Error('Direct equipment route requested the full equipment data on initial load')
if (
  !(await evaluate(
    `document.querySelector('.page-header h1').textContent === "Nargothrel's Band" && document.querySelector('.page-header .page-title').textContent === 'Equipment' && document.querySelector('.detail-drawer h2').textContent.includes("Nargothrel's Band") && document.querySelector('.data-table') && document.querySelectorAll('link[rel="alternate"]').length === 4`,
  ))
)
  throw new Error('Direct equipment route does not render the equipment drawer or SEO links')

await visit('/classes/outlander/')
if (
  !(await evaluate(
    `document.querySelector('.page-header h1').textContent === 'Outlander' && document.querySelector('.page-header .page-title').textContent === 'Classes' && document.querySelector('.skill-panel h2').textContent === 'Rapid Fire' && document.querySelector('.skill-table a[href$="/rune-vault/"]') instanceof HTMLAnchorElement`,
  ))
)
  throw new Error('Class route does not render its first skill')
await waitFor(
  `[...performance.getEntriesByType('resource')].some((entry) => entry.name.endsWith('/data/class-skills.json') && entry.responseEnd > 0)`,
)
const classRouteDataRequests = routeDataRequests()
if (
  !(await evaluate(
    `(() => { const style = getComputedStyle(document.querySelector('.tree-tabs a')); return style.display.endsWith('flex') && style.alignItems === 'center' && style.justifyContent === 'center' })()`,
  ))
)
  throw new Error('Skill tree links are not centered like the original buttons')
await evaluate(
  `document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 600); window.__softNavigationMarker = true; window.__scrollMarker = scrollY`,
)
await evaluate(`document.querySelector('.skill-table a[href$="/rune-vault/"]').click()`)
await waitFor(
  `location.pathname.endsWith('/classes/outlander/skills/rune-vault/') && document.querySelector('.skill-panel h2').textContent === 'Rune Vault' && document.querySelector('link[rel="canonical"]').href.endsWith('/classes/outlander/skills/rune-vault/')`,
)
if (routeDataRequests() !== classRouteDataRequests)
  throw new Error('Cached skill navigation requested route data')
if (!(await evaluate(`window.__softNavigationMarker === true`)))
  throw new Error('Skill selection caused a document navigation')
if (!(await evaluate(`scrollY === window.__scrollMarker`)))
  throw new Error('Skill selection reset the scroll position')
await evaluate(`document.querySelector('.tree-tabs a[href$="/glaive-throw/"]').click()`)
await waitFor(
  `location.pathname.endsWith('/classes/outlander/skills/glaive-throw/') && document.querySelector('.skill-panel h2').textContent === 'Glaive Throw'`,
)
if (!(await evaluate(`scrollY === window.__scrollMarker`))) {
  const scrollState = await evaluate(
    `({ before: window.__scrollMarker, after: scrollY, maximum: document.documentElement.scrollHeight - innerHeight })`,
  )
  throw new Error(`Skill tree selection reset the scroll position: ${JSON.stringify(scrollState)}`)
}

await visit('/items/')
await waitFor(
  `[...document.querySelectorAll('tbody a')].some((link) => link.textContent.includes('Ascendant Belt'))`,
)
await waitFor(
  `[...performance.getEntriesByType('resource')].some((entry) => entry.name.endsWith('/data/equipment.json') && entry.responseEnd > 0)`,
)
const itemRouteDataRequests = routeDataRequests()
await evaluate(
  `document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 500); window.__softNavigationMarker = true; window.__scrollMarker = scrollY`,
)
await evaluate(
  `[...document.querySelectorAll('tbody a')].find((link) => link.textContent.includes('Ascendant Belt')).click()`,
)
await waitFor(
  `location.pathname.endsWith('/items/ascendant-belt/') && document.querySelector('.detail-drawer h2').textContent.includes('Ascendant Belt') && document.querySelector('link[rel="canonical"]').href.endsWith('/items/ascendant-belt/')`,
)
if (routeDataRequests() !== itemRouteDataRequests)
  throw new Error('Cached equipment navigation requested route data')
if (!(await evaluate(`window.__softNavigationMarker === true`)))
  throw new Error('Equipment selection caused a document navigation')
if (!(await evaluate(`scrollY === window.__scrollMarker`)))
  throw new Error('Equipment selection reset the scroll position')
await evaluate(`document.querySelector('.drawer-close').click()`)
await waitFor(
  `location.pathname.endsWith('/items/') && !document.querySelector('.drawer-backdrop')`,
)
if (!(await evaluate(`scrollY === window.__scrollMarker`)))
  throw new Error('Closing equipment reset the scroll position')

await evaluate(`(() => {
  const input = document.querySelector('.data-search input')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Bitterbite')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
await waitFor(`document.querySelector('tbody a')?.textContent.includes('Bitterbite')`)
await evaluate(`document.querySelector('tbody a').click()`)
await waitFor(
  `location.pathname.endsWith('/items/bitterbite/') && document.querySelector('.detail-drawer h2').textContent.includes('Bitterbite') && Boolean(document.querySelector('.variant-field'))`,
)
await evaluate(`document.querySelector('.drawer-close').click()`)
await waitFor(
  `location.pathname.endsWith('/items/') && !document.querySelector('.drawer-backdrop')`,
)

await visit('/')
await evaluate(`document.querySelector('.search-button').click()`)
await waitFor(`Boolean(document.querySelector('.search-backdrop input'))`)
await evaluate(`(() => {
  const input = document.querySelector('.search-backdrop input')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Rune Vault')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
await waitFor(
  `[...document.querySelectorAll('.search-list button')].some((button) => button.textContent.includes('Rune Vault'))`,
)
await evaluate(
  `[...document.querySelectorAll('.search-list button')].find((button) => button.textContent.includes('Rune Vault')).click()`,
)
await waitFor(
  `location.pathname.endsWith('/classes/outlander/skills/rune-vault/') && !document.querySelector('.search-backdrop')`,
)

await visit('/')
await evaluate(`document.querySelector('.search-button').click()`)
await waitFor(`Boolean(document.querySelector('.search-backdrop input'))`)
await evaluate(`(() => {
  const input = document.querySelector('.search-backdrop input')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Ascendant Belt')
  input.dispatchEvent(new Event('input', { bubbles: true }))
})()`)
await waitFor(
  `[...document.querySelectorAll('.search-list button')].some((button) => button.textContent.includes('Ascendant Belt'))`,
)
await evaluate(
  `[...document.querySelectorAll('.search-list button')].find((button) => button.textContent.includes('Ascendant Belt')).click()`,
)
await waitFor(
  `location.pathname.endsWith('/items/ascendant-belt/') && !document.querySelector('.search-backdrop')`,
)
await evaluate(`document.querySelector('.drawer-close').click()`)
await waitFor(
  `location.pathname.endsWith('/items/') && !document.querySelector('.drawer-backdrop')`,
)

await visit('/zh/classes/berserker/skills/eviscerate/')
if (
  !(await evaluate(
    `document.documentElement.lang === 'zh-CN' && document.querySelector('.page-header h1').textContent === '开膛破肚' && document.querySelector('.page-header .page-title').textContent === '职业' && document.querySelector('.skill-layout .skill-panel') && document.title.includes('开膛破肚')`,
  ))
)
  throw new Error('Localized skill page did not hydrate')

for (const [path, expectedUrl] of [
  ['/builds/', 'https://zhhc99.github.io/tl2-wiki/builds/'],
  ['/zh/builds/', 'https://zhhc99.github.io/tl2-wiki/zh/builds/'],
  ['/zh-tw/builds/', 'https://zhhc99.github.io/tl2-wiki/zh-tw/builds/'],
]) {
  await visit(path)
  await evaluate(
    `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text) => { window.__tl2BuildText = text; return Promise.resolve() } } })`,
  )
  await evaluate(`document.querySelector('.export-build').click()`)
  await waitFor(`Boolean(window.__tl2BuildText)`)
  if (
    !(await evaluate(
      `window.__tl2BuildText.includes(${JSON.stringify(`\n${expectedUrl}\n`)}) && !window.__tl2BuildText.includes('#/builds')`,
    ))
  )
    throw new Error(`Build export did not use the localized route: ${path}`)
}

await evaluate(`localStorage.setItem('tl2-build', JSON.stringify({
  classId: 'berserker',
  level: 100,
  allocated: { str: 0, dex: 0, foc: 0, vit: 0 },
  loadout: { main: '-2085670950870325954' },
  socketLoadout: { main: ['6633021093315468842', '6633021093315468842'] }
}))`)
await visit('/builds/')
await waitFor(`Boolean(document.querySelector('.socketed-gem-list article'))`)
if (
  !(await evaluate(
    `document.querySelectorAll('.socketed-gem-list article').length === 1 && document.querySelector('.socketed-gems header strong').textContent === '2' && document.querySelector('.socketed-gem-list article').textContent.includes('2 socketables')`,
  ))
)
  throw new Error('Identical socketables with the same active effect were not grouped')

await visit('/')
const userAgent = await evaluate(`navigator.userAgent`)
await call('Network.setUserAgentOverride', {
  userAgent,
  acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
})
await visit('/?locale-smoke=1')
await waitFor(`Boolean(document.querySelector('.locale-suggestion'))`)
await evaluate(`document.querySelector('.locale-suggestion-close').click()`)
if (await evaluate(`Boolean(document.querySelector('.locale-suggestion'))`))
  throw new Error('Locale suggestion is not dismissible')

await visit('/?locale-smoke=2')
await waitFor(`Boolean(document.querySelector('.locale-suggestion'))`)
await evaluate(`document.querySelector('.locale-suggestion-action').click()`)
await waitFor(
  `location.pathname.endsWith('/zh/') && document.readyState === 'complete' && Boolean(document.querySelector('main'))`,
)
await waitFor(
  `Object.keys(document.querySelector('main')).some((key) => key.startsWith('__reactProps'))`,
)
if (!(await evaluate(`document.documentElement.lang === 'zh-CN'`)))
  throw new Error('Locale suggestion did not navigate to the suggested locale')

await visit('/?locale-smoke=3')
await waitFor(`Boolean(document.querySelector('.locale-suggestion'))`)

socket.close()
console.log('Browser smoke test passed')
