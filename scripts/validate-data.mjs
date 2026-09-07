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
const skills = read('class-skills.json')
const graphs = read('skill-graphs.json')
const spells = read('spell-books.json')
const phases = read('phase-beasts.json')
const meta = read('meta.json')

assert(meta.version === 1, 'Unexpected public data version')
assert(
  equipment.length === 4029 && equipment.length === meta.counts.equipment,
  'Unexpected equipment count',
)
assert(
  unique(equipment) && equipment.every((item) => local(item.name) && iconExists(item)),
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
      skill.treeIndex >= 0 && skill.treeIndex < 3 && skill.position >= 0 && skill.position < 10,
  ),
  'Invalid skill position',
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
assert(
  unique(spells) &&
    spells.every(
      (spell) =>
        local(spell.name) &&
        local(spell.family) &&
        local(spell.description) &&
        spell.school &&
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
  `Validated ${equipment.length} equipment, ${skills.length} class skills, ${spells.length} skill books, and ${phaseRooms} Phase Beast rooms`,
)
