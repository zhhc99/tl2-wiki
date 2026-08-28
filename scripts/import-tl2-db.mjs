import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import MDBReader from 'mdb-reader'

const projectDir = resolve(import.meta.dirname, '..')
const dbPath = resolve(process.argv[2] || `${projectDir}/.cache/tl2-data/tl2db_base.db`)
const tidbiPath = resolve(process.argv[3] || `${projectDir}/.cache/tl2-data/tidbi/TIDBI-eng v1/base.mdb`)
const outputDir = resolve(projectDir, 'public/data')
const officialZh = JSON.parse(readFileSync(resolve(projectDir, 'scripts/official-zh.json'), 'utf8'))

const sqlite = new DatabaseSync(dbPath, { readOnly: true })
const query = (sql) => sqlite.prepare(sql).all()

const clean = (value = '') => String(value ?? '')
  .replace(/\|c[0-9a-f]{8}/gi, '')
  .replace(/\|u/gi, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const toInt = (value) => Number.isFinite(Number(value)) ? Number(value) : 0

const equipmentKinds = [
  '1HAXE','1HMACE','1HSWORD','2HAXE','2HMACE','2HSWORD','AXE','SWORD','MACE','FIST','WAND','STAFF','PISTOL','BOW','CROSSBOW','RIFLE','SHOTGONNE','CANNON','POLEARM','POLARARM',
  'BELT','BOOTS','CHEST ARMOR','GLOVES','HELMET','PANTS','SHIELD','SHOULDER ARMOR','RING','NECKLACE','COLLAR','STUD','SOCKETABLE','EMBER',
]

const classifyCategory = (unitType) => {
  const type = unitType.toUpperCase()
  if (type.includes('SOCKETABLE') || type.includes('EMBER')) return 'socketable'
  if (type.includes('COLLAR') || type.includes('STUD')) return 'pet'
  if (['BELT','BOOTS','CHEST ARMOR','GLOVES','HELMET','PANTS','SHIELD','SHOULDER ARMOR'].some((part) => type.includes(part))) return 'armor'
  if (['RING','NECKLACE'].some((part) => type.includes(part))) return 'trinket'
  return 'weapon'
}

const classifyRarity = (unitType, itemSet) => {
  const type = unitType.toUpperCase()
  if (type.includes('LEGENDARY')) return 'legendary'
  if (clean(itemSet)) return 'set'
  if (type.includes('UNIQUE')) return 'unique'
  if (type.includes('MAGIC')) return 'rare'
  return 'normal'
}

const subtype = (unitType) => clean(unitType)
  .replace(/^(LEGENDARY|UNIQUE|MAGIC|NORMAL)[ _]?/i, '')
  .replaceAll('_', ' ')
  .replace(/^1H/i, 'One-hand ')
  .replace(/^2H/i, 'Two-hand ')
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase())

const specialSources = new Map([
  ['skull of limoany', 'Frosted Hills — Protect the Crystals challenge'],
  ['rambren skull', 'Sundered Battlefield — Avoid the Lava challenge'],
  ['the eye of grell', 'General Grell'],
  ['the eye of the manticore', 'The Manticore'],
  ['the eye of boletus rex', 'Boletus Rex'],
  ['the eye of winter widow', 'Winter Widow'],
  ['the eye of the netherlord', 'The Netherlord'],
])
const sourceFor = (name) => {
  const explicit = specialSources.get(name.toLowerCase())
  if (explicit) return explicit
  const bossEye = name.match(/^The Eye of (?:the )?(.+)$/i)
  return bossEye?.[1] || null
}

const tidbi = new MDBReader(readFileSync(tidbiPath))
const tidbiItems = tidbi.getTable('items').getData()
const tidbiEffects = tidbi.getTable('effects').getData()
const tidbiSetEffects = tidbi.getTable('sets').getData()
const key = (value) => clean(value).toLowerCase()
const tidbiItemsByInternalName = new Map(tidbiItems.map((item) => [key(item.ConsolNAME), item]))

const groupBy = (rows, getKey, convert) => {
  const groups = new Map()
  for (const row of rows) {
    const groupKey = getKey(row)
    if (!groupKey) continue
    groups.set(groupKey, [...(groups.get(groupKey) || []), convert(row)])
  }
  return groups
}

const effectsByItem = groupBy(
  tidbiEffects.filter((effect) => clean(effect.texteffect) && clean(effect.texteffect) !== 'BLANK_NO_EFFECTS'),
  (effect) => key(effect.item),
  (effect) => ({ text: clean(effect.texteffect), value: effect.chislo == null ? null : Number(effect.chislo) }),
)
const setEffectsByName = groupBy(
  tidbiSetEffects.filter((effect) => clean(effect.texteffect)),
  (effect) => key(effect.iTRANSLATION),
  (effect) => ({ pieces: toInt(effect.countset), text: clean(effect.texteffect), value: effect.chislo == null ? null : Number(effect.chislo) }),
)
for (const bonuses of setEffectsByName.values()) bonuses.sort((a, b) => a.pieces - b.pieces || a.text.localeCompare(b.text))

const exactRanges = (item, prefix) => Object.fromEntries([
  ['physical', [item?.[`MIN_${prefix}_PHYSICAL`], item?.[`MAX_${prefix}_PHYSICAL`]]],
  ['fire', [item?.[`MIN_${prefix}_FIRE`], item?.[`MAX_${prefix}_FIRE`]]],
  ['ice', [item?.[`MIN_${prefix}_ICE`], item?.[`MAX_${prefix}_ICE`]]],
  ['electric', [item?.[`MIN_${prefix}_ELECTRIC`], item?.[`MAX_${prefix}_ELECTRIC`]]],
  ['poison', [item?.[`MIN_${prefix}_POISON`], item?.[`MAX_${prefix}_POISON`]]],
].filter(([, values]) => values.some((value) => Number(value) !== 0 && Number.isFinite(Number(value))))
  .map(([element, values]) => [element, values.map((value) => Number(value) || 0)]))

const numberOr = (primary, fallback = 0) => primary == null || primary === '' ? toInt(fallback) : Number(primary)
const unavailableTitles = new Set(['NO_DROP', 'TEST', 'TEST PROC', 'TEST KILL'])
const unavailableInternalNames = new Set(['testaxe', 'zzz_bow_blind', 'tl2_bloodember_base'])
const isInternalOnly = (item) => {
  const title = clean(item.title).toUpperCase()
  const internalName = key(item.name)
  return unavailableTitles.has(title)
    || title.includes('SHOULD NOT SPAWN')
    || title.includes("DON'T USE")
    || internalName.startsWith('zzz_testsword')
    || unavailableInternalNames.has(internalName)
}

const rawItems = query(`
  SELECT printf('%lld', id) AS id, name, title, unittype, level, req_level, req_strength,
    req_dexterity, req_magic, req_defense, sockets, speed, itemset, descr, icon, file,
    arm_electric, arm_fire, arm_ice, arm_physical, arm_poison, armormin, armormax,
    dmg_electric, dmg_fire, dmg_ice, dmg_physical, dmg_poison, mindamage, maxdamage
  FROM items
  WHERE TRIM(COALESCE(title, '')) <> ''
`)

const equipment = rawItems
  .filter((item) => equipmentKinds.some((kind) => clean(item.unittype).toUpperCase().includes(kind)))
  .filter((item) => !clean(item.title).toUpperCase().includes('NOSPAWN'))
  .filter((item) => !isInternalOnly(item))
  .map((item) => {
    const name = clean(item.title)
    const tidbiItem = tidbiItemsByInternalName.get(key(item.name))
    const requirements = [
      ['str', tidbiItem?.STRENGTH_REQUIRED ?? item.req_strength],
      ['dex', tidbiItem?.DEXTERITY_REQUIRED ?? item.req_dexterity],
      ['foc', tidbiItem?.MAGIC_REQUIRED ?? item.req_magic],
      ['vit', tidbiItem?.DEFENSE_REQUIRED ?? item.req_defense],
    ].filter(([, value]) => toInt(value) > 0).map(([stat, value]) => ({ stat, value: toInt(value) }))
    const itemSet = clean(tidbiItem?.SETS) || clean(item.itemset) || null
    return {
      id: item.id,
      slug: `${slug(name)}-${item.id.replace('-', 'n')}`,
      name,
      internalName: clean(item.name),
      category: classifyCategory(item.unittype),
      subtype: subtype(item.unittype),
      unitType: clean(item.unittype),
      rarity: classifyRarity(item.unittype, itemSet),
      level: numberOr(tidbiItem?.iLEVEL, item.level),
      requiredLevel: numberOr(tidbiItem?.LEVEL_REQUIRED, item.req_level),
      requirements,
      sockets: numberOr(tidbiItem?.SOCKETS, item.sockets),
      maxSockets: tidbiItem?.MAX_SOCKETS == null ? null : Number(tidbiItem.MAX_SOCKETS),
      speed: tidbiItem?.SPEED == null ? null : Number(tidbiItem.SPEED),
      blockChance: tidbiItem?.BLOCK_CHANCE == null ? null : Number(tidbiItem.BLOCK_CHANCE),
      minimumDropLevel: tidbiItem?.MINLEVEL == null ? null : Number(tidbiItem.MINLEVEL),
      maximumDropLevel: tidbiItem?.MAXLEVEL == null || Number(tidbiItem.MAXLEVEL) > 100000 ? null : Number(tidbiItem.MAXLEVEL),
      classRequirement: clean(tidbiItem?.REQ_CLASS) || null,
      set: itemSet,
      description: clean(tidbiItem?.DESCRIPTION) || clean(item.descr) || null,
      icon: clean(tidbiItem?.ICON) || clean(item.icon) || null,
      armor: exactRanges(tidbiItem, 'ARM'),
      damage: exactRanges(tidbiItem, 'DMG'),
      effects: effectsByItem.get(key(item.name)) || [],
      setBonuses: setEffectsByName.get(key(itemSet)) || [],
      tidbiMatched: Boolean(tidbiItem),
      specialSource: sourceFor(name),
      sourceFile: clean(item.file),
    }
  })
  .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))

const romanValue = (value) => {
  const map = { I: 1, V: 5, X: 10 }
  return value.split('').reduce((sum, char, index, arr) => {
    const current = map[char] || 0
    const next = map[arr[index + 1]] || 0
    return sum + (current < next ? -current : current)
  }, 0)
}

const spellBooks = rawItems
  .filter((item) => clean(item.unittype).toUpperCase() === 'SPELL')
  .map((item) => {
    const name = clean(item.title)
    const tierMatch = name.match(/\s([IVX]+)$/)
    const family = name.replace(/^(Spell|Tome):\s*/i, '').replace(/\s[IVX]+$/, '')
    const lower = family.toLowerCase()
    const school = lower.includes('summon') ? 'summon'
      : /(heal|protection|block|retribution|repel)/.test(lower) ? 'defense'
      : /(fireball|frost|rumble|tunneler|silence)/.test(lower) ? 'offense'
      : 'utility'
    return {
      id: item.id,
      name,
      family,
      tier: tierMatch ? romanValue(tierMatch[1]) : 1,
      school,
      level: toInt(item.level),
      requiredLevel: toInt(item.req_level),
      description: clean(item.descr),
      icon: clean(item.icon) || null,
      sourceFile: clean(item.file),
    }
  })
  .sort((a, b) => a.family.localeCompare(b.family) || a.tier - b.tier)

const skillTreeMap = {
  embermage: {
    inferno: ['Magma Spear','Magma Mace','Firebombs','Blazing Pillar','Infernal Collapse','Immolation Aura','Firestorm','Charge Mastery','Elemental Attunement','Fire Brand'],
    frost: ['Icy Blast','Hailstorm','Frost Phase','Elemental Boon','Frost Wave','Ice Prison','Astral Ally','Staff Mastery','Frozen Fate','Ice Brand'],
    storm: ['Prismatic Bolt','Shocking Burst','Thunder Locus','Arc Beam',"Death's Bounty",'Shockbolts','Shocking Orb','Prismatic Rift','Wand Chaos','Lightning Brand'],
  },
  engineer: {
    blitz: ['Flame Hammer','Seismic Slam','Ember Hammer','Onslaught','Ember Reach','Storm Burst','Emberquake','Heavy Lifting','Supercharge','Coup de Grace'],
    construction: ['Healing Bot','Blast Cannon','Spider Mines','Gun Bot','Shock Grenade','Fusillade','Sledgebot','Bulwark','Fire and Spark','Charge Domination'],
    aegis: ['Shield Bash','Forcefield','Overload','Dynamo Field','Tremor','Fire Bash','Immobilization Copter','Sword and Board','Aegis of Fate','Charge Reconstitution'],
  },
  berserker: {
    hunter: ['Eviscerate','Howl','Raze','Wolfstrike','Battle Rage','Rupture','Ravage','Blood Hunger','Executioner','Rampage'],
    tundra: ['Frost Breath','Stormclaw','Storm Hatchet','Northern Rage','Iceshield','Permafrost','Glacial Shatter','Cold Steel Mastery','Shatter Storm','Rage Retaliation'],
    shadow: ['Shadow Burst','Wolf Shade','Shadowbind','Savage Rush','Chain Snare','Battle Standard','Wolfpack','Frenzy Mastery','Shred Armor','Red Wolf'],
  },
  outlander: {
    warfare: ['Rapid Fire','Rune Vault','Chaos Burst','Cursed Daggers','Vortex Hex','Shattering Glaive','Venomous Hail','Long Range Mastery','Shotgonne Mastery','Akimbo'],
    lore: ['Glaive Throw','Tangling Shot','Glaive Sweep','Sandstorm','Bramble Wall','Burning Leap','Flaming Glaives','Dodge Mastery','Poison Burst','Share the Wealth'],
    sigil: ['Blade Pact','Shadowshot','Bane Breath','Repulsion Hex','Stone Pact','Shadowmantle','Shadowling Brute','Master of the Elements','Shadowling Ammo','Death Ritual'],
  },
}

const titleAliases = new Map([
  ['Flaming Glaives', 'Flaming Glaives'],
  ['Coup de Grace', 'Coup de Grace'],
])
const rawSkills = query(`
  SELECT printf('%lld', id) AS id, name, title, descr, minlevel, maxlevel, graph,
    passive, shared, icon, tier1, tier2, tier3
  FROM skills
  WHERE TRIM(COALESCE(title, '')) <> ''
`)

const chooseSkill = (wanted, passive) => {
  const alias = titleAliases.get(wanted) || wanted
  const matches = rawSkills.filter((entry) => clean(entry.title).toLowerCase() === alias.toLowerCase() && Boolean(entry.passive) === passive)
  return matches.sort((a, b) => {
    const score = (entry) => (toInt(entry.maxlevel) === 15 ? 4 : 0) + (clean(entry.icon) ? 2 : 0) + (clean(entry.graph).startsWith('SKILLTIER') ? 1 : 0)
    return score(b) - score(a)
  })[0]
}

const classSkills = Object.entries(skillTreeMap).map(([classId, trees]) => ({
  classId,
  trees: Object.entries(trees).map(([treeId, titles]) => ({
    treeId,
    skills: titles.map((title, index) => {
      const passive = index >= 7
      const entry = chooseSkill(title, passive)
      if (!entry) throw new Error(`Missing class skill in source DB: ${classId}/${treeId}/${title}`)
      const publicTitle = title === 'Iceshield' ? 'Ice Shield' : title
      const localized = officialZh.skills[publicTitle] || {}
      return {
        id: entry.id,
        slug: slug(publicTitle),
        title: publicTitle,
        description: clean(entry.descr),
        titleZh: localized.title || publicTitle,
        descriptionZh: localized.description || clean(entry.descr),
        level: passive ? [1, 7, 14][index - 7] : [1, 7, 14, 21, 28, 35, 42][index],
        kind: passive ? 'passive' : 'active',
        maxRank: toInt(entry.maxlevel),
        icon: clean(entry.icon) || null,
        tierText: [clean(entry.tier1), clean(entry.tier2), clean(entry.tier3)].filter(Boolean),
      }
    }),
  })),
}))

mkdirSync(outputDir, { recursive: true })
const write = (name, data) => writeFileSync(resolve(outputDir, name), `${JSON.stringify(data)}\n`)
write('equipment.json', equipment)
write('spell-books.json', spellBooks)
write('class-skills.json', classSkills)
const enrichedEquipment = equipment.filter((item) => item.tidbiMatched).length
const itemEffects = equipment.reduce((sum, item) => sum + item.effects.length, 0)
write('meta.json', {
  source: 'TL2 game data + TIDBI v1.05',
  sourceUrl: 'https://github.com/Awkward-im/Torchlight',
  sources: [
    { name: 'Awkward-im/Torchlight tl2db_base.db', url: 'https://github.com/Awkward-im/Torchlight', role: 'Base items, spell books and class skills' },
    { name: 'TIDBI-eng v1.05', url: 'http://www.dethguild.com/torchlight_item_database.php', role: 'Exact item values, effects and set bonuses' },
    { name: 'Official TRANSLATIONS (v.39)', url: 'https://steamcommunity.com/sharedfiles/filedetails/?id=405160259', role: 'Official Simplified Chinese class and skill strings' },
  ],
  sourceDatabases: [basename(dbPath), basename(tidbiPath)],
  generatedAt: new Date().toISOString(),
  counts: {
    equipment: equipment.length,
    enrichedEquipment,
    itemEffects,
    setBonusDefinitions: tidbiSetEffects.length,
    spellBooks: spellBooks.length,
    classSkills: classSkills.reduce((sum, group) => sum + group.trees.reduce((treeSum, tree) => treeSum + tree.skills.length, 0), 0),
  },
  filters: ['equipment-format player item types', 'non-empty display title', 'exclude explicit NOSPAWN, NO_DROP, TEST and developer-only records'],
})

console.log(`Normalized ${equipment.length} equipment rows (${enrichedEquipment} TIDBI matches, ${itemEffects} effects), ${spellBooks.length} spell-book rows and 120 class skills`)
sqlite.close()
