import type { Lang, LocalText } from './types'

export const pick = (value: LocalText, lang: Lang) => value[lang]

export const localeOptions: { code: Lang; label: string; htmlLang: string }[] = [
  { code: 'zh', label: '简体中文', htmlLang: 'zh-CN' },
  { code: 'en', label: 'English', htmlLang: 'en-US' },
]

const ui = {
  en: {
    navHome:'Home', navClasses:'Classes', navMechanics:'Mechanics', navItems:'Equipment', navSpells:'Spell Books', navPhases:'Phase Beasts',
    search:'Search TL2 Wiki…', classesTitle:'Classes', skillTrees:'Skill trees', active:'Active', passive:'Passive', unlocks:'Level',
    mechTitle:'Mechanics', triggerGuide:'Hits and effects', triggerIntro:'Start with the source of the damage. Basic attacks, weapon-DPS skills, flat skill damage, damage over time and minions each carry different effects.',
    event:'Damage source', canCrit:'Critical hit', canSteal:'Life / mana steal', canProc:'Weapon effects', weaponHit:'Basic weapon attack', weaponSkill:'Skill using weapon DPS', flatSkill:'Flat skill damage', dot:'Damage over time', minion:'Minion or deployable', yes:'Yes', limited:'Depends on the skill', no:'No',
    itemsTitle:'Equipment', all:'All', weapon:'Weapons', armorCat:'Armor', trinket:'Trinkets', petGear:'Pet gear', socketable:'Socketables', allRarity:'All rarities', level:'Item level', required:'Requires level', sockets:'Sockets', itemsFound:'items',
    spellsTitle:'Spell books', offense:'Offense', defense:'Defense', summon:'Summon', utility:'Utility',
    phasesTitle:'Phase Beasts', act:'Act', reward:'Reward', allActs:'All acts',
    noResults:'No matching results.', close:'Close',
  },
  zh: {
    navHome:'首页', navClasses:'职业', navMechanics:'机制', navItems:'装备', navSpells:'技能书', navPhases:'相位兽',
    search:'搜索 TL2 Wiki…', classesTitle:'职业', skillTrees:'技能树', active:'主动', passive:'被动', unlocks:'解锁等级',
    mechTitle:'游戏机制', triggerGuide:'命中与效果', triggerIntro:'先看伤害来自哪里。普通武器攻击、带武器伤害的技能、固定技能伤害、持续伤害和召唤物，能够携带的效果各不相同。',
    event:'伤害来源', canCrit:'暴击', canSteal:'生命 / 法力吸取', canProc:'武器效果', weaponHit:'普通武器攻击', weaponSkill:'使用武器 DPS 的技能', flatSkill:'固定技能伤害', dot:'持续伤害', minion:'召唤物或部署物', yes:'可以', limited:'取决于技能', no:'不可以',
    itemsTitle:'装备', all:'全部', weapon:'武器', armorCat:'护甲', trinket:'饰品', petGear:'宠物装备', socketable:'镶嵌物', allRarity:'全部稀有度', level:'装备等级', required:'需求等级', sockets:'孔数', itemsFound:'件装备',
    spellsTitle:'技能书', offense:'攻击', defense:'防御', summon:'召唤', utility:'辅助',
    phasesTitle:'相位兽', act:'第', reward:'奖励', allActs:'全部幕',
    noResults:'没有匹配内容。', close:'关闭',
  },
} as const

export type UIKey = keyof typeof ui.en
export const tr = (lang: Lang, key: UIKey): string => ui[lang][key]
