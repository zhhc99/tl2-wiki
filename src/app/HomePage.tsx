import { ArrowRight, BookOpen, Hammer, Search, SlidersHorizontal, Swords } from 'lucide-react'
import { classPresentation, statInfo } from '../data'
import { pick, copy, tr } from '../i18n'
import type { SiteData } from '../domain'
import type { Lang } from '../types'
import type { Navigate, Page } from './navigation'
import { originalName, SectionTitle, StatPill } from '../WikiUi'

const plain = (value: string) => value.replaceAll('**', '')

export function HomePage({
  lang,
  go,
  onSearch,
  onClass,
  data,
}: {
  lang: Lang
  go: Navigate
  onSearch: () => void
  onClass: (id: string) => void
  data: SiteData
}) {
  const counts = data.meta.counts
  const links = [
    {
      page: 'classes' as Page,
      icon: <Swords />,
      title: tr(lang, 'navClasses'),
      text: copy(
        lang,
        `${counts.classes} 个职业、${counts.skillTrees} 棵技能树和 ${counts.skillRanks.toLocaleString()} 条等级数据`,
        `${counts.classes} classes, ${counts.skillTrees} skill trees and ${counts.skillRanks.toLocaleString()} rank records`,
        `${counts.classes} 個職業、${counts.skillTrees} 個技能樹與 ${counts.skillRanks.toLocaleString()} 筆等級資料`,
      ),
      count: counts.classSkills,
    },
    {
      page: 'items' as Page,
      icon: <Hammer />,
      title: tr(lang, 'navItems'),
      text: copy(
        lang,
        '按名称、类型、稀有度和等级筛选',
        'Filter by name, type, rarity and level',
        '依名稱、類型、稀有度與等級篩選',
      ),
      count: counts.equipment,
    },
    {
      page: 'spells' as Page,
      icon: <BookOpen />,
      title: tr(lang, 'navSpells'),
      text: copy(
        lang,
        '查看技能书等级、需求和说明',
        'Browse spell-book tiers, requirements and descriptions',
        '查看技能書等級、需求和說明',
      ),
      count: counts.spellBooks,
    },
    {
      page: 'mechanics' as Page,
      icon: <SlidersHorizontal />,
      title: tr(lang, 'navMechanics'),
      text: copy(
        lang,
        '属性公式与伤害触发规则',
        'Attribute formulas and damage triggers',
        '屬性公式與傷害觸發規則',
      ),
      count: 4,
    },
  ]
  return (
    <>
      <section className="home-hero">
        <div className="content home-hero-inner">
          <div>
            <p className="kicker">TORCHLIGHT II</p>
            <h1>TL2 Wiki</h1>
            <p className="home-lead">
              {copy(
                lang,
                '查询职业技能、装备属性、技能书和相位兽挑战。',
                'Look up class skills, equipment, spell books and Phase Beast challenges.',
                '查詢職業技能、裝備屬性、技能書與相位獸挑戰。',
              )}
            </p>
            <button className="home-search" onClick={onSearch}>
              <Search size={20} />
              <span>{tr(lang, 'search')}</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>
          <div className="home-summary">
            <span>{copy(lang, '内容总览', 'At a glance', '內容一覽')}</span>
            <b>
              {counts.equipment.toLocaleString()} {copy(lang, '件装备', 'items', '件裝備')}
            </b>
            <p>
              {counts.classSkills} {copy(lang, '个职业技能', 'class skills', '個職業技能')} ·{' '}
              {counts.spellBooks.toLocaleString()}{' '}
              {copy(lang, '种技能书', 'spell books', '種技能書')} · {counts.phaseChallenges}{' '}
              {copy(lang, '项相位兽挑战', 'Phase Beast challenges', '項相位獸挑戰')}
            </p>
          </div>
        </div>
      </section>
      <section className="content home-content">
        <div className="quick-grid">
          {links.map((link) => (
            <button key={link.page} onClick={() => go(link.page)}>
              <span className="quick-icon">{link.icon}</span>
              <span>
                <b>{link.title}</b>
                <small>{link.text}</small>
              </span>
              <span className="quick-meta">
                <strong>{link.count.toLocaleString()}</strong>
                <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
        <div className="home-columns">
          <section>
            <SectionTitle
              eyebrow={copy(lang, '职业', 'Classes', '職業')}
              title={copy(lang, '选择职业', 'Choose a class', '選擇職業')}
            />
            <div className="class-list">
              {data.classes.map((hero) => (
                <button key={hero.id} onClick={() => onClass(hero.id)}>
                  <span className="class-code" style={{ color: classPresentation[hero.id].accent }}>
                    {classPresentation[hero.id].monogram}
                  </span>
                  <span>
                    <b>{pick(hero.name, lang)}</b>
                    {originalName(hero.name, lang) && <small>{hero.name.en}</small>}
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </section>
          <section>
            <SectionTitle
              eyebrow={copy(lang, '属性', 'Attributes', '屬性')}
              title={copy(lang, '四项核心属性', 'Four core attributes', '四項核心屬性')}
            />
            <div className="attribute-list">
              {statInfo.map((stat) => (
                <button key={stat.key} onClick={() => go('mechanics')}>
                  <StatPill stat={stat.key} />
                  <span>
                    <b>{pick(stat.name, lang)}</b>
                    <small>{plain(pick(stat.effects[0], lang))}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  )
}
