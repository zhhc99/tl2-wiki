import fs from 'node:fs'
import path from 'node:path'
import {
  type DbClass,
  type DbClassSkill,
  type DbEquipment,
  type DbMeta,
  type DbPhaseBeast,
  type DbSpellBook,
  type EquipmentIndexEntry,
  type SiteData,
  type SkillGraphs,
} from './domain'
import { createPageData, type PageData } from './site-data'

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

export type { PageData } from './site-data'

export function loadPage(pathname: string): PageData {
  const page = createPageData(pathname, data())
  if (!page) throw new Response('Not found', { status: 404 })
  return page
}
