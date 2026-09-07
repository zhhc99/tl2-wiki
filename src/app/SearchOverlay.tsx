import { useEffect, useMemo, useRef } from 'react'
import { ArrowRight, BookOpen, Compass, Search, Shield, Swords, X, Zap } from 'lucide-react'
import { allText, asset, ngLabel, type SiteData } from '../domain'
import { copy, pick, tr } from '../i18n'
import type { Lang } from '../types'
import { subtypeName } from './labels'
import type { Navigate, Page, SkillFocus } from './navigation'

type SearchResult = {
  type: 'class' | 'skill' | 'item' | 'spell' | 'phase'
  name: string
  sub: string
  page: Page
  classId?: string
  skillId?: string
  itemQuery?: string
  image?: string | null
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
  onSkill: (focus: SkillFocus) => void
  onItem: (query: string) => void
  data: SiteData
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
    const out: SearchResult[] = []
    data.classes.forEach((hero) => {
      if (`${allText(hero.name)} ${allText(hero.description)}`.toLowerCase().includes(needle))
        out.push({
          type: 'class',
          name: pick(hero.name, lang),
          sub: hero.name.en,
          page: 'classes',
          classId: hero.id,
        })
    })
    data.classSkills.forEach((skill) => {
      if (`${allText(skill.name)} ${allText(skill.description)}`.toLowerCase().includes(needle))
        out.push({
          type: 'skill',
          name: pick(skill.name, lang),
          sub: `${pick(data.classes.find((hero) => hero.id === skill.classId)?.name || skill.name, lang)} · ${skill.kind === 'active' ? tr(lang, 'active') : tr(lang, 'passive')}`,
          page: 'classes',
          classId: skill.classId,
          skillId: skill.id,
          image: skill.iconPath,
        })
    })
    data.equipment.forEach((item) => {
      if (
        `${allText(item.name)} ${ngLabel(item.ngTier) || ''} ${item.subtype} ${item.set ? allText(item.set) : ''} ${item.effects.map((effect) => (effect.text ? allText(effect.text) : '')).join(' ')}`
          .toLowerCase()
          .includes(needle)
      ) {
        const variant = ngLabel(item.ngTier)
        out.push({
          type: 'item',
          name: `${pick(item.name, lang)}${variant ? ` (${variant})` : ''}`,
          sub: `${subtypeName(item.subtype, lang)} · Lv ${item.level}`,
          page: 'items',
          itemQuery: pick(item.name, lang),
          image: item.iconPath,
        })
      }
    })
    data.spellBooks.forEach((spell) => {
      if (
        `${allText(spell.name)} ${allText(spell.family)} ${allText(spell.description)}`
          .toLowerCase()
          .includes(needle)
      )
        out.push({
          type: 'spell',
          name: pick(spell.name, lang),
          sub: pick(spell.family, lang),
          page: 'spells',
          image: spell.iconPath,
        })
    })
    data.phaseBeasts.forEach((beast) => {
      const challengeText = beast.challenges.map((challenge) => allText(challenge.name)).join(' ')
      const rooms = beast.challenges.length + beast.undocumented
      if (`${allText(beast.region)} ${challengeText}`.toLowerCase().includes(needle))
        out.push({
          type: 'phase',
          name: pick(beast.region, lang),
          sub: copy(lang, `${rooms} 个相位房间`, `${rooms} Phase rooms`, `${rooms} 個相位房間`),
          page: 'phases',
        })
    })
    return out.slice(0, 30)
  }, [query, lang, data])
  const icons = {
    class: <Swords />,
    skill: <Zap />,
    item: <Shield />,
    spell: <BookOpen />,
    phase: <Compass />,
  }
  const typeLabels: Record<SearchResult['type'], string> = {
    class: copy(lang, '职业', 'Class', '職業'),
    skill: copy(lang, '技能', 'Skill', '技能'),
    item: copy(lang, '装备', 'Item', '裝備'),
    spell: copy(lang, '技能书', 'Spell book', '技能書'),
    phase: copy(lang, '相位兽', 'Phase Beast', '相位獸'),
  }
  const select = (result: SearchResult) => {
    if (result.type === 'skill' && result.classId && result.skillId)
      onSkill({ classId: result.classId, skillId: result.skillId })
    else if (result.type === 'item' && result.itemQuery) onItem(result.itemQuery)
    else if (result.classId) onClass(result.classId)
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
              <button key={`${result.type}-${index}`} onClick={() => select(result)}>
                <span>
                  {result.image ? <img src={asset(result.image)} alt="" /> : icons[result.type]}
                </span>
                <div>
                  <b>{result.name}</b>
                  <small>{result.sub}</small>
                </div>
                <em>{typeLabels[result.type]}</em>
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
