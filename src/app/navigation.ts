export type Page =
  | 'home'
  | 'classes'
  | 'mechanics'
  | 'items'
  | 'builds'
  | 'gambling'
  | 'spells'
  | 'phases'

export type Navigate = (page: Page) => void
