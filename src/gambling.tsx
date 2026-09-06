import { useMemo, useState } from 'react'
import { CircleDollarSign, Info, Search, Shield, Swords, X } from 'lucide-react'
import { allText, asset, ngLabel, type DbEquipment } from './domain'
import { copy, pick } from './i18n'
import { NumberInput } from './NumberInput'
import { SelectControl } from './SelectControl'
import type { Lang } from './types'

const gambleTypes = [
  { id:'weapon', value:100, en:'Weapon', zhCN:'武器', zhTW:'武器' },
  { id:'chest', value:100, en:'Chest armor', zhCN:'胸甲', zhTW:'胸甲' },
  { id:'pants', value:80, en:'Pants', zhCN:'腿甲', zhTW:'腿甲' },
  { id:'boots', value:80, en:'Boots', zhCN:'靴子', zhTW:'靴子' },
  { id:'shoulders', value:80, en:'Shoulder armor', zhCN:'肩甲', zhTW:'肩甲' },
  { id:'shield', value:75, en:'Shield', zhCN:'盾牌', zhTW:'盾牌' },
  { id:'helmet', value:73, en:'Helmet', zhCN:'头盔', zhTW:'頭盔' },
  { id:'gloves', value:65, en:'Gloves', zhCN:'手套', zhTW:'手套' },
  { id:'amulet', value:60, en:'Necklace', zhCN:'项链', zhTW:'項鍊' },
  { id:'ring', value:60, en:'Ring', zhCN:'戒指', zhTW:'戒指' },
  { id:'belt', value:60, en:'Belt', zhCN:'腰带', zhTW:'腰帶' },
] as const

export type GambleType = (typeof gambleTypes)[number]['id']
const gambleTypeBySubtype:Partial<Record<string,GambleType>> = {
  chest_armor:'chest', pants:'pants', boots:'boots', shoulder_armor:'shoulders', shield:'shield',
  helmet:'helmet', gloves:'gloves', amulet:'amulet', ring:'ring', belt:'belt',
}

export const gambleTypeForEquipment = (category:string, subtype:string):GambleType|null => {
  if(category==='pet'||category==='socketable')return null
  if(category==='weapon')return 'weapon'
  return gambleTypeBySubtype[subtype]||null
}

export const canGambleEquipment = (item:Pick<DbEquipment,'category'|'subtype'|'rarity'|'level'>) =>
  gambleTypeForEquipment(item.category,item.subtype)!==null&&(item.rarity!=='legendary'||item.level===105)

const boundedInteger = (value:string|undefined, fallback:number, min:number, max:number) => {
  const numeric=Number(value)
  return Number.isFinite(numeric)?Math.max(min,Math.min(max,Math.trunc(numeric))):fallback
}
const decodeId = (value:string|undefined) => {
  if(!value)return null
  try{return decodeURIComponent(value)}catch{return null}
}
const gamblingPresetFromHash = (items:DbEquipment[]) => {
  const [page,requestedType,requestedLevel,requestedSockets,requestedItemId]=window.location.hash.replace('#/','').split('/')
  const routeType=gambleTypes.some(row=>row.id===requestedType)?requestedType as GambleType:'weapon'
  const itemId=page==='gambling'?decodeId(requestedItemId):null
  const item=itemId?items.find(candidate=>candidate.id===itemId&&canGambleEquipment(candidate)):undefined
  return {
    type:item?gambleTypeForEquipment(item.category,item.subtype)??routeType:routeType,
    level:item?item.level:boundedInteger(requestedLevel,50,1,105),
    sockets:item?boundedInteger(String(item.sockets),0,0,5):boundedInteger(requestedSockets,0,0,5),
    itemId:item?.id??null,
  }
}

const gamblePrice = (value:number, level:number, sockets:number, randomOffset:number) => {
  const levelPrice=Math.ceil(value*(400+100*(level+randomOffset))*Math.fround(0.01))
  return Math.max(1,Math.trunc((1+0.1*sockets)*levelPrice))
}

function Tooltip({text}:{text:string}){
  return <span className="inline-tooltip" tabIndex={0} aria-label={text}><Info size={14}/><span role="tooltip">{text}</span></span>
}

function NgBadge({tier}:{tier:number}){
  const label=ngLabel(tier)
  return label?<span className="ng-badge">{label}</span>:null
}

export function GamblingPage({lang,items}:{lang:Lang;items:DbEquipment[]}){
  const [initial]=useState(()=>gamblingPresetFromHash(items))
  const [type,setType]=useState<GambleType>(initial.type)
  const [level,setLevel]=useState(initial.level)
  const [sockets,setSockets]=useState(initial.sockets)
  const [itemId,setItemId]=useState<string|null>(initial.itemId)
  const [pickerOpen,setPickerOpen]=useState(false)
  const [query,setQuery]=useState('')
  const selectedType=gambleTypes.find(row=>row.id===type)??gambleTypes[0]
  const selectedItem=itemId?items.find(item=>item.id===itemId)??null:null
  const value=selectedItem?.value??selectedType.value
  const rows=[0,1,2,3].map(randomOffset=>({
    offset:randomOffset+4,
    price:gamblePrice(value,level,sockets,randomOffset),
  }))
  const pickerItems=useMemo(()=>{
    const needle=query.trim().toLowerCase()
    return items.filter(item=>canGambleEquipment(item)&&gambleTypeForEquipment(item.category,item.subtype)===type&&(
      !needle||`${allText(item.name)} ${item.set?allText(item.set):''} ${item.effects.map(effect=>effect.text?allText(effect.text):'').join(' ')}`.toLowerCase().includes(needle)
    ))
  },[items,type,query])
  const changeType=(next:string)=>{setType(next as GambleType);setItemId(null)}
  const chooseItem=(item:DbEquipment)=>{
    const itemType=gambleTypeForEquipment(item.category,item.subtype)
    if(!itemType||!canGambleEquipment(item))return
    setType(itemType);setLevel(item.level);setSockets(boundedInteger(String(item.sockets),0,0,5));setItemId(item.id);setPickerOpen(false);setQuery('')
  }
  const formula='P = trunc[(1 + 0.1S) × ceil(V × (400 + 100[L + max(0, randInt(-3, 3))]) × 0.01_f)], P ≥ 1'
  return <><section className="page-header"><div className="content"><span>{copy(lang,'商店','Shop','商店')}</span><h1>{copy(lang,'赌博','Gambling','賭博')}</h1><p>{copy(lang,'选择物品类型、等级和孔数，查看赌博商人可能给出的四档价格。','Choose an item type, level and socket count to see the gambler’s four possible prices.','選擇物品類型、等級與孔數，查看賭博商人可能開出的四種價格。')}</p></div></section><div className="content page-body gamble-page"><div className="gamble-layout"><section className="gamble-controls"><div className="gamble-mark"><CircleDollarSign/><span>{copy(lang,'价格计算器','Price calculator','價格試算')}</span></div><label><span>{copy(lang,'物品类型','Item type','物品類型')}</span><SelectControl className="planner-select" label={copy(lang,'物品类型','Item type','物品類型')} value={type} onChange={changeType} options={gambleTypes.map(row=>({value:row.id,label:copy(lang,row.zhCN,row.en,row.zhTW)}))}/></label><div className="gamble-item-field"><span>{copy(lang,'具体物品','Specific item','指定物品')}</span><div className={`gamble-item-selection${selectedItem?' selected':''}`}><button onClick={()=>{setQuery('');setPickerOpen(true)}}>{selectedItem?<><img className={`rarity-border ${selectedItem.rarity}`} src={asset(selectedItem.iconPath)} alt=""/><span><b>{pick(selectedItem.name,lang)} <NgBadge tier={selectedItem.ngTier}/></b><small>Lv {selectedItem.level} · VALUE {selectedItem.value}</small></span></>:<span><b>{copy(lang,'选择具体物品','Choose a specific item','選擇指定物品')}</b><small>{copy(lang,'不选择时使用物品类型的基础值','Uses the item-type base value when empty','未選擇時使用物品類型的基礎值')}</small></span>}</button>{selectedItem&&<button className="clear-gamble-item" onClick={()=>setItemId(null)} aria-label={copy(lang,'清除具体物品','Clear specific item','清除指定物品')}><X size={16}/></button>}</div></div><label><span>{copy(lang,'物品等级','Item level','物品等級')}</span><NumberInput min={1} max={105} value={level} onChange={setLevel}/></label><label><span>{copy(lang,'孔数','Sockets','孔數')}</span><NumberInput min={0} max={5} value={sockets} onChange={setSockets}/></label></section><section className="price-results"><header><div><span>{copy(lang,'可能价格','Possible prices','可能價格')}</span><h2>{selectedItem?pick(selectedItem.name,lang):copy(lang,selectedType.zhCN,selectedType.en,selectedType.zhTW)} · Lv {level}</h2></div><strong>VALUE {value}</strong></header><div className="price-table"><div className="price-heading"><span>{copy(lang,'价格档','Band','價格組別')}</span><span>{copy(lang,'价格','Price','價格')}</span></div>{rows.map(row=><div className="price-row" key={row.offset}><span>Lv + {row.offset}</span><b>{row.price.toLocaleString()}</b></div>)}</div></section></div><section className="gamble-notes"><Swords/><div><h2>{copy(lang,'价格计算方式','Price calculation','價格計算方式')}</h2><p><span>{copy(lang,'物品类型决定基础系数','Item type sets the base value','物品類型決定基礎值')}</span><Tooltip text={copy(lang,'部分 RARITY 较低的物品除外。','Some items with a lower RARITY use a different value.','部分 RARITY 較低的物品會使用不同數值。')}/>{copy(lang,'；每个孔会使价格提高 10%。再将随机值计入物品等级，','; every socket increases the price by 10%. The random roll is then applied to the item level to ','；每個孔會讓價格提高 10%。再將隨機值計入物品等級，')}<span>{copy(lang,'得到四档价格','produce four prices','得到四種價格')}</span><Tooltip text={formula}/>{lang==='en'?'.':'。'}</p></div><Shield/></section></div>
    {pickerOpen&&<div className="picker-backdrop gamble-picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPickerOpen(false)}}><section className="item-picker" role="dialog" aria-modal="true" aria-label={copy(lang,'选择具体物品','Choose a specific item','選擇指定物品')}><header><div><span>{copy(lang,selectedType.zhCN,selectedType.en,selectedType.zhTW)}</span><h2>{copy(lang,'选择具体物品','Choose a specific item','選擇指定物品')}</h2></div><button onClick={()=>setPickerOpen(false)} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><label className="picker-search"><Search size={17}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy(lang,'搜索名称、套装或效果…','Search name, set or effect…','搜尋名稱、套裝或效果…')}/></label><div className="picker-list"><button className="clear-slot" onClick={()=>{setItemId(null);setPickerOpen(false);setQuery('')}}>{copy(lang,'不选择具体物品','No specific item','不選擇指定物品')}</button>{pickerItems.map(item=><button key={item.id} onClick={()=>chooseItem(item)}><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span><b>{pick(item.name,lang)} <NgBadge tier={item.ngTier}/></b><small>Lv {item.level} · VALUE {item.value}{item.set?` · ${pick(item.set,lang)}`:''}</small></span><em className={`rarity-dot ${item.rarity}`}/></button>)}{!pickerItems.length&&<p>{copy(lang,'没有匹配装备。','No matching equipment.','沒有符合的裝備。')}</p>}</div></section></div>}
  </>
}
