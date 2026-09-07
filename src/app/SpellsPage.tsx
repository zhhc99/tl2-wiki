import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { allText, asset, type DbSpellBook } from '../domain'
import { copy, pick, tr } from '../i18n'
import { SelectControl } from '../SelectControl'
import type { Lang } from '../types'
import { Loading, originalName, PageHeader } from '../WikiUi'

export function SpellsPage({ lang, spells }: { lang: Lang; spells: DbSpellBook[] }) {
  const [school, setSchool] = useState<'all' | DbSpellBook['school']>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DbSpellBook | null>(null)
  const families = useMemo(() => {
    const map = new Map<string, DbSpellBook[]>()
    spells
      .filter(
        (spell) =>
          (school === 'all' || spell.school === school) &&
          `${allText(spell.family)} ${allText(spell.description)}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .forEach((spell) => map.set(spell.family.en, [...(map.get(spell.family.en) || []), spell]))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [spells, school, query])
  return (
    <>
      <PageHeader section={tr(lang, 'navSpells')} title={tr(lang, 'spellsTitle')}>
        {copy(
          lang,
          '选择技能书，查看可用等级、需求与游戏说明。',
          'Choose a spell book to see its tiers, requirements and in-game description.',
          '選擇技能書，查看可用等級、需求與遊戲說明。',
        )}
      </PageHeader>
      <div className="content page-body">
        <div className="data-toolbar">
          <label className="data-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy(lang, '搜索技能书…', 'Search spell books…', '搜尋技能書…')}
            />
          </label>
          <SelectControl
            className="filter-select"
            label={copy(lang, '技能书类型', 'Spell-book type', '技能書類型')}
            value={school}
            onChange={(value) => setSchool(value as typeof school)}
            options={[
              { value: 'all', label: tr(lang, 'all') },
              ...(['offense', 'defense', 'summon', 'utility'] as DbSpellBook['school'][]).map(
                (value) => ({ value, label: tr(lang, value) }),
              ),
            ]}
          />
        </div>
        <div className="result-meta">
          <span>
            {copy(
              lang,
              `显示 ${families.length} 种技能书`,
              `Showing ${families.length} spell books`,
              `顯示 ${families.length} 種技能書`,
            )}
          </span>
        </div>
        {!spells.length ? (
          <Loading lang={lang} />
        ) : (
          <div className="spell-families">
            {families.map(([family, tiers]) => (
              <article key={family}>
                <img className="spell-icon" src={asset(tiers[0].iconPath)} alt="" />
                <div>
                  <span className={`school ${tiers[0].school}`}>{tr(lang, tiers[0].school)}</span>
                  <h2>{pick(tiers[0].family, lang)}</h2>
                  {originalName(tiers[0].family, lang) && (
                    <small className="original-name">{tiers[0].family.en}</small>
                  )}
                  <p>{pick(tiers[0].description, lang)}</p>
                </div>
                <div className="tier-list">
                  {tiers.map((tier) => (
                    <button key={tier.id} onClick={() => setSelected(tier)}>
                      <b>{tier.tier}</b>
                      <span>Lv {tier.requiredLevel || tier.level}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {selected && <SpellDrawer spell={selected} lang={lang} onClose={() => setSelected(null)} />}
    </>
  )
}

function SpellDrawer({
  spell,
  lang,
  onClose,
}: {
  spell: DbSpellBook
  lang: Lang
  onClose: () => void
}) {
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside className="detail-drawer">
        <button className="drawer-close" onClick={onClose} aria-label={tr(lang, 'close')}>
          <X />
        </button>
        <div className="drawer-title">
          <img src={asset(spell.iconPath)} alt="" />
          <div>
            <span className={`school ${spell.school}`}>{tr(lang, spell.school)}</span>
            <h2>{pick(spell.name, lang)}</h2>
            {originalName(spell.name, lang) && (
              <small className="original-name">{spell.name.en}</small>
            )}
            <p className="subtype">{pick(spell.family, lang)}</p>
          </div>
        </div>
        <blockquote>{pick(spell.description, lang)}</blockquote>
        <dl className="detail-grid">
          <div>
            <dt>{copy(lang, '技能书等级', 'Tier', '技能書等級')}</dt>
            <dd>{spell.tier}</dd>
          </div>
          <div>
            <dt>{tr(lang, 'level')}</dt>
            <dd>{spell.level}</dd>
          </div>
          <div>
            <dt>{tr(lang, 'required')}</dt>
            <dd>{spell.requiredLevel || '—'}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
