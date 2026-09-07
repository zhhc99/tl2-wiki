import { Globe2, Menu, Search, X } from 'lucide-react'
import { localeOptions, tr, type UIKey } from '../i18n'
import { SelectControl } from '../SelectControl'
import type { Lang } from '../types'
import type { Navigate, Page } from './navigation'

export function Header({
  lang,
  setLang,
  page,
  go,
  mobileOpen,
  setMobileOpen,
  onSearch,
}: {
  lang: Lang
  setLang: (lang: Lang) => void
  page: Page
  go: Navigate
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
        <button className="brand" onClick={() => go('home')}>
          <span className="brand-dot" />
          <b>TL2 Wiki</b>
        </button>
        <nav className={mobileOpen ? 'main-nav is-open' : 'main-nav'}>
          {nav.map((item) => (
            <button
              key={item.page}
              className={page === item.page ? 'active' : ''}
              onClick={() => go(item.page)}
            >
              {tr(lang, item.label)}
            </button>
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

export function Footer({ lang, go }: { lang: Lang; go: Navigate }) {
  return (
    <footer className="site-footer">
      <div className="content">
        <b>TL2 Wiki</b>
        <nav>
          <button onClick={() => go('classes')}>{tr(lang, 'navClasses')}</button>
          <button onClick={() => go('items')}>{tr(lang, 'navItems')}</button>
          <button onClick={() => go('builds')}>{tr(lang, 'navBuilds')}</button>
          <button onClick={() => go('gambling')}>{tr(lang, 'navGambling')}</button>
          <button onClick={() => go('spells')}>{tr(lang, 'navSpells')}</button>
          <button onClick={() => go('mechanics')}>{tr(lang, 'navMechanics')}</button>
          <button onClick={() => go('phases')}>{tr(lang, 'navPhases')}</button>
        </nav>
      </div>
    </footer>
  )
}
