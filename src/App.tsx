import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Globe2,
  Hammer, Info, Menu, Search, Shield, SlidersHorizontal, Swords, X, Zap,
} from 'lucide-react'
import { classes, statInfo } from './data'
import { isChinese, localeOptions, pick, tr, type UIKey } from './i18n'
import { BuildsPage, GamblingPage } from './planners'
import { SelectControl } from './SelectControl'
import type { ItemCategory, Lang, LocalText, StatKey } from './types'

type Page = 'home' | 'classes' | 'mechanics' | 'items' | 'builds' | 'gambling' | 'spells' | 'phases'
type Rarity = 'normal' | 'rare' | 'unique' | 'legendary'
type SkillKind = 'active' | 'passive'
type SkillMetricKind = 'weaponDamagePct' | 'chargeScalePct' | 'manaCost' | 'manaPerSecond' | 'maxTargets' | 'projectiles'

interface RawEffect {
  type: string
  name: string
  activation: string
  damageType: string
  duration: number | null
  chance: number | null
  min: number | null
  max: number | null
  useOwnerLevel: boolean
  template?: LocalText | null
  displayName?: LocalText | null
  values?: Record<string, number | null>
  precision?: number
  precisionMax?: number | null
  scalingGraph?: string | null
  text?: LocalText | null
  renderStatus?: string
  valueSemantic?: string
  roundingMode?: string
  socketTargets?: ('weapon'|'armor')[]
}
interface DbRawSetBonus extends RawEffect { pieces: number }
interface DbEquipment {
  id: string; slug: string; name: LocalText; internalName: string; category: ItemCategory; subtype: string
  unitType: string; rarity: Rarity; level: number; requiredLevel: number
  requirements: { stat: Exclude<StatKey, 'none'>; value: number }[]; sockets: number; speed: number | null
  damagePerSecond: [number,number] | null
  set: LocalText | null; description: LocalText | null; iconPath: string | null
  setInternalName: string | null
  maxSockets: number | null; blockChance: number | null; minimumDropLevel: number | null; maximumDropLevel: number | null
  classRequirement: string | null; armor: Record<string, [number, number]>; damage: Record<string, [number, number]>
  effects: RawEffect[]; rawSetBonuses: DbRawSetBonus[]
  ngTier: number; ngVariantOf: string | null
  panelFormulaVersion: string; sourceFile: string
}
interface DbSpellBook {
  id: string; name: LocalText; family: LocalText; tier: number; school: 'offense'|'defense'|'summon'|'utility'
  level: number; requiredLevel: number; description: LocalText; iconPath: string | null; sourceFile: string
}
interface DbSkillRank { rank:number; requiredLevel:number; metrics:{kind:SkillMetricKind;value:number;scalingGraph?:string|null}[]; effects:RawEffect[] }
interface DbClassSkill {
  id:string; slug:string; name:LocalText; description:LocalText; requirement:LocalText|null; level:number; kind:SkillKind
  maxRank:number; iconPath:string|null; cooldownMs:number|null; range:number|null
  tiers:{rank:number;text:LocalText}[]; ranks:DbSkillRank[]
}
interface DbClassGroup { classId:string; trees:{treeId:string;skills:DbClassSkill[]}[] }
interface DbPhaseChallenge { id:string; name:LocalText }
interface DbPhaseBeast { id:string; act:number; region:LocalText; challenges:DbPhaseChallenge[] }
interface DbMeta {
  generatedAt:string
  counts:{equipment:number;ngVariantGroups:number;ngVariantRecords:number;itemEffects:number;spellBooks:number;localizedSpellBooks:number;classSkills:number;skillRanks:number;phaseChallenges:number;icons:number}
  gaps:Record<string,number>
}
type SkillGraphs = Record<string, [number, number][]>
interface SiteData { equipment:DbEquipment[]; spellBooks:DbSpellBook[]; classSkills:DbClassGroup[]; skillGraphs:SkillGraphs; phaseBeasts:DbPhaseBeast[]; meta:DbMeta|null }
interface SkillFocus { classId:string; skillId:string }

const emptyData:SiteData={equipment:[],spellBooks:[],classSkills:[],skillGraphs:{},phaseBeasts:[],meta:null}
const statLabels:Record<StatKey,string>={str:'STR',dex:'DEX',foc:'FOC',vit:'VIT',none:'—'}
const text=(en:string,zhCN:string,zhTW=zhCN):LocalText=>({en,zhCN,zhTW})
const copy=(lang:Lang,zhCN:string,en:string,zhTW=zhCN)=>lang==='en'?en:lang==='zh-TW'?zhTW:zhCN
const plain=(value:string)=>value.replaceAll('**','')
const asset=(path:string|null)=>path?`${import.meta.env.BASE_URL}${path}`:''
const allText=(value:LocalText)=>`${value.en} ${value.zhCN} ${value.zhTW}`
const originalName=(value:LocalText,lang:Lang)=>isChinese(lang)&&pick(value,lang)!==value.en?value.en:null

const pageFromHash=():Page=>{
  const value=window.location.hash.replace('#/','').split('/')[0]
  return (['home','classes','mechanics','items','builds','gambling','spells','phases'].includes(value)?value:'home') as Page
}
const initialLanguage=():Lang=>{
  const stored=localStorage.getItem('tl2-locale')
  if(stored==='zh') return 'zh-CN'
  if(stored==='en'||stored==='zh-CN'||stored==='zh-TW') return stored
  const browser=navigator.language.toLowerCase()
  if(browser.startsWith('zh-tw')||browser.startsWith('zh-hk')||browser.startsWith('zh-mo')) return 'zh-TW'
  return browser.startsWith('zh')?'zh-CN':'en'
}

function App(){
  const [lang,setLang]=useState<Lang>(initialLanguage)
  const [page,setPage]=useState<Page>(pageFromHash)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [classId,setClassId]=useState('berserker')
  const [skillFocus,setSkillFocus]=useState<SkillFocus|null>(null)
  const [siteData,setSiteData]=useState<SiteData>(emptyData)
  const [dataError,setDataError]=useState(false)

  useEffect(()=>{
    const base=import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/equipment.json`).then(r=>r.json()),
      fetch(`${base}data/spell-books.json`).then(r=>r.json()),
      fetch(`${base}data/class-skills.json`).then(r=>r.json()),
      fetch(`${base}data/skill-graphs.json`).then(r=>r.json()),
      fetch(`${base}data/phase-beasts.json`).then(r=>r.json()),
      fetch(`${base}data/meta.json`).then(r=>r.json()),
    ]).then(([equipment,spellBooks,classSkills,skillGraphs,phaseBeasts,meta])=>setSiteData({equipment,spellBooks,classSkills,skillGraphs,phaseBeasts,meta})).catch(()=>setDataError(true))
  },[])
  useEffect(()=>{
    const onHash=()=>setPage(pageFromHash())
    window.addEventListener('hashchange',onHash)
    if(!window.location.hash) window.history.replaceState(null,'','#/home')
    return()=>window.removeEventListener('hashchange',onHash)
  },[])
  useEffect(()=>{
    localStorage.setItem('tl2-locale',lang)
    document.documentElement.lang=localeOptions.find(option=>option.code===lang)?.htmlLang||'en-US'
  },[lang])
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement
      const typing=['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearchOpen(true)}
      else if(event.key==='/'&&!typing){event.preventDefault();setSearchOpen(true)}
    }
    window.addEventListener('keydown',handler)
    return()=>window.removeEventListener('keydown',handler)
  },[])

  const go=(next:Page)=>{
    window.location.hash=`/${next}`
    setPage(next);setMobileOpen(false);setSearchOpen(false)
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const openClass=(id:string)=>{setClassId(id);setSkillFocus(null);go('classes')}
  const openSkill=(focus:SkillFocus)=>{setClassId(focus.classId);setSkillFocus(focus);go('classes')}

  return <div className="app-shell">
    <Header lang={lang} setLang={setLang} page={page} go={go} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onSearch={()=>setSearchOpen(true)}/>
    {dataError&&<div className="data-error"><Info size={15}/>{copy(lang,'数据文件加载失败，请刷新页面。','Data files failed to load. Please refresh.','資料檔案載入失敗，請重新整理頁面。')}</div>}
    <main>
      {page==='home'&&<Home lang={lang} go={go} onSearch={()=>setSearchOpen(true)} onClass={openClass} data={siteData}/>}
      {page==='classes'&&<ClassesPage lang={lang} classId={classId} setClassId={setClassId} classSkills={siteData.classSkills} skillGraphs={siteData.skillGraphs} focus={skillFocus}/>}
      {page==='mechanics'&&<MechanicsPage lang={lang}/>}
      {page==='items'&&<ItemsPage lang={lang} items={siteData.equipment}/>}
      {page==='builds'&&<BuildsPage lang={lang} items={siteData.equipment}/>}
      {page==='gambling'&&<GamblingPage lang={lang}/>}
      {page==='spells'&&<SpellsPage lang={lang} spells={siteData.spellBooks}/>}
      {page==='phases'&&<PhasesPage lang={lang} phaseBeasts={siteData.phaseBeasts}/>}
    </main>
    <Footer lang={lang} go={go}/>
    {searchOpen&&<SearchOverlay lang={lang} query={query} setQuery={setQuery} onClose={()=>setSearchOpen(false)} go={go} onClass={openClass} onSkill={openSkill} data={siteData}/>}
  </div>
}

function Header({lang,setLang,page,go,mobileOpen,setMobileOpen,onSearch}:{lang:Lang;setLang:(lang:Lang)=>void;page:Page;go:(page:Page)=>void;mobileOpen:boolean;setMobileOpen:(open:boolean)=>void;onSearch:()=>void}){
  const nav:{page:Page;label:UIKey}[]=[{page:'home',label:'navHome'},{page:'classes',label:'navClasses'},{page:'mechanics',label:'navMechanics'},{page:'items',label:'navItems'},{page:'builds',label:'navBuilds'},{page:'gambling',label:'navGambling'},{page:'spells',label:'navSpells'},{page:'phases',label:'navPhases'}]
  return <header className="site-header"><div className="nav-wrap">
    <button className="brand" onClick={()=>go('home')}><span className="brand-dot"/><b>TL2 Wiki</b></button>
    <nav className={mobileOpen?'main-nav is-open':'main-nav'}>{nav.map(item=><button key={item.page} className={page===item.page?'active':''} onClick={()=>go(item.page)}>{tr(lang,item.label)}</button>)}</nav>
    <div className="header-tools">
      <button className="search-button" onClick={onSearch}><Search size={16}/><span>{tr(lang,'search')}</span><kbd>Ctrl K</kbd></button>
      <SelectControl className="locale-select" label={tr(lang,'chooseLanguage')} value={lang} onChange={value=>setLang(value as Lang)} icon={<Globe2 size={15}/>} options={localeOptions.map(option=>({value:option.code,label:option.label}))}/>
      <button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label={tr(lang,'menu')}>{mobileOpen?<X/>:<Menu/>}</button>
    </div>
  </div></header>
}

function Home({lang,go,onSearch,onClass,data}:{lang:Lang;go:(page:Page)=>void;onSearch:()=>void;onClass:(id:string)=>void;data:SiteData}){
  const counts=data.meta?.counts
  const links=[
    {page:'classes' as Page,icon:<Swords/>,title:tr(lang,'navClasses'),text:copy(lang,'4 个职业、12 棵技能树和 1,800 条等级数据','4 classes, 12 skill trees and 1,800 rank records','4 個職業、12 個技能樹與 1,800 筆等級資料'),count:counts?.classSkills||120},
    {page:'items' as Page,icon:<Hammer/>,title:tr(lang,'navItems'),text:copy(lang,'按名称、类型、稀有度和等级筛选','Filter by name, type, rarity and level','依名稱、類型、稀有度與等級篩選'),count:counts?.equipment||5483},
    {page:'spells' as Page,icon:<BookOpen/>,title:tr(lang,'navSpells'),text:copy(lang,'查看技能书等级、需求和说明','Browse spell-book tiers, requirements and descriptions','查看技能書等級、需求和說明'),count:counts?.spellBooks||194},
    {page:'mechanics' as Page,icon:<SlidersHorizontal/>,title:tr(lang,'navMechanics'),text:copy(lang,'属性公式与伤害触发规则','Attribute formulas and damage triggers','屬性公式與傷害觸發規則'),count:4},
  ]
  return <>
    <section className="home-hero"><div className="content home-hero-inner"><div><p className="kicker">TORCHLIGHT II</p><h1>TL2 Wiki</h1><p className="home-lead">{copy(lang,'查职业技能、装备属性、技能书和相位兽挑战。','Look up class skills, equipment, spell books and Phase Beast challenges.','查詢職業技能、裝備屬性、技能書與相位獸挑戰。')}</p><button className="home-search" onClick={onSearch}><Search size={20}/><span>{tr(lang,'search')}</span><kbd>Ctrl K</kbd></button></div>
      <div className="home-summary"><span>{copy(lang,'内容总览','At a glance','內容一覽')}</span><b>{(counts?.equipment||5483).toLocaleString()} {copy(lang,'件装备','items','件裝備')}</b><p>{counts?.classSkills||120} {copy(lang,'个职业技能','class skills','個職業技能')} · {(counts?.spellBooks||194).toLocaleString()} {copy(lang,'种技能书','spell books','種技能書')} · {counts?.phaseChallenges||15} {copy(lang,'项相位兽挑战','Phase Beast challenges','項相位獸挑戰')}</p></div>
    </div></section>
    <section className="content home-content"><div className="quick-grid">{links.map(link=><button key={link.page} onClick={()=>go(link.page)}><span className="quick-icon">{link.icon}</span><span><b>{link.title}</b><small>{link.text}</small></span><span className="quick-meta"><strong>{link.count.toLocaleString()}</strong><ArrowRight size={16}/></span></button>)}</div>
      <div className="home-columns"><section><SectionTitle eyebrow={copy(lang,'职业','Classes','職業')} title={copy(lang,'选择职业','Choose a class','選擇職業')}/><div className="class-list">{classes.map(hero=><button key={hero.id} onClick={()=>onClass(hero.id)}><span className="class-code" style={{color:hero.accent}}>{hero.monogram}</span><span><b>{pick(hero.name,lang)}</b>{originalName(hero.name,lang)&&<small>{hero.name.en}</small>}</span><ArrowRight size={15}/></button>)}</div></section>
      <section><SectionTitle eyebrow={copy(lang,'属性','Attributes','屬性')} title={copy(lang,'四项核心属性','Four core attributes','四項核心屬性')}/><div className="attribute-list">{statInfo.map(stat=><button key={stat.key} onClick={()=>go('mechanics')}><StatPill stat={stat.key}/><span><b>{pick(stat.name,lang)}</b><small>{plain(pick(stat.effects[0],lang))}</small></span></button>)}</div></section></div>
    </section>
  </>
}

function PageHeader({section,title,children}:{section:string;title:string;children:string}){return <section className="page-header"><div className="content"><span>{section}</span><h1>{title}</h1><p>{children}</p></div></section>}
function SectionTitle({eyebrow,title}:{eyebrow:string;title:string}){return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2></div>}
function StatPill({stat}:{stat:StatKey}){return stat==='none'?<span className="stat-pill none">—</span>:<span className={`stat-pill ${stat}`}><i/>{statLabels[stat]}</span>}
function BoldText({value}:{value:string}){return <>{value.split('**').map((part,index)=>index%2?<strong key={index}>{part}</strong>:part)}</>}
function RichText({value}:{value:string}){
  return <>{value.split(/\[tooltip\]\((.*?)\)\[\/tooltip\]/g).map((part,index)=>index%2?<span className="inline-tooltip" tabIndex={0} aria-label={part} key={index}><Info size={14}/><span role="tooltip">{part}</span></span>:<BoldText value={part} key={index}/>)}</>
}
function Loading({lang}:{lang:Lang}){return <div className="loading"><span/><p>{tr(lang,'loading')}</p></div>}

function ClassesPage({lang,classId,setClassId,classSkills,skillGraphs,focus}:{lang:Lang;classId:string;setClassId:(id:string)=>void;classSkills:DbClassGroup[];skillGraphs:SkillGraphs;focus:SkillFocus|null}){
  const hero=classes.find(item=>item.id===classId)??classes[0]
  const generated=classSkills.find(item=>item.classId===hero.id)
  const trees=hero.trees.map(tree=>({...tree,skills:generated?.trees.find(item=>item.treeId===tree.id)?.skills||[]}))
  const [treeId,setTreeId]=useState(trees[0].id)
  const tree=trees.find(item=>item.id===treeId)??trees[0]
  const [selectedId,setSelectedId]=useState('')
  useEffect(()=>{setTreeId(trees[0].id);setSelectedId('')},[hero.id])
  useEffect(()=>{
    if(focus?.classId!==hero.id) return
    const targetTree=trees.find(item=>item.skills.some(skill=>skill.id===focus.skillId))
    if(targetTree){setTreeId(targetTree.id);setSelectedId(focus.skillId)}
  },[focus,hero.id,classSkills])
  useEffect(()=>{if(tree.skills.length&&!tree.skills.some(skill=>skill.id===selectedId))setSelectedId(tree.skills[0].id)},[tree,selectedId])
  const selected=tree.skills.find(skill=>skill.id===selectedId)??tree.skills[0]
  return <>
    <PageHeader section={tr(lang,'navClasses')} title={tr(lang,'classesTitle')}>{copy(lang,'选择职业和技能树，查看游戏说明、每级数值与阶段奖励。','Choose a class and skill tree to inspect its in-game description, rank values and tier bonuses.','選擇職業與技能樹，查看遊戲說明、各級數值與階段獎勵。')}</PageHeader>
    <div className="content page-body">
      <div className="segmented class-tabs">{classes.map(item=><button key={item.id} className={item.id===hero.id?'active':''} onClick={()=>setClassId(item.id)}><span style={{color:item.accent}}>{item.monogram}</span>{pick(item.name,lang)}</button>)}</div>
      <section className="class-overview"><div><span className="label">{hero.name.en}</span><h2>{pick(hero.name,lang)}</h2><p>{pick(hero.description,lang)}</p></div></section>
      {!selected?<Loading lang={lang}/>:<div className="skill-layout"><section><div className="section-row"><SectionTitle eyebrow={tr(lang,'skillTrees')} title={pick(tree.name,lang)}/><div className="segmented tree-tabs">{trees.map(item=><button className={item.id===tree.id?'active':''} onClick={()=>setTreeId(item.id)} key={item.id}>{pick(item.name,lang)} <small>{item.skills.length}</small></button>)}</div></div>
        <div className="skill-table">{tree.skills.map(skill=><button key={skill.id} className={selected.id===skill.id?'active':''} onClick={()=>setSelectedId(skill.id)}><img src={asset(skill.iconPath)} alt=""/><span><b>{pick(skill.name,lang)}</b><small>{skill.kind==='active'?tr(lang,'active'):tr(lang,'passive')} · {tr(lang,'unlocks')} {skill.level}</small></span><ChevronRight size={15}/></button>)}</div>
      </section><SkillPanel key={selected.id} skill={selected} lang={lang} skillGraphs={skillGraphs}/></div>}
    </div>
  </>
}

function SkillPanel({skill,lang,skillGraphs}:{skill:DbClassSkill;lang:Lang;skillGraphs:SkillGraphs}){
  const [rank,setRank]=useState(1)
  const [characterLevel,setCharacterLevel]=useState(100)
  const selectedRank=skill.ranks.find(item=>item.rank===rank)||skill.ranks[0]
  const hasLevelScaling=Boolean(selectedRank?.effects.some(effect=>effect.scalingGraph)||selectedRank?.metrics.some(metric=>metric.scalingGraph))
  useEffect(()=>{if(selectedRank)setCharacterLevel(selectedRank.requiredLevel||skill.level)},[selectedRank?.rank,skill.level])
  return <aside className="skill-panel">
    <div className="skill-heading"><img src={asset(skill.iconPath)} alt=""/><div><span className="label">{skill.kind==='active'?tr(lang,'active'):tr(lang,'passive')} · {tr(lang,'unlocks')} {skill.level}</span><h2>{pick(skill.name,lang)}</h2>{originalName(skill.name,lang)&&<small className="original-name">{skill.name.en}</small>}</div></div>
    <p className="skill-description">{pick(skill.description,lang)}</p>
    {skill.requirement&&<div className="skill-requirement"><b>{tr(lang,'requirement')}</b><span>{pick(skill.requirement,lang)}</span></div>}
    {skill.ranks.length>0&&<section className="rank-section"><div className="rank-controls"><div className="rank-control"><label htmlFor={`rank-${skill.id}`}>{tr(lang,'rank')} <strong>{rank}</strong> / {skill.maxRank}</label><input id={`rank-${skill.id}`} type="range" min="1" max={skill.maxRank} value={rank} onChange={event=>setRank(Number(event.target.value))}/></div>{hasLevelScaling&&<label className="skill-character-level"><span>{tr(lang,'characterLevel')}</span><input type="number" min={selectedRank?.requiredLevel||1} max="100" value={characterLevel} onChange={event=>setCharacterLevel(Math.max(selectedRank?.requiredLevel||1,Math.min(100,Number(event.target.value)||1)))}/></label>}</div>
      <h3>{tr(lang,'skillValues')}</h3>{selectedRank&&(selectedRank.metrics.length||selectedRank.effects.length)?<>
        {selectedRank.metrics.length>0&&<div className="skill-metrics">{selectedRank.metrics.map((metric,index)=>{const value=metric.scalingGraph?graphValue(skillGraphs[metric.scalingGraph],characterLevel)??metric.value:metric.value;return <div key={`${metric.kind}-${index}`}><span>{tr(lang,metric.kind)}</span><b>{metric.kind==='weaponDamagePct'||metric.kind==='chargeScalePct'?`${value}%`:value}</b></div>})}</div>}
        {selectedRank.effects.length>0&&<ul className="raw-effect-list">{selectedRank.effects.map((effect,index)=><RawEffectLine key={`${effect.type}-${index}`} effect={effect} lang={lang} playerLevel={characterLevel} skillGraphs={skillGraphs}/>)}</ul>}
      </>:<p className="empty-values">{tr(lang,'noRankValues')}</p>}
    </section>}
    {skill.tiers.length>0&&<section className="tier-bonuses"><h3>{tr(lang,'tierBonuses')}</h3>{skill.tiers.map(tier=><div key={tier.rank}><b>{tr(lang,'rank')} {tier.rank}</b><p>{pick(tier.text,lang)}</p></div>)}</section>}
  </aside>
}

const effectNames:Record<string,LocalText>={
  DAMAGE:text('Damage','伤害','傷害'), 'PERCENT DAMAGE BONUS':text('Damage bonus','伤害加成','傷害加成'), 'PERCENT DAMAGE TAKEN':text('Damage taken','承受伤害','承受傷害'),
  STUN:text('Stun','眩晕','暈眩'), FREEZE:text('Freeze','冰冻','冰凍'), BURN:text('Burn','燃烧','燃燒'), POISON:text('Poison','中毒','中毒'), SHOCK:text('Shock','电击','電擊'),
  'PERCENT SPEED':text('Movement speed','移动速度','移動速度'), 'PERCENT ATTACK SPEED':text('Attack speed','攻击速度','攻擊速度'), 'PERCENT CAST SPEED':text('Cast speed','施法速度','施法速度'),
  'PERCENT ARMOR BONUS':text('Armor bonus','护甲加成','護甲加成'), 'ARMOR BONUS':text('Armor','护甲','護甲'), 'PERCENT CHARGING BONUS':text('Charge rate','怒气获得','怒氣獲得'),
  'CRITICAL CHANCE':text('Critical-hit chance','暴击几率','爆擊機率'), 'DODGE CHANCE BONUS':text('Dodge chance','闪避几率','閃避機率'), 'SHIELD BUFFER':text('Damage shield','伤害护盾','傷害護盾'),
  'HP RECHARGE PLAYER':text('Health recovery','生命恢复','生命恢復'), 'MANA RECHARGE PLAYER':text('Mana recovery','法力恢复','法力恢復'), 'SUMMON DURATION':text('Summon duration','召唤持续时间','召喚持續時間'),
  MINIONDAMAGE:text('Minion damage','召唤物伤害','召喚物傷害'), 'DEGRADE ARMOR':text('Armor reduction','护甲降低','護甲降低'), 'KNOCK BACK EFFECT':text('Knockback','击退','擊退'),
}
const titleCase=(value:string)=>value.toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase())
const damageTypeNames:Record<string,LocalText>={
  ALL:text('All','全部','全部'),PHYSICAL:text('Physical','物理','物理'),FIRE:text('Fire','火焰','火焰'),ICE:text('Ice','冰霜','冰霜'),ELECTRIC:text('Electric','闪电','閃電'),POISON:text('Poison','毒素','毒素'),
}
const graphValue=(points:[number,number][]|undefined,level:number)=>{
  if(!points?.length)return null
  if(level<=points[0][0])return points[0][1]
  for(let index=1;index<points.length;index++){
    const [x,y]=points[index];const [previousX,previousY]=points[index-1]
    if(level<=x)return previousY+(y-previousY)*(level-previousX)/(x-previousX)
  }
  return points.at(-1)?.[1]??null
}
const effectNumber=(effect:RawEffect,value:number|null,playerLevel:number,skillGraphs:SkillGraphs,overTime=false)=>{
  if(value==null)return null
  const scale=effect.scalingGraph?graphValue(skillGraphs[effect.scalingGraph],playerLevel):null
  let result=scale==null?value:scale*value/100
  if(scale!=null&&effect.type==='DAMAGE')result=Math.ceil(Math.abs(result))
  else if(scale!=null&&effect.type==='ARMOR BONUS')result=Math.floor(Math.abs(result))
  else result=Math.abs(result)
  if(overTime&&effect.duration)result=Math.ceil(result)*effect.duration
  const precision=Math.max(0,effect.precision??0)
  return Number(result.toFixed(precision)).toLocaleString('en-US',{maximumFractionDigits:precision})
}
const effectRange=(effect:RawEffect,playerLevel:number,skillGraphs:SkillGraphs,overTime=false)=>{
  const minimum=effectNumber(effect,effect.min,playerLevel,skillGraphs,overTime)
  const maximum=effectNumber(effect,effect.max,playerLevel,skillGraphs,overTime)
  return minimum===maximum||maximum==null?minimum:minimum==null?maximum:`${minimum}–${maximum}`
}
const effectDuration=(duration:number,lang:Lang)=>lang==='en'?`${duration} sec.`:`${duration}秒`
const renderSkillEffect=(effect:RawEffect,lang:Lang,playerLevel:number,skillGraphs:SkillGraphs)=>{
  if(!effect.template)return null
  const values=effect.values||{}
  const auxiliary=(slot:number)=>effectNumber(effect,values[String(slot)]??null,playerLevel,{},false)??'—'
  const thirdAndFourth=auxiliary(3)===auxiliary(4)?auxiliary(3):`${auxiliary(3)}–${auxiliary(4)}`
  const damage=effect.damageType?(damageTypeNames[effect.damageType.toUpperCase()]?pick(damageTypeNames[effect.damageType.toUpperCase()],lang):titleCase(effect.damageType)):''
  const name=effect.displayName?pick(effect.displayName,lang):effect.name
  const overTime=effect.duration!=null&&effect.duration>0&&(effect.type==='DAMAGE'||effect.type==='DAMAGE CHANCE')
  return pick(effect.template,lang)
    .replaceAll('[VALUE_OT]',effectRange(effect,playerLevel,skillGraphs,true)??'—')
    .replaceAll('[VALUE1ASDURATION]',effectDuration(Math.abs(effect.min??0),lang))
    .replaceAll('[VALUE3AND4]',thirdAndFourth)
    .replaceAll('[VALUE5]',auxiliary(5))
    .replaceAll('[VALUE3]',auxiliary(3))
    .replaceAll('[VALUE]',effectRange(effect,playerLevel,skillGraphs,overTime)??'—')
    .replaceAll('[DURATION]',effectDuration(effect.duration??0,lang))
    .replaceAll('[DMGTYPE]',damage)
    .replaceAll('[NAME]',name)
    .replace(/[ \t]{2,}/g,' ')
    .trim()
}
function RawEffectLine({effect,lang,pieces,playerLevel=100,skillGraphs={}}:{effect:RawEffect;lang:Lang;pieces?:number;playerLevel?:number;skillGraphs?:SkillGraphs}){
  if(effect.text)return <li>{pieces!=null&&<b className="piece-count">{pieces} {copy(lang,'件','pieces','件')}</b>}<span><strong>{pick(effect.text,lang)}</strong></span></li>
  const rendered=renderSkillEffect(effect,lang,playerLevel,skillGraphs)
  if(rendered)return <li><span><strong>{rendered}</strong>{effect.scalingGraph&&<small>{copy(lang,`角色等级 ${playerLevel}`,`Character level ${playerLevel}`,`角色等級 ${playerLevel}`)}</small>}</span></li>
  const label=effectNames[effect.type]?.en||titleCase(effect.type)
  const rawValue=effect.min==null&&effect.max==null?null:effect.min===effect.max?`${effect.min}`:`${effect.min}–${effect.max}`
  const percent=/PERCENT|CHANCE|DODGE|SHOCK|FREEZE|STUN|BURN|POISON|INTERRUPT/.test(effect.type)
  const value=rawValue?`${rawValue}${percent?'%':''}${effect.useOwnerLevel?` ${tr(lang,'perLevel')}`:''}`:null
  return <li>{pieces!=null&&<b className="piece-count">{pieces} {copy(lang,'件','pieces','件')}</b>}<span><strong>{effect.damageType?`${titleCase(effect.damageType)} · `:''}{label}</strong>{value&&<em>{value}</em>}{effect.duration!=null&&effect.duration>0&&<small>{effect.duration} {tr(lang,'seconds')}</small>}</span></li>
}

function MechanicsPage({lang}:{lang:Lang}){
  const matrix:{event:UIKey;crit:'yes'|'no'|'limited';steal:'yes'|'no'|'limited';proc:'yes'|'no'|'limited'}[]=[
    {event:'weaponHit',crit:'yes',steal:'yes',proc:'yes'},{event:'weaponSkill',crit:'yes',steal:'limited',proc:'limited'},
    {event:'flatSkill',crit:'yes',steal:'no',proc:'no'},{event:'dot',crit:'no',steal:'no',proc:'no'},{event:'minion',crit:'limited',steal:'no',proc:'no'},
  ]
  return <><PageHeader section={tr(lang,'navMechanics')} title={tr(lang,'mechTitle')}>{copy(lang,'查看四项属性的准确收益，以及不同伤害能否触发暴击、吸取和武器效果。','See the exact returns from the four attributes and which damage sources can trigger critical hits, stealing and weapon effects.','查看四項屬性的實際收益，以及各類傷害能否觸發爆擊、吸取與武器效果。')}</PageHeader>
    <div className="content page-body"><div className="stat-grid">{statInfo.map(stat=><article className={`stat-summary ${stat.key}`} key={stat.key}><div><StatPill stat={stat.key}/><h3>{pick(stat.name,lang)}</h3></div><ul>{stat.effects.map((effect,index)=><li key={index}><RichText value={pick(effect,lang)}/></li>)}</ul></article>)}</div>
      <section className="socket-section"><SectionTitle eyebrow={copy(lang,'装备','Equipment','裝備')} title={copy(lang,'孔数规则','Socket rules','孔數規則')}/><p className="socket-rule-copy"><span><strong>{copy(lang,'一般初始孔数：','Initial sockets.','一般初始孔數：')}</strong>{copy(lang,'装备掉落时通常自带 0–2 个孔；附魔绿色武器的掉落变种最多 3 孔，稀有蓝色武器最多 4 孔（盾牌除外）。','Equipment normally drops with 0–2 sockets; enchanted green weapon variants can have up to 3, while rare blue weapons can have up to 4 (shields excluded).','裝備掉落時通常自帶 0–2 個孔；附魔綠色武器的掉落變體最多 3 孔，稀有藍色武器最多 4 孔（盾牌除外）。')}</span><span><strong>{copy(lang,'打孔上限：','Socketing cap.','打孔上限：')}</strong>{copy(lang,'打孔师朱瑞克只能为不足 2 孔的装备补孔，达到 2 孔后便无法继续增加。','Jurick the Socketer can add sockets only until an item reaches 2; he cannot add another socket to an item that already has 2 or more.','打孔匠朱瑞克只能替不足 2 孔的裝備補孔，達到 2 孔後便無法再增加。')}</span><span><strong>{copy(lang,'特殊装备：','Special items.','特殊裝備：')}</strong>{copy(lang,'“窒息”和“奥拉克之手”各有 5 孔；冥界系列的单手武器和冥界盾牌为 4 孔，双手武器为 5 孔。','The Asphyx and Hands of Orlac each have 5 sockets; Netherrealm one-hand weapons and the Netherrealm Shield have 4, while its two-hand weapons have 5.','「窒息」與「奧拉克之手」各有 5 孔；牧牛人領地系列的單手武器與牧牛人領地盾為 4 孔，雙手武器則為 5 孔。')}</span></p></section>
      <section className="matrix-section"><SectionTitle eyebrow={copy(lang,'命中','Hits','命中')} title={tr(lang,'triggerGuide')}/><p className="section-copy">{tr(lang,'triggerIntro')}</p><div className="table-scroll"><table><thead><tr><th>{tr(lang,'event')}</th><th>{tr(lang,'canCrit')}</th><th>{tr(lang,'canSteal')}</th><th>{tr(lang,'canProc')}</th></tr></thead><tbody>{matrix.map(row=><tr key={row.event}><td>{tr(lang,row.event)}</td>{(['crit','steal','proc'] as const).map(key=><td key={key}><Status value={row[key]} lang={lang}/></td>)}</tr>)}</tbody></table></div></section>
    </div></>
}
function Status({value,lang}:{value:'yes'|'no'|'limited';lang:Lang}){return <span className={`status ${value}`}>{value==='yes'?'✓':value==='no'?'—':'△'} {tr(lang,value)}</span>}

const subtypeNames:Record<string,LocalText>={
  axe:text('Axe','斧','斧'),bow:text('Bow','弓','弓'),cannon:text('Cannon','加农炮','加農炮'),crossbow:text('Crossbow','弩','弩'),fist:text('Claw','拳套','拳套'),mace:text('Mace','单手锤','單手錘'),pistol:text('Pistol','手枪','手槍'),polearm:text('Polearm','长柄武器','長柄武器'),rifle:text('Shotgonne','霰弹枪','霰彈槍'),staff:text('Staff','法杖','法杖'),sword:text('Sword','剑','劍'),two_hand_axe:text('Two-hand axe','双手斧','雙手斧'),two_hand_mace:text('Two-hand mace','双手锤','雙手錘'),two_hand_sword:text('Two-hand sword','双手剑','雙手劍'),wand:text('Wand','魔杖','魔杖'),
  boots:text('Boots','靴子','靴子'),chest_armor:text('Chest armor','胸甲','胸甲'),gloves:text('Gloves','手套','手套'),helmet:text('Helmet','头盔','頭盔'),pants:text('Pants','腿甲','腿甲'),shield:text('Shield','盾牌','盾牌'),shoulder_armor:text('Shoulder armor','肩甲','肩甲'),amulet:text('Amulet','项链','項鍊'),belt:text('Belt','腰带','腰帶'),ring:text('Ring','戒指','戒指'),collar:text('Pet collar','宠物项圈','寵物項圈'),tag:text('Pet tag','宠物饰牌','寵物飾牌'),gem_or_socketable:text('Socketable','镶嵌物','鑲嵌物'),
}
const subtypeName=(subtype:string,lang:Lang)=>subtypeNames[subtype]?pick(subtypeNames[subtype],lang):titleCase(subtype.replaceAll('_',' '))
function rarityName(rarity:Rarity,lang:Lang){const names:Record<Rarity,LocalText>={normal:text('Normal','普通','普通'),rare:text('Rare','稀有','稀有'),unique:text('Unique','独特','獨特'),legendary:text('Legendary','传奇','傳奇')};return pick(names[rarity],lang)}
const classRequirementName=(requirement:string,lang:Lang)=>{
  const aliases:Record<string,string>={wanderer:'outlander',arbiter:'embermage',railman:'engineer'}
  const id=aliases[requirement.toLowerCase()]||requirement.toLowerCase()
  return pick(classes.find(hero=>hero.id===id)?.name||text(requirement,requirement,requirement),lang)
}
const ngLabel=(tier:number)=>tier===1?'NG+':tier>1?`NG+${tier}`:null
function NgBadge({tier}:{tier:number}){const label=ngLabel(tier);return label?<span className="ng-badge">{label}</span>:null}

function ItemsPage({lang,items}:{lang:Lang;items:DbEquipment[]}){
  const [category,setCategory]=useState<'all'|ItemCategory>('all');const [rarity,setRarity]=useState<'all'|Rarity>('all');const [query,setQuery]=useState('');const [level,setLevel]=useState('all');const [currentPage,setCurrentPage]=useState(1);const [selected,setSelected]=useState<DbEquipment|null>(null)
  const filtered=useMemo(()=>items.filter(item=>(category==='all'||item.category===category)&&(rarity==='all'||item.rarity===rarity)&&(level==='all'||(level==='100'?item.level>=100:item.level>=Number(level)&&item.level<Number(level)+20))&&(`${allText(item.name)} ${ngLabel(item.ngTier)||''} ${item.subtype} ${item.set?allText(item.set):''} ${item.effects.map(effect=>effect.text?allText(effect.text):'').join(' ')}`).toLowerCase().includes(query.toLowerCase())),[items,category,rarity,level,query])
  useEffect(()=>setCurrentPage(1),[category,rarity,level,query]);const perPage=40;const pages=Math.max(1,Math.ceil(filtered.length/perPage));const rows=filtered.slice((currentPage-1)*perPage,currentPage*perPage)
  const categoryKey=(value:string):UIKey=>value==='weapon'?'weapon':value==='armor'?'armorCat':value==='trinket'?'trinket':value==='pet'?'petGear':value==='socketable'?'socketable':'all'
  return <><PageHeader section={tr(lang,'navItems')} title={tr(lang,'itemsTitle')}>{copy(lang,'按名称、类型、稀有度、等级或物品效果查找装备。','Find equipment by name, type, rarity, level or item effect.','依名稱、類型、稀有度、等級或裝備效果搜尋裝備。')}</PageHeader><div className="content page-body"><div className="data-toolbar"><label className="data-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy(lang,'搜索名称、类型、套装或效果…','Search name, type, set or effect…','搜尋名稱、類型、套裝或效果…')}/></label><SelectControl className="filter-select" label={copy(lang,'装备类型','Equipment type','裝備類型')} value={category} onChange={value=>setCategory(value as typeof category)} options={['all','weapon','armor','trinket','pet','socketable'].map(value=>({value,label:tr(lang,categoryKey(value))}))}/><SelectControl className="filter-select" label={copy(lang,'稀有度','Rarity','稀有度')} value={rarity} onChange={value=>setRarity(value as typeof rarity)} options={[{value:'all',label:tr(lang,'allRarity')},...(['rare','unique','legendary'] as Rarity[]).map(value=>({value,label:rarityName(value,lang)}))]}/><SelectControl className="filter-select" label={copy(lang,'装备等级','Item level','裝備等級')} value={level} onChange={setLevel} options={[{value:'all',label:copy(lang,'全部等级','All levels','所有等級')},...[0,20,40,60,80,100].map(value=>({value:String(value),label:`Lv ${value}${value<100?`–${value+19}`:'+'}`}))]}/></div>
    <div className="result-meta"><span>{filtered.length.toLocaleString()} {tr(lang,'itemsFound')}</span><span>{copy(lang,`第 ${currentPage} / ${pages} 页`,`Page ${currentPage} of ${pages}`,`第 ${currentPage} / ${pages} 頁`)}</span></div>{!items.length?<Loading lang={lang}/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>{copy(lang,'名称','Name','名稱')}</th><th>{copy(lang,'类型','Type','類型')}</th><th>{copy(lang,'稀有度','Rarity','稀有度')}</th><th>{tr(lang,'level')}</th><th>{copy(lang,'职业','Class','職業')}</th><th/></tr></thead><tbody>{rows.map(item=><tr key={item.id} onClick={()=>setSelected(item)}><td><div className="item-name"><img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt=""/><span><b>{pick(item.name,lang)} <NgBadge tier={item.ngTier}/></b>{item.set&&<small>{pick(item.set,lang)}</small>}</span></div></td><td>{subtypeName(item.subtype,lang)}</td><td><div className="item-badges"><span className={`rarity ${item.rarity}`}>{rarityName(item.rarity,lang)}</span>{item.set&&<span className="set-tag">{copy(lang,'套装','Set','套裝')}</span>}</div></td><td>{item.level}</td><td>{item.classRequirement?classRequirementName(item.classRequirement,lang):''}</td><td><ChevronRight size={14}/></td></tr>)}</tbody></table></div>}<Pagination page={currentPage} pages={pages} setPage={setCurrentPage} lang={lang}/></div>{selected&&<EquipmentDrawer item={selected} variants={selected.ngVariantOf?items.filter(item=>item.ngVariantOf===selected.ngVariantOf):items.filter(item=>!item.ngVariantOf&&item.name.en===selected.name.en&&item.subtype===selected.subtype)} lang={lang} onClose={()=>setSelected(null)}/>}</>
}
function Pagination({page,pages,setPage,lang}:{page:number;pages:number;setPage:(page:number)=>void;lang:Lang}){if(pages<=1)return null;return <div className="pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={15}/>{copy(lang,'上一页','Previous','上一頁')}</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(page+1)}>{copy(lang,'下一页','Next','下一頁')}<ChevronRight size={15}/></button></div>}

function EquipmentDrawer({item,variants,lang,onClose}:{item:DbEquipment;variants:DbEquipment[];lang:Lang;onClose:()=>void}){
  const [currentId,setCurrentId]=useState(item.id);const current=variants.find(variant=>variant.id===currentId)??item
  const hasRequirements=current.requiredLevel>0||current.requirements.length>0||Boolean(current.classRequirement)
  return <div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className="detail-drawer"><button className="drawer-close" onClick={onClose} aria-label={tr(lang,'close')}><X/></button><div className="drawer-title"><img className={`rarity-border ${current.rarity}`} src={asset(current.iconPath)} alt=""/><div><div className="item-badges"><span className={`rarity ${current.rarity}`}>{rarityName(current.rarity,lang)}</span>{current.set&&<span className="set-tag">{copy(lang,'套装','Set','套裝')}</span>}</div><h2>{pick(current.name,lang)} <NgBadge tier={current.ngTier}/></h2>{originalName(current.name,lang)&&<small className="original-name">{current.name.en}</small>}<p className="item-level-type">Lv.{current.level} {subtypeName(current.subtype,lang)}</p></div></div>
    {variants.length>1&&<div className="variant-field"><span>{copy(lang,'选择变体','Choose variant','選擇變體')}</span><SelectControl className="variant-select" label={copy(lang,'选择变体','Choose variant','選擇變體')} value={currentId} onChange={setCurrentId} options={[...variants].sort((a,b)=>a.level-b.level).map(variant=>({value:variant.id,label:`${ngLabel(variant.ngTier)?`${ngLabel(variant.ngTier)} · `:''}Lv ${variant.level} · ${rarityName(variant.rarity,lang)}`}))}/></div>}
    {current.description&&<blockquote>{pick(current.description,lang)}</blockquote>}
    {hasRequirements&&<DetailSection title={copy(lang,'装备需求','Requirements','裝備需求')}><div className="requirement-options">{current.requiredLevel>0&&<strong className="requirement-level">Lv.{current.requiredLevel}</strong>}{current.requiredLevel>0&&current.requirements.length>0&&<span className="requirement-or">{copy(lang,'或','Or','或')}</span>}{current.requirements.length>0&&<div className="requirement-row">{current.requirements.map((requirement,index)=><span key={`${requirement.stat}-${index}`}>{index>0&&<em>{copy(lang,'且','and','且')}</em>}<StatPill stat={requirement.stat}/><b>{requirement.value}</b></span>)}</div>}</div>{current.classRequirement&&<p className="requirement-class"><strong>{copy(lang,'职业：','Class:','職業：')}</strong>{classRequirementName(current.classRequirement,lang)}</p>}</DetailSection>}
    <EquipmentBaseValues item={current} lang={lang}/>
    {current.effects.length>0&&<DetailSection title={copy(lang,'物品效果','Item effects','裝備效果')}><ul className="raw-effect-list">{current.effects.map((effect,index)=><RawEffectLine key={`${effect.type}-${index}`} effect={effect} lang={lang}/>)}</ul></DetailSection>}
    {current.set&&<DetailSection title={copy(lang,'套装','Set','套裝')}><p>{pick(current.set,lang)}</p>{current.rawSetBonuses.length>0&&<ul className="raw-effect-list">{current.rawSetBonuses.map((bonus,index)=><RawEffectLine key={`${bonus.pieces}-${bonus.type}-${index}`} effect={bonus} lang={lang} pieces={bonus.pieces}/>)}</ul>}</DetailSection>}
    {(current.minimumDropLevel!=null||current.maximumDropLevel!=null||current.blockChance)&&<DetailSection title={copy(lang,'其他数值','Other values','其他數值')}>{(current.minimumDropLevel!=null||current.maximumDropLevel!=null)&&<p>{copy(lang,'掉落等级','Drop level','掉落等級')}: {current.minimumDropLevel!=null&&current.maximumDropLevel!=null?`${current.minimumDropLevel}–${current.maximumDropLevel}`:current.minimumDropLevel!=null?`${current.minimumDropLevel}+`:`≤ ${current.maximumDropLevel}`}</p>}{Boolean(current.blockChance)&&<p>{copy(lang,'格挡几率','Block chance','格擋機率')}: {current.blockChance}%</p>}</DetailSection>}
  </aside></div>
}
function DetailSection({title,children}:{title:string;children:React.ReactNode}){return <section className="detail-section"><h3>{title}</h3>{children}</section>}
const itemValueNames:Record<string,{damage:LocalText;armor:LocalText}>={
  physical:{damage:text('Physical Damage','物理伤害','物理傷害'),armor:text('Physical Armor','物理防御','物理防禦')},
  fire:{damage:text('Fire Damage','火焰伤害','火焰傷害'),armor:text('Fire Armor','火焰防御','火焰防禦')},
  ice:{damage:text('Ice Damage','寒冰伤害','寒冰傷害'),armor:text('Ice Armor','寒冰防御','寒冰防禦')},
  electric:{damage:text('Electric Damage','闪电伤害','閃電傷害'),armor:text('Electric Armor','闪电防御','閃電防禦')},
  poison:{damage:text('Poison Damage','毒素伤害','毒素傷害'),armor:text('Poison Armor','毒素防御','毒素防禦')},
}
const rangeText=([min,max]:[number,number])=>min===max?min.toLocaleString():`${min.toLocaleString()}–${max.toLocaleString()}`
function EquipmentBaseValues({item,lang}:{item:DbEquipment;lang:Lang}){
  const damage=Object.entries(item.damage)
  const armor=Object.entries(item.armor)
  const dps=item.damagePerSecond
  if(!damage.length&&!armor.length&&!(item.category==='weapon'&&item.speed!=null))return null
  const valueName=(type:string,kind:'damage'|'armor')=>itemValueNames[type]?pick(itemValueNames[type][kind],lang):titleCase(type.replaceAll('_',' '))
  return <section className="item-base-values" aria-label={copy(lang,'基础数值','Base values','基礎數值')}>
    {dps!=null&&<strong>{rangeText(dps)} {copy(lang,'每秒伤害','Damage per Second','每秒傷害')}</strong>}
    {item.category==='weapon'&&item.speed!=null&&<strong>{item.speed}s {copy(lang,'攻击间隔','Attack Speed','攻擊間隔')}</strong>}
    {damage.map(([type,value])=><span className={`item-value-line ${type}`} key={type}><em>{valueName(type,'damage')}{lang==='en'?':':'：'}</em><b>{rangeText(value)}</b></span>)}
    {armor.map(([type,value])=><span className={`item-value-line ${type}`} key={type}><b>{rangeText(value)}</b><em>{valueName(type,'armor')}</em></span>)}
  </section>
}

function SpellsPage({lang,spells}:{lang:Lang;spells:DbSpellBook[]}){
  const [school,setSchool]=useState<'all'|DbSpellBook['school']>('all');const [query,setQuery]=useState('');const [selected,setSelected]=useState<DbSpellBook|null>(null)
  const families=useMemo(()=>{const map=new Map<string,DbSpellBook[]>();spells.filter(spell=>(school==='all'||spell.school===school)&&(`${allText(spell.family)} ${allText(spell.description)}`).toLowerCase().includes(query.toLowerCase())).forEach(spell=>map.set(spell.family.en,[...(map.get(spell.family.en)||[]),spell]));return [...map.entries()].sort(([a],[b])=>a.localeCompare(b))},[spells,school,query])
  return <><PageHeader section={tr(lang,'navSpells')} title={tr(lang,'spellsTitle')}>{copy(lang,'选择技能书，查看可用等级、需求与游戏说明。','Choose a spell book to see its tiers, requirements and in-game description.','選擇技能書，查看可用等級、需求與遊戲說明。')}</PageHeader><div className="content page-body"><div className="data-toolbar"><label className="data-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={copy(lang,'搜索技能书…','Search spell books…','搜尋技能書…')}/></label><SelectControl className="filter-select" label={copy(lang,'技能书类型','Spell-book type','技能書類型')} value={school} onChange={value=>setSchool(value as typeof school)} options={[{value:'all',label:tr(lang,'all')},...(['offense','defense','summon','utility'] as DbSpellBook['school'][]).map(value=>({value,label:tr(lang,value)}))]}/></div><div className="result-meta"><span>{copy(lang,`显示 ${families.length} 种技能书`,`Showing ${families.length} spell books`,`顯示 ${families.length} 種技能書`)}</span></div>{!spells.length?<Loading lang={lang}/>:<div className="spell-families">{families.map(([family,tiers])=><article key={family}><img className="spell-icon" src={asset(tiers[0].iconPath)} alt=""/><div><span className={`school ${tiers[0].school}`}>{tr(lang,tiers[0].school)}</span><h2>{pick(tiers[0].family,lang)}</h2>{originalName(tiers[0].family,lang)&&<small className="original-name">{tiers[0].family.en}</small>}<p>{pick(tiers[0].description,lang)}</p></div><div className="tier-list">{tiers.map(tier=><button key={tier.id} onClick={()=>setSelected(tier)}><b>{tier.tier}</b><span>Lv {tier.requiredLevel||tier.level}</span></button>)}</div></article>)}</div>}</div>{selected&&<SpellDrawer spell={selected} lang={lang} onClose={()=>setSelected(null)}/>}</>
}
function SpellDrawer({spell,lang,onClose}:{spell:DbSpellBook;lang:Lang;onClose:()=>void}){return <div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className="detail-drawer"><button className="drawer-close" onClick={onClose} aria-label={tr(lang,'close')}><X/></button><div className="drawer-title"><img src={asset(spell.iconPath)} alt=""/><div><span className={`school ${spell.school}`}>{tr(lang,spell.school)}</span><h2>{pick(spell.name,lang)}</h2>{originalName(spell.name,lang)&&<small className="original-name">{spell.name.en}</small>}<p className="subtype">{pick(spell.family,lang)}</p></div></div><blockquote>{pick(spell.description,lang)}</blockquote><dl className="detail-grid"><div><dt>{copy(lang,'技能书等级','Tier','技能書等級')}</dt><dd>{spell.tier}</dd></div><div><dt>{tr(lang,'level')}</dt><dd>{spell.level}</dd></div><div><dt>{tr(lang,'required')}</dt><dd>{spell.requiredLevel||'—'}</dd></div></dl></aside></div>}

const phaseGuidance:Record<string,LocalText>={
  phasebeast_a1z1_bb_a:text('Stand near each totem until it rises, then move to the next.','靠近每座图腾，等它完全升起后再前往下一座。','靠近每座圖騰，等它完全升起後再前往下一座。'),
  phasebeast_a1z1_bb_b:text('Find the route through the maze and reach the exit.','在迷宫中找到正确路线并抵达出口。','在迷宮中找到正確路線並抵達出口。'),
  phasebeast_a1z1_jt_a:text('Defeat the enemies before the time limit expires.','在时间耗尽前尽快消灭场内敌人。','在時間耗盡前儘快消滅場內敵人。'),
  phasebeast_a1z1_lm_a:text('Carry poison to the spider nests and shut them down.','把毒液带到蜘蛛窝，逐一将它们关闭。','把毒液帶到蜘蛛窩，逐一將它們關閉。'),
  phasebeast_a1z1_pb_a:text('Destroy the graves as they rise while dealing with the enemies they release.','摧毁不断升起的坟墓，并处理其中出现的敌人。','摧毀不斷升起的墳墓，並處理其中出現的敵人。'),
  phasebeast_a1z2_bb_a:text('Discover the sequence and ignite the braziers in the correct order.','找出本次的正确顺序，依次点燃火盆。','找出本次的正確順序，依次點燃火盆。'),
  phasebeast_a1z2_bb_b:text('Move between safe heat sources so the cold does not overwhelm you.','在安全的热源之间移动，避免被严寒耗尽生命。','在安全的熱源之間移動，避免被嚴寒耗盡生命。'),
  phasebeast_a1z2_jt_a:text('Hold off the goblin waves and keep as many crystals intact as possible.','抵挡地精的多波进攻，尽量保住更多水晶。','抵擋地精的多波進攻，儘量保住更多水晶。'),
  phasebeast_a2z1_bb_a:text('Choose one of the doors; each can lead to a different encounter.','从门中作出选择；不同的门会通向不同遭遇。','從門中作出選擇；不同的門會通往不同遭遇。'),
  phasebeast_a2z2_bb_a:text('Stay alive through every wave in the arena.','在竞技场内抵挡所有波次并存活下来。','在競技場內抵擋所有波次並存活下來。'),
  phasebeast_a2z2_bb_b:text('Collect shovels and spend the limited digs on likely treasure spots.','收集铲子，在有限的挖掘次数内寻找宝藏。','收集鏟子，在有限的挖掘次數內尋找寶藏。'),
  phasebeast_a3z1_bb_a:text('Defeat the troll while staying clear of hazards around the arena.','避开场地中的危险并击败巨魔。','避開場地中的危險並擊敗巨魔。'),
  phasebeast_a3z1_jt_a:text('Defeat both witches while watching the small arena for incoming attacks.','留意狭小场地中的攻击，并击败两名女巫。','留意狹小場地中的攻擊，並擊敗兩名女巫。'),
  phasebeast_a3z2_bb_a:text('Survive the full attack and clear the remaining enemies.','顶住整轮进攻，并清理剩余敌人。','撐住整輪進攻，並清理剩餘敵人。'),
  phasebeast_a3z2_lm_b:text('Watch the lava cycle and move between safe metal platforms.','观察岩浆涨落，在安全的金属平台之间移动。','觀察岩漿漲落，在安全的金屬平台之間移動。'),
}
function PhasesPage({lang,phaseBeasts}:{lang:Lang;phaseBeasts:DbPhaseBeast[]}){
  const [act,setAct]=useState(0);const filtered=phaseBeasts.filter(beast=>act===0||beast.act===act)
  const steps=[
    copy(lang,'每个主要室外大地图会出现一只相位兽；它发现玩家后会逃跑。','A Phase Beast appears in each major outdoor overworld area and flees when it notices the player.','每個主要室外大地圖會出現一隻相位獸；牠發現玩家後會逃跑。'),
    copy(lang,'击杀相位兽会开启相位传送门；进入后需要完成一个短挑战。','Killing it opens a Phase Portal leading to a short challenge.','擊殺相位獸會開啟相位傳送門；進入後需要完成一個短挑戰。'),
    copy(lang,'挑战由当前大地图决定。完成目标后领取场内奖励，再从出口离开。','The current overworld area determines the challenge pool. Complete the objective, collect the room rewards, then take the exit.','挑戰由目前大地圖決定。完成目標後領取場內獎勵，再從出口離開。'),
  ]
  return <><PageHeader section={tr(lang,'navPhases')} title={tr(lang,'phasesTitle')}>{copy(lang,'先确认相位兽所在地图，再查看可能出现的挑战目标。','Start with the area where the Phase Beast appears, then check its possible challenge objectives.','先確認相位獸所在地圖，再查看可能出現的挑戰目標。')}</PageHeader><div className="content page-body">
    <section className="phase-guide"><figure><img src={`${import.meta.env.BASE_URL}images/phase-beast.webp`} alt={copy(lang,'相位兽与相位传送门','A Phase Beast and Phase Portal','相位獸與相位傳送門')}/></figure><div><SectionTitle eyebrow={copy(lang,'如何进入','How it works','如何進入')} title={copy(lang,'找到相位兽，开启挑战','Find the beast and open its challenge','找到相位獸，開啟挑戰')}/><ol>{steps.map((step,index)=><li key={step}><span>{index+1}</span><p>{step}</p></li>)}</ol></div></section>
    <div className="phase-toolbar"><SectionTitle eyebrow={copy(lang,'挑战地图','Challenge areas','挑戰地圖')} title={copy(lang,'按幕查看','Browse by act','按章節查看')}/><div className="segmented act-tabs">{[0,1,2,3].map(value=><button key={value} className={act===value?'active':''} onClick={()=>setAct(value)}>{value===0?tr(lang,'allActs'):`${tr(lang,'act')} ${value}`}</button>)}</div></div>
    {!phaseBeasts.length?<Loading lang={lang}/>:<div className="phase-grid">{filtered.map(beast=><article className="phase-card" key={beast.id}><header><span><Compass size={15}/>{tr(lang,'act')} {beast.act}</span><h2>{pick(beast.region,lang)}</h2>{originalName(beast.region,lang)&&<small>{beast.region.en}</small>}<p>{beast.challenges.length} {copy(lang,'种可能的挑战','possible challenges','種可能的挑戰')}</p></header><div className="challenge-list">{beast.challenges.map(challenge=><section key={challenge.id}><span className="challenge-label">{tr(lang,'objective')}</span><h3>{pick(challenge.name,lang)}</h3>{originalName(challenge.name,lang)&&<small>{challenge.name.en}</small>}<p>{pick(phaseGuidance[challenge.id]||challenge.name,lang)}</p></section>)}</div></article>)}</div>}
  </div></>
}

type SearchResult={type:'class'|'skill'|'item'|'spell'|'phase';name:string;sub:string;page:Page;classId?:string;skillId?:string;image?:string|null}
function SearchOverlay({lang,query,setQuery,onClose,go,onClass,onSkill,data}:{lang:Lang;query:string;setQuery:(query:string)=>void;onClose:()=>void;go:(page:Page)=>void;onClass:(id:string)=>void;onSkill:(focus:SkillFocus)=>void;data:SiteData}){
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{ref.current?.focus();const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[onClose])
  const results=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return[];const out:SearchResult[]=[]
    classes.forEach(hero=>{if(`${allText(hero.name)} ${allText(hero.description)}`.toLowerCase().includes(needle))out.push({type:'class',name:pick(hero.name,lang),sub:hero.name.en,page:'classes',classId:hero.id})})
    data.classSkills.forEach(group=>group.trees.forEach(tree=>tree.skills.forEach(skill=>{if(`${allText(skill.name)} ${allText(skill.description)}`.toLowerCase().includes(needle))out.push({type:'skill',name:pick(skill.name,lang),sub:`${pick(classes.find(hero=>hero.id===group.classId)?.name||skill.name,lang)} · ${skill.kind==='active'?tr(lang,'active'):tr(lang,'passive')}`,page:'classes',classId:group.classId,skillId:skill.id,image:skill.iconPath})})))
    data.equipment.forEach(item=>{if(`${allText(item.name)} ${ngLabel(item.ngTier)||''} ${item.subtype} ${item.set?allText(item.set):''} ${item.effects.map(effect=>effect.text?allText(effect.text):'').join(' ')}`.toLowerCase().includes(needle))out.push({type:'item',name:`${pick(item.name,lang)}${ngLabel(item.ngTier)?` (${ngLabel(item.ngTier)})`:''}`,sub:`${subtypeName(item.subtype,lang)} · Lv ${item.level}`,page:'items',image:item.iconPath})})
    data.spellBooks.forEach(spell=>{if(`${allText(spell.name)} ${allText(spell.family)} ${allText(spell.description)}`.toLowerCase().includes(needle))out.push({type:'spell',name:pick(spell.name,lang),sub:pick(spell.family,lang),page:'spells',image:spell.iconPath})})
    data.phaseBeasts.forEach(beast=>{const challengeText=beast.challenges.map(challenge=>allText(challenge.name)).join(' ');if(`${allText(beast.region)} ${challengeText}`.toLowerCase().includes(needle))out.push({type:'phase',name:pick(beast.region,lang),sub:copy(lang,`${beast.challenges.length} 种挑战`,`${beast.challenges.length} challenges`,`${beast.challenges.length} 種挑戰`),page:'phases'})})
    return out.slice(0,30)
  },[query,lang,data])
  const icons={class:<Swords/>,skill:<Zap/>,item:<Shield/>,spell:<BookOpen/>,phase:<Compass/>}
  const select=(result:SearchResult)=>{if(result.type==='skill'&&result.classId&&result.skillId)onSkill({classId:result.classId,skillId:result.skillId});else if(result.classId)onClass(result.classId);else go(result.page)}
  return <div className="search-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><div className="search-modal"><div className="search-input"><Search size={20}/><input ref={ref} value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr(lang,'search')}/><button onClick={onClose} aria-label={tr(lang,'close')}><X/></button></div><div className="search-list">{!query?<p>{copy(lang,'输入名称、类型、套装或机制关键词。','Enter a name, type, set or mechanics keyword.','輸入名稱、類型、套裝或機制關鍵字。')}</p>:!results.length?<p>{tr(lang,'noResults')}</p>:results.map((result,index)=><button key={`${result.type}-${index}`} onClick={()=>select(result)}><span>{result.image?<img src={asset(result.image)} alt=""/>:icons[result.type]}</span><div><b>{result.name}</b><small>{result.sub}</small></div><em>{result.type}</em><ArrowRight size={14}/></button>)}</div><footer><span>Esc {tr(lang,'close')}</span><span>{results.length} / 30</span></footer></div></div>
}

function Footer({lang,go}:{lang:Lang;go:(page:Page)=>void}){return <footer className="site-footer"><div className="content"><b>TL2 Wiki</b><nav><button onClick={()=>go('classes')}>{tr(lang,'navClasses')}</button><button onClick={()=>go('items')}>{tr(lang,'navItems')}</button><button onClick={()=>go('builds')}>{tr(lang,'navBuilds')}</button><button onClick={()=>go('gambling')}>{tr(lang,'navGambling')}</button><button onClick={()=>go('spells')}>{tr(lang,'navSpells')}</button><button onClick={()=>go('mechanics')}>{tr(lang,'navMechanics')}</button><button onClick={()=>go('phases')}>{tr(lang,'navPhases')}</button></nav></div></footer>}

export default App
