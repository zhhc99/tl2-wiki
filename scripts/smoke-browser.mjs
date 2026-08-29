const endpoint = process.argv[2] || 'http://127.0.0.1:9222'
const siteUrl = process.argv[3] || 'http://127.0.0.1:5173'
const targets = await fetch(`${endpoint}/json`).then(response => response.json())
const target = targets.find(item => item.type === 'page' && item.url.startsWith(siteUrl))
if (!target) throw new Error('TL2 Wiki page target not found')

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let id = 0
const pending = new Map()
socket.onmessage = event => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
}
const call = (method, params = {}) => new Promise(resolve => {
  const requestId = ++id
  pending.set(requestId, resolve)
  socket.send(JSON.stringify({ id: requestId, method, params }))
})
const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

await evaluate(`location.hash='#/home'`)
await wait(250)
const loaded = await evaluate(`document.body.textContent.includes('5,483')`)
if (!loaded) throw new Error('Equipment count was not rendered')
const before = await evaluate(`Boolean(document.querySelector('.search-modal'))`)
if (before) throw new Error('Search modal unexpectedly open before keyboard test')
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',ctrlKey:true,bubbles:true}))`)
await wait(100)
const after = await evaluate(`Boolean(document.querySelector('.search-modal')) && document.activeElement?.tagName === 'INPUT'`)
if (!after) throw new Error('Ctrl+K did not open and focus global search')
await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`)
await wait(100)
const closed = await evaluate(`!document.querySelector('.search-modal')`)
if (!closed) throw new Error('Escape did not close global search')
await evaluate(`(() => { const select=document.querySelector('.locale-select select'); select.value='zh-TW'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`)
await wait(100)
const language = await evaluate(`document.documentElement.lang`)
if (language !== 'zh-TW') throw new Error(`Traditional Chinese selection did not update document language: ${language}`)

await evaluate(`location.hash='#/classes'`)
await wait(250)
const skillData = await evaluate(`Boolean(document.querySelector('.skill-table img')?.complete && document.querySelector('.rank-control input')?.max==='15' && document.querySelector('.skill-metrics'))`)
if (!skillData) throw new Error('Skill icons or rank values were not rendered')

await evaluate(`location.hash='#/items'`)
await wait(250)
const setSearch = value => evaluate(`(() => {
  const input=document.querySelector('.data-search input');
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  setter.call(input,${JSON.stringify(value)});
  input.dispatchEvent(new Event('input',{bubbles:true}));
})()`)
await setSearch('All Damage Taken is reduced by -3%')
await wait(150)
const effectSearchWorked = await evaluate(`document.querySelectorAll('.data-table tbody tr').length > 0`)
if (!effectSearchWorked) throw new Error('Equipment effect text was not searchable')
await setSearch('The Eye of Grell')
await wait(150)
await evaluate(`document.querySelector('.data-table tbody tr')?.click()`)
await wait(100)
const effectDetail = await evaluate(`document.querySelector('.effect-list')?.textContent.includes('Critical Hit Chance')`)
if (!effectDetail) throw new Error('Imported equipment effects were not shown in the detail drawer')
await evaluate(`document.querySelector('.drawer-close')?.click()`)
await setSearch('Ascendant Armor')
await wait(150)
const independentSetTag = await evaluate(`(() => {
  const row=document.querySelector('.data-table tbody tr');
  return Boolean(row?.querySelector('.rarity.unique') && row?.querySelector('.set-tag') && row?.querySelector('.rarity-border.unique'))
})()`)
if (!independentSetTag) throw new Error('Set membership replaced rarity or the icon rarity border is missing')
const styledSelects = await evaluate(`(() => {
  const controls=[...document.querySelectorAll('.data-toolbar .select-control')];
  const rarity=controls[1]?.querySelector('select');
  return controls.length===3 && getComputedStyle(rarity).appearance==='none' && ![...rarity.options].some(option=>option.value==='set')
})()`)
if (!styledSelects) throw new Error('Equipment filters are not using the shared styled select control')
await evaluate(`location.hash='#/phases'`)
await wait(250)
const phasePage = await evaluate(`(() => { const image=document.querySelector('.phase-guide img'); return Boolean(image?.complete && image.naturalWidth>0 && document.querySelectorAll('.phase-card').length===6 && document.querySelectorAll('.challenge-list section').length===15 && document.body.textContent.includes('接近圖騰')) })()`)
if (!phasePage) throw new Error('Phase Beast guide, areas or challenges did not render')
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await wait(100)
const mobileFits = await evaluate(`document.documentElement.scrollWidth <= 390`)
if (!mobileFits) throw new Error('Mobile layout has horizontal overflow')
await call('Emulation.clearDeviceMetricsOverride')

socket.close()
console.log('Browser smoke test passed: data, shortcuts, language, rarity/set styling, styled filters, effect search/detail, Phase Beast guide and mobile fit')
