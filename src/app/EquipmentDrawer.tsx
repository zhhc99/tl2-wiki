import { useState, type ReactNode } from 'react'
import { ArrowRight, CircleDollarSign, X } from 'lucide-react'
import { asset, ngLabel, type DbClass, type DbEquipment } from '../domain'
import { copy, pick, tr } from '../i18n'
import { canGambleEquipment, gambleTypeForEquipment } from '../gambling'
import { SelectControl } from '../SelectControl'
import type { Lang, LocalText } from '../types'
import { EffectLine } from './EffectLine'
import { classRequirementName, localText, rarityName, subtypeName, titleCase } from './labels'
import { NgBadge, originalName, StatPill } from '../WikiUi'

export function EquipmentDrawer({
  item,
  variants,
  classes,
  lang,
  onClose,
  onGamble,
}: {
  item: DbEquipment
  variants: DbEquipment[]
  classes: DbClass[]
  lang: Lang
  onClose: () => void
  onGamble: (item: DbEquipment) => void
}) {
  const [currentId, setCurrentId] = useState(item.id)
  const current = variants.find((variant) => variant.id === currentId) ?? item
  const hasRequirements =
    current.requiredLevel > 0 ||
    current.requirements.length > 0 ||
    Boolean(current.classRequirement)
  const gambleType = gambleTypeForEquipment(current.category, current.subtype)
  const canGamble = canGambleEquipment(current)
  const details = (
    <aside className="detail-drawer">
      <button className="drawer-close" onClick={onClose} aria-label={tr(lang, 'close')}>
        <X />
      </button>
      <div className="drawer-title">
        <img className={`rarity-border ${current.rarity}`} src={asset(current.iconPath)} alt="" />
        <div>
          <div className="item-badges">
            <span className={`rarity ${current.rarity}`}>{rarityName(current.rarity, lang)}</span>
            {current.set && <span className="set-tag">{copy(lang, '套装', 'Set', '套裝')}</span>}
          </div>
          <h2>
            {pick(current.name, lang)} <NgBadge tier={current.ngTier} />
          </h2>
          {originalName(current.name, lang) && (
            <small className="original-name">{current.name.en}</small>
          )}
          <p className="item-level-type">
            Lv.{current.level} {subtypeName(current.subtype, lang)}
          </p>
        </div>
      </div>
      {variants.length > 1 && (
        <div className="variant-field">
          <span>{copy(lang, '选择变体', 'Choose variant', '選擇變體')}</span>
          <SelectControl
            className="variant-select"
            label={copy(lang, '选择变体', 'Choose variant', '選擇變體')}
            value={currentId}
            onChange={setCurrentId}
            options={[...variants]
              .sort((a, b) => a.level - b.level)
              .map((variant) => ({
                value: variant.id,
                label: `${ngLabel(variant.ngTier) ? `${ngLabel(variant.ngTier)} · ` : ''}Lv ${variant.level} · ${rarityName(variant.rarity, lang)}`,
              }))}
          />
        </div>
      )}
      {gambleType && (
        <button
          className="detail-gamble-link"
          disabled={!canGamble}
          onClick={() => onGamble(current)}
        >
          <CircleDollarSign size={21} />
          <span>
            <b>
              {canGamble
                ? copy(lang, '计算赌博价格', 'Calculate gambling price', '計算賭博價格')
                : copy(lang, '无法通过赌博获得', 'Unavailable for gambling', '無法透過賭博取得')}
            </b>
            {canGamble && (
              <small>
                {copy(
                  lang,
                  '带入类型、物品等级和原有孔数',
                  'Use its type, item level, and original socket count',
                  '帶入類型、物品等級與原有孔數',
                )}
              </small>
            )}
          </span>
          {canGamble && <ArrowRight size={17} />}
        </button>
      )}
      {current.description && <blockquote>{pick(current.description, lang)}</blockquote>}
      {hasRequirements && (
        <DetailSection title={copy(lang, '装备需求', 'Requirements', '裝備需求')}>
          <div className="requirement-options">
            {current.requiredLevel > 0 && (
              <strong className="requirement-level">Lv.{current.requiredLevel}</strong>
            )}
            {current.requiredLevel > 0 && current.requirements.length > 0 && (
              <span className="requirement-or">{copy(lang, '或', 'Or', '或')}</span>
            )}
            {current.requirements.length > 0 && (
              <div className="requirement-row">
                {current.requirements.map((requirement, index) => (
                  <span key={`${requirement.stat}-${index}`}>
                    {index > 0 && <em>{copy(lang, '且', 'and', '且')}</em>}
                    <StatPill stat={requirement.stat} />
                    <b>{requirement.value}</b>
                  </span>
                ))}
              </div>
            )}
          </div>
          {current.classRequirement && (
            <p className="requirement-class">
              <strong>{copy(lang, '职业：', 'Class:', '職業：')}</strong>
              {classRequirementName(current.classRequirement, classes, lang)}
            </p>
          )}
        </DetailSection>
      )}
      <EquipmentBaseValues item={current} lang={lang} />
      {current.effects.length > 0 && (
        <DetailSection title={copy(lang, '物品效果', 'Item effects', '裝備效果')}>
          <ul className="display-effect-list">
            {current.effects.map((effect, index) => (
              <EffectLine key={`${effect.type}-${index}`} effect={effect} lang={lang} />
            ))}
          </ul>
        </DetailSection>
      )}
      {current.set && (
        <DetailSection title={copy(lang, '套装', 'Set', '套裝')}>
          <p>{pick(current.set, lang)}</p>
          {current.setBonuses.length > 0 && (
            <ul className="display-effect-list">
              {current.setBonuses.map((bonus, index) => (
                <EffectLine
                  key={`${bonus.pieces}-${bonus.type}-${index}`}
                  effect={bonus}
                  lang={lang}
                  pieces={bonus.pieces}
                />
              ))}
            </ul>
          )}
        </DetailSection>
      )}
      <DetailSection title={copy(lang, '其他数值', 'Other values', '其他數值')}>
        {(current.minimumDropLevel != null || current.maximumDropLevel != null) && (
          <p>
            {copy(lang, '掉落等级', 'Drop level', '掉落等級')}:{' '}
            {current.minimumDropLevel != null && current.maximumDropLevel != null
              ? `${current.minimumDropLevel}–${current.maximumDropLevel}`
              : current.minimumDropLevel != null
                ? `${current.minimumDropLevel}+`
                : `≤ ${current.maximumDropLevel}`}
          </p>
        )}
        <p>SOCKETS: {current.sockets}</p>
        {current.rarityValue != null && <p>RARITY: {current.rarityValue}</p>}
        <p>VALUE: {current.value}</p>
      </DetailSection>
    </aside>
  )
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {details}
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

const itemValueNames: Record<string, { damage: LocalText; armor: LocalText }> = {
  physical: {
    damage: localText('Physical Damage', '物理伤害', '物理傷害'),
    armor: localText('Physical Armor', '物理防御', '物理防禦'),
  },
  fire: {
    damage: localText('Fire Damage', '火焰伤害', '火焰傷害'),
    armor: localText('Fire Armor', '火焰防御', '火焰防禦'),
  },
  ice: {
    damage: localText('Ice Damage', '寒冰伤害', '寒冰傷害'),
    armor: localText('Ice Armor', '寒冰防御', '寒冰防禦'),
  },
  electric: {
    damage: localText('Electric Damage', '闪电伤害', '閃電傷害'),
    armor: localText('Electric Armor', '闪电防御', '閃電防禦'),
  },
  poison: {
    damage: localText('Poison Damage', '毒素伤害', '毒素傷害'),
    armor: localText('Poison Armor', '毒素防御', '毒素防禦'),
  },
}

const rangeText = ([min, max]: [number, number]) =>
  min === max ? min.toLocaleString() : `${min.toLocaleString()}–${max.toLocaleString()}`

function EquipmentBaseValues({ item, lang }: { item: DbEquipment; lang: Lang }) {
  const damage = Object.entries(item.damage)
  const armor = Object.entries(item.armor)
  const dps = item.damagePerSecond
  if (
    !damage.length &&
    !armor.length &&
    !item.blockChance &&
    !(item.category === 'weapon' && item.speed != null)
  )
    return null
  const valueName = (type: string, kind: 'damage' | 'armor') =>
    itemValueNames[type]
      ? pick(itemValueNames[type][kind], lang)
      : titleCase(type.replaceAll('_', ' '))
  return (
    <section
      className="item-base-values"
      aria-label={copy(lang, '基础数值', 'Base values', '基礎數值')}
    >
      {dps != null && (
        <strong>
          {rangeText(dps)} {copy(lang, '每秒伤害', 'Damage per Second', '每秒傷害')}
        </strong>
      )}
      {item.category === 'weapon' && item.speed != null && (
        <strong>
          {item.speed}s {copy(lang, '攻击间隔', 'Attack Interval', '攻擊間隔')}
        </strong>
      )}
      {damage.map(([type, value]) => (
        <span className={`item-value-line ${type}`} key={type}>
          <em>
            {valueName(type, 'damage')}
            {lang === 'en' ? ':' : '：'}
          </em>
          <b>{rangeText(value)}</b>
        </span>
      ))}
      {armor.map(([type, value]) => (
        <span className={`item-value-line ${type}`} key={type}>
          <b>{rangeText(value)}</b>
          <em>{valueName(type, 'armor')}</em>
        </span>
      ))}
      {Boolean(item.blockChance) && (
        <span className="item-value-line block">
          <b>{item.blockChance}%</b>
          <em>{copy(lang, '格挡几率', 'Block Chance', '格擋機率')}</em>
        </span>
      )}
    </section>
  )
}
