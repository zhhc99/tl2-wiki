import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const projectDir = resolve(import.meta.dirname, '..')
const dataRoot = resolve(process.argv[2] || `${projectDir}/tl2-wiki-data`)
const dbPath = resolve(dataRoot, 'database/tl2.sqlite')
const outputDir = resolve(projectDir, 'public/data')
const iconOutputDir = resolve(projectDir, 'public/game-icons')

if (!existsSync(dbPath)) throw new Error(`Missing TL2 data database: ${dbPath}`)

const sqlite = new DatabaseSync(dbPath, { readOnly: true })
const query = (sql, ...params) => sqlite.prepare(sql).all(...params)
const clean = (value = '') => String(value ?? '')
  .replace(/\|c[0-9a-f]{8}/gi, '')
  .replace(/\|u/gi, '')
  .replace(/\\n/g, '\n')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/ *\n */g, '\n')
  .trim()
const slug = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const local = (en, zhCN, zhTW) => ({ en: clean(en), zhCN: clean(zhCN) || clean(en), zhTW: clean(zhTW) || clean(en) })
const pathForWeb = (path) => path ? `game-icons/${path.replace(/^images\//, '')}` : null
const groupBy = (rows, key) => {
  const grouped = new Map()
  for (const row of rows) grouped.set(key(row), [...(grouped.get(key(row)) || []), row])
  return grouped
}

const enrichmentRows = JSON.parse(readFileSync(resolve(projectDir, 'scripts/item-enrichment.json'), 'utf8'))
const enrichmentByName = new Map(enrichmentRows.map((row) => [row.internalName.toLowerCase(), row]))
const spellBookSource = JSON.parse(readFileSync(resolve(projectDir, 'scripts/spell-books-source.json'), 'utf8'))

const itemRows = query(`
  SELECT i.*, sf.path AS source_path,
    sets.display_name_en AS set_display_name_en,
    sets.display_name_zh_cn AS set_display_name_zh_cn,
    sets.display_name_zh_tw AS set_display_name_zh_tw
  FROM items i
  JOIN source_files sf ON sf.id=i.source_file_id
  LEFT JOIN item_sets sets ON lower(sets.internal_name)=lower(i.set_name)
  ORDER BY i.level DESC, i.display_name_en, i.id
`).filter((row) => !/^(NO_DROP|MON PROP DON'T USE)$/i.test(clean(row.display_name_en)))
const itemAttributes = groupBy(query(`
  SELECT item_id, name, value_text, value_integer, value_real
  FROM item_attributes
`), (row) => row.item_id)
const itemDisplayEffects = groupBy(query(`
  SELECT ide.item_id, ide.ordinal, ide.effect_name, ide.effect_type,
    ide.text_en, ide.text_zh_cn, ide.text_zh_tw, ide.render_status, ide.values_json,
    ae.activation, ae.duration, ae.chance, ae.min_value, ae.max_value, ae.properties_json
  FROM item_display_effects ide
  JOIN affix_effects ae ON ae.id=ide.affix_effect_id
  WHERE ide.is_player_visible=1
  ORDER BY ide.item_id, ide.ordinal
`), (row) => row.item_id)
const rawSetEffects = groupBy(query(`
  SELECT sets.internal_name AS set_name, sb.required_count, ae.effect_name, ae.effect_type,
    ae.activation, ae.duration, ae.chance, ae.min_value, ae.max_value, ae.properties_json,
    ae.rendered_description_en, ae.rendered_description_zh_cn, ae.rendered_description_zh_tw
  FROM item_sets sets
  JOIN set_bonuses sb ON sb.set_id=sets.id
  LEFT JOIN affix_effects ae ON ae.affix_id=sb.resolved_affix_id
  ORDER BY sets.internal_name, sb.required_count, sb.ordinal, ae.ordinal
`), (row) => String(row.set_name || '').toLowerCase())

const attributeMap = (itemId) => new Map((itemAttributes.get(itemId) || []).map((row) => [row.name, row]))
const attrNumber = (attributes, name, fallback = 0) => {
  const row = attributes.get(name)
  return row?.value_integer ?? row?.value_real ?? number(row?.value_text, fallback)
}
const normalizeRawEffect = (row) => {
  const properties = JSON.parse(row.properties_json || '{}')
  const propertyValue = (name) => properties[name]?.value ?? null
  return {
    type: clean(row.effect_type),
    name: clean(row.effect_name),
    activation: clean(row.activation),
    damageType: clean(propertyValue('DAMAGE_TYPE')),
    duration: row.duration == null ? null : number(row.duration),
    chance: row.chance == null ? null : number(row.chance),
    min: row.min_value == null ? null : number(row.min_value),
    max: row.max_value == null ? null : number(row.max_value),
    useOwnerLevel: Boolean(propertyValue('USEOWNERLEVEL')),
    ...(row.rendered_description_en ? { text: local(
      row.rendered_description_en,
      row.rendered_description_zh_cn,
      row.rendered_description_zh_tw,
    ) } : {}),
  }
}
const cleanDisplayEffectText = (value) => clean(value)
  .replace(/\s*[（(][^()（）]*<stat:[^>]+>[^()（）]*[)）]\s*$/i, '')
  .trim()
const normalizeDisplayEffect = (row) => {
  const effect = normalizeRawEffect(row)
  const values = JSON.parse(row.values_json || '{}')
  const minimum = values['1'] ?? effect.min
  const maximum = values['2'] ?? values['1'] ?? effect.max
  return {
    ...effect,
    min: minimum == null ? null : number(minimum),
    max: maximum == null ? null : number(maximum),
    text: local(
      cleanDisplayEffectText(row.text_en),
      cleanDisplayEffectText(row.text_zh_cn),
      cleanDisplayEffectText(row.text_zh_tw),
    ),
    renderStatus: clean(row.render_status),
  }
}

const categoryFor = (category, subtype) => {
  if (category === 'weapon') return 'weapon'
  if (category === 'armor' || subtype === 'belt') return 'armor'
  if (category === 'pet_accessory') return 'pet'
  if (category === 'socketable') return 'socketable'
  return 'trinket'
}
const rarityFor = (row) => {
  const unit = clean(row.unit_type).toUpperCase()
  if (unit.includes('LEGENDARY')) return 'legendary'
  if (unit.includes('UNIQUE')) return 'unique'
  if (unit.includes('MAGIC')) return 'rare'
  return 'normal'
}

const equipment = itemRows.map((row) => {
  const attributes = attributeMap(row.id)
  const enrichment = enrichmentByName.get(clean(row.internal_name).toLowerCase())
  const fallbackRequirements = [
    ['str', attrNumber(attributes, 'STRENGTH_REQUIRED')],
    ['dex', attrNumber(attributes, 'DEXTERITY_REQUIRED')],
    ['foc', attrNumber(attributes, 'MAGIC_REQUIRED')],
    ['vit', attrNumber(attributes, 'DEFENSE_REQUIRED')],
  ].filter(([, value]) => value > 0).map(([stat, value]) => ({ stat, value }))
  const set = row.set_name ? local(
    row.set_display_name_en || row.set_name,
    row.set_display_name_zh_cn,
    row.set_display_name_zh_tw,
  ) : null
  const effects = (itemDisplayEffects.get(row.id) || []).map(normalizeDisplayEffect).filter((effect) => effect.type)
  const rawBonuses = (rawSetEffects.get(String(row.set_name || '').toLowerCase()) || []).map((bonus) => ({
    pieces: number(bonus.required_count),
    ...normalizeRawEffect(bonus),
  })).filter((effect) => effect.type)
  const baseDamageMin = attrNumber(attributes, 'MINDAMAGE', null)
  const baseDamageMax = attrNumber(attributes, 'MAXDAMAGE', null)
  const baseArmorMin = attrNumber(attributes, 'ARMORMIN', null)
  const baseArmorMax = attrNumber(attributes, 'ARMORMAX', null)
  return {
    id: clean(row.guid) || String(row.id),
    slug: `${slug(row.display_name_en)}-${String(row.id)}`,
    name: local(row.display_name_en, row.display_name_zh_cn, row.display_name_zh_tw),
    internalName: clean(row.internal_name),
    category: categoryFor(row.category, row.subtype),
    subtype: clean(row.subtype),
    unitType: clean(row.unit_type),
    rarity: rarityFor(row),
    level: number(row.level),
    requiredLevel: row.required_level ?? attrNumber(attributes, 'LEVEL_REQUIRED'),
    requirements: enrichment?.requirements || fallbackRequirements,
    sockets: number(row.sockets),
    maxSockets: enrichment?.maxSockets ?? attrNumber(attributes, 'MAX_SOCKETS', null),
    speed: enrichment?.speed ?? attrNumber(attributes, 'SPEED', null),
    blockChance: enrichment?.blockChance ?? attrNumber(attributes, 'BLOCK_CHANCE', null),
    minimumDropLevel: row.drop_min_level ?? enrichment?.minimumDropLevel ?? row.min_level,
    maximumDropLevel: row.drop_max_level != null
      ? (number(row.drop_max_level) >= 999 ? null : row.drop_max_level)
      : enrichment?.maximumDropLevel ?? (number(row.max_level) >= 999 ? null : row.max_level),
    classRequirement: enrichment?.classRequirement || clean(attributes.get('REQUIREMENT_CLASS')?.value_text) || null,
    set,
    description: row.description_en ? local(row.description_en, row.description_zh_cn, row.description_zh_tw) : null,
    iconPath: pathForWeb(row.icon_path),
    armor: enrichment?.armor || {},
    damage: enrichment?.damage || {},
    baseValues: {
      damage: baseDamageMin == null && baseDamageMax == null ? null : [baseDamageMin, baseDamageMax],
      armor: baseArmorMin == null && baseArmorMax == null ? null : [baseArmorMin, baseArmorMax],
    },
    effects,
    setBonuses: (enrichment?.setBonuses || []).map((bonus) => ({ pieces: bonus.pieces, text: local(bonus.text, null, null), value: bonus.value })),
    rawSetBonuses: rawBonuses,
    exactEnrichment: Boolean(enrichment),
    specialSource: enrichment?.specialSource || null,
    sourceFile: clean(row.source_path),
  }
}).filter((item) => item.rarity !== 'normal')

const skillTreeMap = {
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
}
const classGroup = { berserker: 'BERSERKER', outlander: 'WANDERER', embermage: 'ARBITER', engineer: 'RAILMAN' }
const skillCandidates = query(`
  SELECT s.*, sf.path AS source_path,
    (SELECT COUNT(*) FROM skill_levels sl WHERE sl.skill_id=s.id) AS level_count
  FROM skills s
  JOIN source_files sf ON sf.id=s.source_file_id
  WHERE s.skill_audience='player'
`)
const skillLevelsBySkill = groupBy(query(`
  SELECT sl.* FROM skill_levels sl
  JOIN skills s ON s.id=sl.skill_id
  WHERE s.skill_audience='player'
  ORDER BY sl.skill_id, sl.level, sl.node_path
`), (row) => row.skill_id)
const effectsBySkillLevel = groupBy(query(`
  SELECT sla.skill_level_id, sla.affix_name, ae.effect_name, ae.effect_type, ae.activation,
    ae.duration, ae.chance, ae.min_value, ae.max_value, ae.properties_json
  FROM skill_level_affixes sla
  JOIN skill_levels sl ON sl.id=sla.skill_level_id
  JOIN skills s ON s.id=sl.skill_id
  LEFT JOIN affix_effects ae ON ae.affix_id=sla.resolved_affix_id
  WHERE s.skill_audience='player'
  ORDER BY sla.skill_level_id, sla.ordinal, ae.ordinal
`), (row) => row.skill_level_id)
const localizedSkillProperties = groupBy(query(`
  SELECT n.source_file_id, p.name, p.value_text, p.chinese_simplified_text, p.chinese_traditional_text
  FROM properties p
  JOIN nodes n ON n.id=p.node_id
  WHERE p.name IN ('TIER1_DESCRIPTION','TIER2_DESCRIPTION','TIER3_DESCRIPTION','REQUIREMENT_DESCRIPTION')
`), (row) => row.source_file_id)

const chooseSkill = (title, expectedKind, group) => {
  const matches = skillCandidates.filter((row) => clean(row.display_name_en).toLowerCase() === title.toLowerCase() && row.skill_group === group)
  if (!matches.length) throw new Error(`Missing player skill: ${group}/${title}`)
  return matches.sort((a, b) => {
    const score = (row) => {
      const passiveMatch = expectedKind === 'passive' ? row.activation_type === 'PASSIVE' : row.activation_type !== 'PASSIVE' && row.activation_type !== 'PROC'
      return (passiveMatch ? 100 : 0)
        + (number(row.level_count) === 15 ? 30 : 0)
        + (row.base_description_en ? 20 : 0)
        + (row.icon_path ? 10 : 0)
        + (String(row.internal_name).toLowerCase().includes('old') ? -80 : 0)
        + (String(row.source_path).toLowerCase().includes('lefferts') ? -80 : 0)
    }
    return score(b) - score(a)
  })[0]
}

const metricKeys = new Map([
  ['WEAPONDAMAGEPCT', 'weaponDamagePct'],
  ['CHARGESCALEPCT', 'chargeScalePct'],
  ['DURATIONOVERRIDEMS', 'durationMs'],
  ['MAX_UNITS_HIT', 'maxTargets'],
  ['CLONECOUNT', 'projectiles'],
])
const collectMetrics = (node) => {
  const values = []
  const visit = (current) => {
    for (const property of current?.properties || []) {
      const kind = metricKeys.get(property.name)
      if (kind && Number.isFinite(Number(property.value))) values.push({ kind, value: Number(property.value) })
    }
    for (const child of current?.children || []) visit(child)
  }
  visit(node)
  return [...new Map(values.map((metric) => [`${metric.kind}:${metric.value}`, metric])).values()]
}
const skillLevel = (row) => {
  const effects = (effectsBySkillLevel.get(row.id) || []).filter((effect) => effect.effect_type).map(normalizeRawEffect)
  return {
    rank: number(row.level),
    metrics: collectMetrics(JSON.parse(row.node_json || '{}')),
    effects: [...new Map(effects.map((effect) => [JSON.stringify(effect), effect])).values()],
  }
}
const sourceProperty = (sourceFileId, name) => {
  const row = (localizedSkillProperties.get(sourceFileId) || []).find((property) => property.name === name)
  return row ? local(row.value_text, row.chinese_simplified_text, row.chinese_traditional_text) : null
}

const classSkills = Object.entries(skillTreeMap).map(([classId, trees]) => ({
  classId,
  trees: Object.entries(trees).map(([treeId, titles]) => ({
    treeId,
    skills: titles.map((title, index) => {
      const kind = index >= 7 ? 'passive' : 'active'
      const row = chooseSkill(title, kind, classGroup[classId])
      const properties = JSON.parse(row.properties_json || '{}')
      const ranks = (skillLevelsBySkill.get(row.id) || []).map(skillLevel)
      const tiers = ['TIER1_DESCRIPTION','TIER2_DESCRIPTION','TIER3_DESCRIPTION']
        .map((name, tierIndex) => ({ rank: [5, 10, 15][tierIndex], text: sourceProperty(row.source_file_id, name) }))
        .filter((tier) => tier.text)
      return {
        id: String(row.id),
        slug: slug(row.display_name_en),
        name: local(row.display_name_en, row.display_name_zh_cn, row.display_name_zh_tw),
        description: local(row.base_description_en, row.base_description_zh_cn, row.base_description_zh_tw),
        requirement: sourceProperty(row.source_file_id, 'REQUIREMENT_DESCRIPTION'),
        level: kind === 'passive' ? [1, 7, 14][index - 7] : [1, 7, 14, 21, 28, 35, 42][index],
        kind,
        maxRank: Math.max(number(row.max_invest_level), ...ranks.map((rank) => rank.rank), 1),
        iconPath: pathForWeb(row.icon_path),
        cooldownMs: properties.COOLDOWNMS?.value ?? null,
        range: properties.RANGE?.value ?? null,
        tiers,
        ranks,
      }
    }),
  })),
}))

const stripRank = (value) => clean(value).replace(/\s+(?:I|II|III|IV|V|VI|[1-6])$/i, '').trim()
const stripLocalizedRank = (value) => clean(value).replace(/\s*(?:III|VI|II|IV|I|V|[1-6])$/, '').trim()
const stripBookPrefix = (value) => clean(value).replace(/^(?:Tome|Spell|秘籍|秘笈|法术|法術)\s*[:：]\s*/i, '')
const spellBookRowsByGuid = new Map(query(`
  SELECT books.*, files.path AS source_path
  FROM skill_books books
  JOIN source_files files ON files.id=books.source_file_id
`).map((row) => [clean(row.guid), row]))
const spellBooks = spellBookSource.map((spell) => {
  const row = spellBookRowsByGuid.get(clean(spell.id))
  if (!row) throw new Error(`Missing normalized skill book ${spell.id}: ${spell.name}`)
  const localizedFamily = local(
    stripRank(spell.family),
    stripLocalizedRank(stripBookPrefix(row.display_name_zh_cn)),
    stripLocalizedRank(stripBookPrefix(row.display_name_zh_tw)),
  )
  return {
    ...spell,
    name: local(row.display_name_en, row.display_name_zh_cn, row.display_name_zh_tw),
    family: localizedFamily,
    level: number(row.item_level),
    requiredLevel: number(row.required_level),
    description: local(row.description_en, row.description_zh_cn, row.description_zh_tw),
    iconPath: pathForWeb(row.icon_path),
    sourceFile: clean(row.source_path),
  }
})

const phaseZones = {
  ACT1Z1: { id: 'temple-steppes', act: 1, region: local('The Temple Steppes', '神庙草原', '神廟草原') },
  ACT1Z2: { id: 'frosted-hills', act: 1, region: local('The Frosted Hills', '霜冻山丘', '霜凍山丘') },
  ACT2Z1: { id: 'ossean-wastes', act: 2, region: local('The Ossean Wastes', '奥辛荒原', '奧辛荒原') },
  ACT2Z2: { id: 'salt-barrens', act: 2, region: local('The Salt Barrens', '盐碱荒地', '鹽鹼荒地') },
  ACT3Z1: { id: 'blightbogs', act: 3, region: local('The Blightbogs', '疫病沼泽', '疫病沼澤') },
  ACT3Z2: { id: 'sundered-battlefield', act: 3, region: local('Sundered Battlefield', '破碎战场', '破碎戰場') },
}
const phaseRows = query(`
  SELECT layouts.internal_name, layouts.act_zone,
    instructions.instruction_en, instructions.instruction_zh_cn, instructions.instruction_zh_tw
  FROM phase_beast_room_layouts layouts
  JOIN phase_beast_room_instructions instructions ON instructions.room_layout_id=layouts.id
  ORDER BY layouts.act_zone, layouts.source_path, instructions.ordinal
`)
const phaseBeasts = Object.entries(phaseZones).map(([zone, info]) => ({
  ...info,
  challenges: phaseRows.filter((row) => row.act_zone === zone).map((row) => ({
    id: clean(row.internal_name).toLowerCase(),
    name: local(row.instruction_en, row.instruction_zh_cn, row.instruction_zh_tw),
  })),
}))

mkdirSync(outputDir, { recursive: true })
mkdirSync(iconOutputDir, { recursive: true })
cpSync(resolve(dataRoot, 'images/items'), resolve(iconOutputDir, 'items'), { recursive: true, force: true })
cpSync(resolve(dataRoot, 'images/skills'), resolve(iconOutputDir, 'skills'), { recursive: true, force: true })
const write = (name, data) => writeFileSync(resolve(outputDir, name), `${JSON.stringify(data)}\n`)
write('equipment.json', equipment)
write('spell-books.json', spellBooks)
write('class-skills.json', classSkills)
write('phase-beasts.json', phaseBeasts)

const selectedSkills = classSkills.flatMap((group) => group.trees.flatMap((tree) => tree.skills))
const meta = {
  generatedAt: new Date().toISOString(),
  sourceDatabase: 'tl2-wiki-data/database/tl2.sqlite',
  languages: ['en', 'zh-CN', 'zh-TW'],
  counts: {
    equipment: equipment.length,
    enrichedEquipment: equipment.filter((item) => item.exactEnrichment).length,
    itemEffects: equipment.reduce((sum, item) => sum + item.effects.length, 0),
    spellBooks: spellBooks.length,
    localizedSpellBooks: spellBooks.filter((spell) => spell.name.zhCN !== spell.name.en || spell.name.zhTW !== spell.name.en).length,
    classSkills: selectedSkills.length,
    skillRanks: selectedSkills.reduce((sum, skill) => sum + skill.ranks.length, 0),
    phaseChallenges: phaseRows.length,
    icons: query('SELECT COUNT(*) AS count FROM icons')[0].count,
  },
  gaps: {
    equipmentWithoutDescription: equipment.filter((item) => !item.description).length,
    equipmentEffectsWithoutOfficialChinese: equipment.reduce((sum, item) => {
      return sum + item.effects.filter((effect) => effect.text.zhCN === effect.text.en).length
    }, 0),
    spellBookNamesWithoutOfficialChinese: spellBooks.filter((spell) => spell.name.zhCN === spell.name.en).length,
    spellBooksWithoutOfficialChineseDescription: spellBooks.filter((spell) => spell.description.zhCN === spell.description.en).length,
    phaseRoomsWithoutInstruction: query(`
      SELECT COUNT(*) AS count FROM phase_beast_room_layouts layouts
      LEFT JOIN phase_beast_room_instructions instructions ON instructions.room_layout_id=layouts.id
      WHERE instructions.id IS NULL
    `)[0].count,
  },
}
write('meta.json', meta)

console.log(`Normalized ${equipment.length} equipment rows, ${spellBooks.length} spell books, ${selectedSkills.length} class skills (${meta.counts.skillRanks} rank records), and ${phaseRows.length} Phase Beast challenges`)
sqlite.close()
