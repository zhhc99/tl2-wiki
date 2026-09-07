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
          'See the exact returns from the four attributes and which damage sources can trigger critical hits, stealing and weapon effects.',
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
        <section className="socket-section">
          <SectionTitle
            eyebrow={copy(lang, '装备', 'Equipment', '裝備')}
            title={copy(lang, '孔数规则', 'Socket rules', '孔數規則')}
          />
          <p className="socket-rule-copy">
            <span>
              <strong>{copy(lang, '一般初始孔数：', 'Initial sockets.', '一般初始孔數：')}</strong>
              {copy(
                lang,
                '普通装备掉落时最多 2 孔，盾牌也按护甲计算。只有武器例外：附魔绿色武器最多 3 孔，稀有蓝色武器最多 4 孔。',
                'Ordinary equipment can drop with up to 2 sockets, and shields count as armor. Only weapons are exceptions: enchanted green weapons can have up to 3 sockets and rare blue weapons up to 4.',
                '一般裝備掉落時最多 2 孔，盾牌也視為護甲。只有武器例外：附魔綠色武器最多 3 孔，稀有藍色武器最多 4 孔。',
              )}
            </span>
            <span>
              <strong>{copy(lang, '打孔上限：', 'Socketing cap.', '打孔上限：')}</strong>
              {copy(
                lang,
                '打孔师朱瑞克只能为不足 2 孔的装备补孔，达到 2 孔后便无法继续增加。',
                'Jurick the Socketer can add sockets only until an item reaches 2; he cannot add another socket to an item that already has 2 or more.',
                '打孔匠朱瑞克只能替不足 2 孔的裝備補孔，達到 2 孔後便無法再增加。',
              )}
            </span>
            <span>
              <strong>{copy(lang, '特殊装备：', 'Special items.', '特殊裝備：')}</strong>
              {copy(
                lang,
                '“窒息”和“奥拉克之手”各有 5 孔；冥界系列的单手武器和冥界盾牌为 4 孔，双手武器为 5 孔。',
                'The Asphyx and Hands of Orlac each have 5 sockets; Netherrealm one-hand weapons and the Netherrealm Shield have 4, while its two-hand weapons have 5.',
                '「窒息」與「奧拉克之手」各有 5 孔；牧牛人領地系列的單手武器與牧牛人領地盾為 4 孔，雙手武器則為 5 孔。',
              )}
            </span>
          </p>
        </section>
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
