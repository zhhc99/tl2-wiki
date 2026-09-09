import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve(import.meta.dirname, '../public/data')
const read = (name) => JSON.parse(readFileSync(resolve(dataDir, `${name}.json`), 'utf8'))
const write = (name, value) =>
  writeFileSync(resolve(dataDir, `${name}.json`), `${JSON.stringify(value)}\n`)
const text = (value) => (value ? `${value.en} ${value.zhCN} ${value.zhTW}` : '')
const normalized = (...parts) => parts.filter(Boolean).join(' ').toLowerCase()

const equipment = read('equipment')
const classes = read('classes')
const classSkills = read('class-skills')
const spellBooks = read('spell-books')
const phaseBeasts = read('phase-beasts')
const classById = new Map(classes.map((hero) => [hero.id, hero]))

const equipmentIndex = equipment.map((item) => ({
  id: item.id,
  familyId: item.familyId,
  name: item.name,
  category: item.category,
  subtype: item.subtype,
  rarity: item.rarity,
  rarityValue: item.rarityValue,
  value: item.value,
  level: item.level,
  sockets: item.sockets,
  classRequirement: item.classRequirement,
  set: item.set,
  iconPath: item.iconPath,
  ngTier: item.ngTier,
  searchText: normalized(
    text(item.name),
    item.ngTier === 1 ? 'NG+' : item.ngTier > 1 ? `NG+${item.ngTier}` : '',
    item.subtype,
    text(item.set),
    ...item.effects.map((effect) => text(effect.text)),
  ),
}))

const searchIndex = [
  ...classes.map((hero) => ({
    type: 'class',
    id: hero.id,
    name: hero.name,
    searchText: normalized(text(hero.name), text(hero.description)),
  })),
  ...classSkills.map((skill) => ({
    type: 'skill',
    id: skill.id,
    name: skill.name,
    searchText: normalized(text(skill.name), text(skill.description)),
    image: skill.iconPath,
    classId: skill.classId,
    className: classById.get(skill.classId)?.name,
    skillKind: skill.kind,
  })),
  ...equipmentIndex.map((item) => ({
    type: 'item',
    id: item.id,
    name: item.name,
    searchText: item.searchText,
    image: item.iconPath,
    familyId: item.familyId,
    subtype: item.subtype,
    level: item.level,
    ngTier: item.ngTier,
  })),
  ...spellBooks.map((spell) => ({
    type: 'spell',
    id: spell.id,
    name: spell.name,
    searchText: normalized(text(spell.name), text(spell.family), text(spell.description)),
    image: spell.iconPath,
    family: spell.family,
  })),
  ...phaseBeasts.map((beast) => ({
    type: 'phase',
    id: beast.id,
    name: beast.region,
    searchText: normalized(
      text(beast.region),
      ...beast.challenges.map((challenge) => text(challenge.name)),
    ),
    rooms: beast.challenges.length + beast.undocumented,
  })),
]

write('equipment-index', equipmentIndex)
write('search-index', searchIndex)
console.log(
  `Generated ${equipmentIndex.length} equipment index rows and ${searchIndex.length} search rows`,
)
