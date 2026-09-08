import fs from 'node:fs'
import path from 'node:path'
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
  type SiteData,
  type SkillGraphs,
} from './domain'
import { parseLocalizedPath, slugify } from './paths'

const files = {
  equipment: 'equipment',
  equipmentIndex: 'equipment-index',
  spellBooks: 'spell-books',
  classes: 'classes',
  classSkills: 'class-skills',
  skillGraphs: 'skill-graphs',
  phaseBeasts: 'phase-beasts',
  meta: 'meta',
} as const

type ServerData = SiteData & { equipmentIndex: EquipmentIndexEntry[] }

let cache: ServerData | undefined

function data(): ServerData {
  if (cache) return cache
  const read = <T>(name: string): T =>
    JSON.parse(fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8')) as T
  cache = {
    equipment: read<DbEquipment[]>(files.equipment),
    equipmentIndex: read<EquipmentIndexEntry[]>(files.equipmentIndex),
    spellBooks: read<DbSpellBook[]>(files.spellBooks),
    classes: read<DbClass[]>(files.classes),
    classSkills: read<DbClassSkill[]>(files.classSkills),
    skillGraphs: read<SkillGraphs>(files.skillGraphs),
    phaseBeasts: read<DbPhaseBeast[]>(files.phaseBeasts),
    meta: read<DbMeta>(files.meta),
  }
  return cache
}

export type PageKind =
  | 'home'
  | 'classes'
  | 'mechanics'
  | 'items'
  | 'builds'
  | 'gambling'
  | 'spells'
  | 'phases'
  | 'class'
  | 'item'
  | 'skill'

export interface PageData {
  kind: PageKind
  lang: ReturnType<typeof parseLocalizedPath>['lang']
  routePath: string
  data: Partial<SiteData>
  itemFamily?: DbEquipment[]
  equipmentRows?: EquipmentSummary[]
  skills?: ClassSkillSummary[]
  selectedSkill?: DbClassSkill
  totalEquipment?: number
  classId?: string
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

const classSkills = (all: ServerData, classId: string) =>
  all.classSkills.filter((skill) => skill.classId === classId)

export function loadPage(pathname: string): PageData {
  const { lang, routePath } = parseLocalizedPath(pathname)
  const all = data()
  const itemMatch = routePath.match(/^items\/([^/]+)$/)
  if (itemMatch) {
    const itemFamily = equipmentFamily(all.equipment, itemMatch[1])
    if (!itemFamily.length) throw new Response('Not found', { status: 404 })
    return {
      kind: 'item',
      lang,
      routePath,
      data: { classes: all.classes },
      itemFamily,
      totalEquipment: all.equipment.length,
    }
  }
  const skillMatch = routePath.match(/^classes\/([^/]+)\/skills\/([^/]+)$/)
  if (skillMatch) {
    const skill = all.classSkills.find(
      (entry) => entry.classId === skillMatch[1] && slugify(entry.name.en) === skillMatch[2],
    )
    if (!skill) throw new Response('Not found', { status: 404 })
    return {
      kind: 'skill',
      lang,
      routePath,
      data: {
        classes: all.classes,
        skillGraphs: all.skillGraphs,
      },
      skills: classSkills(all, skill.classId).map(skillSummary),
      selectedSkill: skill,
      classId: skill.classId,
    }
  }
  const classMatch = routePath.match(/^classes\/([^/]+)$/)
  if (classMatch) {
    const hero = all.classes.find((entry) => entry.id === classMatch[1])
    const skills = classSkills(all, hero?.id || '')
    const selectedSkill = skills[0]
    if (!hero || !selectedSkill) throw new Response('Not found', { status: 404 })
    return {
      kind: 'class',
      lang,
      routePath,
      data: { classes: all.classes, skillGraphs: all.skillGraphs },
      skills: skills.map(skillSummary),
      selectedSkill,
      classId: hero.id,
    }
  }
  const kind = (routePath || 'home') as PageKind
  if (
    !['home', 'classes', 'mechanics', 'items', 'builds', 'gambling', 'spells', 'phases'].includes(
      kind,
    )
  )
    throw new Response('Not found', { status: 404 })
  const selected: Partial<SiteData> =
    kind === 'home'
      ? { classes: all.classes, meta: all.meta }
      : kind === 'classes'
        ? {
            classes: all.classes,
            skillGraphs: all.skillGraphs,
          }
        : kind === 'items' || kind === 'builds'
          ? { classes: all.classes }
          : kind === 'spells'
            ? { spellBooks: all.spellBooks }
            : kind === 'phases'
              ? { phaseBeasts: all.phaseBeasts }
              : {}
  return {
    kind,
    lang,
    routePath,
    data: selected,
    classId: kind === 'classes' ? all.classes[0].id : undefined,
    skills: kind === 'classes' ? classSkills(all, all.classes[0].id).map(skillSummary) : undefined,
    selectedSkill: kind === 'classes' ? classSkills(all, all.classes[0].id)[0] : undefined,
    totalEquipment: kind === 'items' ? all.equipment.length : undefined,
    equipmentRows:
      kind === 'items'
        ? all.equipmentIndex.slice(0, 40).map(({ searchText: _searchText, ...item }) => item)
        : undefined,
  }
}
