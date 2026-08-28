import type { ClassData, LocalText, PhaseBeast } from './types'

const t = (en: string, zh: string): LocalText => ({ en, zh })

// Chinese class and tree names, plus class descriptions, are taken from the
// Simplified Chinese strings shipped with the official game data.
export const classes: ClassData[] = [
  {
    id: 'berserker', name: t('Berserker', '狂战士'), accent: '#c9564c', monogram: 'BZ',
    description: t('Brutal and swift, Berserkers call upon powerful beast magic to augment their deadly combat skills.', '原始而又迅速，狂战士可以通过召唤强大的野兽魔法来强化他们本已十分致命的战技。'),
    trees: [
      { id: 'hunter', name: t('Hunter', '猎人'), skills: [] },
      { id: 'tundra', name: t('Tundra', '雪原'), skills: [] },
      { id: 'shadow', name: t('Shadow', '影子'), skills: [] },
    ],
  },
  {
    id: 'outlander', name: t('Outlander', '塞外客'), accent: '#39875c', monogram: 'OL',
    description: t('Versed in arcane arts and ancient pacts, Outlanders wield guns and magic with equal skill.', '塞外客对与奥术以及古代契约都十分精通，他们可以熟练的同时使用枪械和魔法。'),
    trees: [
      { id: 'warfare', name: t('Warfare', '战争'), skills: [] },
      { id: 'lore', name: t('Lore', '学识'), skills: [] },
      { id: 'sigil', name: t('Sigil', '印记'), skills: [] },
    ],
  },
  {
    id: 'embermage', name: t('Embermage', '烬石法师'), accent: '#397da9', monogram: 'EM',
    description: t('Trained in the arcane arts, Embermages employ a variety of elemental spells to deadly effect.', '烬石法师长年受过严格的法术训练，他们可以通过施展众多的元素魔法来制造十分致命的效果。'),
    trees: [
      { id: 'inferno', name: t('Inferno', '炼狱'), skills: [] },
      { id: 'frost', name: t('Frost', '寒霜'), skills: [] },
      { id: 'storm', name: t('Storm', '风暴'), skills: [] },
    ],
  },
  {
    id: 'engineer', name: t('Engineer', '工程师'), accent: '#a47616', monogram: 'EN',
    description: t('Equipped with Ember-powered weapons and armor, Engineers keep the frontier in working order.', '工程师全身武装着烬石驱动的武器的装甲，他们可以维持前线的秩序。'),
    trees: [
      { id: 'blitz', name: t('Blitz', '闪电战'), skills: [] },
      { id: 'construction', name: t('Construction', '建设工程'), skills: [] },
      { id: 'aegis', name: t('Aegis', '神盾'), skills: [] },
    ],
  },
]

const challenge = (en: string, zh: string, detailEn: string, detailZh: string, rewardEn: string, rewardZh: string) => ({
  name: t(en, zh), detail: t(detailEn, detailZh), reward: t(rewardEn, rewardZh),
})

export const phaseBeasts: PhaseBeast[] = [
  { id: 'temple-steppes', region: t('The Temple Steppes', '神庙草原'), act: 1, challenges: [
    challenge('Poison the spider nests.', '往蜘蛛窝里下毒', 'Carry poison from the central basin to six nests, then defeat the remaining spiders.', '从中央水池取毒，依次关闭六个蜘蛛巢，再清理剩余敌人。', 'Completion chests', '完成后出现奖励宝箱'),
    challenge('Navigate the Maze', '穿过迷宫', 'Reach the finish with haste. Enemies in this challenge grant no experience.', '尽快找到通往终点的路线；此挑战内的敌人不提供经验。', 'Chests found along the route', '沿途及终点宝箱'),
  ]},
  { id: 'frosted-hills', region: t('The Frosted Hills', '霜冻山丘'), act: 1, challenges: [
    challenge('Ignite Braziers in Order', '按顺序点燃火盆', 'Discover the changing sequence and light all four braziers.', '尝试找出本次的正确顺序，并点燃四座火盆。', 'Gold and completion loot', '金币与完成奖励'),
    challenge('Protect the Crystals From the Goblin Hordes!', '保护水晶，不要被地精破坏', 'Defend four crystals from waves of goblins.', '抵御成群地精，尽量保住四颗水晶。', 'One small chest, plus one blue chest for each crystal saved', '一个小宝箱；每保住一颗水晶再获得一个蓝色宝箱'),
  ]},
  { id: 'ossean-wastes', region: t('The Ossean Wastes', '奥辛荒原'), act: 2, challenges: [
    challenge('Choose a Door', '选择一扇门', 'Open one of three doors; the result may be a fight or a reward.', '从三扇门中选择一扇，门后可能是战斗，也可能直接获得奖励。', 'Depends on the selected door', '奖励取决于所选的门'),
    challenge('Jackalbeast Gauntlet', 'Jackalbeast Gauntlet', 'Fight through packs of Jackalbeasts in a winding canyon.', '在曲折峡谷中连续迎战成群的豺狼人。', 'Completion chests', '完成后出现奖励宝箱'),
    challenge('Defeat the Tars', 'Defeat the Tars', 'Defeat three large Tars that split into smaller slimes and regenerate.', '击败三只会分裂小怪并恢复生命的大型焦油怪。', 'Three blue chests', '三个蓝色宝箱'),
  ]},
  { id: 'salt-barrens', region: t('The Salt Barrens', '盐碱荒地'), act: 2, challenges: [
    challenge('Netherrealm Gauntlet', 'Netherrealm Gauntlet', 'Advance while avoiding moving deadly discs.', '避开移动的致命圆盘并推进至终点。', 'Completion chests', '完成后出现奖励宝箱'),
    challenge('Pirate Gauntlet', 'Pirate Gauntlet', 'Fight undead pirates through a ship graveyard.', '穿过沉船墓地，击败沿途的不死海盗。', 'Gold and chests along the route', '沿途金币与宝箱'),
    challenge('Survive in the Arena', '在竞技场里活下去', 'Survive waves of Jackalbeasts and Tu\'tara.', '在竞技场中抵挡多波豺狼人和图塔拉敌人。', 'Completion chests', '完成后出现奖励宝箱'),
    challenge('Dig for Buried Treasure', '挖掘埋藏的财宝', 'Collect shovels and use the available digs to search for buried treasure.', '收集铲子，在有限的挖掘次数内寻找埋藏的宝物。', 'Buried treasure', '挖出的随机宝物'),
  ]},
  { id: 'blightbogs', region: t('The Blightbogs', '疫病沼泽'), act: 3, challenges: [
    challenge('Defeat the Witches', '击败女巫', 'Defeat two witches on a small swamp island while avoiding fire.', '在沼泽小岛上躲避火焰，并击败两名女巫。', 'Completion chest', '完成后出现奖励宝箱'),
    challenge('Defeat the Troll', '击败巨魔', 'Defeat a troll on the same fire-swept island arena.', '在持续受到火焰威胁的小岛上击败巨魔。', 'Completion chest', '完成后出现奖励宝箱'),
  ]},
  { id: 'sundered-battlefield', region: t('Sundered Battlefield', '破碎战场'), act: 3, challenges: [
    challenge('Avoid the Lava', '避开岩浆', 'Move between metal platforms as the lava rises and falls.', '观察岩浆涨落，在金属平台之间移动并开启宝箱。', 'Many chests across the platforms', '平台上分布的大量宝箱'),
    challenge('Varkolyn Gauntlet', 'Varkolyn Gauntlet', 'Fight through a Varkolyn settlement and mine.', '一路攻入瓦科林聚落与矿区。', 'Chests along the route and at the finish', '沿途及终点宝箱'),
  ]},
]

export const statInfo = [
  { key: 'str' as const, name: t('Strength', '力量'), effects: [
    t('Each point adds 0.5% weapon damage.', '每点力量增加 0.5% 武器伤害。'),
    t('Each point adds 0.4% critical-hit damage. Critical hits start at 150% of normal damage.', '每点力量增加 0.4% 暴击伤害；暴击默认造成普通伤害的 150%。'),
  ]},
  { key: 'dex' as const, name: t('Dexterity', '敏捷'), effects: [
    t('Raises both critical-hit chance and dodge chance.', '同时提高暴击几率和闪避几率。'),
    t('Both gains slow down as Dexterity rises; the contribution from Dexterity itself cannot exceed about 50% for either chance.', '敏捷越高，继续投入带来的提升越小；它对两项几率各自提供的贡献上限约为 50%。'),
  ]},
  { key: 'foc' as const, name: t('Focus', '专注'), effects: [
    t('Each point adds 0.5 maximum Mana and 0.5% elemental damage.', '每点专注增加 0.5 点法力上限和 0.5% 元素伤害。'),
    t('It also strengthens flat skill damage, even when that damage is physical.', '固定数值的技能伤害也会受到专注加成，即使该技能造成物理伤害。'),
    t('Raises Execute chance, with smaller gains at higher values.', '提高处决几率；专注越高，继续投入的收益越小。'),
  ]},
  { key: 'vit' as const, name: t('Vitality', '体力'), effects: [
    t('Each point adds 3.6 maximum Health and increases total Armor by 0.25%.', '每点体力增加 3.6 点生命上限，并使总护甲提高 0.25%。'),
    t('When a shield is equipped, Vitality also raises block chance. The gain slows at higher values and its contribution is capped at about 50%.', '装备盾牌时，体力还会提高格挡几率；体力越高，继续投入的收益越小，其贡献上限约为 50%。'),
  ]},
]
