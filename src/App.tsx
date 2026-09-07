import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import {
  type DbClass,
  type DbClassSkill,
  type DbEquipment,
  type DbMeta,
  type DbPhaseBeast,
  type DbSpellBook,
  type SiteData,
  type SkillGraphs,
} from './domain'
import { copy, localeOptions } from './i18n'
import { GamblingPage, canGambleEquipment, gambleTypeForEquipment } from './gambling'
import { BuildsPage } from './planners'
import { Footer, Header } from './app/AppChrome'
import { ClassesPage } from './app/ClassesPage'
import { HomePage } from './app/HomePage'
import { ItemsPage } from './app/ItemsPage'
import { MechanicsPage } from './app/MechanicsPage'
import { PhasesPage } from './app/PhasesPage'
import { SearchOverlay } from './app/SearchOverlay'
import { SpellsPage } from './app/SpellsPage'
import { pageFromHash, type ItemSearchRequest, type Page, type SkillFocus } from './app/navigation'
import { Loading } from './WikiUi'
import type { Lang } from './types'

const initialLanguage = (): Lang => {
  const stored = localStorage.getItem('tl2-locale')
  if (stored === 'zh') return 'zh-CN'
  if (stored === 'en' || stored === 'zh-CN' || stored === 'zh-TW') return stored
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('zh-tw') || browser.startsWith('zh-hk') || browser.startsWith('zh-mo'))
    return 'zh-TW'
  return browser.startsWith('zh') ? 'zh-CN' : 'en'
}

const loadJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`)
  return response.json() as Promise<T>
}

function App() {
  const [lang, setLang] = useState<Lang>(initialLanguage)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('berserker')
  const [skillFocus, setSkillFocus] = useState<SkillFocus | null>(null)
  const [itemSearchRequest, setItemSearchRequest] = useState<ItemSearchRequest | null>(null)
  const [siteData, setSiteData] = useState<SiteData | null>(null)
  const [dataError, setDataError] = useState(false)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      loadJson<DbEquipment[]>(`${base}data/equipment.json`),
      loadJson<DbSpellBook[]>(`${base}data/spell-books.json`),
      loadJson<DbClass[]>(`${base}data/classes.json`),
      loadJson<DbClassSkill[]>(`${base}data/class-skills.json`),
      loadJson<SkillGraphs>(`${base}data/skill-graphs.json`),
      loadJson<DbPhaseBeast[]>(`${base}data/phase-beasts.json`),
      loadJson<DbMeta>(`${base}data/meta.json`),
    ])
      .then(([equipment, spellBooks, classes, classSkills, skillGraphs, phaseBeasts, meta]) => {
        setSiteData({ equipment, spellBooks, classes, classSkills, skillGraphs, phaseBeasts, meta })
      })
      .catch(() => setDataError(true))
  }, [])
  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.history.replaceState(null, '', '#/home')
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    localStorage.setItem('tl2-locale', lang)
    document.documentElement.lang =
      localeOptions.find((option) => option.code === lang)?.htmlLang || 'en-US'
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        copy(
          lang,
          'TL2 Wiki — Torchlight II 职业、机制、装备、技能书与相位兽资料。',
          'TL2 Wiki — Torchlight II classes, mechanics, equipment, spell books and Phase Beasts.',
          'TL2 Wiki — Torchlight II 職業、機制、裝備、技能書與相位獸資料。',
        ),
      )
  }, [lang])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      } else if (event.key === '/' && !typing) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const go = (next: Page) => {
    window.location.hash = `/${next}`
    setPage(next)
    setMobileOpen(false)
    setSearchOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openGambling = (item: DbEquipment) => {
    if (!canGambleEquipment(item)) return
    const type = gambleTypeForEquipment(item.category, item.subtype)
    if (!type) return
    window.location.hash = `/gambling/${type}/${item.level}/${item.sockets}/${encodeURIComponent(item.id)}`
    setPage('gambling')
    setMobileOpen(false)
    setSearchOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openClass = (id: string) => {
    setClassId(id)
    setSkillFocus(null)
    go('classes')
  }
  const openSkill = (focus: SkillFocus) => {
    setClassId(focus.classId)
    setSkillFocus(focus)
    go('classes')
  }
  const openItemSearch = (query: string) => {
    setItemSearchRequest((current) => ({ query, key: (current?.key || 0) + 1 }))
    go('items')
  }

  return (
    <div className="app-shell">
      <Header
        lang={lang}
        setLang={setLang}
        page={page}
        go={go}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSearch={() => setSearchOpen(true)}
      />
      {dataError && (
        <div className="data-error">
          <Info size={15} />
          {copy(
            lang,
            '数据文件加载失败，请刷新页面。',
            'Data files failed to load. Please refresh.',
            '資料檔案載入失敗，請重新整理頁面。',
          )}
        </div>
      )}
      <main>
        {siteData ? (
          <>
            {page === 'home' && (
              <HomePage
                lang={lang}
                go={go}
                onSearch={() => setSearchOpen(true)}
                onClass={openClass}
                data={siteData}
              />
            )}
            {page === 'classes' && (
              <ClassesPage
                lang={lang}
                classId={classId}
                setClassId={setClassId}
                classes={siteData.classes}
                classSkills={siteData.classSkills}
                skillGraphs={siteData.skillGraphs}
                focus={skillFocus}
              />
            )}
            {page === 'mechanics' && <MechanicsPage lang={lang} />}
            {page === 'items' && (
              <ItemsPage
                lang={lang}
                items={siteData.equipment}
                classes={siteData.classes}
                searchRequest={itemSearchRequest}
                onGamble={openGambling}
              />
            )}
            {page === 'builds' && (
              <BuildsPage lang={lang} items={siteData.equipment} classes={siteData.classes} />
            )}
            {page === 'gambling' && <GamblingPage lang={lang} items={siteData.equipment} />}
            {page === 'spells' && <SpellsPage lang={lang} spells={siteData.spellBooks} />}
            {page === 'phases' && <PhasesPage lang={lang} phaseBeasts={siteData.phaseBeasts} />}
          </>
        ) : (
          !dataError && <Loading lang={lang} />
        )}
      </main>
      <Footer lang={lang} go={go} />
      {searchOpen && siteData && (
        <SearchOverlay
          lang={lang}
          query={query}
          setQuery={setQuery}
          onClose={() => setSearchOpen(false)}
          go={go}
          onClass={openClass}
          onSkill={openSkill}
          onItem={openItemSearch}
          data={siteData}
        />
      )}
    </div>
  )
}

export default App
