import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectDir=resolve(import.meta.dirname,'..')
const dataDir=resolve(projectDir,'public/data')
const read=(name)=>JSON.parse(readFileSync(resolve(dataDir,name),'utf8'))
const equipment=read('equipment.json')
const spells=read('spell-books.json')
const classes=read('class-skills.json')
const phases=read('phase-beasts.json')
const meta=read('meta.json')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}
const unique=(rows)=>new Set(rows.map(row=>row.id)).size===rows.length
const localeComplete=(value)=>Boolean(value?.en&&value?.zhCN&&value?.zhTW)
const publicPath=(path)=>resolve(projectDir,'public',path)

assert(equipment.length===5483&&equipment.length===meta.counts.equipment,'Expected 5,483 player-facing equipment records')
assert(unique(equipment),'Equipment IDs are not unique')
assert(equipment.every(row=>localeComplete(row.name)&&row.category&&row.subtype&&row.sourceFile),'Equipment has missing required fields')
assert(equipment.every(row=>['normal','rare','unique','legendary'].includes(row.rarity)),'Equipment contains an invalid rarity')
assert(equipment.some(row=>row.set&&row.rarity==='rare')&&equipment.some(row=>row.set&&row.rarity==='unique'),'Set membership must remain independent from rarity')
assert(equipment.every(row=>row.iconPath&&existsSync(publicPath(row.iconPath))),'Equipment has a missing icon file')
assert(equipment.every(row=>!/(NO_DROP|SHOULD NOT SPAWN|DON'T USE)/i.test(row.name.en)),'Internal equipment templates were not removed')
assert(equipment.filter(row=>row.exactEnrichment).length===meta.counts.enrichedEquipment,'Equipment enrichment count differs from meta.json')
assert(equipment.reduce((sum,row)=>sum+(row.effects.length||row.rawEffects.length),0)===meta.counts.itemEffects,'Displayed item effect count differs from meta.json')
assert(equipment.every(row=>row.effects.every(effect=>localeComplete(effect.text)&&effect.text.en!=='BLANK_NO_EFFECTS')),'Equipment contains an invalid display effect')

assert(spells.length===194&&spells.length===meta.counts.spellBooks,'Expected 194 spell-book records')
assert(unique(spells),'Spell-book IDs are not unique')
assert(spells.every(row=>localeComplete(row.name)&&localeComplete(row.family)&&localeComplete(row.description)),'Spell books have incomplete locales')
assert(spells.every(row=>row.iconPath&&existsSync(publicPath(row.iconPath))),'Spell books have a missing icon file')
assert(spells.filter(row=>row.name.zhCN!==row.name.en||row.name.zhTW!==row.name.en).length===meta.counts.localizedSpellBooks,'Spell-book locale count differs from meta.json')

assert(classes.length===4,'Expected four classes')
assert(classes.every(group=>group.trees.length===3),'Expected three trees per class')
assert(classes.every(group=>group.trees.every(tree=>tree.skills.length===10)),'Expected ten skills per tree')
const skills=classes.flatMap(group=>group.trees.flatMap(tree=>tree.skills))
assert(skills.length===120&&skills.length===meta.counts.classSkills,'Expected 120 class skills')
assert(skills.every(skill=>localeComplete(skill.name)&&localeComplete(skill.description)),'Class skills have incomplete official locales')
assert(skills.every(skill=>skill.iconPath&&existsSync(publicPath(skill.iconPath))),'Class skills have a missing icon file')
assert(skills.every(skill=>skill.ranks.length===15&&skill.maxRank===15),'Every class skill should expose 15 ranks')
assert(skills.reduce((sum,skill)=>sum+skill.ranks.length,0)===1800&&meta.counts.skillRanks===1800,'Expected 1,800 skill rank records')
assert(skills.some(skill=>skill.ranks.some(rank=>rank.metrics.some(metric=>metric.kind==='weaponDamagePct'))),'Weapon-damage rank values were not imported')
assert(skills.some(skill=>skill.ranks.some(rank=>rank.effects.length>0)),'Skill affix effects were not imported')

const challenges=phases.flatMap(beast=>beast.challenges)
assert(phases.length===6,'Expected six Phase Beast overworld areas')
assert(challenges.length===15&&challenges.length===meta.counts.phaseChallenges,'Expected 15 localized Phase Beast challenge instructions')
assert(challenges.every(challenge=>localeComplete(challenge.name)),'Phase Beast challenge locales are incomplete')
assert(meta.gaps.phaseRoomsWithoutInstruction===5,'Expected five source rooms without instruction text')
assert(meta.languages.join('|')==='en|zh-CN|zh-TW','Expected English, Simplified Chinese and Traditional Chinese')

console.log(`Validated ${equipment.length} equipment rows, ${spells.length} spell books, ${skills.length} class skills with ${meta.counts.skillRanks} ranks, and ${challenges.length} Phase Beast challenges`)
