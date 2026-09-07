export type Page =
  | 'home'
  | 'classes'
  | 'mechanics'
  | 'items'
  | 'builds'
  | 'gambling'
  | 'spells'
  | 'phases'

export interface SkillFocus {
  classId: string
  skillId: string
}

export interface ItemSearchRequest {
  query: string
  key: number
}

export type Navigate = (page: Page) => void

export function pageFromHash(): Page {
  const value = window.location.hash.replace('#/', '').split('/')[0]
  return (
    ['home', 'classes', 'mechanics', 'items', 'builds', 'gambling', 'spells', 'phases'].includes(
      value,
    )
      ? value
      : 'home'
  ) as Page
}
