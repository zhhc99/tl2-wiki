import { copy, pick, tr } from '../i18n'
import type { DisplayEffect, SkillGraph, SkillGraphs } from '../domain'
import { localText, titleCase } from './labels'
import type { Lang, LocalText } from '../types'

const effectNames: Record<string, LocalText> = {
  DAMAGE: localText('Damage', '伤害', '傷害'),
  'PERCENT DAMAGE BONUS': localText('Damage bonus', '伤害加成', '傷害加成'),
  'PERCENT DAMAGE TAKEN': localText('Damage taken', '承受伤害', '承受傷害'),
  STUN: localText('Stun', '眩晕', '暈眩'),
  FREEZE: localText('Freeze', '冰冻', '冰凍'),
  BURN: localText('Burn', '燃烧', '燃燒'),
  POISON: localText('Poison', '中毒', '中毒'),
  SHOCK: localText('Shock', '电击', '電擊'),
  'PERCENT SPEED': localText('Movement speed', '移动速度', '移動速度'),
  'PERCENT ATTACK SPEED': localText('Attack speed', '攻击速度', '攻擊速度'),
  'PERCENT CAST SPEED': localText('Cast speed', '施法速度', '施法速度'),
  'PERCENT ARMOR BONUS': localText('Armor bonus', '护甲加成', '護甲加成'),
  'ARMOR BONUS': localText('Armor', '护甲', '護甲'),
  'PERCENT CHARGING BONUS': localText('Charge rate', '怒气获得', '怒氣獲得'),
  'CRITICAL CHANCE': localText('Critical hit chance', '暴击几率', '爆擊機率'),
  'DODGE CHANCE BONUS': localText('Dodge chance', '闪避几率', '閃避機率'),
  'SHIELD BUFFER': localText('Damage shield', '伤害护盾', '傷害護盾'),
  'HP RECHARGE PLAYER': localText('Health recovery', '生命恢复', '生命恢復'),
  'MANA RECHARGE PLAYER': localText('Mana recovery', '法力恢复', '法力恢復'),
  'SUMMON DURATION': localText('Summon duration', '召唤持续时间', '召喚持續時間'),
  MINIONDAMAGE: localText('Minion damage', '召唤物伤害', '召喚物傷害'),
  'DEGRADE ARMOR': localText('Armor reduction', '护甲降低', '護甲降低'),
  'KNOCK BACK EFFECT': localText('Knockback', '击退', '擊退'),
}

const damageTypeNames: Record<string, LocalText> = {
  ALL: localText('All', '全部', '全部'),
  PHYSICAL: localText('Physical', '物理', '物理'),
  FIRE: localText('Fire', '火焰', '火焰'),
  ICE: localText('Ice', '寒冰', '寒冰'),
  ELECTRIC: localText('Electric', '闪电', '閃電'),
  POISON: localText('Poison', '毒素', '毒素'),
}

export const graphValue = (graph: SkillGraph | undefined, level: number) => {
  const points = graph?.points
  if (!points?.length) return null
  if (level <= points[0][0]) return points[0][1]
  for (let index = 1; index < points.length; index++) {
    const [x, y] = points[index]
    const [previousX, previousY] = points[index - 1]
    if (level <= x) return previousY + ((y - previousY) * (level - previousX)) / (x - previousX)
  }
  if (!graph?.inferPastEnd) return points.at(-1)?.[1] ?? null
  const [previousX, previousY] = points.at(-2) as [number, number]
  const [x, y] = points.at(-1) as [number, number]
  return previousY + ((y - previousY) * (level - previousX)) / (x - previousX)
}

const isTimedRecharge = (effect: DisplayEffect) =>
  effect.scalingGraph != null &&
  effect.duration != null &&
  effect.duration > 0 &&
  (effect.type === 'HP RECHARGE PLAYER' || effect.type === 'MANA RECHARGE PLAYER')

const effectNumber = (
  effect: DisplayEffect,
  value: number | null,
  playerLevel: number,
  skillGraphs: SkillGraphs,
  overTime = false,
) => {
  if (value == null) return null
  const scale = effect.scalingGraph
    ? graphValue(skillGraphs[effect.scalingGraph], playerLevel)
    : null
  let result = scale == null ? value : (scale * value) / 100
  const rechargeDuration = overTime && isTimedRecharge(effect) ? effect.duration : null
  if (rechargeDuration != null) result = Math.ceil(Math.abs(result) * rechargeDuration * 0.016)
  else {
    if (scale != null && effect.type === 'DAMAGE') result = Math.ceil(Math.abs(result))
    else if (scale != null && effect.type === 'ARMOR BONUS') result = Math.floor(Math.abs(result))
    else result = Math.abs(result)
    if (overTime && effect.duration) result = Math.ceil(result) * effect.duration
  }
  const precision = Math.max(0, effect.precision ?? 0)
  return Number(result.toFixed(precision)).toLocaleString('en-US', {
    maximumFractionDigits: precision,
  })
}

const effectRange = (
  effect: DisplayEffect,
  playerLevel: number,
  skillGraphs: SkillGraphs,
  overTime = false,
) => {
  const minimum = effectNumber(effect, effect.min, playerLevel, skillGraphs, overTime)
  const maximum = effectNumber(effect, effect.max, playerLevel, skillGraphs, overTime)
  return minimum === maximum || maximum == null
    ? minimum
    : minimum == null
      ? maximum
      : `${minimum}–${maximum}`
}

const effectDuration = (duration: number, lang: Lang) =>
  lang === 'en' ? `${duration} sec.` : `${duration}秒`

const renderSkillEffect = (
  effect: DisplayEffect,
  lang: Lang,
  playerLevel: number,
  skillGraphs: SkillGraphs,
) => {
  if (!effect.template) return null
  const values = effect.values || {}
  const auxiliary = (slot: number) =>
    effectNumber(effect, values[String(slot)] ?? null, playerLevel, {}, false) ?? '—'
  const thirdAndFourth =
    auxiliary(3) === auxiliary(4) ? auxiliary(3) : `${auxiliary(3)}–${auxiliary(4)}`
  const damage = effect.damageType
    ? damageTypeNames[effect.damageType.toUpperCase()]
      ? pick(damageTypeNames[effect.damageType.toUpperCase()], lang)
      : titleCase(effect.damageType)
    : ''
  const name = effect.displayName ? pick(effect.displayName, lang) : effect.name
  const overTime =
    effect.duration != null &&
    effect.duration > 0 &&
    (effect.type === 'DAMAGE' || effect.type === 'DAMAGE CHANCE' || isTimedRecharge(effect))
  return pick(effect.template, lang)
    .replaceAll('[VALUE_OT]', effectRange(effect, playerLevel, skillGraphs, true) ?? '—')
    .replaceAll('[VALUE1ASDURATION]', effectDuration(Math.abs(effect.min ?? 0), lang))
    .replaceAll('[VALUE3AND4]', thirdAndFourth)
    .replaceAll('[VALUE5]', auxiliary(5))
    .replaceAll('[VALUE3]', auxiliary(3))
    .replaceAll('[VALUE]', effectRange(effect, playerLevel, skillGraphs, overTime) ?? '—')
    .replaceAll('[DURATION]', effectDuration(effect.duration ?? 0, lang))
    .replaceAll('[DMGTYPE]', damage)
    .replaceAll('[NAME]', name)
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function EffectLine({
  effect,
  lang,
  pieces,
  playerLevel = 100,
  skillGraphs = {},
}: {
  effect: DisplayEffect
  lang: Lang
  pieces?: number
  playerLevel?: number
  skillGraphs?: SkillGraphs
}) {
  if (effect.text)
    return (
      <li>
        {pieces != null && (
          <b className="piece-count">
            {pieces} {copy(lang, '件', 'pieces', '件')}
          </b>
        )}
        <span>
          <strong>{pick(effect.text, lang)}</strong>
        </span>
      </li>
    )
  const rendered = renderSkillEffect(effect, lang, playerLevel, skillGraphs)
  if (rendered)
    return (
      <li>
        <span>
          <strong>{rendered}</strong>
          {effect.scalingGraph && (
            <small>
              {copy(
                lang,
                `角色等级 ${playerLevel}`,
                `Character level ${playerLevel}`,
                `角色等級 ${playerLevel}`,
              )}
            </small>
          )}
        </span>
      </li>
    )
  const label = effectNames[effect.type]?.en || titleCase(effect.type)
  const rawValue =
    effect.min == null && effect.max == null
      ? null
      : effect.min === effect.max
        ? `${effect.min}`
        : `${effect.min}–${effect.max}`
  const percent = /PERCENT|CHANCE|DODGE|SHOCK|FREEZE|STUN|BURN|POISON|INTERRUPT/.test(effect.type)
  const value = rawValue ? `${rawValue}${percent ? '%' : ''}` : null
  return (
    <li>
      {pieces != null && (
        <b className="piece-count">
          {pieces} {copy(lang, '件', 'pieces', '件')}
        </b>
      )}
      <span>
        <strong>
          {effect.damageType ? `${titleCase(effect.damageType)} · ` : ''}
          {label}
        </strong>
        {value && <em>{value}</em>}
        {effect.duration != null && effect.duration > 0 && (
          <small>
            {effect.duration} {tr(lang, 'seconds')}
          </small>
        )}
      </span>
    </li>
  )
}
