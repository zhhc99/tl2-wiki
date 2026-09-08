import { Globe2, Menu, Search, X } from 'lucide-react'
import { Link } from 'react-router'
import { localeOptions, tr, type UIKey } from '../i18n'
import { SelectControl } from '../SelectControl'
import type { Lang } from '../types'
import type { Page } from './navigation'

export function Header({
  lang,
  setLang,
  page,
  href,
  mobileOpen,
  setMobileOpen,
  onSearch,
}: {
  lang: Lang
  setLang: (lang: Lang) => void
  page: Page
  href: (page: Page) => string
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  onSearch: () => void
}) {
  const nav: { page: Page; label: UIKey }[] = [
    { page: 'home', label: 'navHome' },
    { page: 'classes', label: 'navClasses' },
    { page: 'mechanics', label: 'navMechanics' },
    { page: 'items', label: 'navItems' },
    { page: 'builds', label: 'navBuilds' },
    { page: 'gambling', label: 'navGambling' },
    { page: 'spells', label: 'navSpells' },
    { page: 'phases', label: 'navPhases' },
  ]
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" to={href('home')} onClick={() => setMobileOpen(false)}>
          <span className="brand-dot" />
          <b>TL2 Wiki</b>
        </Link>
        <nav className={mobileOpen ? 'main-nav is-open' : 'main-nav'}>
          {nav.map((item) => (
            <Link
              key={item.page}
              className={page === item.page ? 'active' : ''}
              to={href(item.page)}
              onClick={() => setMobileOpen(false)}
            >
              {tr(lang, item.label)}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <button className="search-button" onClick={onSearch}>
            <Search size={16} />
            <span>{tr(lang, 'search')}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <SelectControl
            className="locale-select"
            label={tr(lang, 'chooseLanguage')}
            value={lang}
            onChange={(value) => setLang(value as Lang)}
            icon={<Globe2 size={15} />}
            options={localeOptions.map((option) => ({ value: option.code, label: option.label }))}
          />
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={tr(lang, 'menu')}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}

export function Footer({ lang, href }: { lang: Lang; href: (page: Page) => string }) {
  return (
    <footer className="site-footer">
      <div className="content">
        <b>TL2 Wiki</b>
        <nav>
          {(
            ['classes', 'items', 'builds', 'gambling', 'spells', 'mechanics', 'phases'] as Page[]
          ).map((page) => (
            <Link key={page} to={href(page)}>
              {tr(lang, `nav${page[0].toUpperCase()}${page.slice(1)}` as UIKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
