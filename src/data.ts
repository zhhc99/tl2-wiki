import type { ClassData, LocalText, StatKey } from './types'

const t = (en: string, zhCN: string, zhTW = en): LocalText => ({ en, zhCN, zhTW })

export const classes: ClassData[] = [
  {
    id: 'berserker', name: t('Berserker', '狂战士', '狂戰士'), accent: '#b95749', monogram: 'BZ',
    description: t('Brutal and swift, Berserkers call upon powerful beast magic to augment their deadly combat skills.', '原始而又迅速，狂战士可以通过召唤强大的野兽魔法来强化他们本已十分致命的战技。'),
    trees: [
      { id: 'hunter', name: t('Hunter', '猎人', '獵人') },
      { id: 'tundra', name: t('Tundra', '雪原', '雪原') },
      { id: 'shadow', name: t('Shadow', '影子', '影子') },
    ],
  },
  {
    id: 'outlander', name: t('Outlander', '塞外客', '異域行者'), accent: '#347655', monogram: 'OL',
    description: t('Versed in arcane arts and ancient pacts, Outlanders wield guns and magic with equal skill.', '塞外客对与奥术以及古代契约都十分精通，他们可以熟练的同时使用枪械和魔法。'),
    trees: [
      { id: 'warfare', name: t('Warfare', '战争', '戰爭') },
      { id: 'lore', name: t('Lore', '学识', '學識') },
      { id: 'sigil', name: t('Sigil', '印记', '印記') },
    ],
  },
  {
    id: 'embermage', name: t('Embermage', '烬石法师', '燼法師'), accent: '#39779d', monogram: 'EM',
    description: t('Trained in the arcane arts, Embermages employ a variety of elemental spells to deadly effect.', '烬石法师长年受过严格的法术训练，他们可以通过施展众多的元素魔法来制造十分致命的效果。'),
    trees: [
      { id: 'inferno', name: t('Inferno', '炼狱', '煉獄') },
      { id: 'frost', name: t('Frost', '寒霜', '寒霜') },
      { id: 'storm', name: t('Storm', '风暴', '風暴') },
    ],
  },
  {
    id: 'engineer', name: t('Engineer', '工程师', '工程師'), accent: '#986b17', monogram: 'EN',
    description: t('Equipped with Ember-powered weapons and armor, Engineers keep the frontier in working order.', '工程师全身武装着烬石驱动的武器的装甲，他们可以维持前线的秩序。'),
    trees: [
      { id: 'blitz', name: t('Blitz', '闪电战', '閃電戰') },
      { id: 'construction', name: t('Construction', '建设工程', '建設工程') },
      { id: 'aegis', name: t('Aegis', '神盾', '神盾') },
    ],
  },
]

export interface StatInfo {
  key: Exclude<StatKey, 'none'>
  name: LocalText
  effects: LocalText[]
}

export const statInfo: StatInfo[] = [
  { key: 'str', name: t('Strength', '力量', '力量'), effects: [
    t('Each point of **Strength** adds **0.5% weapon damage**.', '每点**力量**增加 **0.5% 武器伤害**。', '每點**力量**增加 **0.5% 武器傷害**。'),
    t('Each point also adds **0.4% critical-hit damage**. Critical hits start at 150% of normal damage.', '每点还增加 **0.4% 暴击伤害**；暴击默认造成普通伤害的 150%。', '每點還增加 **0.4% 爆擊傷害**；爆擊預設造成普通傷害的 150%。'),
  ]},
  { key: 'dex', name: t('Dexterity', '敏捷', '敏捷'), effects: [
    t('Each point of **Dexterity** adds about **0.2 percentage points of critical-hit chance** and **0.2 percentage points of dodge chance** at low values.', '每点**敏捷**约提高 **0.2 个百分点的暴击几率**和 **0.2 个百分点的闪避几率**。', '每點**敏捷**約提高 **0.2 個百分點的爆擊機率**和 **0.2 個百分點的閃避機率**。'),
    t('For either chance, the exact contribution is **Dexterity × (0.2002 − 0.0002 × Dexterity)%**. Each new point is worth less than the previous one, and the contribution from Dexterity is capped at **50%**.', '两项几率各自的准确加成为 **敏捷 ×（0.2002 − 0.0002 × 敏捷）%**。投入越多，每点收益越低；敏捷对每项几率最多贡献 **50%**。', '兩項機率各自的準確加成為 **敏捷 ×（0.2002 − 0.0002 × 敏捷）%**。投入越多，每點收益越低；敏捷對每項機率最多貢獻 **50%**。'),
  ]},
  { key: 'foc', name: t('Focus', '专注', '專注'), effects: [
    t('Each point of **Focus** adds **0.5 maximum Mana** and **0.5% elemental damage**.', '每点**专注**增加 **0.5 点法力上限**和 **0.5% 元素伤害**。', '每點**專注**增加 **0.5 點法力上限**和 **0.5% 元素傷害**。'),
    t('Focus also increases the displayed damage of skills that use a fixed damage value, including fixed physical damage.', '使用固定伤害数值的技能也会随专注提高伤害，其中包括固定物理伤害。', '使用固定傷害數值的技能也會隨專注提高傷害，其中包括固定物理傷害。'),
    t('Execute chance uses the same diminishing curve: **Focus × (0.2002 − 0.0002 × Focus)%**, capped at **50%** from Focus.', '处决几率使用同样的递减曲线：**专注 ×（0.2002 − 0.0002 × 专注）%**；专注最多贡献 **50%**。', '處決機率使用同樣的遞減曲線：**專注 ×（0.2002 − 0.0002 × 專注）%**；專注最多貢獻 **50%**。'),
  ]},
  { key: 'vit', name: t('Vitality', '体力', '體力'), effects: [
    t('Each point of **Vitality** adds **3.6 maximum Health** and increases total Armor by **0.25%**.', '每点**体力**增加 **3.6 点生命上限**，并使总护甲提高 **0.25%**。', '每點**體力**增加 **3.6 點生命上限**，並使總護甲提高 **0.25%**。'),
    t('With a shield equipped, each point initially adds about **0.2 percentage points of block chance**. The exact contribution is **Vitality × (0.2002 − 0.0002 × Vitality)%**, with diminishing returns and a **50%** cap from Vitality.', '装备盾牌时，每点**体力**起初约提高 **0.2 个百分点的格挡几率**。准确加成为 **体力 ×（0.2002 − 0.0002 × 体力）%**；投入越多，每点收益越低，体力最多贡献 **50% 格挡几率**。', '裝備盾牌時，每點**體力**起初約提高 **0.2 個百分點的格擋機率**。準確加成為 **體力 ×（0.2002 − 0.0002 × 體力）%**；投入越多，每點收益越低，體力最多貢獻 **50% 格擋機率**。'),
  ]},
]
