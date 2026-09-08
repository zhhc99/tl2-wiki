import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectDir = resolve(import.meta.dirname, '..')
const read = (name) => JSON.parse(readFileSync(resolve(projectDir, 'public/data', name), 'utf8'))
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const local = (value) => Boolean(value?.en && value?.zhCN && value?.zhTW)
const unique = (rows) => new Set(rows.map((row) => row.id)).size === rows.length
const iconExists = (row) => row.iconPath && existsSync(resolve(projectDir, 'public', row.iconPath))

const equipment = read('equipment.json')
const classes = read('classes.json')
const skills = read('class-skills.json')
const graphs = read('skill-graphs.json')
const spells = read('spell-books.json')
const phases = read('phase-beasts.json')
const meta = read('meta.json')
const equipmentIndex = read('equipment-index.json')
const searchIndex = read('search-index.json')

const sameIds = (actual, expected) =>
  actual.length === expected.length && actual.every((row, index) => row.id === expected[index].id)
const hasKeys = (row, keys) => Object.keys(row).sort().join(',') === keys.slice().sort().join(',')
const equipmentIndexKeys = [
  'id',
  'familyId',
  'name',
  'category',
  'subtype',
  'rarity',
  'value',
  'level',
  'sockets',
  'classRequirement',
  'set',
  'iconPath',
  'ngTier',
  'searchText',
]
assert(
  sameIds(equipmentIndex, equipment) &&
    equipmentIndex.every(
      (item) =>
        hasKeys(item, equipmentIndexKeys) &&
        typeof item.searchText === 'string' &&
        item.searchText.length > 0,
    ),
  'Equipment index is stale or has invalid fields',
)

const searchKeys = {
  class: ['type', 'id', 'name', 'searchText'],
  skill: ['type', 'id', 'name', 'searchText', 'image', 'classId', 'className', 'skillKind'],
  item: ['type', 'id', 'name', 'searchText', 'image', 'familyId', 'subtype', 'level', 'ngTier'],
  spell: ['type', 'id', 'name', 'searchText', 'image', 'family'],
  phase: ['type', 'id', 'name', 'searchText', 'rooms'],
}
const searchSources = {
  class: classes,
  skill: skills,
  item: equipment,
  spell: spells,
  phase: phases,
}
assert(
  Object.entries(searchSources).every(([type, source]) =>
    sameIds(
      searchIndex.filter((entry) => entry.type === type),
      source,
    ),
  ) &&
    searchIndex.every(
      (entry) =>
        searchKeys[entry.type] &&
        hasKeys(entry, searchKeys[entry.type]) &&
        typeof entry.searchText === 'string' &&
        entry.searchText.length > 0 &&
        !['ranks', 'effects', 'requirements'].some((key) => Object.hasOwn(entry, key)),
    ),
  'Search index is stale or has invalid fields',
)

assert(meta.version === 2, 'Unexpected public data version')
assert(
  equipment.length === 4029 && equipment.length === meta.counts.equipment,
  'Unexpected equipment count',
)
assert(
  unique(equipment) &&
    equipment.every((item) => item.familyId && local(item.name) && iconExists(item)),
  'Invalid equipment identity',
)
assert(
  equipment.every((item) =>
    ['weapon', 'armor', 'trinket', 'pet', 'socketable'].includes(item.category),
  ),
  'Invalid equipment category',
)
assert(
  equipment.every((item) => item.effects.every((effect) => local(effect.text))),
  'Invalid equipment effect text',
)
assert(
  equipment.reduce((sum, item) => sum + item.effects.length, 0) === 6965,
  'Unexpected equipment effect count',
)
assert(
  equipment
    .filter((item) => item.category !== 'socketable')
    .every((item) => item.effects.every((effect) => !effect.socketTargets)),
  'Socket targets leaked into equipment',
)
assert(
  equipment
    .filter((item) => item.category === 'socketable')
    .every((item) => item.effects.every((effect) => effect.socketTargets?.length)),
  'Socketable effect lacks a target',
)

const classOrder = ['berserker', 'outlander', 'embermage', 'engineer']
const trees = classes.flatMap((hero) => hero.trees)
const treeClasses = new Map(classes.flatMap((hero) => hero.trees.map((tree) => [tree.id, hero.id])))
assert(classes.length === 4 && classes.length === meta.counts.classes, 'Unexpected class count')
assert(
  trees.length === 12 && trees.length === meta.counts.skillTrees,
  'Unexpected skill tree count',
)
assert(classes.map((hero) => hero.id).join(',') === classOrder.join(','), 'Unexpected class order')
assert(
  unique(classes) &&
    unique(trees) &&
    classes.every(
      (hero) =>
        local(hero.name) &&
        local(hero.description) &&
        hero.trees.map((tree) => tree.index).join(',') === '0,1,2' &&
        hero.trees.every((tree) => local(tree.name)),
    ),
  'Invalid class or skill tree identity',
)

assert(
  skills.length === 120 && skills.length === meta.counts.classSkills,
  'Unexpected class skill count',
)
assert(
  unique(skills) &&
    skills.every((skill) => local(skill.name) && local(skill.description) && iconExists(skill)),
  'Invalid class skill identity',
)
assert(
  skills.every(
    (skill) =>
      Number.isInteger(skill.treeId) &&
      treeClasses.get(skill.treeId) === skill.classId &&
      Number.isInteger(skill.position) &&
      skill.position >= 0 &&
      skill.position < 10,
  ),
  'Invalid skill tree relation or position',
)
const skillsByTree = new Map()
for (const skill of skills)
  skillsByTree.set(skill.treeId, [...(skillsByTree.get(skill.treeId) || []), skill])
assert(
  trees.every((tree) => {
    const positions = (skillsByTree.get(tree.id) || [])
      .map((skill) => skill.position)
      .sort((a, b) => a - b)
    return positions.join(',') === '0,1,2,3,4,5,6,7,8,9'
  }),
  'A skill tree does not have 10 ordered skills',
)
assert(
  skills.every((skill) => skill.ranks.length === 15),
  'A class skill does not have 15 ranks',
)
const ranks = skills.flatMap((skill) => skill.ranks)
assert(
  ranks.length === 1800 && ranks.length === meta.counts.skillRanks,
  'Unexpected skill rank count',
)
assert(
  ranks.filter((rank) => rank.description).length === 361,
  'Unexpected official rank description count',
)
const skillEffects = ranks.flatMap((rank) => rank.effects)
assert(skillEffects.length === 3990, 'Unexpected visible skill effect count')
assert(
  skillEffects.every((effect) => local(effect.template)),
  'Invalid skill effect template',
)
assert(
  skills
    .filter((skill) => ['Shadowbind', 'Rampage', 'Blood Hunger'].includes(skill.name.en))
    .every((skill) => skill.ranks.every((rank) => rank.effects.length === 0 && rank.description)),
  'Hidden skill effects were published',
)
const graphReferences = new Set(
  ranks
    .flatMap((rank) => [
      ...rank.metrics.map((metric) => metric.scalingGraph),
      ...rank.effects.map((effect) => effect.scalingGraph),
    ])
    .filter(Boolean),
)
assert(
  [...graphReferences].every((name) => graphs[name]?.points.length),
  'A skill graph is missing',
)
assert(
  Object.values(graphs).every((graph) => typeof graph.inferPastEnd === 'boolean'),
  'Invalid graph extrapolation metadata',
)

assert(
  spells.length === 175 && spells.length === meta.counts.spellBooks,
  'Unexpected obtainable skill book count',
)
const spellBookKeys = [
  'id',
  'name',
  'family',
  'tier',
  'level',
  'requiredLevel',
  'description',
  'iconPath',
]
assert(
  unique(spells) &&
    spells.every(
      (spell) =>
        Object.keys(spell).sort().join(',') === spellBookKeys.slice().sort().join(',') &&
        local(spell.name) &&
        local(spell.family) &&
        local(spell.description) &&
        iconExists(spell),
    ),
  'Invalid skill book',
)

assert(phases.length === 6, 'Unexpected Phase Beast area count')
const phaseChallenges = phases.flatMap((phase) => phase.challenges)
const phaseRooms =
  phaseChallenges.length + phases.reduce((sum, phase) => sum + phase.undocumented, 0)
assert(
  phaseChallenges.length === 15 && phaseChallenges.length === meta.counts.phaseChallenges,
  'Unexpected documented Phase Beast room count',
)
assert(
  phaseRooms === 20 && phaseRooms === meta.counts.phaseRooms,
  'Unexpected Phase Beast room count',
)
assert(
  phaseChallenges.every((challenge) => local(challenge.name)),
  'Invalid Phase Beast instruction',
)

console.log(
  `Validated ${equipment.length} equipment, ${classes.length} classes, ${trees.length} skill trees, ${skills.length} class skills, ${spells.length} skill books, and ${phaseRooms} Phase Beast rooms`,
)
