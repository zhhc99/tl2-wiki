import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const projectDir = resolve(import.meta.dirname, '..')
const dbDir = resolve(projectDir, 'db')
const database = new DatabaseSync(resolve(dbDir, 'build/tl2.sqlite'), { readOnly: true })
const query = (sql) => database.prepare(sql).all()
const outputDir = resolve(projectDir, 'public/data')
const iconOutputDir = resolve(projectDir, 'public/game-icons')

const metadata = Object.fromEntries(
  query('SELECT key,value FROM metadata').map((row) => [row.key, row.value]),
)
if (metadata.schema_version !== '5')
  throw new Error(`Unsupported tl2-db schema: ${metadata.schema_version}`)

const clean = (value) => String(value ?? '').trim()
const local = (row, prefix) => ({
  en: clean(row[`${prefix}_en`]),
  zhCN: clean(row[`${prefix}_zh_cn`] || row[`${prefix}_en`]),
  zhTW: clean(row[`${prefix}_zh_tw`] || row[`${prefix}_en`]),
})
const iconPath = (path) => (path ? `game-icons/${path.replace(/^icons\//, '')}` : null)
const groupBy = (rows, key) => {
  const groups = new Map()
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) || []), row])
  return groups
}
const keyedRows = (sql, key) => groupBy(query(sql), (row) => row[key])
const rankKey = (row) => `${row.skill_id}:${row.rank}`
const finiteDropLevel = (value) => (value == null || value >= 999 ? null : value)

const equipmentClasses = new Map(
  query(`
  SELECT record_id,required_class FROM wiki_equipment_classes ORDER BY record_id,ordinal
`).map((row) => [row.record_id, row.required_class]),
)
const equipmentRequirements = keyedRows(
  `
  SELECT * FROM wiki_equipment_requirements ORDER BY record_id,ordinal
`,
  'record_id',
)
const equipmentDamage = keyedRows(
  `
  SELECT * FROM wiki_equipment_damage ORDER BY record_id,
    CASE damage_type WHEN 'physical' THEN 0 WHEN 'ice' THEN 1 WHEN 'fire' THEN 2
      WHEN 'electric' THEN 3 WHEN 'poison' THEN 4 ELSE 5 END
`,
  'record_id',
)
const equipmentArmor = keyedRows(
  `
  SELECT * FROM wiki_equipment_armor ORDER BY record_id,
    CASE damage_type WHEN 'physical' THEN 0 WHEN 'ice' THEN 1 WHEN 'fire' THEN 2
      WHEN 'electric' THEN 3 WHEN 'poison' THEN 4 ELSE 5 END
`,
  'record_id',
)
const equipmentEffects = keyedRows(
  `
  SELECT * FROM wiki_equipment_effects ORDER BY record_id,ordinal
`,
  'record_id',
)
const equipmentEffectUpgradeRows = query(`
  SELECT * FROM wiki_equipment_effect_upgrades ORDER BY record_id,effect_ordinal,ordinal
`)
const equipmentEffectUpgrades = groupBy(
  equipmentEffectUpgradeRows,
  (row) => `${row.record_id}:${row.effect_ordinal}`,
)
const effectTargets = groupBy(
  query(`
  SELECT * FROM wiki_equipment_effect_targets
  ORDER BY record_id,effect_ordinal,CASE target WHEN 'weapon' THEN 0 ELSE 1 END
`),
  (row) => `${row.record_id}:${row.effect_ordinal}`,
)
const sets = new Map(
  query('SELECT * FROM wiki_sets').map((row) => [clean(row.internal_name).toLowerCase(), row]),
)
const setEffects = keyedRows(
  `
  SELECT * FROM wiki_set_effects ORDER BY set_id,required_count,ordinal
`,
  'set_id',
)

const displayEffect = (row, targets = []) => ({
  type: clean(row.effect_type),
  name: clean(row.effect_name),
  activation: clean(row.activation),
  damageType: clean(row.damage_type),
  duration: row.duration,
  min: row.min_value,
  max: row.max_value,
  text: local(row, 'text'),
  ...(targets.length ? { socketTargets: targets } : {}),
})
const channels = (rows = []) =>
  Object.fromEntries(rows.map((row) => [row.damage_type, [row.min_value, row.max_value]]))
const category = (value) =>
  value === 'accessory' ? 'trinket' : value === 'pet_accessory' ? 'pet' : value

const equipmentRows = query(`
  SELECT * FROM wiki_equipment ORDER BY level DESC,name_en,record_id
`)
const equipment = equipmentRows.map((row) => {
  const set = row.set_name ? sets.get(clean(row.set_name).toLowerCase()) : null
  const effects = (equipmentEffects.get(row.record_id) || []).map((effect) => {
    const upgradeEffects = (
      equipmentEffectUpgrades.get(`${row.record_id}:${effect.ordinal}`) || []
    ).map((upgrade) => displayEffect(upgrade))
    return {
      ...displayEffect(
        effect,
        (effectTargets.get(`${row.record_id}:${effect.ordinal}`) || []).map(
          (target) => target.target,
        ),
      ),
      ...(upgradeEffects.length ? { upgradeEffects } : {}),
    }
  })
  return {
    id: row.record_id,
    familyId: row.family_id,
    name: local(row, 'name'),
    category: category(row.category),
    subtype: row.subtype,
    rarity: row.rarity,
    rarityValue: row.rarity_value,
    value: row.value,
    level: row.level,
    requiredLevel: row.required_level,
    requirements: (equipmentRequirements.get(row.record_id) || []).map((requirement) => ({
      stat: { strength: 'str', dexterity: 'dex', focus: 'foc', vitality: 'vit' }[requirement.stat],
      value: requirement.value,
    })),
    sockets: row.sockets ?? 0,
    speed: row.attack_interval,
    damagePerSecond:
      row.damage_per_second_min == null
        ? null
        : [row.damage_per_second_min, row.damage_per_second_max],
    blockChance: row.block_chance,
    minimumDropLevel: finiteDropLevel(row.drop_min_level),
    maximumDropLevel: finiteDropLevel(row.drop_max_level),
    classRequirement: equipmentClasses.get(row.record_id) || null,
    set: set ? local(set, 'name') : null,
    setInternalName: set?.internal_name || null,
    description: row.description_en ? local(row, 'description') : null,
    iconPath: iconPath(row.icon_path),
    armor: channels(equipmentArmor.get(row.record_id)),
    damage: channels(equipmentDamage.get(row.record_id)),
    effects,
    setBonuses: (setEffects.get(set?.set_id) || []).map((effect) => ({
      pieces: effect.required_count,
      ...displayEffect(effect),
    })),
    ngTier: row.ng_tier,
  }
})

const skillRanks = keyedRows('SELECT * FROM wiki_skill_ranks ORDER BY skill_id,rank', 'skill_id')
const skillMetrics = groupBy(
  query(`
  SELECT * FROM wiki_skill_rank_metrics ORDER BY skill_id,rank,ordinal
`),
  rankKey,
)
const skillEffects = groupBy(
  query(`
  SELECT * FROM wiki_skill_rank_effects ORDER BY skill_id,rank,ordinal
`),
  rankKey,
)
const skillTiers = keyedRows('SELECT * FROM wiki_skill_tiers ORDER BY skill_id,rank', 'skill_id')
const usedGraphs = new Set()
const classOrder = ['berserker', 'outlander', 'embermage', 'engineer']
const classRows = new Map(query('SELECT * FROM wiki_classes').map((row) => [row.class_id, row]))
const skillTreeRows = query('SELECT * FROM wiki_class_skill_trees ORDER BY class_id,tree_index')
const skillTrees = groupBy(skillTreeRows, (row) => row.class_id)
const classes = classOrder.map((id) => {
  const row = classRows.get(id)
  return {
    id,
    name: local(row, 'name'),
    description: local(row, 'description'),
    trees: (skillTrees.get(id) || []).map((tree) => ({
      id: tree.tree_id,
      index: tree.tree_index,
      name: local(tree, 'name'),
    })),
  }
})
const classSkills = query(`
  SELECT * FROM wiki_class_skills ORDER BY class_id,tree_index,position
`).map((skill) => ({
  id: String(skill.skill_id),
  classId: skill.class_id,
  treeId: skill.tree_id,
  position: skill.position,
  name: local(skill, 'name'),
  description: local(skill, 'description'),
  requirement: skill.requirement_en ? local(skill, 'requirement') : null,
  level: skill.unlock_level,
  kind: skill.kind,
  maxRank: skill.max_rank,
  iconPath: iconPath(skill.icon_path),
  tiers: (skillTiers.get(skill.skill_id) || []).map((tier) => ({
    rank: tier.rank,
    text: local(tier, 'text'),
  })),
  ranks: (skillRanks.get(skill.skill_id) || []).map((rank) => {
    const key = rankKey(rank)
    return {
      rank: rank.rank,
      requiredLevel: rank.required_level,
      description: rank.description_en ? local(rank, 'description') : null,
      metrics: (skillMetrics.get(key) || []).map((metric) => {
        if (metric.scaling_graph) usedGraphs.add(metric.scaling_graph)
        return {
          kind: metric.kind,
          value: metric.value,
          scalingGraph: metric.scaling_graph,
        }
      }),
      effects: (skillEffects.get(key) || []).map((effect) => {
        if (effect.scaling_graph) usedGraphs.add(effect.scaling_graph)
        return {
          type: clean(effect.effect_type),
          name: clean(effect.effect_name),
          activation: clean(effect.activation),
          damageType: clean(effect.damage_type),
          duration: effect.duration,
          min: effect.value1,
          max: effect.value2 ?? effect.value1,
          values: { 3: effect.value3, 4: effect.value4, 5: effect.value5 },
          template: local(effect, 'template'),
          displayName: effect.display_name_en ? local(effect, 'display_name') : null,
          precision: effect.precision,
          scalingGraph: effect.scaling_graph,
        }
      }),
    }
  }),
}))

const graphInfo = new Map(query('SELECT * FROM wiki_graphs').map((row) => [row.graph_name, row]))
const graphPoints = keyedRows(
  `
  SELECT * FROM wiki_graph_points ORDER BY graph_name,ordinal
`,
  'graph_name',
)
const skillGraphs = Object.fromEntries(
  [...usedGraphs].sort().map((name) => [
    name,
    {
      inferPastEnd: Boolean(graphInfo.get(name).infer_past_end),
      points: graphPoints.get(name).map((point) => [point.x, point.y]),
    },
  ]),
)

const spellBooks = query(`
  SELECT * FROM wiki_skill_books WHERE obtainable=1 ORDER BY family_en,tier,record_id
`).map((book) => ({
  id: book.record_id,
  name: local(book, 'name'),
  family: local(book, 'family'),
  tier: book.tier,
  level: book.item_level,
  requiredLevel: book.required_level,
  description: local(book, 'description'),
  iconPath: iconPath(book.icon_path),
}))

const phaseZones = {
  ACT1Z1: {
    id: 'temple-steppes',
    act: 1,
    region: { en: 'The Temple Steppes', zhCN: '神庙草原', zhTW: '神廟草原' },
  },
  ACT1Z2: {
    id: 'frosted-hills',
    act: 1,
    region: { en: 'The Frosted Hills', zhCN: '霜冻山丘', zhTW: '霜凍山丘' },
  },
  ACT2Z1: {
    id: 'ossean-wastes',
    act: 2,
    region: { en: 'The Ossean Wastes', zhCN: '奥辛荒原', zhTW: '奧辛荒原' },
  },
  ACT2Z2: {
    id: 'salt-barrens',
    act: 2,
    region: { en: 'The Salt Barrens', zhCN: '盐碱荒地', zhTW: '鹽鹼荒地' },
  },
  ACT3Z1: {
    id: 'blightbogs',
    act: 3,
    region: { en: 'The Blightbogs', zhCN: '疫病沼泽', zhTW: '疫病沼澤' },
  },
  ACT3Z2: {
    id: 'sundered-battlefield',
    act: 3,
    region: { en: 'Sundered Battlefield', zhCN: '破碎战场', zhTW: '破碎戰場' },
  },
}
const phaseRows = keyedRows(
  'SELECT * FROM wiki_phase_rooms ORDER BY act_zone,internal_name',
  'act_zone',
)
const phaseBeasts = Object.entries(phaseZones).map(([actZone, zone]) => {
  const rooms = phaseRows.get(actZone) || []
  return {
    ...zone,
    challenges: rooms
      .filter((room) => room.instruction_en)
      .map((room) => ({
        id: room.internal_name.toLowerCase(),
        name: local(room, 'instruction'),
      })),
    undocumented: rooms.filter((room) => !room.instruction_en).length,
  }
})

const meta = {
  version: 3,
  counts: {
    equipment: equipment.length,
    itemEffects: equipment.reduce((sum, item) => sum + item.effects.length, 0),
    itemEffectUpgrades: equipmentEffectUpgradeRows.length,
    spellBooks: spellBooks.length,
    classes: classes.length,
    skillTrees: classes.reduce((sum, hero) => sum + hero.trees.length, 0),
    classSkills: classSkills.length,
    skillRanks: classSkills.reduce((sum, skill) => sum + skill.ranks.length, 0),
    phaseRooms: phaseBeasts.reduce(
      (sum, zone) => sum + zone.challenges.length + zone.undocumented,
      0,
    ),
    phaseChallenges: phaseBeasts.reduce((sum, zone) => sum + zone.challenges.length, 0),
  },
}

mkdirSync(outputDir, { recursive: true })
rmSync(iconOutputDir, { recursive: true, force: true })
cpSync(resolve(dbDir, 'build/icons'), iconOutputDir, { recursive: true })
const write = (name, value) => writeFileSync(resolve(outputDir, name), `${JSON.stringify(value)}\n`)
write('equipment.json', equipment)
write('classes.json', classes)
write('class-skills.json', classSkills)
write('skill-graphs.json', skillGraphs)
write('spell-books.json', spellBooks)
write('phase-beasts.json', phaseBeasts)
write('meta.json', meta)
database.close()

console.log(
  `Imported ${classes.length} classes, ${meta.counts.skillTrees} skill trees, ${classSkills.length} class skills, ${spellBooks.length} obtainable skill books, and ${meta.counts.phaseRooms} Phase Beast rooms`,
)
