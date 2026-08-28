import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve(import.meta.dirname, '../public/data')
const read = (name) => JSON.parse(readFileSync(resolve(dataDir, name), 'utf8'))
const equipment = read('equipment.json')
const spells = read('spell-books.json')
const classes = read('class-skills.json')
const meta = read('meta.json')

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const unique = (rows) => new Set(rows.map(row => row.id)).size === rows.length

assert(equipment.length === meta.counts.equipment, 'Equipment count differs from meta.json')
assert(spells.length === meta.counts.spellBooks, 'Spell-book count differs from meta.json')
assert(unique(equipment), 'Equipment IDs are not unique')
assert(unique(spells), 'Spell-book IDs are not unique')
assert(equipment.every(row => row.name && row.category && row.sourceFile), 'Equipment has missing required fields')
assert(equipment.every(row => !/(NO_DROP|SHOULD NOT SPAWN|DON'T USE)/i.test(row.name) && !/^zzz_testsword/i.test(row.internalName) && !['testaxe', 'zzz_bow_blind', 'tl2_bloodember_base'].includes(row.internalName.toLowerCase())), 'Internal test equipment was not removed')
assert(equipment.every(row => row.effects.every(effect => effect.text && effect.text !== 'BLANK_NO_EFFECTS')), 'Equipment contains empty placeholder effects')
assert(equipment.every(row => [...Object.values(row.damage), ...Object.values(row.armor)].every(range => Array.isArray(range) && range.length === 2 && range.every(Number.isFinite))), 'Equipment has invalid exact ranges')
assert(equipment.filter(row => row.tidbiMatched).length === meta.counts.enrichedEquipment, 'TIDBI match count differs from meta.json')
assert(equipment.reduce((sum, row) => sum + row.effects.length, 0) === meta.counts.itemEffects, 'Item effect count differs from meta.json')
assert(meta.counts.enrichedEquipment / equipment.length > 0.99, 'Less than 99% of equipment matched TIDBI')
assert(equipment.find(row => row.internalName === 'tl2_eyeofgrell')?.effects.length === 2, 'Known socketable effects were not imported')
assert(spells.every(row => row.name && row.family && row.description && row.sourceFile), 'Spell books have missing required fields')
assert(classes.length === 4, 'Expected four classes')
assert(classes.every(group => group.trees.length === 3), 'Expected three trees per class')
assert(classes.every(group => group.trees.every(tree => tree.skills.length === 10)), 'Expected ten skills per tree')
const skillCount = classes.reduce((sum, group) => sum + group.trees.reduce((treeSum, tree) => treeSum + tree.skills.length, 0), 0)
assert(skillCount === 120 && skillCount === meta.counts.classSkills, 'Expected 120 class skills')

console.log(`Validated ${equipment.length} equipment rows, ${meta.counts.itemEffects} item effects, ${spells.length} spell-book rows and ${skillCount} class skills`)
