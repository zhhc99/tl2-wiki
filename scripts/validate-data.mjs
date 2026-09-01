import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectDir=resolve(import.meta.dirname,'..')
const dataDir=resolve(projectDir,'public/data')
const read=(name)=>JSON.parse(readFileSync(resolve(dataDir,name),'utf8'))
const equipment=read('equipment.json')
const spells=read('spell-books.json')
const classes=read('class-skills.json')
const skillGraphs=read('skill-graphs.json')
const phases=read('phase-beasts.json')
const meta=read('meta.json')
const assert=(condition,message)=>{if(!condition)throw new Error(message)}
const unique=(rows)=>new Set(rows.map(row=>row.id)).size===rows.length
const localeComplete=(value)=>Boolean(value?.en&&value?.zhCN&&value?.zhTW)
const publicPath=(path)=>resolve(projectDir,'public',path)

assert(equipment.length===4029&&equipment.length===meta.counts.equipment,'Expected 4,029 non-normal player-facing equipment records including value-changing NG variants')
assert(unique(equipment),'Equipment IDs are not unique')
assert(equipment.every(row=>localeComplete(row.name)&&row.category&&row.subtype&&row.sourceFile),'Equipment has missing required fields')
assert(equipment.every(row=>['rare','unique','legendary'].includes(row.rarity)),'Equipment contains normal or invalid rarity records')
assert(equipment.every(row=>Number.isInteger(row.requiredLevel)&&row.requiredLevel>0),'Equipment contains an invalid final required level')
assert(equipment.every(row=>!Object.hasOwn(row,'baseValues')&&!Object.hasOwn(row,'exactEnrichment')),'Legacy equipment enrichment leaked into public data')
assert(equipment.some(row=>row.set&&row.rarity==='rare')&&equipment.some(row=>row.set&&row.rarity==='unique'),'Set membership must remain independent from rarity')
assert(equipment.every(row=>row.iconPath&&existsSync(publicPath(row.iconPath))),'Equipment has a missing icon file')
assert(equipment.every(row=>!/(NO_DROP|SHOULD NOT SPAWN|DON'T USE)/i.test(row.name.en)),'Internal equipment templates were not removed')
assert(equipment.every(row=>row.panelFormulaVersion==='tl2-panel-values-v1-f32'),'Equipment panel values use an unexpected formula version')
assert(equipment.every(row=>Number.isInteger(row.ngTier)&&row.ngTier>=0&&row.ngTier<=3&&(row.ngVariantOf===null||typeof row.ngVariantOf==='string')),'Equipment contains invalid NG metadata')
assert(equipment.filter(row=>row.ngTier>0).length===189&&equipment.filter(row=>row.ngTier===0&&row.ngVariantOf).length===63&&meta.counts.ngVariantGroups===63&&meta.counts.ngVariantRecords===189,'Expected 63 value-changing equipment groups and 189 derived NG records')
assert(equipment.filter(row=>row.ngVariantOf).every(row=>equipment.filter(peer=>peer.ngVariantOf===row.ngVariantOf).length===4),'An NG equipment group does not contain all four variants')
const ngValueSignature=row=>JSON.stringify({damagePerSecond:row.damagePerSecond,damage:row.damage,armor:row.armor,effects:row.effects.map(effect=>({type:effect.type,min:effect.min,max:effect.max,text:effect.text}))})
assert([...new Set(equipment.filter(row=>row.ngVariantOf).map(row=>row.ngVariantOf))].every(group=>new Set(equipment.filter(row=>row.ngVariantOf===group).map(ngValueSignature)).size>1),'An NG group was emitted without a player-visible value change')
assert(equipment.reduce((sum,row)=>sum+row.effects.length,0)===meta.counts.itemEffects,'Displayed item effect count differs from meta.json')
assert(equipment.every(row=>row.effects.every(effect=>localeComplete(effect.text)&&effect.text.en!=='BLANK_NO_EFFECTS')),'Equipment contains an invalid display effect')
assert(equipment.every(row=>row.effects.every(effect=>!/\[(?:VALUE|NAME|DMGTYPE|DURATION)/.test(effect.text.en)&&!/<stat:/i.test(effect.text.en))),'Equipment contains an unresolved display-effect placeholder')
const socketables=equipment.filter(row=>row.category==='socketable')
assert(socketables.filter(row=>row.ngTier===0).length===111&&socketables.length===174,'Expected 111 base socketables and 63 value-changing NG socketable variants')
assert(socketables.every(row=>row.effects.length>0&&row.effects.every(effect=>effect.socketTargets?.length>0)),'A socketable effect is missing its weapon or armor target')
assert(equipment.filter(row=>row.category!=='socketable').every(row=>row.effects.every(effect=>!effect.socketTargets)),'Socket targets leaked into ordinary equipment effects')
const grellEye=socketables.find(row=>row.name.en==='The Eye of Grell'&&row.ngTier===0)
assert(grellEye?.effects.find(effect=>effect.text.en==='+3% Critical Hit Chance')?.socketTargets.join('|')==='weapon','The Eye of Grell weapon effect target is incorrect')
assert(grellEye?.effects.find(effect=>effect.text.en==='All Damage Taken is reduced by 3%')?.socketTargets.join('|')==='armor','The Eye of Grell armor effect target is incorrect')
assert(socketables.filter(row=>row.name.en==='The Eye of Grell').length===1&&!grellEye.ngVariantOf,'The Eye of Grell must not emit identical NG variants')
const dragonEye=socketables.find(row=>row.name.en==='The Eye of the Dragon')
assert(socketables.filter(row=>row.name.en==='The Eye of the Dragon').length===1&&dragonEye?.ngTier===0&&!dragonEye.ngVariantOf,'The Eye of the Dragon must not emit identical NG variants')
const winterWidowEyes=socketables.filter(row=>row.name.en==='The Eye of Winter Widow').sort((a,b)=>a.ngTier-b.ngTier)
assert(winterWidowEyes.map(row=>row.level).join('|')==='11|57|85|100','Winter Widow NG item levels are incorrect')
assert(winterWidowEyes.map(row=>row.effects.find(effect=>effect.type==='MAGIC')?.min).join('|')==='6|24|36|42','Winter Widow NG Focus values are incorrect')
assert(winterWidowEyes.map(row=>row.effects.find(effect=>effect.type==='DEGRADE ARMOR')?.min).join('|')==='6|67|134|180','Winter Widow NG armor degradation values are incorrect')
const darkAlchemistEyes=socketables.filter(row=>row.name.en==='The Eye of the Dark Alchemist').sort((a,b)=>a.ngTier-b.ngTier)
assert(darkAlchemistEyes.map(row=>row.level).join('|')==='48|79|98|100','Dark Alchemist NG item levels are incorrect')
assert(darkAlchemistEyes.map(row=>row.effects.find(effect=>effect.type==='DAMAGE')?.text.en).join('|')==='480 Physical Damage over 5 seconds|1370 Physical Damage over 5 seconds|2260 Physical Damage over 5 seconds|2375 Physical Damage over 5 seconds','Dark Alchemist NG damage values are incorrect')
const galloEyes=socketables.filter(row=>row.name.en==='The Eye of Gallo').sort((a,b)=>a.ngTier-b.ngTier)
assert(galloEyes.map(row=>row.effects.find(effect=>effect.type==='LIFE STEAL')?.min).join('|')==='93|185|243|260','Gallo NG life-steal values are incorrect')
const elderOne=equipment.find(row=>row.internalName.toLowerCase()==='legendary2_axe05b')
assert(elderOne?.damagePerSecond?.join('|')==='1010|1010'&&elderOne.speed===0.72,'Axe of the Elder One panel DPS or attack interval is incorrect')
assert(JSON.stringify(elderOne?.damage)==='{"fire":[240,240],"electric":[247,247],"poison":[240,240]}','Axe of the Elder One damage channels are incorrect')
assert(elderOne?.effects.length===6,'Axe of the Elder One should expose exactly six effective display effects')
assert(elderOne.effects.map(effect=>effect.text.en).join('|')==='4% increase in magic-finding Luck|+20% Melee Weapon Damage bonus|6% chance to cast Acid Rain from target|10% chance to cast Scalding Geyser from target|2% chance to cast Call Forth the Skull on kill|20% chance to break enemy shields','Axe of the Elder One display effects differ from the verified game text')
const playerRing=equipment.find(row=>row.internalName.toLowerCase()==='wanderer_05_ring_alt_b')
assert(JSON.stringify(playerRing?.armor)==='{"ice":[45,45],"fire":[45,45],"electric":[45,45],"poison":[45,45]}','Ring of the Players armor channels are incorrect')
assert(playerRing?.effects.find(effect=>effect.type==='DEXTERITY BONUS')?.min===20,'Ring of the Players must expose a rounded +20 Dexterity effect')
assert(playerRing?.requiredLevel===78&&playerRing.requirements.map(row=>`${row.stat}:${row.value}`).join('|')==='dex:119|vit:68','Ring of the Players requirements are incorrect')
const experimentalChainsword=equipment.find(row=>row.internalName.toLowerCase()==='greatsword_u05')
assert(experimentalChainsword?.damagePerSecond?.join('|')==='608|608'&&JSON.stringify(experimentalChainsword.damage)==='{"physical":[326,653],"electric":[109,217]}','Experimental Chainsword panel values are incorrect')
const massiveWrench=equipment.find(row=>row.internalName.toLowerCase()==='z_greathammer_m03_set')
assert(massiveWrench?.damagePerSecond?.join('|')==='157|161','Ranged weapon DPS values must retain their final range')
const setEffects=equipment.flatMap(row=>row.rawSetBonuses)
assert(setEffects.length>0&&setEffects.every(effect=>localeComplete(effect.text)),'Set effects have incomplete locales')
assert(setEffects.every(effect=>!/\[(?:VALUE|NAME|DMGTYPE|DURATION)/.test(effect.text.en)&&!/<stat:/i.test(effect.text.en)),'Set effects contain an unresolved display-effect placeholder')
const asphyx=equipment.find(row=>row.setInternalName?.toLowerCase()==='asphyx')
assert(asphyx?.rawSetBonuses.some(effect=>effect.text.en==='12.8 Health loss per second!'),'Asphyx two-piece health loss must resolve to 12.8 per second')
assert(equipment.some(row=>row.effects.some(effect=>effect.text.en==='5880 Physical Damage over 3 seconds')),'Dispatch over-time damage must use the in-game rounding order')
assert(setEffects.some(effect=>effect.text.en==='2320 Physical Damage over 5 seconds'),'Unearthly set damage must use the in-game rounding order')

assert(spells.length===194&&spells.length===meta.counts.spellBooks,'Expected 194 spell-book records')
assert(unique(spells),'Spell-book IDs are not unique')
assert(spells.every(row=>localeComplete(row.name)&&localeComplete(row.family)&&localeComplete(row.description)),'Spell books have incomplete locales')
assert(spells.every(row=>row.iconPath&&existsSync(publicPath(row.iconPath))),'Spell books have a missing icon file')
assert(spells.filter(row=>row.name.zhCN!==row.name.en||row.name.zhTW!==row.name.en).length===meta.counts.localizedSpellBooks,'Spell-book locale count differs from meta.json')
assert(meta.counts.localizedSpellBooks===194&&meta.gaps.spellBookNamesWithoutOfficialChinese===0&&meta.gaps.spellBooksWithoutOfficialChineseDescription===0,'Expected complete official spell-book locales')

assert(classes.length===4,'Expected four classes')
assert(classes.every(group=>group.trees.length===3),'Expected three trees per class')
assert(classes.every(group=>group.trees.every(tree=>tree.skills.length===10)),'Expected ten skills per tree')
const skills=classes.flatMap(group=>group.trees.flatMap(tree=>tree.skills))
assert(skills.length===120&&skills.length===meta.counts.classSkills,'Expected 120 class skills')
assert(skills.every(skill=>localeComplete(skill.name)&&localeComplete(skill.description)),'Class skills have incomplete official locales')
assert(skills.every(skill=>skill.iconPath&&existsSync(publicPath(skill.iconPath))),'Class skills have a missing icon file')
assert(skills.every(skill=>skill.ranks.length===15&&skill.maxRank===15),'Every class skill should expose 15 ranks')
assert(skills.every(skill=>skill.ranks.every(rank=>Number.isInteger(rank.requiredLevel)&&rank.requiredLevel>=skill.level)),'A skill rank has an invalid required character level')
assert(skills.reduce((sum,skill)=>sum+skill.ranks.length,0)===1800&&meta.counts.skillRanks===1800,'Expected 1,800 skill rank records')
assert(skills.some(skill=>skill.ranks.some(rank=>rank.metrics.some(metric=>metric.kind==='weaponDamagePct'))),'Weapon-damage rank values were not imported')
assert(skills.some(skill=>skill.ranks.some(rank=>rank.effects.length>0)),'Skill affix effects were not imported')
const skillEffects=skills.flatMap(skill=>skill.ranks.flatMap(rank=>rank.effects))
assert(skillEffects.every(effect=>localeComplete(effect.template)),'Skill effects have incomplete localized display templates')
assert(skillEffects.every(effect=>!/(?:ADD|REMOVE) TRIGGERABLE|(?:ADD|REMOVE) STAT/.test(effect.type)),'Runtime skill plumbing leaked into player-facing effects')
const supportedSkillTokens=new Set(['[VALUE]','[VALUE_OT]','[VALUE1ASDURATION]','[VALUE3]','[VALUE3AND4]','[VALUE5]','[DMGTYPE]','[DURATION]','[NAME]'])
assert(skillEffects.every(effect=>Object.values(effect.template).every(text=>[...text.matchAll(/\[[A-Z0-9_]+\]/g)].every(match=>supportedSkillTokens.has(match[0])))),'Skill display templates contain an unsupported placeholder')
assert(Object.keys(skillGraphs).length>=6&&Object.values(skillGraphs).every(points=>Array.isArray(points)&&points.length>0),'Skill scaling graph data is incomplete')
assert(skillEffects.every(effect=>!effect.scalingGraph||skillGraphs[effect.scalingGraph]),'A skill effect references a missing scaling graph')
const skillEffect=(name,rank,type,damageType)=>skills.find(skill=>skill.name.en===name)?.ranks[rank-1]?.effects.find(effect=>effect.type===type&&(!damageType||effect.damageType===damageType))
const masteryEndpoints=[
  ['Charge Mastery','PERCENT CHARGE BAR DECAY RATE',null,-6,-90],
  ['Charge Mastery','PERCENT CHARGING BONUS',null,4,60],
  ['Cold Steel Mastery','PERCENT DAMAGE BONUS','PHYSICAL',2,30],
  ['Cold Steel Mastery','PERCENT DAMAGE BONUS','ICE',6,90],
  ['Executioner','PERCENT DUAL WIELDING ATTACK',null,2,30],
  ['Heavy Lifting','PERCENT ATTACK SPEED',null,2,30],
  ['Heavy Lifting','STUN',null,2,30],
  ['Bulwark','PERCENT ARMOR BONUS',null,2,30],
  ['Fire and Spark','PERCENT DAMAGE BONUS','FIRE',5,75],
  ['Fire and Spark','PERCENT DAMAGE BONUS','ELECTRIC',5,75],
  ['Akimbo','DUAL WIELDING BONUS','PHYSICAL',2,30],
  ['Akimbo','PERCENT DUAL WIELDING ATTACK',null,2,30],
  ['Dodge Mastery','DODGE CHANCE BONUS',null,4,32],
  ['Long Range Mastery','PERCENT RANGEDDAMAGE','ALL',2,30],
  ['Long Range Mastery','MISSILE RANGE BONUS',null,1/3,5],
  ['Master of the Elements','PERCENT DAMAGE BONUS','ICE',2,30],
  ['Master of the Elements','PERCENT DAMAGE BONUS','FIRE',2,30],
  ['Master of the Elements','PERCENT DAMAGE BONUS','POISON',4,60],
  ['Master of the Elements','PERCENT DAMAGE BONUS','ELECTRIC',2,30],
  ['Poison Burst','CAST SKILL ON DEATH FROM EFFECT OWNER',null,12,68],
]
const nearlyEqual=(left,right)=>Math.abs(left-right)<1e-5
assert(masteryEndpoints.every(([name,type,damageType,first,last])=>nearlyEqual(skillEffect(name,1,type,damageType)?.min,first)&&nearlyEqual(skillEffect(name,15,type,damageType)?.min,last)),'A mastery skill did not apply its affix-level graph override')
const minionSkills=['Astral Ally','Wolf Shade','Gun Bot','Sledgebot','Spider Mines','Bane Breath','Shadowling Ammo','Shadowling Brute']
assert(minionSkills.every(name=>skillEffect(name,1,'MINIONDAMAGE')?.scalingGraph==='DAMAGE_MINION_BYLEVEL'),'A minion skill did not apply its owner-level graph override')
assert(skillEffect('Ravage',1,'ARMOR BONUS')?.scalingGraph==='ARMOR_MONSTER_BYLEVEL','Ravage did not apply its armor graph override')
const rapidFire=skills.find(skill=>skill.name.en==='Rapid Fire')
assert(rapidFire?.ranks[0].metrics.some(metric=>metric.kind==='manaPerSecond'&&metric.value===12),'Rapid Fire rank-one mana drain is missing')
assert(rapidFire?.ranks[0].effects.some(effect=>effect.type==='ARMOR BONUS'&&effect.scalingGraph==='ARMOR_PLAYER_BYLEVEL_FORSET'),'Rapid Fire armor reduction is not linked to its player-level graph')
assert(rapidFire?.ranks[0].effects.some(effect=>effect.type==='KNOCK BACK EFFECT'&&effect.min===2.6),'Rapid Fire knockback is missing')
assert(!rapidFire?.ranks.some(rank=>rank.metrics.some(metric=>metric.kind==='durationMs')),'Rapid Fire execution timing leaked into displayed duration')
const glaiveThrow=skills.find(skill=>skill.name.en==='Glaive Throw')
assert(glaiveThrow?.ranks[0].effects.some(effect=>effect.type==='DAMAGE'&&effect.scalingGraph==='DAMAGE_MONSTER'&&effect.min===100&&effect.max===120),'Glaive Throw damage is not linked to its player-level graph')
assert(glaiveThrow?.ranks[0].effects.some(effect=>effect.type==='ADD CHARGE PERCENT'&&effect.min===2),'Glaive Throw charge generation is missing')
assert(glaiveThrow?.ranks[0].requiredLevel===1&&glaiveThrow.ranks[14].requiredLevel===92,'Glaive Throw rank requirements differ from SKILLTIER1')
assert(glaiveThrow?.ranks[0].metrics.some(metric=>metric.kind==='manaCost'&&metric.value===10&&metric.scalingGraph==='MANACOST_NORMAL')&&glaiveThrow.ranks[14].metrics.some(metric=>metric.kind==='manaCost'&&metric.value===42),'Glaive Throw mana scaling is incomplete')
const graphAt=(name,level)=>skillGraphs[name]?.find(([x])=>x===level)?.[1]
const glaiveAverages=glaiveThrow.ranks.map(rank=>{const effect=rank.effects.find(row=>row.type==='DAMAGE');const scale=graphAt(effect.scalingGraph,rank.requiredLevel);return Math.ceil((Math.ceil(scale*effect.min/100)+Math.ceil(scale*effect.max/100))/2)})
assert(glaiveAverages.join('|')==='11|16|22|41|72|110|170|262|399|602|899|1284|1830|2595|3757','Glaive Throw minimum-rank-level damage no longer matches the verified progression')
const rapidArmor=rapidFire.ranks.map(rank=>{const effect=rank.effects.find(row=>row.type==='ARMOR BONUS');return Math.floor(graphAt(effect.scalingGraph,rank.requiredLevel)*Math.abs(effect.min)/100)})
assert(rapidArmor.join('|')==='1|1|1|3|5|7|11|16|22|30|40|51|64|79|98','Rapid Fire minimum-rank-level armor reduction no longer matches the verified progression')

const challenges=phases.flatMap(beast=>beast.challenges)
assert(phases.length===6,'Expected six Phase Beast overworld areas')
assert(challenges.length===15&&challenges.length===meta.counts.phaseChallenges,'Expected 15 localized Phase Beast challenge instructions')
assert(challenges.every(challenge=>localeComplete(challenge.name)),'Phase Beast challenge locales are incomplete')
assert(meta.gaps.phaseRoomsWithoutInstruction===5,'Expected five source rooms without instruction text')
assert(meta.languages.join('|')==='en|zh-CN|zh-TW','Expected English, Simplified Chinese and Traditional Chinese')

console.log(`Validated ${equipment.length} equipment rows, ${spells.length} spell books, ${skills.length} class skills with ${meta.counts.skillRanks} ranks, and ${challenges.length} Phase Beast challenges`)
