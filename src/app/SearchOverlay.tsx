import { useEffect, useMemo, useRef } from 'react'
import { ArrowRight, BookOpen, Compass, Search, Shield, Swords, X, Zap } from 'lucide-react'
import {
  asset,
  ngLabel,
  type SearchIndexEntry,
  type SearchItemEntry,
  type SearchSkillEntry,
} from '../domain'
import { copy, pick, tr } from '../i18n'
import type { Lang } from '../types'
import { subtypeName } from './labels'
import type { Navigate, Page } from './navigation'

type SearchResult = {
  name: string
  sub: string
  page: Page
  entry: SearchIndexEntry
}

export function SearchOverlay({
  lang,
  query,
  setQuery,
  onClose,
  go,
  onClass,
  onSkill,
  onItem,
  data,
}: {
  lang: Lang
  query: string
  setQuery: (query: string) => void
  onClose: () => void
  go: Navigate
  onClass: (id: string) => void
  onSkill: (skill: SearchSkillEntry) => void
  onItem: (item: SearchItemEntry) => void
  data: SearchIndexEntry[]
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return data
      .filter((entry) => entry.searchText.includes(needle))
      .slice(0, 30)
      .map((entry): SearchResult => {
        let sub: string
        let page: Page
        switch (entry.type) {
          case 'class':
            sub = entry.name.en
            page = 'classes'
            break
          case 'skill':
            sub = `${pick(entry.className, lang)} · ${entry.skillKind === 'active' ? tr(lang, 'active') : tr(lang, 'passive')}`
            page = 'classes'
            break
          case 'item':
            sub = `${subtypeName(entry.subtype, lang)} · Lv ${entry.level}`
            page = 'items'
            break
          case 'spell':
            sub = pick(entry.family, lang)
            page = 'spells'
            break
          case 'phase':
            sub = copy(
              lang,
              `${entry.rooms} 个相位房间`,
              `${entry.rooms} Phase rooms`,
              `${entry.rooms} 個相位房間`,
            )
            page = 'phases'
        }
        const variant = entry.type === 'item' ? ngLabel(entry.ngTier) : null
        return {
          name: `${pick(entry.name, lang)}${variant ? ` (${variant})` : ''}`,
          sub,
          page,
          entry,
        }
      })
  }, [query, lang, data])
  const icons = {
    class: <Swords />,
    skill: <Zap />,
    item: <Shield />,
    spell: <BookOpen />,
    phase: <Compass />,
  }
  const typeLabels: Record<SearchIndexEntry['type'], string> = {
    class: copy(lang, '职业', 'Class', '職業'),
    skill: copy(lang, '技能', 'Skill', '技能'),
    item: copy(lang, '装备', 'Item', '裝備'),
    spell: copy(lang, '技能书', 'Spell book', '技能書'),
    phase: copy(lang, '相位兽', 'Phase Beast', '相位獸'),
  }
  const select = (result: SearchResult) => {
    const { entry } = result
    if (entry.type === 'skill') onSkill(entry)
    else if (entry.type === 'item') onItem(entry)
    else if (entry.type === 'class') onClass(entry.id)
    else go(result.page)
  }
  return (
    <div
      className="search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="search-modal">
        <div className="search-input">
          <Search size={20} />
          <input
            ref={ref}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(lang, 'search')}
          />
          <button onClick={onClose} aria-label={tr(lang, 'close')}>
            <X />
          </button>
        </div>
        <div className="search-list">
          {!query ? (
            <p>
              {copy(
                lang,
                '输入名称、类型、套装或机制关键词。',
                'Enter a name, type, set or mechanics keyword.',
                '輸入名稱、類型、套裝或機制關鍵字。',
              )}
            </p>
          ) : !results.length ? (
            <p>{tr(lang, 'noResults')}</p>
          ) : (
            results.map((result, index) => (
              <button key={`${result.entry.type}-${index}`} onClick={() => select(result)}>
                <span>
                  {'image' in result.entry && result.entry.image ? (
                    <img src={asset(result.entry.image)} alt="" />
                  ) : (
                    icons[result.entry.type]
                  )}
                </span>
                <div>
                  <b>{result.name}</b>
                  <small>{result.sub}</small>
                </div>
                <em>{typeLabels[result.entry.type]}</em>
                <ArrowRight size={14} />
              </button>
            ))
          )}
        </div>
        <footer>
          <span>Esc {tr(lang, 'close')}</span>
          <span>{results.length} / 30</span>
        </footer>
      </div>
    </div>
  )
}
