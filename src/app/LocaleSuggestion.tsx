import { Languages, X } from 'lucide-react'
import type { Lang } from '../types'

const text = {
  'zh-CN': {
    message: '是否前往简体中文站点？',
    action: '前往简体中文',
    close: '关闭语言建议',
  },
  'zh-TW': {
    message: '要前往繁體中文網站嗎？',
    action: '前往繁體中文',
    close: '關閉語言建議',
  },
} as const

export function LocaleSuggestion({
  locale,
  onAccept,
  onClose,
}: {
  locale: Exclude<Lang, 'en'>
  onAccept: () => void
  onClose: () => void
}) {
  const content = text[locale]
  return (
    <aside className="locale-suggestion" aria-live="polite">
      <Languages size={21} />
      <span>{content.message}</span>
      <button className="locale-suggestion-action" onClick={onAccept}>
        {content.action}
      </button>
      <button className="locale-suggestion-close" onClick={onClose} aria-label={content.close}>
        <X size={19} />
      </button>
    </aside>
  )
}
