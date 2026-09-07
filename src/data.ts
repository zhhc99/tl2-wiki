import type { LocalText, StatKey } from './types'

const t = (en: string, zhCN: string, zhTW = en): LocalText => ({ en, zhCN, zhTW })

export const classPresentation: Record<string, { accent: string; monogram: string }> = {
  berserker: { accent: '#b95749', monogram: 'BZ' },
  outlander: { accent: '#347655', monogram: 'OL' },
  embermage: { accent: '#39779d', monogram: 'EM' },
  engineer: { accent: '#986b17', monogram: 'EN' },
}

export interface StatInfo {
  key: Exclude<StatKey, 'none'>
  name: LocalText
  effects: LocalText[]
}

export const statInfo: StatInfo[] = [
  {
    key: 'str',
    name: t('Strength', '力量', '力量'),
    effects: [
      t(
        'Each point of **Strength** adds **0.5% weapon damage**.',
        '每点**力量**增加 **0.5% 武器伤害**。',
        '每點**力量**增加 **0.5% 武器傷害**。',
      ),
      t(
        'Each point adds **0.4% critical-hit damage**[tooltip](Critical hits start at +50%.)[/tooltip].',
        '每点增加 **0.4% 暴击伤害**[tooltip](初始暴击伤害为 +50%。)[/tooltip]。',
        '每點增加 **0.4% 爆擊傷害**[tooltip](爆擊初始傷害加成為 +50%。)[/tooltip]。',
      ),
    ],
  },
  {
    key: 'dex',
    name: t('Dexterity', '敏捷', '敏捷'),
    effects: [
      t(
        'Each point of **Dexterity** adds about **0.2% critical-hit chance** and **0.2% dodge chance**.',
        '每点**敏捷**约增加 **0.2% 暴击几率**和 **0.2% 闪避几率**。',
        '每點**敏捷**約增加 **0.2% 爆擊機率**和 **0.2% 閃避機率**。',
      ),
      t(
        'Each additional point gives a smaller benefit[tooltip](The exact contribution to either chance is Dexterity × (0.2002 − 0.0002 × Dexterity)%, capped at 50%.)[/tooltip].',
        '投入越多，每点收益越低[tooltip](两项几率各自的准确加成为 敏捷 ×（0.2002 − 0.0002 × 敏捷）%，最多贡献 50%。)[/tooltip]。',
        '投入越多，每點收益越低[tooltip](兩項機率各自的實際加成為 敏捷 ×（0.2002 − 0.0002 × 敏捷）%，最多提供 50%。)[/tooltip]。',
      ),
    ],
  },
  {
    key: 'foc',
    name: t('Focus', '专注', '專注'),
    effects: [
      t(
        'Each point of **Focus** adds **0.5 maximum Mana**.',
        '每点**专注**增加 **0.5 点法力上限**。',
        '每點**專注**增加 **0.5 點法力上限**。',
      ),
      t(
        'Each point of **Focus** adds **0.5% elemental damage**[tooltip](This is not reflected in the elemental-damage value on the character panel.)[/tooltip] and **0.5% physical fixed damage**[tooltip](For example, physical DoT damage from weapons and the Outlander’s Shattering Glaive.)[/tooltip].',
        '每点**专注**增加 **0.5% 的元素伤害**[tooltip](不在属性面板的元素伤害上体现。)[/tooltip]和 **0.5% 的物理固伤**[tooltip](例如武器的物理 DoT 伤害、塞外客「破碎之刃」的伤害)[/tooltip]。',
        '每點**專注**增加 **0.5% 的元素傷害**[tooltip](不會顯示在屬性面板的元素傷害中。)[/tooltip]和 **0.5% 的物理固傷**[tooltip](例如武器的物理 DoT 傷害、異域行者「破碎之刃」的傷害)[/tooltip]。',
      ),
      t(
        'Each point of **Focus** adds **0.2% execute chance**[tooltip](The exact contribution is Focus × (0.2002 − 0.0002 × Focus)%, capped at 50%.)[/tooltip].',
        '每点**专注**增加 **0.2% 的处决（猛击）几率**[tooltip](准确加成为 专注 ×（0.2002 − 0.0002 × 专注）%，最多贡献 50%。)[/tooltip]。',
        '每點**專注**增加 **0.2% 的處決（猛擊）機率**[tooltip](實際加成為 專注 ×（0.2002 − 0.0002 × 專注）%，最多提供 50%。)[/tooltip]。',
      ),
    ],
  },
  {
    key: 'vit',
    name: t('Vitality', '体力', '體力'),
    effects: [
      t(
        'Each point of **Vitality** adds **3.6 maximum Health** and increases total Armor by **0.25%**.',
        '每点**体力**增加 **3.6 点生命上限**，并使总护甲提高 **0.25%**。',
        '每點**體力**增加 **3.6 點生命上限**，並使總護甲提高 **0.25%**。',
      ),
      t(
        'Each point of **Vitality** adds **0.2% block chance**[tooltip](The exact contribution is Vitality × (0.2002 − 0.0002 × Vitality)%, capped at 50%.)[/tooltip].',
        '每点**体力**增加 **0.2% 的格挡几率**[tooltip](准确加成为 体力 ×（0.2002 − 0.0002 × 体力）%，最多贡献 50%。)[/tooltip]。',
        '每點**體力**增加 **0.2% 的格擋機率**[tooltip](實際加成為 體力 ×（0.2002 − 0.0002 × 體力）%，最多提供 50%。)[/tooltip]。',
      ),
    ],
  },
]
