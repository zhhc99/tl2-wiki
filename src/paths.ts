import type { Lang } from './types'

export const locales: Lang[] = ['en', 'zh-CN', 'zh-TW']

export const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const localePrefix = (lang: Lang) =>
  lang === 'zh-CN' ? '/zh' : lang === 'zh-TW' ? '/zh-tw' : ''

export const localizedPath = (lang: Lang, path = '/') =>
  `${localePrefix(lang)}${!path || path === '/' ? '/' : `/${path.replace(/^\/|\/$/g, '')}/`}`

export const pagePath = (lang: Lang, page: string) =>
  localizedPath(lang, page === 'home' ? '/' : page)

export function parseLocalizedPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const lang: Lang = parts[0] === 'zh' ? 'zh-CN' : parts[0] === 'zh-tw' ? 'zh-TW' : 'en'
  if (lang !== 'en') parts.shift()
  return { lang, routePath: parts.join('/') }
}
