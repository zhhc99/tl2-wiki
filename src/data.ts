import type { ClassData, LocalText, PhaseBeast, Skill, StatKey, TriggerKey } from './types'

const t = (en: string, zh: string): LocalText => ({ en, zh })
const skill = (id: string, en: string, zh: string, level: number, kind: 'active' | 'passive', summaryEn: string, summaryZh: string, scaling: StatKey[], trigger: TriggerKey, mechEn: string, mechZh: string): Skill => ({
  id, name: t(en, zh), level, kind, summary: t(summaryEn, summaryZh), scaling, trigger, mechanism: t(mechEn, mechZh),
})

export const classes: ClassData[] = [
  {
    id: 'embermage', name: t('Embermage', '烬石法师'), epithet: t('The elemental savant', '元素的驾驭者'), role: t('Ranged caster · Control', '远程施法 · 控场'),
    description: t('A disciplined battlemage who bends fire, frost and storm through raw Focus.', '经受严苛训练的战斗法师，以专注驾驭烈焰、冰霜与风暴。'),
    resource: t('Charge Trance', '充能冥想'), resourceDetail: t('Damage builds Charge. A full bar grants 12 seconds of free casting and 25% bonus damage.', '造成伤害积累充能；满槽后进入 12 秒冥想，技能无消耗并获得 25% 伤害加成。'),
    accent: '#3e9bff', monogram: 'EM', recommended: ['foc', 'dex'],
    trees: [
      { id: 'inferno', name: t('Inferno', '炼狱'), description: t('Aggressive fire magic and burning zones.', '以火焰爆发和持续燃烧区域压制敌人。'), skills: [
        skill('magma-spear','Magma Spear','熔岩之矛',1,'active','Piercing fire projectile.','发射可穿透敌人的火焰投射物。',['foc'],'none','Flat spell damage: no weapon proc or steal. Focus scales the fire damage.','固定法术伤害：不触发武器特效或吸取；火焰伤害受专注加成。'),
        skill('magma-mace','Magma Mace','熔岩之锤',7,'active','A fiery mace strikes and stuns.','召唤熔岩巨锤打击并击晕。',['foc'],'none','Spell strike; cannot trigger on-hit weapon effects.','法术打击，不触发武器命中特效。'),
        skill('firebombs','Firebombs','火焰炸弹',14,'active','Scatter burning bombs over an area.','向区域散布持续燃烧的炸弹。',['foc'],'none','Damage over time does not leech. Each bomb uses spell critical chance.','持续伤害不触发吸取；每枚炸弹独立判定法术暴击。'),
        skill('blazing-pillar','Blazing Pillar','烈焰柱',21,'active','Summon roaming pillars of flame.','召唤会追踪敌人的烈焰柱。',['foc'],'none','Autonomous spell entity; does not carry weapon procs.','独立法术实体，不继承武器触发效果。'),
        skill('firestorm','Firestorm','火焰风暴',35,'active','Rain fire and shred fire armor.','降下火雨并削弱火焰护甲。',['foc'],'none','The resistance debuff amplifies later fire hits; it is not a weapon debuff.','抗性削弱会放大后续火焰伤害，但不属于武器减益。'),
        skill('charge-mastery','Charge Mastery','充能专精',14,'passive','Retain Charge longer and gain it faster.','延缓充能衰减并提高获取速度。',['none'],'passive','Modifies the class resource only; no hit event.','仅修改职业资源，不产生命中事件。'),
      ]},
      { id: 'frost', name: t('Frost', '冰霜'), description: t('Defensive control, freezes and repositioning.', '以冻结、位移与防御控制战场。'), skills: [
        skill('icy-blast','Icy Blast','寒冰冲击',1,'active','Short-range shards with a freeze chance.','近距离射出冰片，有几率冻结。',['foc'],'none','Flat ice spell damage; freeze is rolled per shard.','固定冰霜法术伤害；每枚冰片独立判定冻结。'),
        skill('hailstorm','Hailstorm','冰雹风暴',7,'active','Hail damages and makes enemies vulnerable.','冰雹伤害区域内敌人并使其易伤。',['foc'],'none','Area spell; the vulnerability affects all incoming damage.','区域法术；易伤会作用于之后的所有伤害。'),
        skill('frost-phase','Frost Phase','冰霜位移',14,'active','Teleport and freeze at both endpoints.','传送，并在起点与终点造成冻结伤害。',['foc'],'none','Movement spell with two spell hits; neither carries weapon procs.','位移法术产生两次法术命中，均不继承武器特效。'),
        skill('frost-wave','Frost Wave','冰霜波',28,'active','Launch a rolling wave of ice.','释放翻滚前进的冰霜波。',['foc'],'none','Repeated spell contacts do not count as weapon hits.','多段法术接触不视为武器命中。'),
        skill('ice-prison','Ice Prison','寒冰牢笼',35,'active','Raise ice walls around a target area.','在目标区域升起寒冰之墙。',['foc','vit'],'none','Wall health is independent of weapon DPS; defensive value benefits positioning, not Vitality directly.','冰墙生命与武器 DPS 无关；体力色调表示生存协同，而非直接数值缩放。'),
        skill('staff-mastery','Staff Mastery','法杖专精',7,'passive','Staff attacks reduce elemental armor.','法杖攻击削弱敌人的元素护甲。',['foc'],'passive','Requires a staff weapon hit; spell hits do not apply it.','需要法杖武器命中，法术命中不会施加。'),
      ]},
      { id: 'storm', name: t('Storm', '风暴'), description: t('Electric bursts, brands and charge generation.', '电击爆发、烙印联动与快速充能。'), skills: [
        skill('prismatic-bolt','Prismatic Bolt','棱光弹',1,'active','Seeking bolts with random elements.','释放带随机元素的追踪弹。',['foc'],'none','Pure spell damage. Each bolt can crit but cannot trigger weapon procs.','纯法术伤害；每枚弹体可暴击，但不触发武器特效。'),
        skill('shocking-burst','Shocking Burst','电能爆发',7,'active','Channel a cone of lightning.','持续引导锥形闪电。',['foc'],'none','Channel ticks are spell hits and cannot steal from weapon affixes.','引导跳伤属于法术命中，不能触发武器吸取。'),
        skill('thunder-locus','Thunder Locus','雷霆领域',14,'active','Place a charged orb that attacks nearby foes.','放置自动攻击附近敌人的雷电球。',['foc'],'none','Summoned locus uses player spell scaling, not weapon on-hit effects.','雷球继承角色法术缩放，不继承武器命中特效。'),
        skill('arc-beam','Arc Beam','电弧射线',21,'active','A beam that jumps between targets.','在敌人之间跳跃的电弧射线。',['foc'],'none','The first and chained contacts are spell hits.','首次与弹射接触均为法术命中。'),
        skill('deaths-bounty','Death’s Bounty','死亡馈赠',28,'active','Mark enemies to release health and mana on death.','标记敌人，使其死亡时返还生命与法力。',['foc'],'none','Resource return is a mark/death event, not life or mana steal.','资源返还是标记死亡事件，并非生命或法力吸取。'),
        skill('lightning-brand','Lightning Brand','闪电烙印',42,'passive','Electric hits trigger bonus damage on shocked foes.','电击命中对带电敌人触发额外伤害。',['foc'],'passive','Triggered by eligible electric damage; the brand has an internal interval.','由符合条件的电击伤害触发；烙印存在内部触发间隔。'),
      ]},
    ],
  },
  {
    id: 'engineer', name: t('Engineer', '工程师'), epithet: t('The ironclad powerhouse', '钢铁铸就的先锋'), role: t('Melee · Tank · Summons', '近战 · 坦克 · 召唤'),
    description: t('A frontier specialist who turns Ember-powered armor into hammers, shields and machines.', '帝国边境的技术专家，用烬石动力装甲驾驭重锤、护盾与机械。'),
    resource: t('Charge Bar', '充能条'), resourceDetail: t('Many attacks add Charge. Defensive and construction skills consume pips for stronger effects.', '多种攻击积累充能；防御和建造技能可消耗充能层数强化效果。'),
    accent: '#f08a3c', monogram: 'EN', recommended: ['str', 'vit'],
    trees: [
      { id:'blitz', name:t('Blitz','突击'), description:t('Heavy weapon blows and seismic fire.','重型武器打击与地震烈焰。'), skills:[
        skill('flame-hammer','Flame Hammer','火焰锤击',1,'active','A heavy strike sends out four fire fissures.','重击地面并释放四道火焰裂隙。',['str','foc'],'full','The initial % weapon-DPS strike carries weapon procs and steal; fissures are secondary fire damage.','初次武器 DPS 打击可触发武器特效与吸取；裂隙是次生火焰伤害。'),
        skill('seismic-slam','Seismic Slam','地震猛击',7,'active','A radial slam that stuns nearby enemies.','环形猛击并击晕附近敌人。',['str','foc'],'partial','Weapon-DPS portion can carry eligible effects; added fire is Focus-scaled.','武器 DPS 部分可携带符合条件的特效；附加火焰受专注加成。'),
        skill('ember-hammer','Ember Hammer','烬石之锤',14,'active','Crush armor with a focused blow.','集中重击并粉碎敌人护甲。',['str'],'full','Direct weapon-DPS hit: supports life/mana steal and weapon procs.','直接武器 DPS 命中：支持生命/法力吸取及武器触发。'),
        skill('onslaught','Onslaught','强袭',21,'active','Leap forward and smash the landing area.','跃向前方并猛击落点区域。',['str','foc'],'partial','Landing includes weapon-DPS damage; movement itself never triggers on-hit effects.','落地包含武器 DPS 伤害；位移动作本身不触发命中特效。'),
        skill('emberquake','Emberquake','烬石震击',42,'active','Split the earth into seeking fire fissures.','撕裂地面，生成追踪敌人的火焰裂隙。',['str','foc'],'partial','Initial strike uses weapon DPS; traveling fissures are secondary skill damage.','初击使用武器 DPS；移动裂隙属于次生技能伤害。'),
        skill('heavy-lifting','Heavy Lifting','重装专精',1,'passive','Faster attacks and stuns with heavy weapons.','提高重型武器攻速与击晕几率。',['str'],'passive','Applies only while an eligible two-handed melee weapon is equipped.','仅在装备符合条件的双手近战武器时生效。'),
      ]},
      { id:'construction', name:t('Construction','建造'), description:t('Cannons, robots and deployable support.','火炮、机器人与部署型支援。'), skills:[
        skill('healing-bot','Healing Bot','治疗机器人',1,'active','Deploy a bot that restores health and mana.','部署周期恢复生命与法力的机器人。',['vit'],'none','Healing pulses are fixed support effects and do not count as steal.','治疗脉冲是固定支援效果，不属于吸取。'),
        skill('blast-cannon','Blast Cannon','爆破加农炮',7,'active','Fire a piercing cannon round.','发射穿透敌人的加农炮弹。',['str','foc'],'full','% weapon-DPS projectile; eligible for weapon procs and steal. Requires a cannon.','武器 DPS 投射物，可触发武器特效与吸取；需要加农炮。'),
        skill('spider-mines','Spider Mines','蜘蛛雷',14,'active','Release mobile explosive drones.','释放会追踪目标的爆炸蜘蛛。',['foc'],'none','Minion explosions do not carry the player weapon’s on-hit affixes.','召唤物爆炸不继承玩家武器的命中词条。'),
        skill('gun-bot','Gun Bot','炮塔机器人',21,'active','Deploy a rapid-fire autonomous turret.','部署自动速射炮塔。',['foc'],'none','Pet-like skill entity; it uses skill damage and cannot leech for the player.','类宠物技能实体，使用技能伤害且不能为玩家吸取。'),
        skill('fusillade','Fusillade','火箭齐射',35,'active','Launch a volley of seeking rockets.','发射一轮追踪火箭。',['str','foc'],'partial','Converted weapon-DPS damage uses weapon scaling; proc behavior is limited by the skill template.','转化的武器 DPS 受武器缩放；触发行为受技能模板限制。'),
        skill('fire-and-spark','Fire and Spark','火与电',14,'passive','Increase fire and electric damage.','提高火焰与闪电伤害。',['foc'],'passive','Global elemental modifier; no event by itself.','全局元素修正，本身不产生触发事件。'),
      ]},
      { id:'aegis', name:t('Aegis','神盾'), description:t('Shield techniques, barriers and survival.','盾牌技巧、屏障与生存能力。'), skills:[
        skill('shield-bash','Shield Bash','盾击',1,'active','Strike with shield armor and knock back.','以盾牌护甲造成伤害并击退。',['vit'],'none','Damage derives from shield armor, not weapon DPS; no weapon steal.','伤害取自盾牌护甲而非武器 DPS；不触发武器吸取。'),
        skill('forcefield','Forcefield','力场',7,'active','Absorb damage; Charge pips strengthen the barrier.','吸收伤害；充能层数会强化屏障。',['vit'],'none','No hit event. Cast at five Charge pips for maximum absorption.','不产生命中事件；五层充能时施放可获最大吸收量。'),
        skill('overload','Overload','超载',14,'active','Consume Charge to release an electric nova.','消耗充能释放闪电新星。',['foc'],'none','Flat electric spell damage; consumption scales with available Charge.','固定闪电法术伤害；威力随消耗的充能层数提高。'),
        skill('dynamo-field','Dynamo Field','动力场',21,'active','Damage nearby enemies and rapidly build Charge.','伤害附近敌人并快速积累充能。',['foc'],'none','Spell ticks grant Charge but do not inherit weapon effects.','法术跳伤提供充能，但不继承武器效果。'),
        skill('tremor','Tremor','震颤',28,'active','A defensive shockwave that weakens enemies.','释放削弱敌人的防御冲击波。',['vit'],'none','Debuff application is a skill event, not a weapon strike.','减益施加属于技能事件，而非武器打击。'),
        skill('sword-board','Sword and Board','剑盾专精',7,'passive','Convert part of shield armor into weapon damage.','将部分盾牌护甲转化为武器伤害。',['str','vit'],'passive','Requires a shield; modifies weapon damage before eligible attacks resolve.','需要盾牌；在符合条件的攻击结算前修正武器伤害。'),
      ]},
    ],
  },
  {
    id: 'berserker', name: t('Berserker', '狂战士'), epithet: t('The northern predator', '来自北境的掠食者'), role: t('Melee · Critical · Sustain', '近战 · 暴击 · 续航'),
    description: t('A relentless melee hunter who channels beasts, frost and shadow through Frenzy.', '永不停歇的近战猎手，在狂怒中驾驭野兽、冰霜与暗影。'),
    resource: t('Frenzy', '狂怒'), resourceDetail: t('Critical hits fill the Charge bar. When full, Frenzy grants guaranteed critical hits for a short time.', '暴击填充充能条；满槽后进入狂怒，短时间内攻击必定暴击。'),
    accent: '#e05a4f', monogram: 'BZ', recommended: ['str', 'dex'],
    trees: [
      { id:'hunter', name:t('Hunter','猎人'), description:t('Fast weapon attacks and predatory mobility.','快速武器攻击与猎杀机动。'), skills:[
        skill('eviscerate','Eviscerate','剔骨',1,'active','Dash through enemies with a savage cut.','以凶猛斩击穿过敌群。',['str'],'full','% weapon-DPS hit; carries eligible procs and steal.','武器 DPS 命中，可携带符合条件的特效与吸取。'),
        skill('howl','Howl','战嚎',7,'active','Terrify and weaken nearby enemies.','恐吓并削弱附近敌人。',['none'],'none','Pure debuff: no damage or on-hit event.','纯减益技能：无伤害也无命中事件。'),
        skill('wolfstrike','Wolfstrike','狼袭',14,'active','Become a wolf and tear through a line.','化身为狼，撕裂直线上的敌人。',['str'],'full','Each registered weapon-DPS strike can carry permitted weapon effects.','每次有效武器 DPS 打击均可携带允许的武器效果。'),
        skill('battle-rage','Battle Rage','战斗狂怒',21,'active','Gain damage for each nearby enemy.','根据附近敌人数量提高伤害。',['str'],'none','Self-buff only; does not itself trigger effects.','仅为自身增益，本身不触发效果。'),
        skill('rampage','Rampage','横冲直撞',42,'passive','Kills can grant a burst of speed and power.','击杀可能带来速度与力量爆发。',['str'],'passive','Triggered on kill, not on hit; damage-over-time kills can qualify.','由击杀而非命中触发；持续伤害造成击杀也可满足。'),
        skill('blood-hunger','Blood Hunger','嗜血',7,'passive','Critical hits restore a portion of health.','暴击时恢复一定生命。',['dex','vit'],'passive','Class healing on critical hit; separate from weapon life steal.','职业暴击治疗，与武器生命吸取相互独立。'),
      ]},
      { id:'tundra', name:t('Tundra','苔原'), description:t('Cold damage, armor and area denial.','冰霜伤害、护甲与区域封锁。'), skills:[
        skill('frost-breath','Frost Breath','冰霜吐息',1,'active','A cone of cold that can freeze.','喷出有几率冻结敌人的寒气。',['foc'],'none','Flat ice skill damage; no weapon proc.','固定冰霜技能伤害，不触发武器特效。'),
        skill('stormclaw','Stormclaw','风暴之爪',7,'active','Charge attacks with chaining lightning.','使攻击附带可弹射的闪电。',['str','foc'],'partial','The buff is applied by weapon attacks; the chained bolt is secondary elemental damage.','增益由武器攻击触发；弹射闪电属于次生元素伤害。'),
        skill('northern-rage','Northern Rage','北地之怒',14,'active','Hurl icy axes into a target area.','向目标区域投掷冰斧。',['foc'],'none','Spell-like projectiles use skill damage and do not steal.','类法术投射物使用技能伤害，不触发吸取。'),
        skill('ice-shield','Ice Shield','寒冰护盾',21,'active','Reflect projectiles and gain mana.','反射投射物并获得法力。',['vit'],'none','Reflected shots are not your weapon hits; mana return is not mana steal.','反射投射物并非你的武器命中；法力返还不属于法力吸取。'),
        skill('glacial-shatter','Glacial Shatter','冰川碎裂',35,'active','Explode the ground in a line of ice.','沿直线引爆冰冻地面。',['foc'],'none','Area spell damage without weapon events.','区域法术伤害，不产生武器事件。'),
        skill('cold-steel','Cold Steel Mastery','冷钢专精',1,'passive','Increase physical and ice damage.','提高物理与冰霜伤害。',['str','foc'],'passive','Global modifier to matching damage types.','对相应伤害类型提供全局修正。'),
      ]},
      { id:'shadow', name:t('Shadow','暗影'), description:t('Spectral allies, life recovery and execution.','幽灵盟友、生命恢复与斩杀。'), skills:[
        skill('shadow-burst','Shadow Burst','暗影爆发',1,'active','Dash as a wolf and recover health per target.','化身暗影狼突进，并按命中目标恢复生命。',['str','vit'],'none','Built-in healing per target; this is not weapon life steal.','技能自带按目标治疗，不属于武器生命吸取。'),
        skill('wolf-shade','Wolf Shade','幽狼',7,'active','Summon a spectral wolf that heals you on hit.','召唤幽灵狼，其攻击可为你治疗。',['foc','vit'],'none','Minion-specific healing; player weapon affixes are not transferred.','召唤物特有治疗，不转移玩家武器词条。'),
        skill('shadow-bind','Shadow Bind','暗影束缚',14,'active','Bind enemies so damage echoes between them.','束缚敌人，使伤害在目标间回响。',['foc'],'none','Echoed damage is secondary and does not repeat on-hit effects.','回响属于次生伤害，不会重复触发命中特效。'),
        skill('savage-rush','Savage Rush','狂野冲锋',21,'active','Sustain a rushing wolf transformation.','持续保持狼形冲锋。',['str'],'partial','Repeated skill contacts use weapon scaling but have restricted proc behavior.','连续技能接触受武器缩放，但触发行为受限制。'),
        skill('chain-snare','Chain Snare','锁链诱捕',28,'active','Pull enemies inward and damage them.','将敌人拉向中心并造成伤害。',['str'],'full','The damage component is weapon-DPS based and may trigger eligible effects.','伤害部分基于武器 DPS，可触发符合条件的效果。'),
        skill('shred-armor','Shred Armor','护甲撕裂',7,'passive','Weapon hits steal armor temporarily.','武器命中暂时窃取敌人护甲。',['str','vit'],'passive','Requires a weapon hit; most pure spell/skill entities cannot trigger it.','需要武器命中；多数纯法术或独立技能实体无法触发。'),
      ]},
    ],
  },
  {
    id: 'outlander', name: t('Outlander', '塞外客'), epithet: t('The wandering renegade', '游走荒野的异乡人'), role: t('Ranged · Debuff · Mobility', '远程 · 减益 · 机动'),
    description: t('A mobile marksman who mixes firearms, glaives, shadow magic and forbidden sigils.', '灵活的远程射手，将枪械、飞刃、暗影魔法与禁忌印记融为一体。'),
    resource: t('Charge Benefits', '充能增益'), resourceDetail: t('Charge increases attack speed, cast speed, dodge and critical chance as the bar fills.', '充能条越高，攻击速度、施法速度、闪避与暴击几率越高。'),
    accent: '#65ba85', monogram: 'OL', recommended: ['dex', 'foc'],
    trees: [
      { id:'warfare', name:t('Warfare','战争'), description:t('Firearms, mobility and rapid weapon damage.','枪械、机动与高速武器伤害。'), skills:[
        skill('rapid-fire','Rapid Fire','速射',1,'active','Channel a stream of ranged weapon fire.','持续倾泻远程武器火力。',['str','dex'],'full','Repeated % weapon-DPS hits can proc weapon effects and steal when the skill template permits.','连续武器 DPS 命中可在技能模板允许时触发武器效果与吸取。'),
        skill('rune-vault','Rune Vault','符文跃击',7,'active','Leap backward and leave a slowing rune.','向后跃出并留下减速符文。',['foc'],'none','Movement and rune explosion are skill effects, not weapon hits.','位移与符文爆炸均为技能效果，不是武器命中。'),
        skill('chaos-burst','Chaos Burst','混沌爆裂',14,'active','Fire bouncing elemental projectiles.','发射可弹射的元素弹丸。',['str','foc'],'partial','Uses converted weapon damage; secondary bounces have restricted procs.','使用转化武器伤害；后续弹射的触发能力受限。'),
        skill('cursed-daggers','Cursed Daggers','诅咒飞刃',21,'active','Throw daggers that weaken enemy damage.','投掷削弱敌人伤害的飞刃。',['foc'],'none','Flat skill damage and debuff; equipped weapon on-hit affixes do not apply.','固定技能伤害与减益；不继承已装备武器的命中词条。'),
        skill('venomous-hail','Venomous Hail','剧毒冰雹',35,'active','Rain poison over a target area.','向目标区域倾泻毒雨。',['str','foc'],'partial','Weapon-DPS conversion scales the hit; damage-over-time cannot steal.','武器 DPS 转化会缩放命中；持续伤害不能触发吸取。'),
        skill('long-range','Long Range Mastery','远程专精',1,'passive','Increase ranged weapon damage and reach.','提高远程武器伤害与射程。',['str','dex'],'passive','Requires an eligible ranged weapon; modifies weapon attacks and matching skills.','需要符合条件的远程武器；修正武器攻击与匹配技能。'),
      ]},
      { id:'lore', name:t('Lore','秘术'), description:t('Glaives, elemental effects and ancient craft.','飞刃、元素效果与古老技艺。'), skills:[
        skill('glaive-throw','Glaive Throw','飞刃投掷',1,'active','Throw a ricocheting glaive.','投掷会在敌人间弹射的飞刃。',['foc'],'none','Fixed skill damage; the visual weapon does not count as your equipped weapon.','固定技能伤害；视觉上的飞刃不视为已装备武器。'),
        skill('sandstorm','Sandstorm','沙尘暴',7,'active','Send out a piercing storm projectile.','释放可穿透敌人的沙暴投射物。',['foc'],'none','Flat physical skill damage is scaled by Focus despite its physical type.','虽然属于物理类型，固定技能伤害仍受专注缩放。'),
        skill('glaive-sweep','Glaive Sweep','飞刃横扫',14,'active','Sweep a spectral glaive around you.','以幽灵飞刃横扫周围。',['foc'],'none','Skill entity, no weapon proc or steal.','技能实体，不触发武器特效或吸取。'),
        skill('shattering-glaive','Shattering Glaive','碎裂飞刃',28,'active','Explode a glaive into damaging fragments.','使飞刃爆裂成伤害碎片。',['foc'],'none','Primary and fragments are flat skill damage.','主飞刃与碎片均为固定技能伤害。'),
        skill('bramble-wall','Bramble Wall','荆棘之墙',35,'active','Create a breakable wall of thorns.','生成可被摧毁的荆棘墙。',['foc','vit'],'none','Terrain entity; its damage and health are not weapon hits.','地形实体；其伤害与生命均不属于武器命中。'),
        skill('poison-burst','Poison Burst','毒素爆发',7,'passive','Poisoned enemies can explode on death.','中毒敌人死亡时可能爆炸。',['foc'],'passive','On-death secondary damage cannot trigger weapon procs or steal.','死亡触发的次生伤害不能触发武器特效或吸取。'),
      ]},
      { id:'sigil', name:t('Sigil','印记'), description:t('Pacts, hexes and battlefield support.','契约、妖术与战场支援。'), skills:[
        skill('blade-pact','Blade Pact','利刃契约',1,'active','Slow enemies and increase damage taken.','减速敌人并提高其受到的伤害。',['none'],'none','Area debuff, no hit event.','区域减益，不产生命中事件。'),
        skill('shadowshot','Shadowshot','暗影射击',7,'active','A weapon shot splits into shadow bats.','武器射击分裂出暗影蝙蝠。',['str','foc'],'partial','Initial shot is weapon-DPS based; spawned bats are secondary skill projectiles.','初始射击基于武器 DPS；生成的蝙蝠属于次生技能投射物。'),
        skill('repulsion-hex','Repulsion Hex','排斥妖术',14,'active','Summon a sigil that pushes enemies away.','召唤周期性推开敌人的印记。',['none'],'none','Control pulse deals no weapon hit.','控制脉冲不产生武器命中。'),
        skill('stone-pact','Stone Pact','岩石契约',21,'active','Create an area of healing and armor.','创造提供治疗与护甲的区域。',['vit'],'none','Periodic restoration is not life steal.','周期恢复不属于生命吸取。'),
        skill('shadowmantle','Shadowmantle','暗影斗篷',28,'active','Reflect projectiles and obscure allies.','反射投射物并掩护盟友。',['vit'],'none','Reflections do not inherit your weapon affixes.','反射伤害不继承你的武器词条。'),
        skill('master-elements','Master of the Elements','元素大师',14,'passive','Increase elemental damage dealt.','提高造成的元素伤害。',['foc'],'passive','Global elemental modifier; works on weapon and skill elemental portions.','全局元素修正，对武器与技能的元素部分都有效。'),
      ]},
    ],
  },
]

export const phaseBeasts: PhaseBeast[] = [
  {id:'steppes-beast',name:t('Temple Steppes Beast','神殿草原相位兽'),region:t('Temple Steppes','神殿草原'),act:1,environment:t('Estherian ruins / spider nests','埃斯特里亚遗迹 / 蜘蛛巢穴'),description:t('One Phase Beast can be found somewhere in this major overworld. Its portal selects a challenge from the area pool.','这一大地图中必定可找到一只相位兽；其传送门会从本区域挑战池中随机选择内容。'),challenge:t('Poison the spider nests · Navigate the maze · Vanquish foes with haste','毒害蜘蛛巢穴 · 穿越迷宫 · 限时消灭敌人'),reward:t('Completion chests · level-scaled world loot','完成宝箱 · 随等级变化的世界掉落'),mark:'Ⅰ'},
  {id:'frosted-beast',name:t('Frosted Hills Beast','冰封山丘相位兽'),region:t('Frosted Hills','冰封山丘'),act:1,environment:t('Frozen islands / goblin grounds','浮冰群岛 / 地精营地'),description:t('The Frosted Hills portal randomly opens one of two known defense-and-order challenges.','冰封山丘的传送门会随机开启两个已知的防守或顺序挑战之一。'),challenge:t('Ignite braziers in order · Protect four crystals from goblin hordes','按顺序点燃火盆 · 保护四颗水晶抵挡地精群'),reward:t('Up to four blue chests in the crystal defense challenge','水晶防守挑战最多奖励四个蓝色宝箱'),mark:'✧'},
  {id:'wastes-beast',name:t('Ossean Wastes Beast','奥辛荒原相位兽'),region:t('Ossean Wastes','奥辛荒原'),act:2,environment:t('Desert ruins / winding canyon','沙漠遗迹 / 曲折峡谷'),description:t('A spectral Jackalbeast roams the broad Ossean Wastes and flees when approached.','一只幽灵般的豺狼人异兽游荡在广阔的奥辛荒原，接近时会逃跑。'),challenge:t('Choose a door · Jackalbeast gauntlet · Defeat three giant Tars','三门抉择 · 豺狼人试炼 · 击败三只巨型焦油怪'),reward:t('Challenge-dependent chests and desert-level loot','随挑战变化的宝箱与沙漠等级战利品'),mark:'Ⅱ'},
  {id:'salt-beast',name:t('Salt Barrens Beast','盐碱荒原相位兽'),region:t('The Salt Barrens','盐碱荒原'),act:2,environment:t('Netherrealm machinery / ship graveyard','冥界机关 / 船舶墓地'),description:t('The largest challenge pool is attached to the Phase Beast roaming the Salt Barrens.','盐碱荒原相位兽拥有已知区域中最大的随机挑战池。'),challenge:t('Netherrealm gauntlet · Pirate gauntlet · Survive the arena · X marks the spot','冥界机关试炼 · 海盗试炼 · 竞技场生存 · 寻找藏宝点'),reward:t('Gold, random chests and buried treasure by challenge','金币、随机宝箱，以及藏宝挑战中的掩埋奖励'),mark:'⚙'},
  {id:'blightbog-beast',name:t('Blightbogs Beast','疫沼相位兽'),region:t('Blightbogs','疫沼'),act:3,environment:t('Burning swamp island','燃烧的沼泽孤岛'),description:t('The Blightbogs portal leads to a small island arena under constant fire pressure.','疫沼传送门通往一处持续受到火焰威胁的小型孤岛竞技场。'),challenge:t('Defeat two witches · Defeat the troll','击败两名女巫 · 击败巨魔'),reward:t('Boss chest and level-scaled swamp loot','首领宝箱与随等级变化的沼泽战利品'),mark:'❧'},
  {id:'battlefield-beast',name:t('Sundered Battlefield Beast','破碎战场相位兽'),region:t('The Sundered Battlefield','破碎战场'),act:3,environment:t('Lava platforms / Varkolyn mine','熔岩平台 / 瓦科林矿区'),description:t('A late-campaign Phase Beast opens one of two dangerous gauntlets with dense chest rewards.','后期相位兽会开启两种危险试炼之一，其中分布着密集宝箱。'),challenge:t('Avoid the rising lava · Varkolyn gauntlet','躲避上涨的熔岩 · 瓦科林试炼'),reward:t('Numerous chests; a favored route for high-level socketables','大量宝箱；常用于获取高级镶嵌物'),mark:'Ⅲ'},
]

export const statInfo = [
  {key:'str' as const, abbr:'STR', name:t('Strength','力量'), color:'#e7574f', effects:[t('+0.5% weapon damage per point','每点 +0.5% 武器伤害'),t('+0.4% critical damage bonus per point','每点 +0.4% 暴击伤害加成'),t('Critical damage bonus starts at 50%','基础暴击伤害加成为 50%')]},
  {key:'dex' as const, abbr:'DEX', name:t('Dexterity','敏捷'), color:'#54b979', effects:[t('Adds critical hit and dodge chance','提高暴击与闪避几率'),t('Formula: (0.2002 − 0.0002 × DEX) × DEX','公式：(0.2002 − 0.0002 × 敏捷) × 敏捷'),t('Attribute contribution approaches a 50% cap','属性贡献趋近 50% 上限')]},
  {key:'foc' as const, abbr:'FOC', name:t('Focus','专注'), color:'#4b9fea', effects:[t('+0.5 mana and +0.5% elemental damage per point','每点 +0.5 法力及 +0.5% 元素伤害'),t('Scales flat skill damage, including physical','缩放固定技能伤害，包括物理伤害'),t('Execute bonus uses the same diminishing formula','处决加成使用相同的递减公式')]},
  {key:'vit' as const, abbr:'VIT', name:t('Vitality','体力'), color:'#e0b44d', effects:[t('+3.6 health and +0.25% armor bonus per point','每点 +3.6 生命及 +0.25% 护甲加成'),t('Adds shield block chance with diminishing returns','以递减收益提高盾牌格挡几率'),t('Attribute block contribution approaches 50%','属性格挡贡献趋近 50%')]},
]
