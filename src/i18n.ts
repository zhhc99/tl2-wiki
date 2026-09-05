import type { Lang, LocalText } from './types'

export const pick = (value: LocalText, lang: Lang) => lang === 'zh-CN' ? value.zhCN : lang === 'zh-TW' ? value.zhTW : value.en
export const isChinese = (lang: Lang) => lang !== 'en'
export const copy = (lang: Lang, zhCN: string, en: string, zhTW = zhCN) => lang === 'en' ? en : lang === 'zh-TW' ? zhTW : zhCN

export const localeOptions: { code: Lang; label: string; htmlLang: string }[] = [
  { code: 'zh-CN', label: '简体中文', htmlLang: 'zh-CN' },
  { code: 'zh-TW', label: '繁體中文', htmlLang: 'zh-TW' },
  { code: 'en', label: 'English', htmlLang: 'en-US' },
]

const en = {
  navHome:'Home', navClasses:'Classes', navMechanics:'Mechanics', navItems:'Equipment', navBuilds:'Build Planner', navGambling:'Gambling', navSpells:'Spell Books', navPhases:'Phase Beasts',
  search:'Search TL2 Wiki…', classesTitle:'Classes', skillTrees:'Skill trees', active:'Active', passive:'Passive', unlocks:'Unlock level',
  rank:'Rank', skillValues:'Rank values', tierBonuses:'Tier bonuses', requirement:'Requirement', cooldown:'Cooldown', range:'Range',
  weaponDamagePct:'Weapon damage', chargeScalePct:'Charge gained', manaCost:'Mana cost', manaPerSecond:'Mana per second', maxTargets:'Maximum targets', projectiles:'Projectiles', characterLevel:'Character level',
  effect:'Effect', value:'Value', perLevel:'× character level', seconds:'sec', noRankValues:'No separate numeric effect is defined for this rank.',
  mechTitle:'Mechanics', triggerGuide:'Hits and effects', triggerIntro:'Different kinds of damage can trigger different effects.',
  event:'Damage source', canCrit:'Critical hit', canSteal:'Life / mana steal', canProc:'Weapon effects', weaponHit:'Basic weapon attack', weaponSkill:'Skill using weapon DPS', flatSkill:'Fixed skill damage', dot:'Damage over time', minion:'Minion or deployable', yes:'Yes', limited:'Depends on the skill', no:'No',
  itemsTitle:'Equipment', all:'All', weapon:'Weapons', armorCat:'Armor', trinket:'Trinkets', petGear:'Pet gear', socketable:'Socketables', allRarity:'All rarities', level:'Item level', required:'Requires level', sockets:'Sockets', itemsFound:'items',
  spellsTitle:'Spell books', offense:'Offense', defense:'Defense', summon:'Summon', utility:'Utility',
  phasesTitle:'Phase Beasts', act:'Act', allActs:'All acts', objective:'Objective',
  noResults:'No matching results.', close:'Close', chooseLanguage:'Choose language', menu:'Menu', loading:'Loading data…',
}

const zhCN: typeof en = {
  navHome:'首页', navClasses:'职业', navMechanics:'机制', navItems:'装备', navBuilds:'配装', navGambling:'赌博', navSpells:'技能书', navPhases:'相位兽',
  search:'搜索 TL2 Wiki…', classesTitle:'职业', skillTrees:'技能树', active:'主动', passive:'被动', unlocks:'解锁等级',
  rank:'技能等级', skillValues:'本级数值', tierBonuses:'阶段奖励', requirement:'使用条件', cooldown:'冷却时间', range:'范围',
  weaponDamagePct:'武器伤害', chargeScalePct:'怒气获得', manaCost:'法力消耗', manaPerSecond:'每秒法力消耗', maxTargets:'最多目标', projectiles:'投射物数量', characterLevel:'角色等级',
  effect:'效果', value:'数值', perLevel:'× 角色等级', seconds:'秒', noRankValues:'这一等级没有单独定义的数值效果。',
  mechTitle:'游戏机制', triggerGuide:'命中与效果', triggerIntro:'不同伤害能触发的效果不同。',
  event:'伤害来源', canCrit:'暴击', canSteal:'生命 / 法力吸取', canProc:'武器效果', weaponHit:'普通武器攻击', weaponSkill:'使用武器 DPS 的技能', flatSkill:'固定技能伤害', dot:'持续伤害', minion:'召唤物或部署物', yes:'可以', limited:'取决于技能', no:'不可以',
  itemsTitle:'装备', all:'全部', weapon:'武器', armorCat:'护甲', trinket:'饰品', petGear:'宠物装备', socketable:'镶嵌物', allRarity:'全部稀有度', level:'装备等级', required:'需求等级', sockets:'孔数', itemsFound:'件装备',
  spellsTitle:'技能书', offense:'攻击', defense:'防御', summon:'召唤', utility:'辅助',
  phasesTitle:'相位兽', act:'第', allActs:'全部幕', objective:'挑战目标',
  noResults:'没有匹配内容。', close:'关闭', chooseLanguage:'选择语言', menu:'菜单', loading:'正在加载数据…',
}

const zhTW: typeof en = {
  navHome:'首頁', navClasses:'職業', navMechanics:'機制', navItems:'裝備', navBuilds:'配裝', navGambling:'賭博', navSpells:'技能書', navPhases:'相位獸',
  search:'搜尋 TL2 Wiki…', classesTitle:'職業', skillTrees:'技能樹', active:'主動', passive:'被動', unlocks:'解鎖等級',
  rank:'技能等級', skillValues:'此級數值', tierBonuses:'階段獎勵', requirement:'使用條件', cooldown:'冷卻時間', range:'範圍',
  weaponDamagePct:'武器傷害', chargeScalePct:'怒氣獲得', manaCost:'法力消耗', manaPerSecond:'每秒法力消耗', maxTargets:'最多目標', projectiles:'投射物數量', characterLevel:'角色等級',
  effect:'效果', value:'數值', perLevel:'× 角色等級', seconds:'秒', noRankValues:'此等級沒有個別定義的數值效果。',
  mechTitle:'遊戲機制', triggerGuide:'命中與效果', triggerIntro:'不同傷害能觸發的效果不同。',
  event:'傷害來源', canCrit:'爆擊', canSteal:'生命 / 法力吸取', canProc:'武器效果', weaponHit:'一般武器攻擊', weaponSkill:'使用武器 DPS 的技能', flatSkill:'固定技能傷害', dot:'持續傷害', minion:'召喚物或部署物', yes:'可以', limited:'依技能而定', no:'不可以',
  itemsTitle:'裝備', all:'全部', weapon:'武器', armorCat:'護甲', trinket:'飾品', petGear:'寵物裝備', socketable:'鑲嵌物', allRarity:'全部稀有度', level:'裝備等級', required:'需求等級', sockets:'孔數', itemsFound:'件裝備',
  spellsTitle:'技能書', offense:'攻擊', defense:'防禦', summon:'召喚', utility:'輔助',
  phasesTitle:'相位獸', act:'第', allActs:'全部章節', objective:'挑戰目標',
  noResults:'沒有符合的內容。', close:'關閉', chooseLanguage:'選擇語言', menu:'選單', loading:'正在載入資料…',
}

const ui = { en, 'zh-CN': zhCN, 'zh-TW': zhTW }
export type UIKey = keyof typeof en
export const tr = (lang: Lang, key: UIKey): string => ui[lang][key]
