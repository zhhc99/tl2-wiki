import {
  equipmentFamily,
  type ClassSkillSummary,
  type DbClass,
  type DbClassSkill,
  type DbEquipment,
  type DbMeta,
  type DbPhaseBeast,
  type DbSpellBook,
  type EquipmentIndexEntry,
  type EquipmentSummary,
  type SkillGraphs,
} from './domain'
import { parseLocalizedPath, slugify } from './paths'
import type { Lang } from './types'

type PageBase = {
  lang: Lang
  routePath: string
}

export type PageData = PageBase &
  (
    | { kind: 'home'; data: { classes: DbClass[]; meta: DbMeta } }
    | {
        kind: 'classes' | 'class' | 'skill'
        data: { classes: DbClass[]; skillGraphs: SkillGraphs }
        classId: string
        skills: ClassSkillSummary[]
        selectedSkill: DbClassSkill
      }
    | {
        kind: 'items'
        data: { classes: DbClass[] }
        equipmentRows: EquipmentSummary[]
        totalEquipment: number
      }
    | {
        kind: 'item'
        data: { classes: DbClass[] }
        itemFamily: DbEquipment[]
        totalEquipment: number
      }
    | { kind: 'builds'; data: { classes: DbClass[] } }
    | { kind: 'gambling' | 'mechanics'; data: {} }
    | { kind: 'spells'; data: { spellBooks: DbSpellBook[] } }
    | { kind: 'phases'; data: { phaseBeasts: DbPhaseBeast[] } }
  )

export type PageSource = {
  equipment?: DbEquipment[]
  equipmentIndex?: EquipmentIndexEntry[]
  spellBooks?: DbSpellBook[]
  classes?: DbClass[]
  classSkills?: DbClassSkill[]
  skillGraphs?: SkillGraphs
  phaseBeasts?: DbPhaseBeast[]
  meta?: DbMeta
}

const skillSummary = ({
  id,
  classId,
  treeId,
  name,
  kind,
  level,
  iconPath,
}: DbClassSkill): ClassSkillSummary => ({ id, classId, treeId, name, kind, level, iconPath })

const classSkills = (skills: DbClassSkill[], classId: string) =>
  skills.filter((skill) => skill.classId === classId)

const equipmentRows = (items: EquipmentIndexEntry[]) =>
  items.slice(0, 40).map(({ searchText: _searchText, ...item }) => item)

export function createPageData(pathname: string, source: PageSource): PageData | undefined {
  const { lang, routePath } = parseLocalizedPath(pathname)
  const { classes, classSkills: allSkills, skillGraphs } = source
  const itemMatch = routePath.match(/^items\/([^/]+)$/)
  if (itemMatch) {
    if (!source.equipment || !classes) return
    const itemFamily = equipmentFamily(source.equipment, itemMatch[1])
    if (!itemFamily.length) return
    return {
      kind: 'item',
      lang,
      routePath,
      data: { classes },
      itemFamily,
      totalEquipment: source.equipment.length,
    }
  }
  if (routePath === 'items') {
    if (!source.equipmentIndex || !classes) return
    return {
      kind: 'items',
      lang,
      routePath,
      data: { classes },
      totalEquipment: source.equipment?.length ?? source.equipmentIndex.length,
      equipmentRows: equipmentRows(source.equipmentIndex),
    }
  }

  const skillMatch = routePath.match(/^classes\/([^/]+)\/skills\/([^/]+)$/)
  const classMatch = routePath.match(/^classes\/([^/]+)$/)
  if (skillMatch || classMatch || routePath === 'classes') {
    if (!allSkills || !classes || !skillGraphs) return
    const classId = skillMatch?.[1] ?? classMatch?.[1] ?? classes[0]?.id
    if (!classId) return
    const hero = classes.find((entry) => entry.id === classId)
    const skills = classSkills(allSkills, classId)
    const selectedSkill = skillMatch
      ? skills.find((skill) => slugify(skill.name.en) === skillMatch[2])
      : skills[0]
    if (!hero || !selectedSkill) return
    const data = { classes, skillGraphs }
    const common = {
      lang,
      routePath,
      data,
      skills: skills.map(skillSummary),
      selectedSkill,
      classId: hero.id,
    }
    return skillMatch
      ? { kind: 'skill', ...common }
      : classMatch
        ? { kind: 'class', ...common }
        : { kind: 'classes', ...common }
  }

  switch (routePath) {
    case '':
      if (!classes || !source.meta) return
      return { kind: 'home', lang, routePath, data: { classes, meta: source.meta } }
    case 'builds':
      if (!classes) return
      return { kind: 'builds', lang, routePath, data: { classes } }
    case 'spells':
      if (!source.spellBooks) return
      return { kind: 'spells', lang, routePath, data: { spellBooks: source.spellBooks } }
    case 'phases':
      if (!source.phaseBeasts) return
      return { kind: 'phases', lang, routePath, data: { phaseBeasts: source.phaseBeasts } }
    case 'mechanics':
      return { kind: 'mechanics', lang, routePath, data: {} }
    case 'gambling':
      return { kind: 'gambling', lang, routePath, data: {} }
    default:
      return
  }
}
