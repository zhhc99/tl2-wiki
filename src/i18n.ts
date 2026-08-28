import type { Lang, LocalText } from './types'

export const pick = (value: LocalText, lang: Lang) => value[lang]

// The selector is registry-driven rather than a binary toggle. Add a locale here
// after supplying its UI dictionary and content fallbacks.
export const localeOptions: { code: Lang; label: string; htmlLang: string }[] = [
  { code: 'zh', label: '简体中文', htmlLang: 'zh-CN' },
  { code: 'en', label: 'English', htmlLang: 'en-US' },
]

const ui = {
  en: {
    navHome:'Home',navClasses:'Classes',navMechanics:'Mechanics',navItems:'Equipment',navSpells:'Spell Books',navPhases:'Phase Beasts',
    archive:'TL2 WIKI',subtitle:'Torchlight II reference',search:'Search TL2 Wiki…',language:'Language',
    heroEyebrow:'FIELD ARCHIVE · EST. 2012',heroTitleA:'Knowledge survives.',heroTitleB:'Heroes thrive.',heroText:'Precise mechanics, annotated skill trees and the spoils of Vilderan — indexed for your next expedition.',start:'Explore classes',mechanics:'Read mechanics',
    classCount:'Classes',skillCount:'Annotated skills',itemCount:'Archive items',phaseCount:'Phase trails',
    featured:'Choose your path',featuredSub:'Four disciplines. Twelve distinct skill trees.',openClass:'Open dossier',
    fieldNotes:'Field notes',noteTitle:'Weapon hit or spell hit?',noteText:'It changes everything. Steal and most weapon procs require an eligible weapon-DPS hit. Every skill in this archive declares its behavior.',readTrigger:'Read trigger guide',
    classesTitle:'Classes',classesSub:'Class mechanics, resources and complete skill trees.',recommended:'Recommended attributes',classMechanic:'Class mechanic',chooseClass:'Choose class',skillTrees:'Skill trees',active:'ACTIVE',passive:'PASSIVE',unlocks:'LEVEL',scalesWith:'SCALING',triggerLabel:'WEAPON EFFECTS',details:'MECHANICS',selectSkill:'Select a skill to inspect its trigger behavior.',
    triggerFull:'Full trigger',triggerPartial:'Partial trigger',triggerNone:'No trigger',triggerPassive:'Conditional',none:'None',
    mechTitle:'Mechanics',mechSub:'Attribute formulas and trigger rules.',attributes:'Core attributes',calculator:'Attribute calculator',points:'Points',result:'Calculated contribution',weaponDamage:'Weapon damage',critDamage:'Critical damage',critChance:'Crit chance',dodge:'Dodge',mana:'Mana',elemental:'Elemental damage',execute:'Execute',health:'Health',armor:'Armor bonus',block:'Block',
    triggerGuide:'Hit & trigger matrix',triggerIntro:'Do not judge by animation. The skill template and damage component decide what can trigger.',event:'Damage event',canCrit:'Can crit',canSteal:'Life / mana steal',canProc:'Weapon procs',weaponHit:'Basic weapon hit',weaponSkill:'% weapon-DPS skill',flatSkill:'Flat skill damage',dot:'Damage over time',minion:'Minion / deployable',yes:'Yes',limited:'Conditional',no:'No',
    formulaNote:'Community-tested formulas. Displayed values are rounded; equipment and skills are applied separately and remain subject to game caps.',
    itemsTitle:'Equipment',itemsSub:'Search and filter equipment data.',all:'All',weapon:'Weapons',armorCat:'Armor',trinket:'Trinkets',petGear:'Pet gear',socketable:'Socketables',allRarity:'All rarities',unique:'Unique',legendary:'Legendary',set:'Set',rare:'Rare',level:'Item level',required:'Requires level',sockets:'Sockets',affixes:'Affixes',source:'Source',itemsFound:'items found',noItems:'No items match these filters.',ngVersion:'Game cycle',
    spellsTitle:'Spell books',spellsSub:'Equippable spells for heroes and pets.',offense:'Offense',defense:'Defense',summon:'Summon',utility:'Utility',tiers:'tiers',cooldown:'Cooldown',usageNote:'NOTE',
    phasesTitle:'Phase Beasts',phasesSub:'Locations and challenge pools by overworld area.',act:'ACT',region:'Region',environment:'Environment',challenge:'Challenge',reward:'Reward',mapView:'MAP',allActs:'All acts',
    footerText:'Built for adventurers. Mechanics are version-sensitive; verify modded games separately.',dataNote:'Game data & methodology',backTop:'Back to top',
    searchResults:'Search results',noResults:'No matching results.',resultClass:'Class',resultSkill:'Skill',resultItem:'Item',resultSpell:'Spell',resultPhase:'Phase Beast',close:'Close',
  },
  zh: {
    navHome:'首页',navClasses:'角色',navMechanics:'机制',navItems:'装备',navSpells:'技能书',navPhases:'相位兽',
    archive:'TL2 WIKI',subtitle:'火炬之光 II 资料站',search:'搜索名称、类型或机制…',language:'语言',
    heroEyebrow:'维尔德兰实地档案 · 始于 2012',heroTitleA:'知识不灭，',heroTitleB:'英雄长存。',heroText:'精确机制、带触发标注的技能树，以及维尔德兰的珍奇战利品——为你的下一次远征编目。',start:'浏览角色',mechanics:'查看机制',
    classCount:'可选角色',skillCount:'标注技能',itemCount:'档案装备',phaseCount:'相位路线',
    featured:'选择你的道路',featuredSub:'四种职业，十二棵独特技能树。',openClass:'打开档案',
    fieldNotes:'战地札记',noteTitle:'武器命中，还是法术命中？',noteText:'这决定了一切。吸取与多数武器触发要求有效的武器 DPS 命中；本档案为每个技能标明具体行为。',readTrigger:'阅读触发指南',
    classesTitle:'角色',classesSub:'职业机制、资源与完整技能树。',recommended:'推荐属性',classMechanic:'职业机制',chooseClass:'选择角色',skillTrees:'技能树',active:'主动',passive:'被动',unlocks:'解锁等级',scalesWith:'加成属性',triggerLabel:'武器效果',details:'机制',selectSkill:'选择技能查看详情。',
    triggerFull:'完整触发',triggerPartial:'部分触发',triggerNone:'不可触发',triggerPassive:'条件触发',none:'无',
    mechTitle:'游戏机制',mechSub:'属性公式与触发规则。',attributes:'核心属性',calculator:'属性计算器',points:'点数',result:'计算结果',weaponDamage:'武器伤害',critDamage:'暴击伤害',critChance:'暴击几率',dodge:'闪避',mana:'法力',elemental:'元素伤害',execute:'处决',health:'生命',armor:'护甲加成',block:'格挡',
    triggerGuide:'命中与触发矩阵',triggerIntro:'不要只看技能动画；技能模板与具体伤害段才决定能否触发。',event:'伤害事件',canCrit:'可暴击',canSteal:'生命 / 法力吸取',canProc:'武器特效',weaponHit:'普通武器命中',weaponSkill:'武器 DPS 百分比技能',flatSkill:'固定技能伤害',dot:'持续伤害',minion:'召唤物 / 部署物',yes:'是',limited:'视模板而定',no:'否',
    formulaNote:'公式来自社区测试。显示值经过舍入；装备与技能加成另行计算，并仍受游戏上限约束。',
    itemsTitle:'装备',itemsSub:'搜索并筛选装备数据。',all:'全部',weapon:'武器',armorCat:'护甲',trinket:'饰品',petGear:'宠物装备',socketable:'镶嵌物',allRarity:'全部稀有度',unique:'独特',legendary:'传奇',set:'套装',rare:'稀有',level:'装备等级',required:'需求等级',sockets:'孔数',affixes:'词条',source:'来源',itemsFound:'件装备',noItems:'没有装备符合当前筛选。',ngVersion:'游戏周目',
    spellsTitle:'技能书',spellsSub:'英雄与宠物可装备的技能。',offense:'攻击',defense:'防御',summon:'召唤',utility:'辅助',tiers:'级',cooldown:'冷却',usageNote:'说明',
    phasesTitle:'相位兽',phasesSub:'按大地图整理位置和挑战池。',act:'第',region:'所在地图',environment:'环境',challenge:'挑战内容',reward:'主要奖励',mapView:'地图',allActs:'全部幕',
    footerText:'为远征者而建。机制可能受版本影响；模组游戏请另行验证。',dataNote:'数据与方法说明',backTop:'回到顶部',
    searchResults:'搜索结果',noResults:'没有匹配内容。',resultClass:'角色',resultSkill:'技能',resultItem:'装备',resultSpell:'技能书',resultPhase:'相位兽',close:'关闭',
  },
} as const

export type UIKey = keyof typeof ui.en
export const tr = (lang: Lang, key: UIKey): string => ui[lang][key]
