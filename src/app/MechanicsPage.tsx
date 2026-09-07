import { Info } from 'lucide-react'
import { statInfo } from '../data'
import { copy, pick, tr, type UIKey } from '../i18n'
import type { Lang } from '../types'
import { PageHeader, SectionTitle, StatPill } from '../WikiUi'

function BoldText({ value }: { value: string }) {
  return (
    <>
      {value
        .split('**')
        .map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part))}
    </>
  )
}

function RichText({ value }: { value: string }) {
  return (
    <>
      {value.split(/\[tooltip\]\((.*?)\)\[\/tooltip\]/g).map((part, index) =>
        index % 2 ? (
          <span className="inline-tooltip" tabIndex={0} aria-label={part} key={index}>
            <Info size={14} />
            <span role="tooltip">{part}</span>
          </span>
        ) : (
          <BoldText value={part} key={index} />
        ),
      )}
    </>
  )
}

export function MechanicsPage({ lang }: { lang: Lang }) {
  const matrix: {
    event: UIKey
    crit: 'yes' | 'no' | 'limited'
    steal: 'yes' | 'no' | 'limited'
    proc: 'yes' | 'no' | 'limited'
  }[] = [
    { event: 'weaponHit', crit: 'yes', steal: 'yes', proc: 'yes' },
    { event: 'weaponSkill', crit: 'yes', steal: 'limited', proc: 'limited' },
    { event: 'flatSkill', crit: 'yes', steal: 'no', proc: 'no' },
    { event: 'dot', crit: 'no', steal: 'no', proc: 'no' },
    { event: 'minion', crit: 'limited', steal: 'no', proc: 'no' },
  ]
  return (
    <>
      <PageHeader section={tr(lang, 'navMechanics')} title={tr(lang, 'mechTitle')}>
        {copy(
          lang,
          '查看四项属性的准确收益，以及不同伤害能否触发暴击、吸取和武器效果。',
          'See the exact bonuses from the four attributes and which damage sources can trigger critical hits, life/mana steal, and weapon effects.',
          '查看四項屬性的實際收益，以及各類傷害能否觸發爆擊、吸取與武器效果。',
        )}
      </PageHeader>
      <div className="content page-body">
        <div className="stat-grid">
          {statInfo.map((stat) => (
            <article className={`stat-summary ${stat.key}`} key={stat.key}>
              <div>
                <StatPill stat={stat.key} />
                <h3>{pick(stat.name, lang)}</h3>
              </div>
              <ul>
                {stat.effects.map((effect, index) => (
                  <li key={index}>
                    <RichText value={pick(effect, lang)} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <section className="matrix-section">
          <SectionTitle
            eyebrow={copy(lang, '命中', 'Hits', '命中')}
            title={tr(lang, 'triggerGuide')}
          />
          <p className="section-copy">{tr(lang, 'triggerIntro')}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr(lang, 'event')}</th>
                  <th>{tr(lang, 'canCrit')}</th>
                  <th>{tr(lang, 'canSteal')}</th>
                  <th>{tr(lang, 'canProc')}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.event}>
                    <td>{tr(lang, row.event)}</td>
                    {(['crit', 'steal', 'proc'] as const).map((key) => (
                      <td key={key}>
                        <Status value={row[key]} lang={lang} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

function Status({ value, lang }: { value: 'yes' | 'no' | 'limited'; lang: Lang }) {
  return (
    <span className={`status ${value}`}>
      {value === 'yes' ? '✓' : value === 'no' ? '—' : '△'} {tr(lang, value)}
    </span>
  )
}
