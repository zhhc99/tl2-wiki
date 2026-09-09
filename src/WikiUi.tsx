import { isChinese, pick, tr } from './i18n'
import { ngLabel } from './domain'
import type { Lang, LocalText, StatKey } from './types'

const statLabels: Record<StatKey, string> = {
  str: 'STR',
  dex: 'DEX',
  foc: 'FOC',
  vit: 'VIT',
  none: '—',
}

export const originalName = (value: LocalText, lang: Lang) =>
  isChinese(lang) && pick(value, lang) !== value.en ? value.en : null

export function PageHeader({
  section,
  title,
  documentTitle,
  children,
}: {
  section: string
  title: string
  documentTitle?: string
  children: string
}) {
  return (
    <section className="page-header">
      <div className="content">
        <span>{section}</span>
        {documentTitle ? (
          <>
            <h1 className="sr-only">{documentTitle}</h1>
            <div className="page-title">{title}</div>
          </>
        ) : (
          <h1>{title}</h1>
        )}
        <p>{children}</p>
      </div>
    </section>
  )
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  )
}

export function StatPill({ stat }: { stat: StatKey }) {
  return stat === 'none' ? (
    <span className="stat-pill none">—</span>
  ) : (
    <span className={`stat-pill ${stat}`}>
      <i />
      {statLabels[stat]}
    </span>
  )
}

export function Loading({ lang }: { lang: Lang }) {
  return (
    <div className="loading">
      <span />
      <p>{tr(lang, 'loading')}</p>
    </div>
  )
}

export function NgBadge({ tier }: { tier: number }) {
  const label = ngLabel(tier)
  return label ? <span className="ng-badge">{label}</span> : null
}
