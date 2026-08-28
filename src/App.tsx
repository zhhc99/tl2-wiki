import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight,
  Compass, Globe2, Hammer, Info, Menu,
  Search, Shield, SlidersHorizontal, Swords, X, Zap,
} from 'lucide-react'
import { classes, phaseBeasts, statInfo } from './data'
import { localeOptions, pick, tr, type UIKey } from './i18n'
import type { ItemCategory, Lang, Skill, StatKey } from './types'

type Page = 'home' | 'classes' | 'mechanics' | 'items' | 'spells' | 'phases'
type Rarity = 'normal' | 'rare' | 'set' | 'unique' | 'legendary'
interface DbEffect { text: string; value: number | null }
interface DbSetBonus extends DbEffect { pieces: number }

interface DbEquipment {
  id: string; slug: string; name: string; internalName: string; category: ItemCategory; subtype: string
  unitType: string; rarity: Rarity; level: number; requiredLevel: number
  requirements: { stat: Exclude<StatKey, 'none'>; value: number }[]; sockets: number; speed: number | null
  set: string | null; description: string | null; icon: string | null
  maxSockets: number | null; blockChance: number | null; minimumDropLevel: number | null; maximumDropLevel: number | null
  classRequirement: string | null; armor: Record<string, [number, number]>; damage: Record<string, [number, number]>
  effects: DbEffect[]; setBonuses: DbSetBonus[]; tidbiMatched: boolean; specialSource: string | null; sourceFile: string
}

interface DbSpellBook {
  id: string; name: string; family: string; tier: number; school: 'offense'|'defense'|'summon'|'utility'
  level: number; requiredLevel: number; description: string; icon: string | null; sourceFile: string
}

interface DbClassSkill {
  id: string; slug: string; title: string; titleZh: string; description: string; descriptionZh: string; level: number
  kind: 'active'|'passive'; maxRank: number; icon: string | null; tierText: string[]
}

interface DbClassGroup { classId: string; trees: { treeId: string; skills: DbClassSkill[] }[] }
interface DbMeta {
  source: string; sourceUrl: string; generatedAt: string
  sources: {name:string;url:string;role:string}[]
  counts: {equipment:number;enrichedEquipment:number;itemEffects:number;setBonusDefinitions:number;spellBooks:number;classSkills:number}
}
interface SiteData { equipment: DbEquipment[]; spellBooks: DbSpellBook[]; classSkills: DbClassGroup[]; meta: DbMeta | null }

const emptyData: SiteData = { equipment: [], spellBooks: [], classSkills: [], meta: null }
const statLabels: Record<StatKey, string> = { str: 'STR', dex: 'DEX', foc: 'FOC', vit: 'VIT', none: '—' }
const zh = (lang:Lang, chinese:string, english:string) => lang === 'zh' ? chinese : english

const pageFromHash = (): Page => {
  const value = window.location.hash.replace('#/', '').split('/')[0]
  return (['home','classes','mechanics','items','spells','phases'].includes(value) ? value : 'home') as Page
}

function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('tl2-locale') as Lang) || (navigator.language.startsWith('zh') ? 'zh' : 'en'))
  const [page, setPage] = useState<Page>(pageFromHash)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('berserker')
  const [siteData, setSiteData] = useState<SiteData>(emptyData)
  const [dataError, setDataError] = useState(false)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/equipment.json`).then(r => r.json()), fetch(`${base}data/spell-books.json`).then(r => r.json()),
      fetch(`${base}data/class-skills.json`).then(r => r.json()), fetch(`${base}data/meta.json`).then(r => r.json()),
    ]).then(([equipment, spellBooks, classSkills, meta]) => setSiteData({equipment, spellBooks, classSkills, meta})).catch(() => setDataError(true))
  }, [])

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.history.replaceState(null, '', '#/home')
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    localStorage.setItem('tl2-locale', lang)
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
  }, [lang])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = ['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
      else if (event.key === '/' && !typing) { event.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const go = (next: Page) => {
    window.location.hash = `/${next}`
    setPage(next); setMobileOpen(false); setSearchOpen(false)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  return <div className="app-shell">
    <Header lang={lang} setLang={setLang} page={page} go={go} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onSearch={()=>setSearchOpen(true)}/>
    {dataError && <div className="data-error"><Info size={15}/>{zh(lang,'数据文件加载失败，请刷新页面。','Data files failed to load. Please refresh.')}</div>}
    <main>
      {page==='home' && <Home lang={lang} go={go} onSearch={()=>setSearchOpen(true)} onClass={(id)=>{setClassId(id);go('classes')}} data={siteData}/>}
      {page==='classes' && <ClassesPage lang={lang} classId={classId} setClassId={setClassId} classSkills={siteData.classSkills}/>}
      {page==='mechanics' && <MechanicsPage lang={lang}/>}
      {page==='items' && <ItemsPage lang={lang} items={siteData.equipment}/>}
      {page==='spells' && <SpellsPage lang={lang} spells={siteData.spellBooks}/>}
      {page==='phases' && <PhasesPage lang={lang}/>}
    </main>
    <Footer lang={lang} go={go}/>
    {searchOpen && <SearchOverlay lang={lang} query={query} setQuery={setQuery} onClose={()=>setSearchOpen(false)} go={go} onClass={setClassId} data={siteData}/>} 
  </div>
}

function Header({lang,setLang,page,go,mobileOpen,setMobileOpen,onSearch}:{lang:Lang;setLang:(l:Lang)=>void;page:Page;go:(p:Page)=>void;mobileOpen:boolean;setMobileOpen:(v:boolean)=>void;onSearch:()=>void}) {
  const nav:{page:Page;label:UIKey}[]=[{page:'home',label:'navHome'},{page:'classes',label:'navClasses'},{page:'mechanics',label:'navMechanics'},{page:'items',label:'navItems'},{page:'spells',label:'navSpells'},{page:'phases',label:'navPhases'}]
  return <header className="site-header"><div className="nav-wrap">
    <button className="brand" onClick={()=>go('home')}><span className="brand-dot"/><b>TL2 Wiki</b></button>
    <nav className={mobileOpen?'main-nav is-open':'main-nav'}>{nav.map(n=><button key={n.page} className={page===n.page?'active':''} onClick={()=>go(n.page)}>{tr(lang,n.label)}</button>)}</nav>
    <div className="header-tools"><button className="search-button" onClick={onSearch}><Search size={16}/><span>{tr(lang,'search')}</span><kbd>Ctrl K</kbd></button>
      <label className="locale-select"><Globe2 size={15}/><span className="sr-only">{zh(lang,'选择语言','Choose language')}</span><select value={lang} onChange={e=>setLang(e.target.value as Lang)} aria-label={zh(lang,'选择语言','Choose language')}>{localeOptions.map(option=><option key={option.code} value={option.code}>{option.label}</option>)}</select><ChevronDown size={13}/></label>
      <button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Menu">{mobileOpen?<X/>:<Menu/>}</button>
    </div>
  </div></header>
}

function Home({lang,go,onSearch,onClass,data}:{lang:Lang;go:(p:Page)=>void;onSearch:()=>void;onClass:(id:string)=>void;data:SiteData}) {
  const counts=data.meta?.counts
  const links=[
    {page:'classes' as Page,icon:<Swords/>,title:tr(lang,'navClasses'),text:zh(lang,'4 个职业、12 棵完整技能树','4 classes and 12 complete skill trees'),count:counts?.classSkills||120},
    {page:'items' as Page,icon:<Hammer/>,title:tr(lang,'navItems'),text:zh(lang,'按类型、稀有度和等级筛选','Filter by type, rarity and level'),count:counts?.equipment||4366},
    {page:'spells' as Page,icon:<BookOpen/>,title:tr(lang,'navSpells'),text:zh(lang,'所有技能书等级与说明','Every spell-book tier and description'),count:counts?.spellBooks||194},
    {page:'mechanics' as Page,icon:<SlidersHorizontal/>,title:tr(lang,'navMechanics'),text:zh(lang,'了解属性与命中触发','Understand attributes and hit triggers'),count:4},
  ]
  return <><section className="home-hero"><div className="content home-hero-inner"><div><p className="kicker">TORCHLIGHT II</p><h1>TL2 Wiki</h1><p className="home-lead">{zh(lang,'查职业技能、装备属性、技能书和相位兽挑战。','Look up class skills, equipment, spell books and Phase Beast challenges.')}</p><button className="home-search" onClick={onSearch}><Search size={20}/><span>{tr(lang,'search')}</span><kbd>Ctrl K</kbd></button></div>
    <div className="home-summary"><span>{zh(lang,'内容总览','At a glance')}</span><b>{(counts?.equipment||4366).toLocaleString()} {zh(lang,'件装备','items')}</b><p>120 {zh(lang,'个职业技能','class skills')} · {(counts?.spellBooks||194).toLocaleString()} {zh(lang,'种技能书','spell books')} · 15 {zh(lang,'项相位兽挑战','Phase Beast challenges')}</p></div></div></section>
    <section className="content home-content"><div className="quick-grid">{links.map(link=><button key={link.page} onClick={()=>go(link.page)}><span className="quick-icon">{link.icon}</span><span><b>{link.title}</b><small>{link.text}</small></span><strong>{link.count.toLocaleString()}</strong><ArrowRight size={16}/></button>)}</div>
    <div className="home-columns"><section><SectionTitle eyebrow={zh(lang,'职业','Classes')} title={zh(lang,'选择职业','Choose a class')} /><div className="class-list">{classes.map(hero=><button key={hero.id} onClick={()=>onClass(hero.id)}><span className="class-code" style={{color:hero.accent}}>{hero.monogram}</span><span><b>{pick(hero.name,lang)}</b>{lang==='zh'&&<small>{hero.name.en}</small>}</span><ArrowRight size={15}/></button>)}</div></section>
    <section><SectionTitle eyebrow={zh(lang,'属性','Attributes')} title={zh(lang,'四项核心属性','Four core attributes')} /><div className="attribute-list">{statInfo.map(stat=><button key={stat.key} onClick={()=>go('mechanics')}><StatPill stat={stat.key}/><span><b>{pick(stat.name,lang)}</b><small>{pick(stat.effects[0],lang)}</small></span></button>)}</div></section></div></section></>
}

function PageHeader({section,title,text}:{section:string;title:string;text:string}) {return <section className="page-header"><div className="content"><span>{section}</span><h1>{title}</h1><p>{text}</p></div></section>}
function SectionTitle({eyebrow,title}:{eyebrow:string;title:string}) {return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2></div>}
function StatPill({stat}:{stat:StatKey}) {return stat==='none'?<span className="stat-pill none">—</span>:<span className={`stat-pill ${stat}`}><i/>{statLabels[stat]}</span>}

function useMergedSkills(classId:string,classSkills:DbClassGroup[]) {
  const hero=classes.find(c=>c.id===classId)??classes[0]
  return useMemo(()=>{
    const generated=classSkills.find(c=>c.classId===hero.id)
    return hero.trees.map(tree=>{
      const source=generated?.trees.find(t=>t.treeId===tree.id)?.skills
      if(!source) return tree
      return {...tree,skills:source.map(db=>({
        id:db.slug,
        name:{en:db.title,zh:db.titleZh||db.title},
        level:db.level,
        kind:db.kind,
        summary:{en:db.description,zh:db.descriptionZh||db.description},
      } satisfies Skill))}
    })
  },[hero,classSkills])
}

function ClassesPage({lang,classId,setClassId,classSkills}:{lang:Lang;classId:string;setClassId:(id:string)=>void;classSkills:DbClassGroup[]}) {
  const hero=classes.find(c=>c.id===classId)??classes[0]; const trees=useMergedSkills(classId,classSkills); const [treeId,setTreeId]=useState(trees[0].id); const tree=trees.find(t=>t.id===treeId)??trees[0]; const [selectedId,setSelectedId]=useState('')
  useEffect(()=>{setTreeId(trees[0].id);setSelectedId('')},[hero.id]); useEffect(()=>{if(tree.skills.length&&!tree.skills.some(s=>s.id===selectedId))setSelectedId(tree.skills[0].id)},[tree,selectedId]); const selected=tree.skills.find(s=>s.id===selectedId)??tree.skills[0]
  return <><PageHeader section={tr(lang,'navClasses')} title={tr(lang,'classesTitle')} text={zh(lang,'选择职业，查看三系技能与解锁等级。','Choose a class to browse its three skill trees and unlock levels.')}/><div className="content page-body">
    <div className="segmented class-tabs">{classes.map(c=><button key={c.id} className={c.id===hero.id?'active':''} onClick={()=>setClassId(c.id)}><span style={{color:c.accent}}>{c.monogram}</span>{pick(c.name,lang)}</button>)}</div>
    <section className="class-overview"><div><span className="label">{hero.name.en}</span><h2>{pick(hero.name,lang)}</h2><p>{pick(hero.description,lang)}</p></div></section>
    {!selected?<Loading lang={lang}/>:<div className="skill-layout"><section><div className="section-row"><SectionTitle eyebrow={tr(lang,'skillTrees')} title={pick(tree.name,lang)}/><div className="segmented tree-tabs">{trees.map(t=><button className={t.id===tree.id?'active':''} onClick={()=>setTreeId(t.id)} key={t.id}>{pick(t.name,lang)} <small>{t.skills.length}</small></button>)}</div></div><div className="skill-table">{tree.skills.map(skill=><button key={skill.id} className={selected.id===skill.id?'active':''} onClick={()=>setSelectedId(skill.id)}><span className="skill-level">{skill.level}</span><span><b>{pick(skill.name,lang)}</b><small>{skill.kind==='active'?tr(lang,'active'):tr(lang,'passive')}</small></span><ChevronRight size={15}/></button>)}</div></section>
    <aside className="skill-panel"><span className="label">{selected.kind==='active'?tr(lang,'active'):tr(lang,'passive')} · {tr(lang,'unlocks')} {selected.level}</span><h2>{pick(selected.name,lang)}</h2>{lang==='zh'&&selected.name.zh!==selected.name.en&&<small className="original-name">{selected.name.en}</small>}<p>{pick(selected.summary,lang)}</p></aside></div>}
  </div></>
}

function MechanicsPage({lang}:{lang:Lang}) {
  const matrix:{event:UIKey;crit:'yes'|'no'|'limited';steal:'yes'|'no'|'limited';proc:'yes'|'no'|'limited'}[]=[{event:'weaponHit',crit:'yes',steal:'yes',proc:'yes'},{event:'weaponSkill',crit:'yes',steal:'limited',proc:'limited'},{event:'flatSkill',crit:'yes',steal:'no',proc:'no'},{event:'dot',crit:'no',steal:'no',proc:'no'},{event:'minion',crit:'limited',steal:'no',proc:'no'}]
  return <><PageHeader section={tr(lang,'navMechanics')} title={tr(lang,'mechTitle')} text={zh(lang,'了解四项属性，以及不同伤害怎样触发暴击、吸取和武器效果。','Understand the four attributes and how damage types interact with critical hits, stealing and weapon effects.')}/><div className="content page-body"><div className="stat-grid">{statInfo.map(stat=><article className={`stat-summary ${stat.key}`} key={stat.key}><div><StatPill stat={stat.key}/><h3>{pick(stat.name,lang)}</h3></div><ul>{stat.effects.map((e,i)=><li key={i}>{pick(e,lang)}</li>)}</ul></article>)}</div>
    <section className="matrix-section"><SectionTitle eyebrow={zh(lang,'命中','Hits')} title={tr(lang,'triggerGuide')}/><p className="section-copy">{tr(lang,'triggerIntro')}</p><div className="table-scroll"><table><thead><tr><th>{tr(lang,'event')}</th><th>{tr(lang,'canCrit')}</th><th>{tr(lang,'canSteal')}</th><th>{tr(lang,'canProc')}</th></tr></thead><tbody>{matrix.map(r=><tr key={r.event}><td>{tr(lang,r.event)}</td>{(['crit','steal','proc'] as const).map(k=><td key={k}><Status value={r[k]} lang={lang}/></td>)}</tr>)}</tbody></table></div></section>
  </div></>
}

function Status({value,lang}:{value:'yes'|'no'|'limited';lang:Lang}) {return <span className={`status ${value}`}>{value==='yes'?'✓':value==='no'?'—':'△'} {tr(lang,value)}</span>}

function ItemsPage({lang,items}:{lang:Lang;items:DbEquipment[]}) {
  const [category,setCategory]=useState<'all'|ItemCategory>('all'); const [rarity,setRarity]=useState<'all'|Rarity>('all'); const [query,setQuery]=useState(''); const [level,setLevel]=useState('all'); const [page,setPage]=useState(1); const [selected,setSelected]=useState<DbEquipment|null>(null)
  const filtered=useMemo(()=>items.filter(item=>(category==='all'||item.category===category)&&(rarity==='all'||item.rarity===rarity)&&(level==='all'||(level==='100'?item.level>=100:item.level>=Number(level)&&item.level<Number(level)+20))&&(`${item.name} ${item.subtype} ${item.set||''} ${item.effects.map(effect=>effect.text).join(' ')}`).toLowerCase().includes(query.toLowerCase())),[items,category,rarity,level,query])
  useEffect(()=>setPage(1),[category,rarity,level,query]); const perPage=40; const pages=Math.max(1,Math.ceil(filtered.length/perPage)); const rows=filtered.slice((page-1)*perPage,page*perPage)
  const cat=(value:string)=>value==='weapon'?'weapon':value==='armor'?'armorCat':value==='trinket'?'trinket':value==='pet'?'petGear':value==='socketable'?'socketable':'all'
  return <><PageHeader section={tr(lang,'navItems')} title={tr(lang,'itemsTitle')} text={zh(lang,'按名称、类型、稀有度、等级或物品效果查找装备。','Find equipment by name, type, rarity, level or item effect.')}/><div className="content page-body"><div className="data-toolbar"><label className="data-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={zh(lang,'搜索名称、类型、套装或效果…','Search name, type, set or effect…')}/></label><select value={category} onChange={e=>setCategory(e.target.value as typeof category)}>{['all','weapon','armor','trinket','pet','socketable'].map(v=><option value={v} key={v}>{tr(lang,cat(v) as UIKey)}</option>)}</select><select value={rarity} onChange={e=>setRarity(e.target.value as typeof rarity)}><option value="all">{tr(lang,'allRarity')}</option>{['normal','rare','set','unique','legendary'].map(v=><option value={v} key={v}>{rarityName(v as Rarity,lang)}</option>)}</select><select value={level} onChange={e=>setLevel(e.target.value)}><option value="all">{zh(lang,'全部等级','All levels')}</option>{[0,20,40,60,80,100].map(v=><option value={v} key={v}>Lv {v}{v<100?'–'+(v+19):'+'}</option>)}</select></div>
    <div className="result-meta"><span>{filtered.length.toLocaleString()} {tr(lang,'itemsFound')}</span><span>{zh(lang,`第 ${page} / ${pages} 页`,`Page ${page} of ${pages}`)}</span></div>{!items.length?<Loading lang={lang}/>:<div className="table-scroll"><table className="data-table"><thead><tr><th>{zh(lang,'名称','Name')}</th><th>{zh(lang,'类型','Type')}</th><th>{zh(lang,'稀有度','Rarity')}</th><th>{tr(lang,'level')}</th><th>{tr(lang,'required')}</th><th>{tr(lang,'sockets')}</th><th/></tr></thead><tbody>{rows.map(item=><tr key={item.id} onClick={()=>setSelected(item)}><td><b>{item.name}</b>{item.set&&<small>{item.set}</small>}</td><td>{item.subtype}</td><td><span className={`rarity ${item.rarity}`}>{rarityName(item.rarity,lang)}</span></td><td>{item.level}</td><td>{item.requiredLevel||'—'}</td><td>{item.category==='socketable'?'—':item.sockets}</td><td><ChevronRight size={14}/></td></tr>)}</tbody></table></div>}<Pagination page={page} pages={pages} setPage={setPage} lang={lang}/></div>{selected&&<EquipmentDrawer item={selected} variants={items.filter(i=>i.name===selected.name&&i.subtype===selected.subtype)} lang={lang} onClose={()=>setSelected(null)}/>}</>
}

function rarityName(rarity:Rarity,lang:Lang){const names={normal:['普通','Normal'],rare:['稀有','Rare'],set:['套装','Set'],unique:['独特','Unique'],legendary:['传奇','Legendary']} as const;return zh(lang,names[rarity][0],names[rarity][1])}
function Loading({lang}:{lang:Lang}) {return <div className="loading"><span/><p>{zh(lang,'正在加载数据…','Loading data…')}</p></div>}
function Pagination({page,pages,setPage,lang}:{page:number;pages:number;setPage:(p:number)=>void;lang:Lang}) {if(pages<=1)return null;return <div className="pagination"><button disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={15}/>{zh(lang,'上一页','Previous')}</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(page+1)}>{zh(lang,'下一页','Next')}<ChevronRight size={15}/></button></div>}

function EquipmentDrawer({item,variants,lang,onClose}:{item:DbEquipment;variants:DbEquipment[];lang:Lang;onClose:()=>void}) {
  const [currentId,setCurrentId]=useState(item.id); const current=variants.find(v=>v.id===currentId)??item
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="detail-drawer"><button className="drawer-close" onClick={onClose}><X/></button><span className={`rarity ${current.rarity}`}>{rarityName(current.rarity,lang)}</span><h2>{current.name}</h2><p className="subtype">{current.subtype}</p>{variants.length>1&&<label className="variant-select"><span>{zh(lang,'选择等级','Choose level')}</span><select value={currentId} onChange={e=>setCurrentId(e.target.value)}>{variants.sort((a,b)=>a.level-b.level).map(v=><option key={v.id} value={v.id}>Lv {v.level} · {rarityName(v.rarity,lang)}</option>)}</select></label>}
    {current.description&&<blockquote>{current.description}</blockquote>}<dl className="detail-grid"><div><dt>{tr(lang,'level')}</dt><dd>{current.level}</dd></div><div><dt>{tr(lang,'required')}</dt><dd>{current.requiredLevel||'—'}</dd></div>{current.category!=='socketable'&&<div><dt>{tr(lang,'sockets')}</dt><dd>{current.maxSockets?`${current.sockets} / ${current.maxSockets}`:current.sockets}</dd></div>}<div><dt>{zh(lang,'速度值','Speed value')}</dt><dd>{current.speed??'—'}</dd></div></dl>
    {(current.requirements.length>0||current.classRequirement)&&<DetailSection title={zh(lang,'装备需求','Requirements')}>{current.requirements.length>0&&<div className="requirement-row">{current.requirements.map(r=><span key={r.stat}><StatPill stat={r.stat}/><b>{r.value}</b></span>)}</div>}{current.classRequirement&&<p>{zh(lang,'职业','Class')}: {current.classRequirement}</p>}</DetailSection>}
    {current.effects.length>0&&<DetailSection title={zh(lang,'物品效果','Item effects')}><ul className="effect-list">{current.effects.map((effect,index)=><li key={`${effect.text}-${index}`}>{effect.text}</li>)}</ul></DetailSection>}
    {current.set&&<DetailSection title={zh(lang,'套装','Set')}><p>{current.set}</p>{current.setBonuses.length>0&&<ul className="effect-list set-bonuses">{current.setBonuses.map((bonus,index)=><li key={`${bonus.pieces}-${bonus.text}-${index}`}><b>{bonus.pieces} {zh(lang,'件','pieces')}</b>{bonus.text}</li>)}</ul>}</DetailSection>}
    {Object.keys(current.damage).length>0&&<DetailSection title={zh(lang,'基础伤害范围','Base damage ranges')}><DataValues values={current.damage}/></DetailSection>}{Object.keys(current.armor).length>0&&<DetailSection title={zh(lang,'基础护甲范围','Base armor ranges')}><DataValues values={current.armor}/></DetailSection>}
    {(current.minimumDropLevel!=null||current.maximumDropLevel!=null||current.blockChance)&&<DetailSection title={zh(lang,'其他数值','Other values')}>{(current.minimumDropLevel!=null||current.maximumDropLevel!=null)&&<p>{zh(lang,'掉落等级','Drop level')}: {current.minimumDropLevel??'—'}–{current.maximumDropLevel??'—'}</p>}{Boolean(current.blockChance)&&<p>{zh(lang,'格挡几率','Block chance')}: {current.blockChance}%</p>}</DetailSection>}
    {current.specialSource&&<DetailSection title={zh(lang,'获取方式','Where to find')}><p>{current.specialSource}</p></DetailSection>}</aside></div>
}
function DetailSection({title,children}:{title:string;children:React.ReactNode}){return <section className="detail-section"><h3>{title}</h3>{children}</section>}
function DataValues({values}:{values:Record<string,[number,number]>}){return <div className="value-list">{Object.entries(values).map(([k,[min,max]])=><span key={k}><i className={k}/>{k}<b>{min===max?min:`${min}–${max}`}</b></span>)}</div>}

function SpellsPage({lang,spells}:{lang:Lang;spells:DbSpellBook[]}) {
  const [school,setSchool]=useState<'all'|DbSpellBook['school']>('all'); const [query,setQuery]=useState(''); const [selected,setSelected]=useState<DbSpellBook|null>(null)
  const families=useMemo(()=>{const map=new Map<string,DbSpellBook[]>();spells.filter(s=>(school==='all'||s.school===school)&&(`${s.family} ${s.description}`).toLowerCase().includes(query.toLowerCase())).forEach(s=>map.set(s.family,[...(map.get(s.family)||[]),s]));return [...map.entries()].sort(([a],[b])=>a.localeCompare(b))},[spells,school,query])
  return <><PageHeader section={tr(lang,'navSpells')} title={tr(lang,'spellsTitle')} text={zh(lang,'选择技能书，查看可用等级、需求与效果。','Choose a spell book to see its tiers, requirements and effect.')}/><div className="content page-body"><div className="data-toolbar"><label className="data-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={zh(lang,'搜索技能书…','Search spell books…')}/></label><select value={school} onChange={e=>setSchool(e.target.value as typeof school)}><option value="all">{tr(lang,'all')}</option>{['offense','defense','summon','utility'].map(v=><option value={v} key={v}>{tr(lang,v as UIKey)}</option>)}</select></div><div className="result-meta"><span>{zh(lang,`显示 ${families.length} 种技能书`,`Showing ${families.length} spell books`)}</span></div>{!spells.length?<Loading lang={lang}/>:<div className="spell-families">{families.map(([family,tiers])=><article key={family}><div><span className={`school ${tiers[0].school}`}>{tr(lang,tiers[0].school)}</span><h2>{family}</h2><p>{tiers[0].description}</p></div><div className="tier-list">{tiers.map(tier=><button key={tier.id} onClick={()=>setSelected(tier)}><b>{tier.tier}</b><span>Lv {tier.requiredLevel||tier.level}</span></button>)}</div></article>)}</div>}</div>{selected&&<SpellDrawer spell={selected} lang={lang} onClose={()=>setSelected(null)}/>}</>
}
function SpellDrawer({spell,lang,onClose}:{spell:DbSpellBook;lang:Lang;onClose:()=>void}) {return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="detail-drawer"><button className="drawer-close" onClick={onClose}><X/></button><span className={`school ${spell.school}`}>{tr(lang,spell.school)}</span><h2>{spell.name}</h2><p className="subtype">{spell.family}</p><blockquote>{spell.description}</blockquote><dl className="detail-grid"><div><dt>{zh(lang,'技能书等级','Tier')}</dt><dd>{spell.tier}</dd></div><div><dt>{tr(lang,'level')}</dt><dd>{spell.level}</dd></div><div><dt>{tr(lang,'required')}</dt><dd>{spell.requiredLevel||'—'}</dd></div></dl></aside></div>}

function PhasesPage({lang}:{lang:Lang}) {
  const [act,setAct]=useState(0); const filtered=phaseBeasts.filter(beast=>act===0||beast.act===act)
  const steps=[
    zh(lang,'每个主要室外大地图都会生成一只相位兽。它不会主动攻击，发现玩家后会逃跑。','One Phase Beast spawns in every major outdoor overworld area. It never attacks and flees when discovered.'),
    zh(lang,'击杀相位兽后会出现相位传送门。进入前可先整理装备和背包。','Killing it opens a Phase Portal. Prepare your gear and inventory before entering.'),
    zh(lang,'传送门会从当前地图对应的挑战中随机选择一个；完成目标后领取奖励，再从出口离开。','The portal randomly selects a challenge tied to that area. Complete its objective, collect the reward, then leave through the exit.'),
  ]
  return <><PageHeader section={tr(lang,'navPhases')} title={tr(lang,'phasesTitle')} text={zh(lang,'先确认所在地图，再查看可能遇到的挑战与奖励。','Choose an area to see its possible challenges and rewards.')}/><div className="content page-body">
    <section className="phase-guide"><figure><img src={`${import.meta.env.BASE_URL}images/phase-beast.webp`} alt={zh(lang,'相位兽与相位传送门','A Phase Beast and Phase Portal')}/></figure><div><SectionTitle eyebrow={zh(lang,'如何进入','How it works')} title={zh(lang,'找到相位兽，开启挑战','Find the beast and open its challenge')}/><ol>{steps.map((step,index)=><li key={step}><span>{index+1}</span><p>{step}</p></li>)}</ol></div></section>
    <div className="phase-toolbar"><SectionTitle eyebrow={zh(lang,'挑战地图','Challenge areas')} title={zh(lang,'按幕查看','Browse by act')}/><div className="segmented act-tabs">{[0,1,2,3].map(a=><button key={a} className={act===a?'active':''} onClick={()=>setAct(a)}>{a===0?tr(lang,'allActs'):`${tr(lang,'act')} ${a}`}</button>)}</div></div>
    <div className="phase-grid">{filtered.map(beast=><article className="phase-card" key={beast.id}><header><span><Compass size={15}/>{tr(lang,'act')} {beast.act}</span><h2>{pick(beast.region,lang)}</h2>{lang==='zh'&&<small>{beast.region.en}</small>}<p>{beast.challenges.length} {zh(lang,'种可能的挑战','possible challenges')}</p></header><div className="challenge-list">{beast.challenges.map(item=><section key={item.name.en}><h3>{pick(item.name,lang)}</h3>{lang==='zh'&&item.name.zh!==item.name.en&&<small>{item.name.en}</small>}<p>{pick(item.detail,lang)}</p><dl><dt>{tr(lang,'reward')}</dt><dd>{pick(item.reward,lang)}</dd></dl></section>)}</div></article>)}</div>
  </div></>
}

type SearchResult={type:'class'|'skill'|'item'|'spell'|'phase';name:string;sub:string;page:Page;classId?:string}
function SearchOverlay({lang,query,setQuery,onClose,go,onClass,data}:{lang:Lang;query:string;setQuery:(q:string)=>void;onClose:()=>void;go:(p:Page)=>void;onClass:(id:string)=>void;data:SiteData}) {
  const ref=useRef<HTMLInputElement>(null);useEffect(()=>{ref.current?.focus();const h=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[onClose])
  const results=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return[];const out:SearchResult[]=[];classes.forEach(c=>{if(`${c.name.en} ${c.name.zh} ${c.description.en} ${c.description.zh}`.toLowerCase().includes(q))out.push({type:'class',name:pick(c.name,lang),sub:c.name.en,page:'classes',classId:c.id})});data.classSkills.forEach(c=>c.trees.forEach(t=>t.skills.forEach(s=>{if(`${s.title} ${s.titleZh} ${s.description} ${s.descriptionZh}`.toLowerCase().includes(q))out.push({type:'skill',name:lang==='zh'?(s.titleZh||s.title):s.title,sub:`${c.classId} · ${t.treeId}`,page:'classes',classId:c.classId})})));data.equipment.forEach(i=>{if(`${i.name} ${i.subtype} ${i.set||''} ${i.effects.map(effect=>effect.text).join(' ')}`.toLowerCase().includes(q))out.push({type:'item',name:i.name,sub:`${i.subtype} · Lv ${i.level}`,page:'items'})});data.spellBooks.forEach(s=>{if(`${s.name} ${s.description}`.toLowerCase().includes(q))out.push({type:'spell',name:s.name,sub:s.family,page:'spells'})});phaseBeasts.forEach(b=>{const challengeText=b.challenges.flatMap(c=>[c.name.en,c.name.zh,c.detail.en,c.detail.zh]).join(' ');if(`${b.region.en} ${b.region.zh} ${challengeText}`.toLowerCase().includes(q))out.push({type:'phase',name:pick(b.region,lang),sub:zh(lang,`${b.challenges.length} 种挑战`,`${b.challenges.length} challenges`),page:'phases'})});return out.slice(0,30)},[query,lang,data])
  const icons={class:<Swords/>,skill:<Zap/>,item:<Shield/>,spell:<BookOpen/>,phase:<Compass/>}
  return <div className="search-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="search-modal"><div className="search-input"><Search size={20}/><input ref={ref} value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr(lang,'search')}/><button onClick={onClose}><X/></button></div><div className="search-list">{!query?<p>{zh(lang,'输入名称、类型、套装或机制关键词。','Enter a name, type, set or mechanics keyword.')}</p>:!results.length?<p>{tr(lang,'noResults')}</p>:results.map((r,i)=><button key={`${r.type}-${i}`} onClick={()=>{if(r.classId)onClass(r.classId);go(r.page)}}><span>{icons[r.type]}</span><div><b>{r.name}</b><small>{r.sub}</small></div><em>{r.type}</em><ArrowRight size={14}/></button>)}</div><footer><span>Esc {tr(lang,'close')}</span><span>{results.length} / 30</span></footer></div></div>
}

function Footer({lang,go}:{lang:Lang;go:(p:Page)=>void}) {return <footer className="site-footer"><div className="content"><b>TL2 Wiki</b><nav><button onClick={()=>go('classes')}>{tr(lang,'navClasses')}</button><button onClick={()=>go('items')}>{tr(lang,'navItems')}</button><button onClick={()=>go('spells')}>{tr(lang,'navSpells')}</button><button onClick={()=>go('mechanics')}>{tr(lang,'navMechanics')}</button><button onClick={()=>go('phases')}>{tr(lang,'navPhases')}</button></nav></div></footer>}

export default App
