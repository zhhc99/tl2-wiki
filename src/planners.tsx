import { useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, Eye, RefreshCw, RotateCcw, Search, Shield, Swords, X } from 'lucide-react'
import { classes } from './data'
import { pick } from './i18n'
import { SelectControl } from './SelectControl'
import type { Lang, LocalText, StatKey } from './types'

type Stat = Exclude<StatKey, 'none'>
type Rarity = 'normal' | 'rare' | 'unique' | 'legendary'
interface PlannerEffect {
  type:string; activation:string; min:number|null; max:number|null; text?:LocalText|null
}
export interface PlannerEquipment {
  id:string; name:LocalText; iconPath:string|null; rarity:Rarity; set:LocalText|null
  level:number; requiredLevel:number; requirements:{stat:Stat;value:number}[]; classRequirement:string|null
  category:string; subtype:string; blockChance:number|null
  damage:Record<string,[number,number]>; armor:Record<string,[number,number]>
  baseValues:{damage:[number,number]|null;armor:[number,number]|null}
  effects:PlannerEffect[]; rawSetBonuses:(PlannerEffect&{pieces:number})[]
}

const copy=(lang:Lang,zhCN:string,en:string,zhTW=zhCN)=>lang==='en'?en:lang==='zh-TW'?zhTW:zhCN
const asset=(path:string|null)=>path?`${import.meta.env.BASE_URL}${path}`:''
const allText=(value:LocalText)=>`${value.en} ${value.zhCN} ${value.zhTW}`
const classBases:Record<string,Record<Stat,number>>={
  berserker:{str:15,dex:15,foc:5,vit:5}, outlander:{str:10,dex:15,foc:10,vit:5},
  embermage:{str:5,dex:10,foc:15,vit:10}, engineer:{str:15,dex:5,foc:5,vit:15},
}
const classUnits:Record<string,string[]>={berserker:['BERSERKER'],outlander:['OUTLANDER','WANDERER'],embermage:['EMBERMAGE','ARBITER'],engineer:['ENGINEER','RAILMAN']}
const statNames:Record<Stat,LocalText>={
  str:{en:'Strength',zhCN:'力量',zhTW:'力量'},dex:{en:'Dexterity',zhCN:'敏捷',zhTW:'敏捷'},
  foc:{en:'Focus',zhCN:'专注',zhTW:'專注'},vit:{en:'Vitality',zhCN:'体力',zhTW:'體力'},
}
const statEffectTypes:Record<string,Stat>={'STRENGTH BONUS':'str','DEXTERITY BONUS':'dex',MAGIC:'foc',DEFENSE:'vit'}
const twoHanded=new Set(['two_hand_axe','two_hand_mace','two_hand_sword','polearm','bow','crossbow','rifle','cannon','staff'])

type Slot='main'|'off'|'helmet'|'chest'|'shoulders'|'gloves'|'belt'|'pants'|'boots'|'amulet'|'ring1'|'ring2'
const slots:Slot[]=['helmet','amulet','shoulders','chest','gloves','main','off','belt','pants','ring1','ring2','boots']
const slotSubtype:Partial<Record<Slot,string>>={helmet:'helmet',chest:'chest_armor',shoulders:'shoulder_armor',gloves:'gloves',belt:'belt',pants:'pants',boots:'boots',amulet:'amulet',ring1:'ring',ring2:'ring'}
const slotName=(slot:Slot,lang:Lang)=>{
  const names:Record<Slot,[string,string,string]>={
    main:['主手','Main hand','主手'],off:['副手','Off hand','副手'],helmet:['头盔','Helmet','頭盔'],chest:['胸甲','Chest armor','胸甲'],shoulders:['肩甲','Shoulders','肩甲'],gloves:['手套','Gloves','手套'],belt:['腰带','Belt','腰帶'],pants:['腿甲','Pants','腿甲'],boots:['靴子','Boots','靴子'],amulet:['项链','Amulet','項鍊'],ring1:['戒指 1','Ring 1','戒指 1'],ring2:['戒指 2','Ring 2','戒指 2'],
  }
  return copy(lang,...names[slot])
}
const emptyLoadout=()=>Object.fromEntries(slots.map(slot=>[slot,null])) as Record<Slot,string|null>
const chance=(value:number)=>Math.min(50,value*(0.2002-0.0002*value))
const rangeTotal=(values:Record<string,[number,number]>,fallback:[number,number]|null):[number,number]=>{
  const ranges=Object.values(values)
  return ranges.length?ranges.reduce((sum,value)=>[sum[0]+value[0],sum[1]+value[1]],[0,0] as [number,number]):fallback??[0,0]
}

export function BuildsPage({lang,items}:{lang:Lang;items:PlannerEquipment[]}){
  const [classId,setClassId]=useState('berserker')
  const [level,setLevel]=useState(100)
  const [allocated,setAllocated]=useState<Record<Stat,number>>({str:0,dex:0,foc:0,vit:0})
  const [loadout,setLoadout]=useState<Record<Slot,string|null>>(emptyLoadout)
  const [picker,setPicker]=useState<Slot|null>(null)
  const [previewSlot,setPreviewSlot]=useState<Slot|null>(null)
  const [query,setQuery]=useState('')

  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('tl2-build')||'null');if(saved){setClassId(saved.classId||'berserker');setLevel(saved.level||100);setAllocated({...allocated,...saved.allocated});setLoadout({...emptyLoadout(),...saved.loadout})}}catch{/* ignore invalid old data */}},[])
  useEffect(()=>{localStorage.setItem('tl2-build',JSON.stringify({classId,level,allocated,loadout}))},[classId,level,allocated,loadout])

  const byId=useMemo(()=>new Map(items.map(item=>[item.id,item])),[items])
  const equipped=slots.map(slot=>({slot,item:loadout[slot]?byId.get(loadout[slot] as string):undefined})).filter(row=>row.item) as {slot:Slot;item:PlannerEquipment}[]
  const preview=previewSlot?equipped.find(row=>row.slot===previewSlot):undefined
  const setCounts=equipped.reduce((map,{item})=>{if(item.set)map.set(item.set.en,(map.get(item.set.en)||0)+1);return map},new Map<string,number>())
  const activeSetEffects=[...setCounts.entries()].flatMap(([name,count])=>{
    const representative=equipped.find(row=>row.item.set?.en===name)?.item
    return (representative?.rawSetBonuses||[]).filter(effect=>effect.pieces<=count)
  })
  const equipmentEffects=[...equipped.flatMap(row=>row.item.effects),...activeSetEffects]
  const effectSummary=[...equipmentEffects.reduce((map,effect)=>{
    const rawValue=effect.min==null&&effect.max==null?'':effect.min===effect.max?`${effect.min}`:`${effect.min}–${effect.max}`
    const label=effect.text?pick(effect.text,lang):`${effect.type.toLowerCase()}${rawValue?` ${rawValue}`:''}`
    map.set(label,(map.get(label)||0)+1);return map
  },new Map<string,number>()).entries()]
  const gearStats=equipmentEffects.reduce((total,effect)=>{
    const stat=statEffectTypes[effect.type]
    if(stat&&effect.activation==='PASSIVE'&&effect.min!=null&&effect.min===effect.max)total[stat]+=effect.min
    return total
  },{str:0,dex:0,foc:0,vit:0} as Record<Stat,number>)
  const stats=Object.fromEntries((Object.keys(statNames) as Stat[]).map(stat=>[stat,classBases[classId][stat]+allocated[stat]+gearStats[stat]])) as Record<Stat,number>
  const spent=Object.values(allocated).reduce((sum,value)=>sum+value,0)
  const available=(level-1)*5
  const armor=equipped.reduce<[number,number]>((sum,{item})=>{const value=rangeTotal(item.armor,item.baseValues.armor);return [sum[0]+value[0],sum[1]+value[1]]},[0,0])
  const weaponRows=equipped.filter(({slot,item})=>(slot==='main'||slot==='off')&&item.category==='weapon')
  const damage=weaponRows.reduce<[number,number]>((sum,{item})=>{const value=rangeTotal(item.damage,item.baseValues.damage);return [sum[0]+value[0],sum[1]+value[1]]},[0,0])
  const shieldEquipped=equipped.some(({slot,item})=>slot==='off'&&item.subtype==='shield')
  const requirements=equipped.map(({slot,item})=>{
    const classOk=!item.classRequirement||classUnits[classId].includes(item.classRequirement.toUpperCase())
    const ownStats=item.effects.reduce((total,effect)=>{const stat=statEffectTypes[effect.type];if(stat&&effect.activation==='PASSIVE'&&effect.min!=null&&effect.min===effect.max)total[stat]+=effect.min;return total},{str:0,dex:0,foc:0,vit:0} as Record<Stat,number>)
    const statsOk=item.requirements.length>0&&item.requirements.every(requirement=>stats[requirement.stat]-ownStats[requirement.stat]>=requirement.value)
    return {slot,item,ok:classOk&&(level>=item.requiredLevel||statsOk)}
  })

  const pickerItems=useMemo(()=>{
    if(!picker)return[]
    const needle=query.trim().toLowerCase()
    return items.filter(item=>{
      if(item.category==='pet'||item.category==='socketable')return false
      if(picker==='main'&&item.category!=='weapon')return false
      if(picker==='off'&&!(item.category==='weapon'||item.subtype==='shield')||picker==='off'&&twoHanded.has(item.subtype))return false
      if(slotSubtype[picker]&&item.subtype!==slotSubtype[picker])return false
      return !needle||allText(item.name).toLowerCase().includes(needle)
    }).sort((a,b)=>b.level-a.level||a.name.en.localeCompare(b.name.en)).slice(0,120)
  },[items,picker,query])
  const choose=(item:PlannerEquipment)=>{
    if(!picker)return
    setLoadout(current=>({...current,[picker]:item.id,...(picker==='main'&&twoHanded.has(item.subtype)?{off:null}:{})}))
    setPicker(null);setQuery('')
  }
  const reset=()=>{setClassId('berserker');setLevel(100);setAllocated({str:0,dex:0,foc:0,vit:0});setLoadout(emptyLoadout());setPreviewSlot(null)}
  const previewDamage=preview?rangeTotal(preview.item.damage,preview.item.baseValues.damage):[0,0]
  const previewArmor=preview?rangeTotal(preview.item.armor,preview.item.baseValues.armor):[0,0]

  return <><section className="page-header"><div className="content"><span>{copy(lang,'角色','Character','角色')}</span><h1>{copy(lang,'配装','Build planner','配裝')}</h1><p>{copy(lang,'选择职业、分配属性点并穿戴装备，集中查看属性、基础数值和装备需求。','Choose a class, allocate attribute points and equip a full loadout to inspect stats, base values and requirements.','選擇職業、分配屬性點並穿上裝備，集中查看屬性、基礎數值與裝備需求。')}</p></div></section>
    <div className="content page-body build-page">
      <div className="build-toolbar"><SelectControl className="planner-select" label={copy(lang,'职业','Class','職業')} value={classId} onChange={setClassId} options={classes.map(hero=>({value:hero.id,label:pick(hero.name,lang)}))}/><label className="level-input"><span>{copy(lang,'角色等级','Character level','角色等級')}</span><input type="number" min="1" max="100" value={level} onChange={event=>setLevel(Math.max(1,Math.min(100,Number(event.target.value)||1)))}/></label><button className="reset-build" onClick={reset}><RotateCcw size={16}/>{copy(lang,'重置','Reset','重設')}</button></div>
      <div className="build-layout"><section className="paper-doll"><header><div><span>{copy(lang,'装备栏','Equipment','裝備欄')}</span><h2>{pick(classes.find(hero=>hero.id===classId)?.name||classes[0].name,lang)}</h2></div><strong>{equipped.length} / 12</strong></header><div className="slot-grid">{slots.map(slot=>{const item=loadout[slot]?byId.get(loadout[slot] as string):null;const locked=slot==='off'&&Boolean(loadout.main&&twoHanded.has(byId.get(loadout.main)?.subtype||''));return <div key={slot} className={`gear-slot${item?' filled':''}${locked?' disabled':''}`}><span className="slot-label">{slotName(slot,lang)}</span>{item?<><button className="slot-preview" onClick={()=>setPreviewSlot(slot)} aria-label={copy(lang,`速览${pick(item.name,lang)}`,`Quick view: ${pick(item.name,lang)}`,`快速預覽：${pick(item.name,lang)}`)}><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span className="slot-item"><b>{pick(item.name,lang)}</b><small>Lv {item.level}</small></span><Eye className="slot-peek" size={15}/></button><button className="remove-item" onClick={()=>{setLoadout(current=>({...current,[slot]:null}));if(previewSlot===slot)setPreviewSlot(null)}} aria-label={copy(lang,`移除${pick(item.name,lang)}`,`Remove ${pick(item.name,lang)}`,`移除${pick(item.name,lang)}`)}><X size={15}/></button></>:<button className="slot-empty" disabled={locked} onClick={()=>{setPicker(slot);setQuery('')}}>{locked?copy(lang,'双手武器占用','Occupied by two-hand weapon','雙手武器已占用'):copy(lang,'选择装备','Choose item','選擇裝備')}</button>}</div>})}</div></section>
        <aside className="build-inspector"><section className="allocation-card"><header><div><span>{copy(lang,'属性加点','Attributes','屬性加點')}</span><b className={spent>available?'over':''}>{spent} / {available}</b></div><div className="point-track"><i style={{width:`${Math.min(100,available?spent/available*100:0)}%`}}/></div></header>{(Object.keys(statNames) as Stat[]).map(stat=><label className={`stat-allocation ${stat}`} key={stat}><span><b>{pick(statNames[stat],lang)}</b><small>{classBases[classId][stat]} + {gearStats[stat]} {copy(lang,'装备','gear','裝備')}</small></span><input aria-label={pick(statNames[stat],lang)} type="number" min="0" max="495" value={allocated[stat]} onChange={event=>setAllocated(current=>({...current,[stat]:Math.max(0,Math.min(495,Number(event.target.value)||0))}))}/><strong>{stats[stat]}</strong></label>)}{spent>available&&<p className="build-warning">{copy(lang,`超出当前等级可分配点数 ${spent-available} 点。`,`Allocation exceeds the level limit by ${spent-available}.`,`超出目前等級可分配的點數 ${spent-available} 點。`)}</p>}</section>
          <section className="derived-card"><h2>{copy(lang,'属性检视','Stat overview','屬性總覽')}</h2><div className="derived-grid"><div><span>{copy(lang,'武器基础伤害','Base weapon damage','武器基礎傷害')}</span><b>{damage[0]||damage[1]?`${Math.round(damage[0])}–${Math.round(damage[1])}`:'—'}</b></div><div><span>{copy(lang,'基础护甲','Base armor','基礎護甲')}</span><b>{armor[0]||armor[1]?`${Math.round(armor[0])}–${Math.round(armor[1])}`:'—'}</b></div><div><span>{copy(lang,'武器伤害加成','Weapon damage','武器傷害加成')}</span><b>+{(stats.str*.5).toFixed(1)}%</b></div><div><span>{copy(lang,'暴击伤害加成','Critical damage','爆擊傷害加成')}</span><b>+{(stats.str*.4).toFixed(1)}%</b></div><div><span>{copy(lang,'暴击 / 闪避','Critical / dodge','爆擊 / 閃避')}</span><b>{chance(stats.dex).toFixed(1)}%</b></div><div><span>{copy(lang,'元素伤害加成','Elemental damage','元素傷害加成')}</span><b>+{(stats.foc*.5).toFixed(1)}%</b></div><div><span>{copy(lang,'额外法力','Added mana','額外法力')}</span><b>+{(stats.foc*.5).toFixed(1)}</b></div><div><span>{copy(lang,'处决几率','Execute chance','處決機率')}</span><b>{chance(stats.foc).toFixed(1)}%</b></div><div><span>{copy(lang,'额外生命','Added health','額外生命')}</span><b>+{Math.round(stats.vit*3.6)}</b></div><div><span>{copy(lang,'护甲加成','Armor bonus','護甲加成')}</span><b>+{(stats.vit*.25).toFixed(1)}%</b></div><div><span>{copy(lang,'格挡几率','Block chance','格擋機率')}</span><b>{shieldEquipped?`${chance(stats.vit).toFixed(1)}%`:'—'}</b></div></div></section>
          {(requirements.length>0||setCounts.size>0)&&<section className="build-status"><h2>{copy(lang,'当前配置','Current loadout','目前配裝')}</h2>{requirements.map(({slot,item,ok})=><div key={slot}><span>{slotName(slot,lang)} · {pick(item.name,lang)}</span><b className={ok?'ok':'blocked'}>{ok?copy(lang,'可装备','Ready','可裝備'):copy(lang,'未满足需求','Requirements not met','未符合需求')}</b></div>)}{[...setCounts.entries()].map(([name,count])=><div key={name}><span>{pick(equipped.find(row=>row.item.set?.en===name)?.item.set as LocalText,lang)}</span><b>{count} {copy(lang,'件','pieces','件')}</b></div>)}</section>}
        </aside></div>
      {effectSummary.length>0&&<section className="build-effects"><header><div><span>{copy(lang,'当前加成','Current bonuses','目前加成')}</span><h2>{copy(lang,'装备效果汇总','Equipment effects','裝備效果總覽')}</h2></div><strong>{effectSummary.length}</strong></header><ul>{effectSummary.map(([label,count])=><li key={label}><span>{label}</span>{count>1&&<b>× {count}</b>}</li>)}</ul></section>}
    </div>
    {preview&&<div className="gear-preview-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewSlot(null)}}><section className="gear-preview" role="dialog" aria-modal="true" aria-label={copy(lang,'装备速览','Equipment quick view','裝備快速預覽')}><header><div><span>{slotName(preview.slot,lang)} · {copy(lang,'速览','Quick view','快速預覽')}</span><h2>{pick(preview.item.name,lang)}</h2></div><button onClick={()=>setPreviewSlot(null)} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><div className="gear-preview-title"><img className={`rarity-border ${preview.item.rarity}`} src={asset(preview.item.iconPath)} alt=""/><div><b>Lv {preview.item.level}</b>{preview.item.set&&<span>{pick(preview.item.set,lang)}</span>}<small>{copy(lang,`需求等级 ${preview.item.requiredLevel||'—'}`,`Requires level ${preview.item.requiredLevel||'—'}`,`需求等級 ${preview.item.requiredLevel||'—'}`)}</small></div></div><div className="gear-preview-values">{Boolean(previewDamage[0]||previewDamage[1])&&<div><span>{copy(lang,'基础伤害','Base damage','基礎傷害')}</span><b>{Math.round(previewDamage[0])}–{Math.round(previewDamage[1])}</b></div>}{Boolean(previewArmor[0]||previewArmor[1])&&<div><span>{copy(lang,'基础护甲','Base armor','基礎護甲')}</span><b>{Math.round(previewArmor[0])}–{Math.round(previewArmor[1])}</b></div>}{preview.item.requirements.map(requirement=><div key={requirement.stat}><span>{pick(statNames[requirement.stat],lang)}</span><b>{requirement.value}</b></div>)}</div>{preview.item.effects.length>0&&<section><h3>{copy(lang,'装备效果','Equipment effects','裝備效果')}</h3><ul>{preview.item.effects.map((effect,index)=><li key={`${effect.type}-${index}`}>{effect.text?pick(effect.text,lang):effect.type}</li>)}</ul></section>}<footer><button className="preview-replace" onClick={()=>{setPicker(preview.slot);setQuery('');setPreviewSlot(null)}}><RefreshCw size={16}/>{copy(lang,'更换装备','Replace item','更換裝備')}</button><button onClick={()=>setPreviewSlot(null)}>{copy(lang,'关闭','Close','關閉')}</button></footer></section></div>}
    {picker&&<div className="picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPicker(null)}}><section className="item-picker"><header><div><span>{slotName(picker,lang)}</span><h2>{copy(lang,'选择装备','Choose equipment','選擇裝備')}</h2></div><button onClick={()=>setPicker(null)} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><label className="picker-search"><Search size={17}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy(lang,'搜索装备名称…','Search equipment…','搜尋裝備名稱…')}/></label><div className="picker-list"><button className="clear-slot" onClick={()=>{setLoadout(current=>({...current,[picker]:null}));setPicker(null)}}>{copy(lang,'清空这个栏位','Clear this slot','清除此欄位')}</button>{pickerItems.map(item=><button key={item.id} onClick={()=>choose(item)}><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span><b>{pick(item.name,lang)}</b><small>Lv {item.level}{item.set?` · ${pick(item.set,lang)}`:''}</small></span><em className={`rarity-dot ${item.rarity}`}/></button>)}{!pickerItems.length&&<p>{copy(lang,'没有匹配装备。','No matching equipment.','沒有符合的裝備。')}</p>}</div></section></div>}</>
}

const gambleTypes=[
  ['weapon',100,'Weapon','武器','武器'],['chest',100,'Chest armor','胸甲','胸甲'],['pants',80,'Pants','腿甲','腿甲'],['boots',80,'Boots','靴子','靴子'],['shoulders',80,'Shoulder armor','肩甲','肩甲'],['shield',75,'Shield','盾牌','盾牌'],['helmet',73,'Helmet','头盔','頭盔'],['gloves',65,'Gloves','手套','手套'],['amulet',60,'Necklace','项链','項鍊'],['ring',60,'Ring','戒指','戒指'],['belt',60,'Belt','腰带','腰帶'],
] as const

export function GamblingPage({lang}:{lang:Lang}){
  const [type,setType]=useState('weapon');const [level,setLevel]=useState(50);const [sockets,setSockets]=useState(0)
  const selected=gambleTypes.find(row=>row[0]===type)||gambleTypes[0]
  const rows=[4,5,6,7].map(offset=>{const raw=(level+offset)*selected[1]*(1+sockets/10);return {offset,raw,low:Math.floor(raw),high:Math.ceil(raw)}})
  return <><section className="page-header"><div className="content"><span>{copy(lang,'商店','Shop','商店')}</span><h1>{copy(lang,'赌博','Gambling','賭博')}</h1><p>{copy(lang,'赌博商人的标价由物品类型、物品等级和孔数决定。输入条件即可查看全部八个整数价格。','Gambler prices depend on item type, item level and sockets. Enter the item details to see all eight integer outcomes.','賭博商人的價格取決於物品類型、物品等級與孔數。輸入條件即可查看八種整數價格。')}</p></div></section><div className="content page-body gamble-page"><div className="gamble-layout"><section className="gamble-controls"><div className="gamble-mark"><CircleDollarSign/><span>{copy(lang,'价格计算器','Price calculator','價格試算')}</span></div><label><span>{copy(lang,'物品类型','Item type','物品類型')}</span><SelectControl className="planner-select" label={copy(lang,'物品类型','Item type','物品類型')} value={type} onChange={setType} options={gambleTypes.map(row=>({value:row[0],label:copy(lang,row[3],row[2],row[4])}))}/></label><label><span>{copy(lang,'物品等级','Item level','物品等級')}</span><input type="number" min="1" max="100" value={level} onChange={event=>setLevel(Math.max(1,Math.min(100,Number(event.target.value)||1)))}/></label><label><span>{copy(lang,'孔数','Sockets','孔數')}</span><input type="number" min="0" max="5" value={sockets} onChange={event=>setSockets(Math.max(0,Math.min(5,Number(event.target.value)||0)))}/></label><div className="formula"><span>{copy(lang,'计算式','Formula','公式')}</span><code>{copy(lang,`(等级 + 4…7) × ${selected[1]} × (1 + 孔数 ÷ 10)`,`(level + 4…7) × ${selected[1]} × (1 + sockets ÷ 10)`,`(等級 + 4…7) × ${selected[1]} × (1 + 孔數 ÷ 10)`)}</code></div></section><section className="price-results"><header><div><span>{copy(lang,'可能价格','Possible prices','可能價格')}</span><h2>{copy(lang,selected[3],selected[2],selected[4])} · Lv {level}</h2></div><strong>× {selected[1]}</strong></header><div className="price-table"><div className="price-heading"><span>{copy(lang,'价格档','Band','價格組別')}</span><span>{copy(lang,'向下取整','Rounded down','無條件捨去')}</span><span>{copy(lang,'向上取整','Rounded up','無條件進位')}</span></div>{rows.map(row=><div className="price-row" key={row.offset}><span>Lv + {row.offset}<small>{row.raw.toFixed(2)}</small></span><b>{row.low.toLocaleString()}</b><b>{row.high.toLocaleString()}</b></div>)}</div><p>{copy(lang,'共有四个原始价格；游戏可能向下或向上取整，因此列出八个整数结果。两种取整相同时，会看到重复价格。','There are four underlying values. Each may be rounded down or up, producing eight integer outcomes; identical rounding results appear twice.','共有四組原始價格；遊戲可能採用無條件捨去或進位，因此列出八種整數結果。兩者相同時會出現重複價格。')}</p></section></div><section className="gamble-notes"><Swords/><div><h2>{copy(lang,'价格计算方式','Price calculation','價格計算方式')}</h2><p>{copy(lang,'物品类型决定基础系数；每个孔会使价格提高 10%。再将物品等级分别加 4、5、6、7，得到四档价格。','Item type sets the base factor and every socket adds 10%. The gambler then uses item level plus 4, 5, 6 and 7 for the four price bands.','物品類型決定基礎係數，每個孔會讓價格提高 10%。再將物品等級分別加上 4、5、6、7，得到四組價格。')}</p></div><Shield/></section></div></>
}
