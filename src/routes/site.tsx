import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Info } from 'lucide-react'
import type { Route } from './+types/site'
import { Footer, Header } from '../app/AppChrome'
import { ClassesPage } from '../app/ClassesPage'
import { HomePage } from '../app/HomePage'
import { ItemsPage } from '../app/ItemsPage'
import { LocaleSuggestion } from '../app/LocaleSuggestion'
import { MechanicsPage } from '../app/MechanicsPage'
import { PhasesPage } from '../app/PhasesPage'
import { SearchOverlay } from '../app/SearchOverlay'
import { SpellsPage } from '../app/SpellsPage'
import type { Page } from '../app/navigation'
import {
  equipmentFamily,
  type DbEquipment,
  type EquipmentIndexEntry,
  type EquipmentSummary,
  type SearchIndexEntry,
  type SiteData,
} from '../domain'
import { GamblingPage, canGambleEquipment, gambleTypeForEquipment } from '../gambling'
import { copy, pick } from '../i18n'
import { localizedPath, locales, pagePath, parseLocalizedPath, slugify } from '../paths'
import { BuildsPage } from '../planners'
import { loadPage } from '../site-data.server'
import type { Lang } from '../types'

export async function loader({ request }: Route.LoaderArgs) {
  return loadPage(new URL(request.url).pathname.replace(/^\/tl2-wiki/, '') || '/')
}

const siteUrl = 'https://zhhc99.github.io/tl2-wiki'

const descriptions: Record<Lang, string> = {
  en: 'Torchlight II classes, mechanics, equipment, spell books and Phase Beasts.',
  'zh-CN': 'Torchlight II 职业、机制、装备、技能书与相位兽资料。',
  'zh-TW': 'Torchlight II 職業、機制、裝備、技能書與相位獸資料。',
}

function seo(data: Awaited<ReturnType<typeof loader>>) {
  const entity =
    data.itemFamily?.[0]?.name ?? (data.kind === 'skill' ? data.selectedSkill?.name : undefined)
  const section =
    data.kind === 'item'
      ? copy(data.lang, '装备', 'Equipment', '裝備')
      : data.kind === 'skill'
        ? copy(data.lang, '职业技能', 'Class skill', '職業技能')
        : undefined
  const pageTitles = {
    home: 'TL2 Wiki',
    classes: copy(data.lang, '职业 · TL2 Wiki', 'Classes · TL2 Wiki', '職業 · TL2 Wiki'),
    mechanics: copy(
      data.lang,
      '游戏机制 · TL2 Wiki',
      'Mechanics · TL2 Wiki',
      '遊戲機制 · TL2 Wiki',
    ),
    items: copy(data.lang, '装备 · TL2 Wiki', 'Equipment · TL2 Wiki', '裝備 · TL2 Wiki'),
    builds: copy(data.lang, '配装 · TL2 Wiki', 'Build Planner · TL2 Wiki', '配裝 · TL2 Wiki'),
    gambling: copy(data.lang, '赌博 · TL2 Wiki', 'Gambling · TL2 Wiki', '賭博 · TL2 Wiki'),
    spells: copy(data.lang, '技能书 · TL2 Wiki', 'Spell Books · TL2 Wiki', '技能書 · TL2 Wiki'),
    phases: copy(data.lang, '相位兽 · TL2 Wiki', 'Phase Beasts · TL2 Wiki', '相位獸 · TL2 Wiki'),
    class: data.classId
      ? `${pick(data.data.classes!.find((hero) => hero.id === data.classId)!.name, data.lang)} · TL2 Wiki`
      : 'TL2 Wiki',
    item: '',
    skill: '',
  }
  const title = entity
    ? `${pick(entity, data.lang)} · ${section} · TL2 Wiki`
    : pageTitles[data.kind]
  const hero = data.data.classes?.find((entry) => entry.id === data.classId)
  const description = data.itemFamily?.[0]?.description
    ? pick(data.itemFamily[0].description, data.lang)
    : data.kind === 'skill' && data.selectedSkill
      ? pick(data.selectedSkill.description, data.lang)
      : hero
        ? pick(hero.description, data.lang)
        : descriptions[data.lang]
  return { title, description }
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: 'TL2 Wiki' }]
  const { title, description } = seo(data)
  const canonical = `${siteUrl}${localizedPath(data.lang, data.routePath)}`
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
  ]
}

const loadJson = async <T,>(name: string): Promise<T> => {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
  if (!response.ok) throw new Error(String(response.status))
  return response.json() as Promise<T>
}

let equipmentPromise: Promise<DbEquipment[]> | undefined
let equipmentIndexPromise: Promise<EquipmentIndexEntry[]> | undefined
let searchIndexPromise: Promise<SearchIndexEntry[]> | undefined
const loadEquipment = () => (equipmentPromise ??= loadJson<DbEquipment[]>('equipment'))
const loadEquipmentIndex = () =>
  (equipmentIndexPromise ??= loadJson<EquipmentIndexEntry[]>('equipment-index'))
const loadSearchIndex = () => (searchIndexPromise ??= loadJson<SearchIndexEntry[]>('search-index'))

async function loadClientEquipmentData() {
  const [equipment, classes] = await Promise.all([
    loadEquipment(),
    loadJson<SiteData['classes']>('classes'),
  ])
  return { equipment, classes }
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  try {
    return await serverLoader()
  } catch (error) {
    const pathname = new URL(request.url).pathname.replace(/^\/tl2-wiki/, '') || '/'
    const { lang, routePath } = parseLocalizedPath(pathname)
    const slug = routePath.match(/^items\/([^/]+)$/)?.[1]
    if (!slug) throw error
    const { equipment, classes } = await loadClientEquipmentData()
    const itemFamily = equipmentFamily(equipment, slug)
    if (!itemFamily.length) throw error
    return {
      kind: 'item' as const,
      lang,
      routePath,
      data: { classes },
      itemFamily,
      totalEquipment: equipment.length,
    }
  }
}

export default function Site({ loaderData }: Route.ComponentProps) {
  const { kind, lang, routePath, data } = loaderData
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchIndexEntry[] | null>(null)
  const [dataError, setDataError] = useState(false)
  const [equipmentIndex, setEquipmentIndex] = useState<EquipmentIndexEntry[]>([])
  const [fullEquipment, setFullEquipment] = useState<DbEquipment[]>([])
  const [localeSuggestion, setLocaleSuggestion] = useState<Exclude<Lang, 'en'> | null>(null)
  const requestEquipmentIndex = useCallback(() => {
    loadEquipmentIndex()
      .then(setEquipmentIndex)
      .catch(() => setDataError(true))
  }, [])
  const requestFullEquipment = useCallback(() => {
    loadEquipment()
      .then(setFullEquipment)
      .catch(() => setDataError(true))
  }, [])
  const page = (
    kind === 'item' ? 'items' : kind === 'skill' || kind === 'class' ? 'classes' : kind
  ) as Page
  useEffect(() => {
    if (kind !== 'items' || equipmentIndex.length === loaderData.totalEquipment) return
    requestEquipmentIndex()
  }, [kind, equipmentIndex.length, loaderData.totalEquipment, requestEquipmentIndex])
  useEffect(() => {
    if (kind === 'gambling' && new URLSearchParams(location.search).get('item'))
      requestEquipmentIndex()
  }, [kind, location.search, requestEquipmentIndex])
  const href = (target: Page) => pagePath(lang, target)
  const go = (target: Page) => {
    setSearchOpen(false)
    navigate(href(target))
  }
  const openSearch = () => {
    setSearchOpen(true)
    if (!searchData)
      loadSearchIndex()
        .then(setSearchData)
        .catch(() => setDataError(true))
  }
  const setLang = (next: Lang) => {
    setSearchOpen(false)
    setLocaleSuggestion(null)
    localStorage.setItem('tl2-locale', next)
    navigate(`${localizedPath(next, routePath)}${location.search}`)
  }
  useEffect(() => {
    if (
      kind !== 'home' ||
      lang !== 'en' ||
      routePath ||
      localStorage.getItem('tl2-locale') ||
      localStorage.getItem('tl2-locale-prompt-dismissed')
    )
      return
    const browser = navigator.languages.join(' ').toLowerCase()
    if (/zh-(tw|hk|mo)/.test(browser)) setLocaleSuggestion('zh-TW')
    else if (browser.includes('zh')) setLocaleSuggestion('zh-CN')
  }, [kind, lang, routePath])
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en-US' : lang
  }, [lang])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
  const openClass = (classId: string) => {
    setSearchOpen(false)
    navigate(localizedPath(lang, `classes/${classId}`), { preventScrollReset: true })
  }
  const openSkill = (skill: Extract<SearchIndexEntry, { type: 'skill' }>) => {
    setSearchOpen(false)
    navigate(localizedPath(lang, `classes/${skill.classId}/skills/${slugify(skill.name.en)}`), {
      preventScrollReset: true,
    })
  }
  const openItem = (item: Pick<EquipmentSummary, 'id' | 'familyId'>) => {
    setSearchOpen(false)
    navigate(localizedPath(lang, `items/${item.familyId}`), {
      state: { itemId: item.id },
      preventScrollReset: true,
    })
  }
  const openGambling = (item: EquipmentSummary) => {
    if (!canGambleEquipment(item)) return
    const type = gambleTypeForEquipment(item.category, item.subtype)
    navigate(
      `${href('gambling')}?type=${type}&level=${item.level}&sockets=${item.sockets}&item=${encodeURIComponent(item.id)}`,
    )
  }
  const canonicalRoute = localizedPath(lang, routePath)
  const selectedVariants = loaderData.itemFamily ?? []
  const listedEquipment =
    equipmentIndex.length > 0
      ? equipmentIndex
      : kind === 'item'
        ? selectedVariants
        : (loaderData.equipmentRows ?? [])
  const selectedItem =
    kind === 'item'
      ? (selectedVariants.find(
          (item) => item.id === (location.state as { itemId?: string } | null)?.itemId,
        ) ?? selectedVariants[0])
      : null
  const closeItem = () => {
    navigate(href('items'), { replace: true, preventScrollReset: true })
  }

  return (
    <div className="app-shell">
      <link rel="canonical" href={`${siteUrl}${canonicalRoute}`} />
      {locales.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale === 'zh-CN' ? 'zh-Hans' : locale === 'zh-TW' ? 'zh-Hant' : 'en'}
          href={`${siteUrl}${localizedPath(locale, routePath)}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${siteUrl}${localizedPath('en', routePath)}`}
      />
      <Header
        lang={lang}
        setLang={setLang}
        page={page}
        href={href}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSearch={openSearch}
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
        {kind === 'home' && (
          <HomePage
            lang={lang}
            go={go}
            onSearch={openSearch}
            onClass={openClass}
            data={data as SiteData}
          />
        )}
        {(kind === 'classes' || kind === 'class' || kind === 'skill') && (
          <ClassesPage
            lang={lang}
            classId={loaderData.classId!}
            classes={data.classes!}
            skills={loaderData.skills!}
            selectedSkill={loaderData.selectedSkill!}
            skillGraphs={data.skillGraphs!}
            skillHref={(skill) =>
              localizedPath(lang, `classes/${skill.classId}/skills/${slugify(skill.name.en)}`)
            }
            classHref={(classId) => localizedPath(lang, `classes/${classId}`)}
          />
        )}
        {kind === 'mechanics' && <MechanicsPage lang={lang} />}
        {(kind === 'items' || kind === 'item') && (
          <ItemsPage
            lang={lang}
            items={listedEquipment}
            classes={data.classes!}
            searchRequest={
              new URLSearchParams(location.search).get('q')
                ? { query: new URLSearchParams(location.search).get('q')!, key: 1 }
                : null
            }
            onGamble={openGambling}
            itemHref={(item) => localizedPath(lang, `items/${item.familyId}`)}
            selected={selectedItem}
            selectedVariants={selectedVariants}
            onSelect={openItem}
            onClose={closeItem}
            dataReady={kind === 'items' && equipmentIndex.length === loaderData.totalEquipment}
            totalCount={loaderData.totalEquipment}
          />
        )}
        {kind === 'builds' && (
          <BuildsPage
            lang={lang}
            items={fullEquipment}
            classes={data.classes!}
            onLoadItems={requestFullEquipment}
          />
        )}
        {kind === 'gambling' && (
          <GamblingPage
            lang={lang}
            items={equipmentIndex}
            onLoadItems={requestEquipmentIndex}
            search={location.search}
          />
        )}
        {kind === 'spells' && <SpellsPage lang={lang} spells={data.spellBooks!} />}
        {kind === 'phases' && <PhasesPage lang={lang} phaseBeasts={data.phaseBeasts!} />}
      </main>
      <Footer lang={lang} href={href} />
      {searchOpen && searchData && (
        <SearchOverlay
          lang={lang}
          query={query}
          setQuery={setQuery}
          onClose={() => setSearchOpen(false)}
          go={go}
          onClass={openClass}
          onSkill={openSkill}
          onItem={openItem}
          data={searchData}
        />
      )}
      {localeSuggestion && (
        <LocaleSuggestion
          locale={localeSuggestion}
          onAccept={() => setLang(localeSuggestion)}
          onClose={() => {
            localStorage.setItem('tl2-locale-prompt-dismissed', '1')
            setLocaleSuggestion(null)
          }}
        />
      )}
    </div>
  )
}
