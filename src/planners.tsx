import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, CircleAlert, CircleDollarSign, ClipboardCopy, ClipboardPaste, Eye, Gem, RefreshCw, RotateCcw, Search, Shield, Swords, X } from 'lucide-react'
import { classes } from './data'
import { allText, asset, ngLabel, type DbEquipment as PlannerEquipment, type RawEffect as PlannerEffect } from './domain'
import { copy, pick } from './i18n'
import { NumberInput } from './NumberInput'
import { SelectControl } from './SelectControl'
import type { Lang, LocalText, StatKey } from './types'

type Stat = Exclude<StatKey, 'none'>
const NgBadge=({tier}:{tier:number})=>ngLabel(tier)?<span className="ng-badge">{ngLabel(tier)}</span>:null
const classBases:Record<string,Record<Stat,number>>={
  berserker:{str:15,dex:15,foc:5,vit:5}, outlander:{str:10,dex:15,foc:10,vit:5},
  embermage:{str:5,dex:10,foc:15,vit:10}, engineer:{str:15,dex:5,foc:5,vit:15},
}
const classUnits:Record<string,string[]>={berserker:['BERSERKER'],outlander:['OUTLANDER','WANDERER'],embermage:['EMBERMAGE','ARBITER'],engineer:['ENGINEER','RAILMAN']}
const classDamageReduction:Record<string,number>={berserker:25,outlander:0,embermage:0,engineer:25}
const statNames:Record<Stat,LocalText>={
  str:{en:'Strength',zhCN:'力量',zhTW:'力量'},dex:{en:'Dexterity',zhCN:'敏捷',zhTW:'敏捷'},
  foc:{en:'Focus',zhCN:'专注',zhTW:'專注'},vit:{en:'Vitality',zhCN:'体力',zhTW:'體力'},
}
const statEffectTypes:Record<string,Stat>={'STRENGTH BONUS':'str','DEXTERITY BONUS':'dex',MAGIC:'foc',DEFENSE:'vit'}
const twoHanded=new Set(['two_hand_axe','two_hand_mace','two_hand_sword','polearm','bow','crossbow','rifle','cannon','staff'])

type Slot='main'|'off'|'helmet'|'chest'|'shoulders'|'gloves'|'belt'|'pants'|'boots'|'amulet'|'ring1'|'ring2'
type SocketLoadout=Partial<Record<Slot,(string|null)[]>>
interface BuildState {
  classId:string;level:number;allocated:Record<Stat,number>;loadout:Record<Slot,string|null>;socketLoadout:SocketLoadout
}
type TransferDialog={mode:'import'|'export';text:string;message:string}
type ImportError='empty'|'format'|'version'|'class'
const slots:Slot[]=['main','off','helmet','shoulders','chest','gloves','belt','pants','boots','amulet','ring1','ring2']
const slotSubtype:Partial<Record<Slot,string>>={helmet:'helmet',chest:'chest_armor',shoulders:'shoulder_armor',gloves:'gloves',belt:'belt',pants:'pants',boots:'boots',amulet:'amulet',ring1:'ring',ring2:'ring'}
const slotName=(slot:Slot,lang:Lang)=>{
  const names:Record<Slot,[string,string,string]>={
    main:['主手','Main hand','主手'],off:['副手','Off hand','副手'],helmet:['头盔','Helmet','頭盔'],chest:['胸甲','Chest armor','胸甲'],shoulders:['肩甲','Shoulders','肩甲'],gloves:['手套','Gloves','手套'],belt:['腰带','Belt','腰帶'],pants:['腿甲','Pants','腿甲'],boots:['靴子','Boots','靴子'],amulet:['项链','Amulet','項鍊'],ring1:['戒指 1','Ring 1','戒指 1'],ring2:['戒指 2','Ring 2','戒指 2'],
  }
  return copy(lang,...names[slot])
}
const emptyLoadout=()=>Object.fromEntries(slots.map(slot=>[slot,null])) as Record<Slot,string|null>
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)
const clampedInteger=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.trunc(value))):fallback
const itemFitsSlot=(item:PlannerEquipment,slot:Slot)=>{
  if(slot==='main')return item.category==='weapon'
  if(slot==='off')return (item.category==='weapon'||item.subtype==='shield')&&!twoHanded.has(item.subtype)
  return slotSubtype[slot]===item.subtype
}
const bytesToBase64Url=(bytes:Uint8Array)=>{
  let binary=''
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000))
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')
}
const base64UrlToBytes=(value:string)=>{
  if(!value||value.length>20000||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('invalid build data')
  const base64=value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=')
  return Uint8Array.from(atob(base64),character=>character.charCodeAt(0))
}
const compressText=async(value:string)=>{
  const stream=new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
const decompressText=async(bytes:Uint8Array)=>{
  const input=new Uint8Array(bytes.length)
  input.set(bytes)
  const reader=new Blob([input.buffer]).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  const chunks:Uint8Array[]=[]
  let length=0
  while(true){
    const {done,value}=await reader.read()
    if(done)break
    length+=value.length
    if(length>100000){await reader.cancel();throw new Error('build data too large')}
    chunks.push(value)
  }
  const output=new Uint8Array(length)
  let offset=0
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}
  return new TextDecoder().decode(output)
}
const serializeBuild=async({classId,level,allocated,loadout,socketLoadout}:BuildState)=>{
  const equipment=Object.fromEntries(slots.flatMap(slot=>loadout[slot]?[[slot,loadout[slot]]]:[]))
  const gems=Object.fromEntries(slots.flatMap(slot=>socketLoadout[slot]?.some(Boolean)?[[slot,socketLoadout[slot]]]:[]))
  const json=JSON.stringify({version:1,classId,level,attributes:allocated,equipment,gems})
  const buildCode=`TL2BUILD/1:${bytesToBase64Url(await compressText(json))}`
  return `Torchlight II Build\n\n在 Build Planner 中导入：\nhttps://zhhc99.github.io/tl2-wiki/#/builds\n\n${buildCode}`
}
const parseBuild=async(text:string,items:PlannerEquipment[]):Promise<{state:BuildState;skipped:number}|{error:ImportError}>=>{
  const source=text.trim()
  if(!source)return {error:'empty'}
  const match=source.match(/TL2BUILD\/(\d+):([A-Za-z0-9_-]+)/)
  if(!match)return {error:'format'}
  if(match[1]!=='1')return {error:'version'}
  let value:unknown
  try{value=JSON.parse(await decompressText(base64UrlToBytes(match[2])))}catch{return {error:'format'}}
  if(!isRecord(value))return {error:'format'}
  if(value.version!==1)return {error:'version'}
  if(typeof value.classId!=='string'||!Object.hasOwn(classBases,value.classId))return {error:'class'}
  const classId=value.classId
  const attributes=isRecord(value.attributes)?value.attributes:{}
  const allocated=Object.fromEntries((Object.keys(statNames) as Stat[]).map(stat=>[stat,clampedInteger(attributes[stat],0,495,0)])) as Record<Stat,number>
  const level=clampedInteger(value.level,1,100,100)
  const equipment=isRecord(value.equipment)?value.equipment:{}
  const gems=isRecord(value.gems)?value.gems:{}
  const byId=new Map(items.map(item=>[item.id,item]))
  const loadout=emptyLoadout()
  const socketLoadout:SocketLoadout={}
  let skipped=0
  for(const slot of slots){
    const id=equipment[slot]
    if(id==null)continue
    const item=typeof id==='string'?byId.get(id):null
    if(!item||!itemFitsSlot(item,slot)||!isClassCompatible(item,classId)){skipped+=1;continue}
    loadout[slot]=item.id
  }
  const main=loadout.main?byId.get(loadout.main):null
  if(main&&twoHanded.has(main.subtype)&&loadout.off){loadout.off=null;skipped+=1}
  for(const slot of slots){
    const item=loadout[slot]?byId.get(loadout[slot] as string):null
    const ids=gems[slot]
    if(!item||!Array.isArray(ids))continue
    const values:(string|null)[]=[]
    for(const id of ids.slice(0,buildSocketCount(item))){
      const gem=typeof id==='string'?byId.get(id):null
      if(gem?.category==='socketable'&&activeGemEffects(gem,item).length){values.push(gem.id)}
      else {values.push(null);if(id!=null)skipped+=1}
    }
    if(values.some(Boolean))socketLoadout[slot]=values
  }
  return {state:{classId,level,allocated,loadout,socketLoadout},skipped}
}
const chance=(value:number)=>Math.min(50,value*(0.2002-0.0002*value))
const rangeTotal=(values:Record<string,[number,number]>):[number,number]=>{
  const ranges=Object.values(values)
  return ranges.reduce((sum,value)=>[sum[0]+value[0],sum[1]+value[1]],[0,0] as [number,number])
}
const isClassCompatible=(item:PlannerEquipment,classId:string)=>!item.classRequirement||classUnits[classId].includes(item.classRequirement.toUpperCase())
const fixedEffectValue=(effect:PlannerEffect)=>effect.activation==='PASSIVE'&&effect.min!=null&&effect.min===effect.max?effect.min:0
const socketTargetFor=(item:PlannerEquipment):'weapon'|'armor'=>item.category==='weapon'?'weapon':'armor'
const activeGemEffects=(gem:PlannerEquipment,item:PlannerEquipment)=>gem.effects.filter(effect=>effect.socketTargets?.includes(socketTargetFor(item)))
const buildSocketCount=(item:PlannerEquipment)=>{
  const rarityMinimum=item.rarity==='rare'?(item.category==='weapon'?4:2):item.rarity==='unique'||item.rarity==='legendary'?2:0
  return Math.max(rarityMinimum,item.sockets)
}

const numberToken=/[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g
const nonStackingEffect=/^(?:ADD TRIGGERABLE|CAST SKILL(?:\s|$)|MISSILE REFLECT$)/
interface NumberTemplate { before:string;after:string;factor:number;explicitPlus:boolean }
interface NumberTemplates { en:NumberTemplate;zhCN:NumberTemplate;zhTW:NumberTemplate }
interface EffectSummary { key:string;label:string;count:number;aggregated:boolean }
const numberTemplate=(text:string,value:number):NumberTemplate|null=>{
  const matches=[...text.matchAll(numberToken)]
  if(matches.length!==1||value===0)return null
  const match=matches[0]
  const rendered=Number(match[0])
  if(!Number.isFinite(rendered)||Math.abs(Math.abs(rendered)-Math.abs(value))>1e-4)return null
  const start=match.index as number
  return {before:text.slice(0,start),after:text.slice(start+match[0].length),factor:rendered/value,explicitPlus:match[0].startsWith('+')}
}
const localTemplates=(effect:PlannerEffect)=>effect.text&&effect.min!=null?{
  en:numberTemplate(effect.text.en,effect.min),
  zhCN:numberTemplate(effect.text.zhCN,effect.min),
  zhTW:numberTemplate(effect.text.zhTW,effect.min),
}:null
const formatEffectValue=(value:number,explicitPlus:boolean)=>{
  const rounded=Number(value.toFixed(4))
  return `${explicitPlus&&rounded>0?'+':''}${rounded}`
}
const summarizeEffects=(effects:PlannerEffect[],lang:Lang):EffectSummary[]=>{
  type StackableRow={key:string;templates:NumberTemplates;total:number;count:number}
  type RepeatedRow={key:string;label:string;count:number}
  const rows=new Map<string,StackableRow|RepeatedRow>()
  effects.forEach(effect=>{
    const value=fixedEffectValue(effect)
    const templates=effect.activation==='PASSIVE'&&!nonStackingEffect.test(effect.type)?localTemplates(effect):null
    if(value&&templates?.en&&templates.zhCN&&templates.zhTW){
      const templateKey=JSON.stringify([effect.type,effect.damageType,templates.en,templates.zhCN,templates.zhTW])
      const key=`sum:${templateKey}`
      const current=rows.get(key) as StackableRow|undefined
      if(current){current.total+=value;current.count+=1}
      else rows.set(key,{key,templates:{en:templates.en,zhCN:templates.zhCN,zhTW:templates.zhTW},total:value,count:1})
      return
    }
    const rawValue=effect.min==null&&effect.max==null?'':effect.min===effect.max?`${effect.min}`:`${effect.min}–${effect.max}`
    const label=effect.text?pick(effect.text,lang):`${effect.type.toLowerCase()}${rawValue?` ${rawValue}`:''}`
    const key=`raw:${label}`
    const current=rows.get(key) as RepeatedRow|undefined
    if(current)current.count+=1
    else rows.set(key,{key,label,count:1})
  })
  return [...rows.values()].map(row=>{
    if('templates' in row){
      const template=lang==='en'?row.templates.en:lang==='zh-TW'?row.templates.zhTW:row.templates.zhCN
      const rendered=row.total*template.factor
      return {key:row.key,label:`${template.before}${formatEffectValue(rendered,template.explicitPlus)}${template.after}`,count:row.count,aggregated:row.count>1}
    }
    return {...row,aggregated:false}
  })
}

export function BuildsPage({lang,items}:{lang:Lang;items:PlannerEquipment[]}){
  const [classId,setClassId]=useState('berserker')
  const [level,setLevel]=useState(100)
  const [allocated,setAllocated]=useState<Record<Stat,number>>({str:0,dex:0,foc:0,vit:0})
  const [loadout,setLoadout]=useState<Record<Slot,string|null>>(emptyLoadout)
  const [socketLoadout,setSocketLoadout]=useState<SocketLoadout>({})
  const [picker,setPicker]=useState<Slot|null>(null)
  const [gemPicker,setGemPicker]=useState<{slot:Slot;index:number}|null>(null)
  const [previewSlot,setPreviewSlot]=useState<Slot|null>(null)
  const [candidate,setCandidate]=useState<{slot:Slot;item:PlannerEquipment}|null>(null)
  const [query,setQuery]=useState('')
  const [gemQuery,setGemQuery]=useState('')
  const [restored,setRestored]=useState(false)
  const [transfer,setTransfer]=useState<TransferDialog|null>(null)
  const [notice,setNotice]=useState('')

  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('tl2-build')||'null');if(saved){setClassId(saved.classId||'berserker');setLevel(saved.level||100);setAllocated(current=>({...current,...saved.allocated}));setLoadout({...emptyLoadout(),...saved.loadout});setSocketLoadout(saved.socketLoadout||{})}}catch{/* ignore invalid old data */}finally{setRestored(true)}},[])
  useEffect(()=>{if(restored)try{localStorage.setItem('tl2-build',JSON.stringify({classId,level,allocated,loadout,socketLoadout}))}catch{/* storage may be unavailable */}},[classId,level,allocated,loadout,socketLoadout,restored])
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),3200);return()=>window.clearTimeout(timer)},[notice])

  const byId=useMemo(()=>new Map(items.map(item=>[item.id,item])),[items])
  useEffect(()=>{
    if(!restored||!items.length)return
    setLoadout(current=>{
      let changed=false
      const next={...current}
      for(const slot of slots){const item=current[slot]?byId.get(current[slot] as string):null;if(item&&!isClassCompatible(item,classId)){next[slot]=null;changed=true}}
      const main=next.main?byId.get(next.main):null
      if(main&&twoHanded.has(main.subtype)&&next.off){next.off=null;changed=true}
      return changed?next:current
    })
    setPreviewSlot(null);setCandidate(null)
  },[classId,items,byId,restored])
  useEffect(()=>{
    if(!restored||!items.length)return
    setSocketLoadout(current=>{
      let changed=false
      const next:SocketLoadout={}
      for(const slot of slots){
        const item=loadout[slot]?byId.get(loadout[slot] as string):null
        const values=(current[slot]||[]).slice(0,item?buildSocketCount(item):0).map(id=>id&&byId.get(id)?.category==='socketable'?id:null)
        if(values.some(Boolean))next[slot]=values
        if(JSON.stringify(values)!==JSON.stringify(current[slot]||[]))changed=true
      }
      return changed?next:current
    })
  },[loadout,items.length,byId,restored])
  const equipped=slots.map(slot=>({slot,item:loadout[slot]?byId.get(loadout[slot] as string):undefined})).filter(row=>row.item) as {slot:Slot;item:PlannerEquipment}[]
  const preview=candidate||(previewSlot?equipped.find(row=>row.slot===previewSlot):undefined)
  const setCounts=equipped.reduce((map,{item})=>{if(item.set&&item.setInternalName)map.set(item.setInternalName,(map.get(item.setInternalName)||0)+1);return map},new Map<string,number>())
  const activeSetEffects=[...setCounts.entries()].flatMap(([setId,count])=>{
    const representative=equipped.find(row=>row.item.setInternalName===setId)?.item
    return (representative?.rawSetBonuses||[]).filter(effect=>effect.pieces<=count)
  })
  const activeSocketRows=equipped.flatMap(({slot,item})=>(socketLoadout[slot]||[]).slice(0,buildSocketCount(item)).flatMap((gemId,index)=>{
    const gem=gemId?byId.get(gemId):null
    if(!gem||gem.category!=='socketable')return []
    const effects=activeGemEffects(gem,item)
    return effects.length?[{slot,index,item,gem,effects}]:[]
  }))
  const equipmentEffects=[...equipped.flatMap(row=>row.item.effects),...activeSetEffects,...activeSocketRows.flatMap(row=>row.effects)]
  const effectSummary=summarizeEffects(equipmentEffects,lang)
  const gearStats=equipmentEffects.reduce((total,effect)=>{
    const stat=statEffectTypes[effect.type]
    if(stat)total[stat]+=fixedEffectValue(effect)
    return total
  },{str:0,dex:0,foc:0,vit:0} as Record<Stat,number>)
  const stats=Object.fromEntries((Object.keys(statNames) as Stat[]).map(stat=>[stat,classBases[classId][stat]+allocated[stat]+gearStats[stat]])) as Record<Stat,number>
  const spent=Object.values(allocated).reduce((sum,value)=>sum+value,0)
  const available=(level-1)*5
  const armor=equipped.reduce<[number,number]>((sum,{item})=>{const value=rangeTotal(item.armor);return [sum[0]+value[0],sum[1]+value[1]]},[0,0])
  const weaponRows=equipped.filter(({slot,item})=>(slot==='main'||slot==='off')&&item.category==='weapon')
  const damage=weaponRows.reduce<[number,number]>((sum,{item})=>{const value=rangeTotal(item.damage);return [sum[0]+value[0],sum[1]+value[1]]},[0,0])
  const shield=equipped.find(({slot,item})=>slot==='off'&&item.subtype==='shield')?.item
  const sumEffects=(type:string,damageType?:string)=>equipmentEffects.reduce((sum,effect)=>sum+(effect.type===type&&(!damageType||effect.damageType===damageType)?fixedEffectValue(effect):0),0)
  const mainWeapon=equipped.find(({slot,item})=>slot==='main'&&item.category==='weapon')?.item
  const weaponEffectType=mainWeapon&&['wand','staff'].includes(mainWeapon.subtype)?'PERCENT MAGIC ITEM DAMAGE BONUS':mainWeapon&&['bow','crossbow','pistol','rifle','cannon'].includes(mainWeapon.subtype)?'PERCENT RANGEDDAMAGE':'PERCENT MELEEDAMAGE'
  const weaponDamageBonus=stats.str*.5+sumEffects(weaponEffectType)
  const armorBonus=stats.vit*.25+sumEffects('PERCENT ARMOR BONUS')
  const criticalChance=Math.min(100,chance(stats.dex)+sumEffects('CRITICAL CHANCE'))
  const criticalDamage=stats.str*.4+sumEffects('PERCENT CRITICAL DAMAGE')
  const addedHealth=stats.vit*3.6+sumEffects('MAX HP')
  const addedHealthPercent=sumEffects('PERCENT HP')
  const dodgeChance=Math.min(75,chance(stats.dex)+sumEffects('DODGE CHANCE BONUS'))
  const addedMana=stats.foc*.5+sumEffects('MAX MANA')
  const addedManaPercent=sumEffects('PERCENT MANA')
  const focusDamageBonus=stats.foc*.5
  const blockChance=shield?Math.min(75,(shield.blockChance||0)+chance(stats.vit)+sumEffects('PERCENT BLOCK CHANCE BASE')):null
  const executeChance=Math.min(100,chance(stats.foc)+sumEffects('PERCENT DUAL WIELDING ATTACK'))
  const allDamage=sumEffects('PERCENT DAMAGE BONUS','ALL')
  const allDamageReduction=classDamageReduction[classId]-sumEffects('PERCENT DAMAGE TAKEN','ALL')
  const requirements=equipped.map(({slot,item})=>{
    const classOk=isClassCompatible(item,classId)
    const ownEffects=[...item.effects,...activeSocketRows.filter(row=>row.slot===slot).flatMap(row=>row.effects)]
    const ownStats=ownEffects.reduce((total,effect)=>{const stat=statEffectTypes[effect.type];if(stat)total[stat]+=fixedEffectValue(effect);return total},{str:0,dex:0,foc:0,vit:0} as Record<Stat,number>)
    const statsOk=item.requirements.length>0&&item.requirements.every(requirement=>stats[requirement.stat]-ownStats[requirement.stat]>=requirement.value)
    return {slot,item,ok:classOk&&(level>=item.requiredLevel||statsOk),classOk,levelOk:level>=item.requiredLevel,statsOk}
  })
  const requirementsBySlot=new Map(requirements.map(row=>[row.slot,row]))

  const pickerItems=useMemo(()=>{
    if(!picker)return[]
    const needle=query.trim().toLowerCase()
    return items.filter(item=>{
      if(item.category==='pet'||item.category==='socketable')return false
      if(!isClassCompatible(item,classId))return false
      if(picker==='main'&&item.category!=='weapon')return false
      if(picker==='off'&&!(item.category==='weapon'||item.subtype==='shield')||picker==='off'&&twoHanded.has(item.subtype))return false
      if(slotSubtype[picker]&&item.subtype!==slotSubtype[picker])return false
      return !needle||`${allText(item.name)} ${ngLabel(item.ngTier)||''} ${item.set?allText(item.set):''} ${item.effects.map(effect=>effect.text?allText(effect.text):'').join(' ')}`.toLowerCase().includes(needle)
    }).sort((a,b)=>b.level-a.level||a.name.en.localeCompare(b.name.en)).slice(0,120)
  },[items,picker,query,classId])
  const gemPickerItem=gemPicker&&loadout[gemPicker.slot]?byId.get(loadout[gemPicker.slot] as string):null
  const gemPickerItems=useMemo(()=>{
    if(!gemPickerItem)return[]
    const needle=gemQuery.trim().toLowerCase()
    return items.filter(item=>item.category==='socketable'&&activeGemEffects(item,gemPickerItem).length>0&&(!needle||`${allText(item.name)} ${item.effects.map(effect=>effect.text?allText(effect.text):'').join(' ')}`.toLowerCase().includes(needle)))
      .sort((a,b)=>b.level-a.level||a.name.en.localeCompare(b.name.en)).slice(0,160)
  },[items,gemPickerItem,gemQuery])
  const choose=(item:PlannerEquipment)=>{
    if(!picker)return
    setCandidate({slot:picker,item});setPicker(null);setQuery('')
  }
  const equipCandidate=()=>{if(!candidate)return;setLoadout(current=>({...current,[candidate.slot]:candidate.item.id,...(candidate.slot==='main'&&twoHanded.has(candidate.item.subtype)?{off:null}:{})}));setSocketLoadout(current=>({...current,[candidate.slot]:[],...(candidate.slot==='main'&&twoHanded.has(candidate.item.subtype)?{off:[]}:{})}));setCandidate(null);setPreviewSlot(null)}
  const chooseGem=(gem:PlannerEquipment)=>{if(!gemPicker)return;const {slot,index}=gemPicker;setSocketLoadout(current=>{const values=[...(current[slot]||[])];values[index]=gem.id;return {...current,[slot]:values}});setGemPicker(null);setGemQuery('');setPreviewSlot(slot)}
  const closePreview=()=>{setPreviewSlot(null);setCandidate(null)}
  const reset=()=>{setClassId('berserker');setLevel(100);setAllocated({str:0,dex:0,foc:0,vit:0});setLoadout(emptyLoadout());setSocketLoadout({});setPreviewSlot(null);setCandidate(null);setGemPicker(null)}
  const currentBuild=():BuildState=>({classId,level,allocated,loadout,socketLoadout})
  const exportBuild=async()=>{
    let text:string
    try{text=await serializeBuild(currentBuild())}catch{setNotice(copy(lang,'暂时无法生成配装文字。','Build text could not be created right now.','目前無法產生配裝文字。'));return}
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setNotice(copy(lang,'配装文字已复制。','Build text copied.','配裝文字已複製。'))
    }catch{
      setTransfer({mode:'export',text,message:copy(lang,'浏览器无法写入剪贴板，请手动复制。','Your browser could not write to the clipboard. Copy the text manually.','瀏覽器無法寫入剪貼簿，請手動複製。')})
    }
  }
  const pasteBuild=async()=>{
    try{
      if(!navigator.clipboard?.readText)throw new Error('clipboard unavailable')
      const text=await navigator.clipboard.readText()
      setTransfer({mode:'import',text,message:''})
    }catch{
      setTransfer(current=>current&&current.mode==='import'?{...current,message:copy(lang,'无法读取剪贴板，请在下方手动粘贴。','Clipboard access was blocked. Paste the text below manually.','無法讀取剪貼簿，請在下方手動貼上。')}:current)
    }
  }
  const importBuild=async()=>{
    if(!transfer||transfer.mode!=='import')return
    if(!items.length){setTransfer({...transfer,message:copy(lang,'装备仍在加载，请稍后再试。','Equipment is still loading. Try again in a moment.','裝備仍在載入，請稍後再試。')});return}
    const result=await parseBuild(transfer.text,items)
    if('error' in result){
      const message=result.error==='empty'?copy(lang,'请先粘贴配装文字。','Paste build text first.','請先貼上配裝文字。'):result.error==='version'?copy(lang,'此配装来自不支持的版本。','This build uses an unsupported version.','此配裝來自不支援的版本。'):result.error==='class'?copy(lang,'配装中的职业无法识别。','The class in this build is not recognized.','無法辨識此配裝的職業。'):copy(lang,'无法识别这段配装文字，请确认内容完整。','This build text could not be read. Check that it is complete.','無法辨識這段配裝文字，請確認內容完整。')
      setTransfer({...transfer,message});return
    }
    const {state,skipped}=result
    setClassId(state.classId);setLevel(state.level);setAllocated(state.allocated);setLoadout(state.loadout);setSocketLoadout(state.socketLoadout)
    setPreviewSlot(null);setCandidate(null);setPicker(null);setGemPicker(null);setTransfer(null)
    setNotice(skipped?copy(lang,`配装已导入，${skipped} 项无效内容已跳过。`,`Build imported; ${skipped} unavailable entries were skipped.`,`配裝已匯入，已略過 ${skipped} 項無效內容。`):copy(lang,'配装已导入。','Build imported.','配裝已匯入。'))
  }
  const retryCopy=async()=>{
    if(!transfer||transfer.mode!=='export')return
    try{
      await navigator.clipboard.writeText(transfer.text)
      setTransfer(null);setNotice(copy(lang,'配装文字已复制。','Build text copied.','配裝文字已複製。'))
    }catch{
      setTransfer({...transfer,message:copy(lang,'仍无法写入剪贴板，请选中文字后手动复制。','Clipboard access is still blocked. Select the text and copy it manually.','仍無法寫入剪貼簿，請選取文字後手動複製。')})
    }
  }
  const previewDamage=preview?rangeTotal(preview.item.damage):[0,0]
  const previewArmor=preview?rangeTotal(preview.item.armor):[0,0]
  const previewSlotItem=preview?equipped.find(row=>row.slot===preview.slot)?.item:null
  const previewSlotEffects=previewSlotItem?[...previewSlotItem.effects,...activeSocketRows.filter(row=>row.slot===preview?.slot).flatMap(row=>row.effects)]:[]
  const previewSlotStats=previewSlotEffects.reduce((total,effect)=>{const stat=statEffectTypes[effect.type];if(stat)total[stat]+=fixedEffectValue(effect);return total},{str:0,dex:0,foc:0,vit:0} as Record<Stat,number>)
  const previewRequirements=preview?.item.requirements.map(requirement=>({
    ...requirement,
    ok:stats[requirement.stat]-previewSlotStats[requirement.stat]>=requirement.value,
  }))||[]
  const previewSockets=preview&&!candidate?Array.from({length:buildSocketCount(preview.item)},(_,index)=>{
    const gemId=socketLoadout[preview.slot]?.[index]
    const gem=gemId?byId.get(gemId):null
    return {index,gem,effects:gem?activeGemEffects(gem,preview.item):[]}
  }):[]

  return <><section className="page-header"><div className="content"><span>{copy(lang,'角色','Character','角色')}</span><h1>{copy(lang,'配装','Build planner','配裝')}</h1><p>{copy(lang,'选择职业、分配属性点并穿戴装备，集中查看属性、基础数值和装备需求。','Choose a class, allocate attribute points and equip a full loadout to inspect stats, base values and requirements.','選擇職業、分配屬性點並穿上裝備，集中查看屬性、基礎數值與裝備需求。')}</p></div></section>
    <div className="content page-body build-page">
      <div className="build-toolbar"><SelectControl className="planner-select" label={copy(lang,'职业','Class','職業')} value={classId} onChange={setClassId} options={classes.map(hero=>({value:hero.id,label:pick(hero.name,lang)}))}/><label className="level-input"><span>{copy(lang,'角色等级','Character level','角色等級')}</span><NumberInput min={1} max={100} value={level} onChange={setLevel}/></label><div className="build-transfer-actions"><button className="import-build" disabled={!items.length} onClick={()=>setTransfer({mode:'import',text:'',message:''})}><ClipboardPaste size={16}/>{copy(lang,'导入','Import','匯入')}</button><button className="export-build" onClick={exportBuild}><ClipboardCopy size={16}/>{copy(lang,'导出','Export','匯出')}</button></div><button className="reset-build" onClick={reset}><RotateCcw size={16}/>{copy(lang,'重置','Reset','重設')}</button></div>
      <div className="build-layout"><section className="paper-doll"><header><div><span>{copy(lang,'装备栏','Equipment','裝備欄')}</span><h2>{pick(classes.find(hero=>hero.id===classId)?.name||classes[0].name,lang)}</h2></div><strong>{equipped.length} / 12</strong></header><div className="slot-grid">{slots.map(slot=>{const item=loadout[slot]?byId.get(loadout[slot] as string):null;const locked=slot==='off'&&Boolean(loadout.main&&twoHanded.has(byId.get(loadout.main)?.subtype||''));const unmet=Boolean(item&&!requirementsBySlot.get(slot)?.ok);const socketCount=item?buildSocketCount(item):0;const socketValues=item?(socketLoadout[slot]||[]).slice(0,socketCount):[];const filledSockets=socketValues.filter(Boolean).length;return <div key={slot} className={`gear-slot${item?' filled':''}${locked?' disabled':''}${unmet?' unmet':''}`}><span className="slot-label">{slotName(slot,lang)}</span>{item?<><button className="slot-preview" onClick={()=>{setCandidate(null);setPreviewSlot(slot)}} aria-label={copy(lang,`速览${pick(item.name,lang)}`,`Quick view: ${pick(item.name,lang)}`,`快速預覽：${pick(item.name,lang)}`)}><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span className="slot-item"><b>{pick(item.name,lang)} <NgBadge tier={item.ngTier}/></b><small>Lv {item.level}</small>{socketCount>0&&<span className="slot-socket-state" aria-label={copy(lang,`${filledSockets}/${socketCount} 个孔已镶嵌`,`${filledSockets} of ${socketCount} sockets filled`,`${filledSockets}/${socketCount} 個孔已鑲嵌`)}><Gem size={11}/><span>{filledSockets}/{socketCount}</span><i>{Array.from({length:socketCount},(_,index)=><em className={socketValues[index]?'filled':''} key={index}/>)}</i></span>}{unmet&&<span className="slot-unmet"><CircleAlert size={13}/>{copy(lang,'未满足需求','Requirements not met','未符合需求')}</span>}</span><Eye className="slot-peek" size={15}/></button><button className="remove-item" onClick={()=>{setLoadout(current=>({...current,[slot]:null}));setSocketLoadout(current=>({...current,[slot]:[]}));if(previewSlot===slot)setPreviewSlot(null)}} aria-label={copy(lang,`移除${pick(item.name,lang)}`,`Remove ${pick(item.name,lang)}`,`移除${pick(item.name,lang)}`)}><X size={15}/></button></>:<button className="slot-empty" disabled={locked} onClick={()=>{setPicker(slot);setQuery('')}}>{locked?copy(lang,'双手武器占用','Occupied by two-hand weapon','雙手武器已占用'):copy(lang,'选择装备','Choose item','選擇裝備')}</button>}</div>})}</div></section>
        <aside className="build-inspector"><section className="allocation-card"><header><div><span>{copy(lang,'属性加点','Attributes','屬性加點')}</span><b className={spent>available?'over':''}>{spent} / {available}</b></div><div className="point-track"><i style={{width:`${Math.min(100,available?spent/available*100:0)}%`}}/></div></header>{(Object.keys(statNames) as Stat[]).map(stat=><label className={`stat-allocation ${stat}`} key={stat}><span><b>{pick(statNames[stat],lang)}</b><small>{classBases[classId][stat]} + {gearStats[stat]} {copy(lang,'装备','gear','裝備')}</small></span><NumberInput aria-label={pick(statNames[stat],lang)} min={0} max={495} value={allocated[stat]} onChange={value=>setAllocated(current=>({...current,[stat]:value}))}/><strong>{stats[stat]}</strong></label>)}{spent>available&&<p className="build-warning">{copy(lang,`超出当前等级可分配点数 ${spent-available} 点。`,`Allocation exceeds the level limit by ${spent-available}.`,`超出目前等級可分配的點數 ${spent-available} 點。`)}</p>}</section>
          <section className="derived-card"><h2>{copy(lang,'完整属性','Full stat overview','完整屬性')}</h2><div className="derived-grid"><div><span>{copy(lang,'武器基础伤害','Base weapon damage','武器基礎傷害')}</span><b>{damage[0]||damage[1]?`${Math.round(damage[0])}–${Math.round(damage[1])}`:'—'}</b></div><div><span>{copy(lang,'武器伤害加成','Weapon damage bonus','武器傷害加成')}</span><b>+{weaponDamageBonus.toFixed(1)}%</b></div><div><span>{copy(lang,'基础护甲','Base armor','基礎護甲')}</span><b>{armor[0]||armor[1]?`${Math.round(armor[0])}–${Math.round(armor[1])}`:'—'}</b></div><div><span>{copy(lang,'护甲加成','Armor bonus','護甲加成')}</span><b>+{armorBonus.toFixed(1)}%</b></div><div><span>{copy(lang,'暴击率','Critical-hit chance','爆擊率')}</span><b>{criticalChance.toFixed(1)}%</b></div><div><span>{copy(lang,'暴击伤害加成','Critical damage bonus','爆擊傷害加成')}</span><b>+{criticalDamage.toFixed(1)}%</b></div><div><span>{copy(lang,'额外生命','Added health','額外生命')}</span><b>+{Math.round(addedHealth)}{addedHealthPercent?` · +${addedHealthPercent}%`:''}</b></div><div><span>{copy(lang,'闪避率','Dodge chance','閃避率')}</span><b>{dodgeChance.toFixed(1)}%</b></div><div><span>{copy(lang,'额外法力','Added mana','額外法力')}</span><b>+{addedMana.toFixed(1)}{addedManaPercent?` · +${addedManaPercent}%`:''}</b></div><div><span>{copy(lang,'专注伤害加成','Focus damage bonus','專注傷害加成')}</span><b>+{focusDamageBonus.toFixed(1)}%</b></div><div><span>{copy(lang,'格挡率','Block chance','格擋率')}</span><b>{blockChance==null?'—':`${blockChance.toFixed(1)}%`}</b></div><div><span>{copy(lang,'处决率','Execute chance','處決率')}</span><b>{executeChance.toFixed(1)}%</b></div><div><span>{copy(lang,'全伤害增加','All damage bonus','全傷害增加')}</span><b>+{allDamage.toFixed(1)}%</b></div><div><span>{copy(lang,'全伤害减免','All damage reduction','全傷害減免')}</span><b>{allDamageReduction.toFixed(1)}%</b></div></div></section>
        </aside></div>
      {effectSummary.length>0&&<section className="build-effects"><header><div><span>{copy(lang,'当前加成','Current bonuses','目前加成')}</span><h2>{copy(lang,'装备效果汇总','Equipment effects','裝備效果總覽')}</h2></div><strong>{effectSummary.length}</strong></header><ul>{effectSummary.map(row=><li key={row.key}><span>{row.label}</span>{!row.aggregated&&row.count>1&&<b>× {row.count}</b>}</li>)}</ul></section>}
      {activeSocketRows.length>0&&<section className="socketed-gems"><header><div><span>{copy(lang,'镶嵌','Sockets','鑲嵌')}</span><h2>{copy(lang,'已镶嵌宝石','Socketed gems','已鑲嵌寶石')}</h2></div><strong>{activeSocketRows.length}</strong></header><div className="socketed-gem-list">{activeSocketRows.map(row=><article key={`${row.slot}-${row.index}`}><img src={asset(row.gem.iconPath)} alt=""/><div><span>{slotName(row.slot,lang)} · {copy(lang,`第 ${row.index+1} 孔`,`Socket ${row.index+1}`,`第 ${row.index+1} 孔`)}</span><b>{pick(row.gem.name,lang)} <NgBadge tier={row.gem.ngTier}/></b><ul>{row.effects.map((effect,index)=><li key={`${effect.type}-${index}`}>{effect.text?pick(effect.text,lang):effect.type}</li>)}</ul></div></article>)}</div></section>}
    </div>
    {preview&&<div className="gear-preview-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closePreview()}}>
      <section className="gear-preview" role="dialog" aria-modal="true" aria-label={copy(lang,'装备速览','Equipment quick view','裝備快速預覽')}>
        <header><div><span>{slotName(preview.slot,lang)} · {candidate?copy(lang,'装备前预览','Preview before equipping','裝備前預覽'):copy(lang,'速览','Quick view','快速預覽')}</span><h2>{pick(preview.item.name,lang)} <NgBadge tier={preview.item.ngTier}/></h2></div><button onClick={closePreview} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header>
        <div className="gear-preview-title"><img className={`rarity-border ${preview.item.rarity}`} src={asset(preview.item.iconPath)} alt=""/><div><b>Lv {preview.item.level}</b>{preview.item.set&&<span>{pick(preview.item.set,lang)}</span>}<div className="gear-preview-requirements"><small className={level>=preview.item.requiredLevel?'ok':'blocked'}>{copy(lang,`需求等级 ${preview.item.requiredLevel||'—'}`,`Requires level ${preview.item.requiredLevel||'—'}`,`需求等級 ${preview.item.requiredLevel||'—'}`)}</small>{previewRequirements.map(requirement=><small className={requirement.ok?'ok':'blocked'} key={requirement.stat}>{pick(statNames[requirement.stat],lang)} {requirement.value}</small>)}</div></div></div>
        <div className="gear-preview-values">
          {preview.item.damagePerSecond&&<div><span>{copy(lang,'每秒伤害','Damage per Second','每秒傷害')}</span><b>{Math.round(preview.item.damagePerSecond[0])}{preview.item.damagePerSecond[1]!==preview.item.damagePerSecond[0]?`–${Math.round(preview.item.damagePerSecond[1])}`:''}</b></div>}
          {preview.item.speed!=null&&<div><span>{copy(lang,'攻击间隔','Attack Speed','攻擊間隔')}</span><b>{preview.item.speed.toFixed(2)}s</b></div>}
          {Boolean(previewDamage[0]||previewDamage[1])&&<div><span>{copy(lang,'基础伤害','Base damage','基礎傷害')}</span><b>{Math.round(previewDamage[0])}–{Math.round(previewDamage[1])}</b></div>}
          {Boolean(previewArmor[0]||previewArmor[1])&&<div><span>{copy(lang,'基础护甲','Base armor','基礎護甲')}</span><b>{Math.round(previewArmor[0])}–{Math.round(previewArmor[1])}</b></div>}
        </div>
        {preview.item.effects.length>0&&<section><h3>{copy(lang,'装备效果','Equipment effects','裝備效果')}</h3><ul>{preview.item.effects.map((effect,index)=><li key={`${effect.type}-${index}`}>{effect.text?pick(effect.text,lang):effect.type}</li>)}</ul></section>}
        {preview.item.rawSetBonuses.length>0&&<details className="gear-preview-set"><summary><span>{copy(lang,'套装效果','Set bonuses','套裝效果')}</span><b>{preview.item.set&&pick(preview.item.set,lang)}</b><ChevronDown size={18}/></summary><ul>{preview.item.rawSetBonuses.map((effect,index)=><li key={`${effect.pieces}-${effect.type}-${index}`}><b>{effect.pieces} {copy(lang,'件','pieces','件')}</b><span>{effect.text?pick(effect.text,lang):effect.type}</span></li>)}</ul></details>}
        {previewSockets.length>0&&<section className="gear-preview-sockets"><h3>{copy(lang,'宝石孔位','Gem sockets','寶石孔位')}</h3><div>{previewSockets.map(row=><article key={row.index}><span className="socket-index"><Gem size={15}/>{row.index+1}</span>{row.gem?<><img src={asset(row.gem.iconPath)} alt=""/><span><b>{pick(row.gem.name,lang)} <NgBadge tier={row.gem.ngTier}/></b><small>Lv {row.gem.level} · {row.effects.map(effect=>effect.text?pick(effect.text,lang):effect.type).join(' · ')}</small></span><button onClick={()=>{setGemPicker({slot:preview.slot,index:row.index});setGemQuery('');closePreview()}}>{copy(lang,'更换','Replace','更換')}</button><button className="clear-gem" onClick={()=>setSocketLoadout(current=>{const values=[...(current[preview.slot]||[])];values[row.index]=null;return {...current,[preview.slot]:values}})} aria-label={copy(lang,'移除宝石','Remove gem','移除寶石')}><X size={15}/></button></>:<button className="choose-gem" onClick={()=>{setGemPicker({slot:preview.slot,index:row.index});setGemQuery('');closePreview()}}>{copy(lang,'选择宝石','Choose gem','選擇寶石')}</button>}</article>)}</div></section>}
        <footer>{candidate?<button className="preview-replace" onClick={equipCandidate}><Shield size={16}/>{copy(lang,'装备到栏位','Equip item','裝備至欄位')}</button>:<button className="preview-replace" onClick={()=>{setPicker(preview.slot);setQuery('');closePreview()}}><RefreshCw size={16}/>{copy(lang,'更换装备','Replace item','更換裝備')}</button>}<button onClick={closePreview}>{copy(lang,'关闭','Close','關閉')}</button></footer>
      </section>
    </div>}
    {picker&&<div className="picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPicker(null)}}><section className="item-picker"><header><div><span>{slotName(picker,lang)}</span><h2>{copy(lang,'选择装备','Choose equipment','選擇裝備')}</h2></div><button onClick={()=>setPicker(null)} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><label className="picker-search"><Search size={17}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy(lang,'搜索名称、套装或效果…','Search name, set or effect…','搜尋名稱、套裝或效果…')}/></label><div className="picker-list"><button className="clear-slot" onClick={()=>{setLoadout(current=>({...current,[picker]:null}));setSocketLoadout(current=>({...current,[picker]:[]}));setPicker(null)}}>{copy(lang,'清空这个栏位','Clear this slot','清除此欄位')}</button>{pickerItems.map(item=><button key={item.id} onClick={()=>choose(item)}><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span><b>{pick(item.name,lang)} <NgBadge tier={item.ngTier}/></b><small>Lv {item.level}{item.set?` · ${pick(item.set,lang)}`:''}</small></span><em className={`rarity-dot ${item.rarity}`}/></button>)}{!pickerItems.length&&<p>{copy(lang,'没有匹配装备。','No matching equipment.','沒有符合的裝備。')}</p>}</div></section></div>}
    {gemPicker&&gemPickerItem&&<div className="picker-backdrop gem-picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget){setGemPicker(null);setGemQuery('');setPreviewSlot(gemPicker.slot)}}}><section className="item-picker gem-picker"><header><div><span>{slotName(gemPicker.slot,lang)} · {copy(lang,`第 ${gemPicker.index+1} 孔`,`Socket ${gemPicker.index+1}`,`第 ${gemPicker.index+1} 孔`)}</span><h2>{copy(lang,'选择宝石','Choose gem','選擇寶石')}</h2></div><button onClick={()=>{setGemPicker(null);setGemQuery('');setPreviewSlot(gemPicker.slot)}} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><label className="picker-search"><Search size={17}/><input autoFocus value={gemQuery} onChange={event=>setGemQuery(event.target.value)} placeholder={copy(lang,'搜索宝石名称或效果…','Search gem name or effect…','搜尋寶石名稱或效果…')}/></label><div className="picker-list">{gemPickerItems.map(gem=>{const effects=activeGemEffects(gem,gemPickerItem);return <button key={gem.id} onClick={()=>chooseGem(gem)}><img className={`rarity-border ${gem.rarity}`} src={asset(gem.iconPath)} alt=""/><span><b>{pick(gem.name,lang)} <NgBadge tier={gem.ngTier}/></b><small>Lv {gem.level} · {effects.map(effect=>effect.text?pick(effect.text,lang):effect.type).join(' · ')}</small></span><em className={`rarity-dot ${gem.rarity}`}/></button>})}{!gemPickerItems.length&&<p>{copy(lang,'没有适用于该装备的宝石。','No gems apply to this item.','沒有適用於此裝備的寶石。')}</p>}</div></section></div>}
    {transfer&&<div className="build-transfer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setTransfer(null)}}><section className="build-transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="build-transfer-title"><header><div><span>{copy(lang,'配装文字','Build text','配裝文字')}</span><h2 id="build-transfer-title">{transfer.mode==='import'?copy(lang,'导入配装','Import build','匯入配裝'):copy(lang,'手动复制','Copy manually','手動複製')}</h2></div><button onClick={()=>setTransfer(null)} aria-label={copy(lang,'关闭','Close','關閉')}><X/></button></header><div className="build-transfer-body"><p>{transfer.mode==='import'?copy(lang,'粘贴其他玩家分享的配装文字。','Paste build text shared by another player.','貼上其他玩家分享的配裝文字。'):copy(lang,'复制下方文字即可分享这套配装。','Copy the text below to share this build.','複製下方文字即可分享這套配裝。')}</p><textarea autoFocus spellCheck={false} readOnly={transfer.mode==='export'} value={transfer.text} onFocus={event=>transfer.mode==='export'&&event.currentTarget.select()} onChange={event=>setTransfer({...transfer,text:event.target.value,message:''})} placeholder={transfer.mode==='import'?copy(lang,'在此粘贴配装文字…','Paste build text here…','在此貼上配裝文字…'):undefined}/>{transfer.message&&<p className="transfer-message" role="status"><CircleAlert size={16}/>{transfer.message}</p>}</div><footer>{transfer.mode==='import'&&<button className="paste-build" onClick={pasteBuild}><ClipboardPaste size={16}/>{copy(lang,'从剪贴板粘贴','Paste from clipboard','從剪貼簿貼上')}</button>}<button className="transfer-primary" onClick={transfer.mode==='import'?importBuild:retryCopy}>{transfer.mode==='import'?copy(lang,'导入配装','Import build','匯入配裝'):copy(lang,'再次复制','Copy again','再次複製')}</button></footer></section></div>}
    {notice&&<div className="build-snackbar" role="status" aria-live="polite">{notice}</div>}
  </>
}

const gambleTypes=[
  ['weapon',100,'Weapon','武器','武器'],['chest',100,'Chest armor','胸甲','胸甲'],['pants',80,'Pants','腿甲','腿甲'],['boots',80,'Boots','靴子','靴子'],['shoulders',80,'Shoulder armor','肩甲','肩甲'],['shield',75,'Shield','盾牌','盾牌'],['helmet',73,'Helmet','头盔','頭盔'],['gloves',65,'Gloves','手套','手套'],['amulet',60,'Necklace','项链','項鍊'],['ring',60,'Ring','戒指','戒指'],['belt',60,'Belt','腰带','腰帶'],
] as const

export type GambleType=(typeof gambleTypes)[number][0]
const gambleTypeBySubtype:Partial<Record<string,GambleType>>={
  chest_armor:'chest',pants:'pants',boots:'boots',shoulder_armor:'shoulders',shield:'shield',
  helmet:'helmet',gloves:'gloves',amulet:'amulet',ring:'ring',belt:'belt',
}
export const gambleTypeForEquipment=(category:string,subtype:string):GambleType|null=>{
  if(category==='pet'||category==='socketable')return null
  if(category==='weapon')return 'weapon'
  return gambleTypeBySubtype[subtype]||null
}
const gamblingPresetFromHash=()=>{
  const [page,requestedType,requestedLevel,requestedSockets]=window.location.hash.replace('#/','').split('/')
  const type:GambleType=page==='gambling'&&gambleTypes.some(row=>row[0]===requestedType)?requestedType as GambleType:'weapon'
  const numericLevel=Number(requestedLevel)
  const numericSockets=Number(requestedSockets)
  return {
    type,
    level:Number.isFinite(numericLevel)?Math.max(1,Math.min(105,Math.trunc(numericLevel))):50,
    sockets:Number.isFinite(numericSockets)?Math.max(0,Math.min(5,Math.trunc(numericSockets))):0,
  }
}

export function GamblingPage({lang}:{lang:Lang}){
  const [initial]=useState(gamblingPresetFromHash)
  const [type,setType]=useState<string>(initial.type);const [level,setLevel]=useState(initial.level);const [sockets,setSockets]=useState(initial.sockets)
  const selected=gambleTypes.find(row=>row[0]===type)||gambleTypes[0]
  const rows=[4,5,6,7].map(offset=>{const raw=(level+offset)*selected[1]*(1+sockets/10);return {offset,raw,low:Math.floor(raw),high:Math.ceil(raw)}})
  return <><section className="page-header"><div className="content"><span>{copy(lang,'商店','Shop','商店')}</span><h1>{copy(lang,'赌博','Gambling','賭博')}</h1><p>{copy(lang,'赌博商人的标价由物品类型、物品等级和孔数决定。输入条件即可查看全部八个整数价格。','Gambler prices depend on item type, item level and sockets. Enter the item details to see all eight integer outcomes.','賭博商人的價格取決於物品類型、物品等級與孔數。輸入條件即可查看八種整數價格。')}</p></div></section><div className="content page-body gamble-page"><div className="gamble-layout"><section className="gamble-controls"><div className="gamble-mark"><CircleDollarSign/><span>{copy(lang,'价格计算器','Price calculator','價格試算')}</span></div><label><span>{copy(lang,'物品类型','Item type','物品類型')}</span><SelectControl className="planner-select" label={copy(lang,'物品类型','Item type','物品類型')} value={type} onChange={setType} options={gambleTypes.map(row=>({value:row[0],label:copy(lang,row[3],row[2],row[4])}))}/></label><label><span>{copy(lang,'物品等级','Item level','物品等級')}</span><NumberInput min={1} max={105} value={level} onChange={setLevel}/></label><label><span>{copy(lang,'孔数','Sockets','孔數')}</span><NumberInput min={0} max={5} value={sockets} onChange={setSockets}/></label><div className="formula"><span>{copy(lang,'计算式','Formula','公式')}</span><code>{copy(lang,`(等级 + 4…7) × ${selected[1]} × (1 + 孔数 ÷ 10)`,`(level + 4…7) × ${selected[1]} × (1 + sockets ÷ 10)`,`(等級 + 4…7) × ${selected[1]} × (1 + 孔數 ÷ 10)`)}</code></div></section><section className="price-results"><header><div><span>{copy(lang,'可能价格','Possible prices','可能價格')}</span><h2>{copy(lang,selected[3],selected[2],selected[4])} · Lv {level}</h2></div><strong>× {selected[1]}</strong></header><div className="price-table"><div className="price-heading"><span>{copy(lang,'价格档','Band','價格組別')}</span><span>{copy(lang,'向下取整','Rounded down','無條件捨去')}</span><span>{copy(lang,'向上取整','Rounded up','無條件進位')}</span></div>{rows.map(row=><div className="price-row" key={row.offset}><span>Lv + {row.offset}<small>{row.raw.toFixed(2)}</small></span><b>{row.low.toLocaleString()}</b><b>{row.high.toLocaleString()}</b></div>)}</div><p>{copy(lang,'共有四个原始价格；游戏可能向下或向上取整，因此列出八个整数结果。两种取整相同时，会看到重复价格。','There are four underlying values. Each may be rounded down or up, producing eight integer outcomes; identical rounding results appear twice.','共有四組原始價格；遊戲可能採用無條件捨去或進位，因此列出八種整數結果。兩者相同時會出現重複價格。')}</p></section></div><section className="gamble-notes"><Swords/><div><h2>{copy(lang,'价格计算方式','Price calculation','價格計算方式')}</h2><p>{copy(lang,'物品类型决定基础系数；每个孔会使价格提高 10%。再将物品等级分别加 4、5、6、7，得到四档价格。','Item type sets the base factor and every socket adds 10%. The gambler then uses item level plus 4, 5, 6 and 7 for the four price bands.','物品類型決定基礎係數，每個孔會讓價格提高 10%。再將物品等級分別加上 4、5、6、7，得到四組價格。')}</p></div><Shield/></section></div></>
}
