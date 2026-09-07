import { CircleAlert, ClipboardCopy, ClipboardPaste, Eye, Gem, RotateCcw, X } from 'lucide-react'
import { asset, type DbClass, type DbEquipment as PlannerEquipment } from '../domain'
import { copy, pick } from '../i18n'
import { NumberInput } from '../NumberInput'
import { SelectControl } from '../SelectControl'
import { NgBadge } from '../WikiUi'
import type { Lang } from '../types'
import type { PlannerSnapshot } from './calculations'
import {
  buildSocketCount,
  classBases,
  slotName,
  slots,
  statNames,
  twoHanded,
  type Slot,
  type SocketLoadout,
  type Stat,
} from './model'

export interface BuildWorkspaceProps {
  lang: Lang
  itemsReady: boolean
  classes: DbClass[]
  classId: string
  level: number
  allocated: Record<Stat, number>
  loadout: Record<Slot, string | null>
  socketLoadout: SocketLoadout
  byId: Map<string, PlannerEquipment>
  planner: PlannerSnapshot
  onClassChange: (classId: string) => void
  onLevelChange: (level: number) => void
  onAllocatedChange: (stat: Stat, value: number) => void
  onOpenImport: () => void
  onExport: () => void
  onReset: () => void
  onPreview: (slot: Slot) => void
  onOpenPicker: (slot: Slot) => void
  onRemoveItem: (slot: Slot) => void
}

export function BuildWorkspace({
  lang,
  itemsReady,
  classes,
  classId,
  level,
  allocated,
  loadout,
  socketLoadout,
  byId,
  planner,
  onClassChange,
  onLevelChange,
  onAllocatedChange,
  onOpenImport,
  onExport,
  onReset,
  onPreview,
  onOpenPicker,
  onRemoveItem,
}: BuildWorkspaceProps) {
  return (
    <div className="content page-body build-page">
      <div className="build-toolbar">
        <SelectControl
          className="planner-select"
          label={copy(lang, '职业', 'Class', '職業')}
          value={classId}
          onChange={onClassChange}
          options={classes.map((hero) => ({ value: hero.id, label: pick(hero.name, lang) }))}
        />
        <label className="level-input">
          <span>{copy(lang, '角色等级', 'Character level', '角色等級')}</span>
          <NumberInput min={1} max={100} value={level} onChange={onLevelChange} />
        </label>
        <div className="build-transfer-actions">
          <button className="import-build" disabled={!itemsReady} onClick={onOpenImport}>
            <ClipboardPaste size={16} />
            {copy(lang, '导入', 'Import', '匯入')}
          </button>
          <button className="export-build" onClick={onExport}>
            <ClipboardCopy size={16} />
            {copy(lang, '导出', 'Export', '匯出')}
          </button>
        </div>
        <button className="reset-build" onClick={onReset}>
          <RotateCcw size={16} />
          {copy(lang, '重置', 'Reset', '重設')}
        </button>
      </div>
      <div className="build-layout">
        <section className="paper-doll">
          <header>
            <div>
              <span>{copy(lang, '装备栏', 'Equipment', '裝備欄')}</span>
              <h2>
                {pick(classes.find((hero) => hero.id === classId)?.name || classes[0].name, lang)}
              </h2>
            </div>
            <strong>{planner.equipped.length} / 12</strong>
          </header>
          <div className="slot-grid">
            {slots.map((slot) => {
              const item = loadout[slot] ? byId.get(loadout[slot] as string) : null
              const locked =
                slot === 'off' &&
                Boolean(loadout.main && twoHanded.has(byId.get(loadout.main)?.subtype || ''))
              const unmet = Boolean(item && !planner.requirementsBySlot.get(slot)?.ok)
              const socketCount = item ? buildSocketCount(item) : 0
              const socketValues = item ? (socketLoadout[slot] || []).slice(0, socketCount) : []
              const filledSockets = socketValues.filter(Boolean).length
              return (
                <div
                  key={slot}
                  className={`gear-slot${item ? ' filled' : ''}${locked ? ' disabled' : ''}${unmet ? ' unmet' : ''}`}
                >
                  <span className="slot-label">{slotName(slot, lang)}</span>
                  {item ? (
                    <>
                      <button
                        className="slot-preview"
                        onClick={() => onPreview(slot)}
                        aria-label={copy(
                          lang,
                          `速览${pick(item.name, lang)}`,
                          `Quick view: ${pick(item.name, lang)}`,
                          `快速預覽：${pick(item.name, lang)}`,
                        )}
                      >
                        <img
                          className={`rarity-border ${item.rarity}`}
                          src={asset(item.iconPath)}
                          alt=""
                        />
                        <span className="slot-item">
                          <b>
                            {pick(item.name, lang)} <NgBadge tier={item.ngTier} />
                          </b>
                          <small>Lv {item.level}</small>
                          {socketCount > 0 && (
                            <span
                              className="slot-socket-state"
                              aria-label={copy(
                                lang,
                                `${filledSockets}/${socketCount} 个孔已镶嵌`,
                                `${filledSockets} of ${socketCount} sockets filled`,
                                `${filledSockets}/${socketCount} 個孔已鑲嵌`,
                              )}
                            >
                              <Gem size={11} />
                              <span>
                                {filledSockets}/{socketCount}
                              </span>
                              <i>
                                {Array.from({ length: socketCount }, (_, index) => (
                                  <em className={socketValues[index] ? 'filled' : ''} key={index} />
                                ))}
                              </i>
                            </span>
                          )}
                          {unmet && (
                            <span className="slot-unmet">
                              <CircleAlert size={13} />
                              {copy(lang, '未满足需求', 'Requirements not met', '未符合需求')}
                            </span>
                          )}
                        </span>
                        <Eye className="slot-peek" size={15} />
                      </button>
                      <button
                        className="remove-item"
                        onClick={() => onRemoveItem(slot)}
                        aria-label={copy(
                          lang,
                          `移除${pick(item.name, lang)}`,
                          `Remove ${pick(item.name, lang)}`,
                          `移除${pick(item.name, lang)}`,
                        )}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="slot-empty"
                      disabled={locked}
                      onClick={() => onOpenPicker(slot)}
                    >
                      {locked
                        ? copy(
                            lang,
                            '已被双手武器占用',
                            'Occupied by a two-handed weapon',
                            '已被雙手武器占用',
                          )
                        : copy(lang, '选择装备', 'Choose item', '選擇裝備')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
        <aside className="build-inspector">
          <section className="allocation-card">
            <header>
              <div>
                <span>{copy(lang, '属性加点', 'Attributes', '屬性加點')}</span>
                <b className={planner.spent > planner.available ? 'over' : ''}>
                  {planner.spent} / {planner.available}
                </b>
              </div>
              <div className="point-track">
                <i
                  style={{
                    width: `${Math.min(100, planner.available ? (planner.spent / planner.available) * 100 : 0)}%`,
                  }}
                />
              </div>
            </header>
            {(Object.keys(statNames) as Stat[]).map((stat) => (
              <label className={`stat-allocation ${stat}`} key={stat}>
                <span>
                  <b>{pick(statNames[stat], lang)}</b>
                  <small>
                    {classBases[classId][stat]} + {planner.gearStats[stat]}{' '}
                    {copy(lang, '装备', 'gear', '裝備')}
                  </small>
                </span>
                <NumberInput
                  aria-label={pick(statNames[stat], lang)}
                  min={0}
                  max={495}
                  value={allocated[stat]}
                  onChange={(value) => onAllocatedChange(stat, value)}
                />
                <strong>{planner.stats[stat]}</strong>
              </label>
            ))}
            {planner.spent > planner.available && (
              <p className="build-warning">
                {copy(
                  lang,
                  `超出当前等级可分配点数 ${planner.spent - planner.available} 点。`,
                  `Allocation exceeds the level limit by ${planner.spent - planner.available}.`,
                  `超出目前等級可分配的點數 ${planner.spent - planner.available} 點。`,
                )}
              </p>
            )}
          </section>
          <section className="derived-card">
            <h2>{copy(lang, '完整属性', 'Full stat overview', '完整屬性')}</h2>
            <div className="derived-grid">
              <div>
                <span>{copy(lang, '武器基础伤害', 'Base weapon damage', '武器基礎傷害')}</span>
                <b>
                  {planner.damage[0] || planner.damage[1]
                    ? `${Math.round(planner.damage[0])}–${Math.round(planner.damage[1])}`
                    : '—'}
                </b>
              </div>
              <div>
                <span>{copy(lang, '武器伤害加成', 'Weapon damage bonus', '武器傷害加成')}</span>
                <b>+{planner.weaponDamageBonus.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '基础护甲', 'Base armor', '基礎護甲')}</span>
                <b>
                  {planner.armor[0] || planner.armor[1]
                    ? `${Math.round(planner.armor[0])}–${Math.round(planner.armor[1])}`
                    : '—'}
                </b>
              </div>
              <div>
                <span>{copy(lang, '护甲加成', 'Armor bonus', '護甲加成')}</span>
                <b>+{planner.armorBonus.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '暴击率', 'Critical hit chance', '爆擊率')}</span>
                <b>{planner.criticalChance.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '暴击伤害加成', 'Critical damage bonus', '爆擊傷害加成')}</span>
                <b>+{planner.criticalDamage.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '额外生命', 'Added health', '額外生命')}</span>
                <b>
                  +{Math.round(planner.addedHealth)}
                  {planner.addedHealthPercent ? ` · +${planner.addedHealthPercent}%` : ''}
                </b>
              </div>
              <div>
                <span>{copy(lang, '闪避率', 'Dodge chance', '閃避率')}</span>
                <b>{planner.dodgeChance.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '额外法力', 'Added mana', '額外法力')}</span>
                <b>
                  +{planner.addedMana.toFixed(1)}
                  {planner.addedManaPercent ? ` · +${planner.addedManaPercent}%` : ''}
                </b>
              </div>
              <div>
                <span>{copy(lang, '智力伤害加成', 'Focus damage bonus', '智力傷害加成')}</span>
                <b>+{planner.focusDamageBonus.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '格挡率', 'Block chance', '格擋率')}</span>
                <b>{planner.blockChance == null ? '—' : `${planner.blockChance.toFixed(1)}%`}</b>
              </div>
              <div>
                <span>{copy(lang, '猛击几率', 'Execute chance', '猛擊機率')}</span>
                <b>{planner.executeChance.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '全伤害加成', 'All damage bonus', '全傷害加成')}</span>
                <b>+{planner.allDamage.toFixed(1)}%</b>
              </div>
              <div>
                <span>{copy(lang, '全伤害减免', 'All damage reduction', '全傷害減免')}</span>
                <b>{planner.allDamageReduction.toFixed(1)}%</b>
              </div>
            </div>
          </section>
        </aside>
      </div>
      {planner.effectSummary.length > 0 && (
        <section className="build-effects">
          <header>
            <div>
              <span>{copy(lang, '当前加成', 'Current bonuses', '目前加成')}</span>
              <h2>{copy(lang, '装备效果汇总', 'Equipment effects', '裝備效果總覽')}</h2>
            </div>
            <strong>{planner.effectSummary.length}</strong>
          </header>
          <ul>
            {planner.effectSummary.map((row) => (
              <li key={row.key}>
                <span>{row.label}</span>
                {!row.aggregated && row.count > 1 && <b>× {row.count}</b>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {planner.activeSocketRows.length > 0 && (
        <section className="socketed-gems">
          <header>
            <div>
              <span>{copy(lang, '镶嵌', 'Sockets', '鑲嵌')}</span>
              <h2>{copy(lang, '镶嵌物', 'Socketables', '鑲嵌物')}</h2>
            </div>
            <strong>{planner.activeSocketRows.length}</strong>
          </header>
          <div className="socketed-gem-list">
            {planner.activeSocketRows.map((row) => (
              <article key={`${row.slot}-${row.index}`}>
                <img src={asset(row.gem.iconPath)} alt="" />
                <div>
                  <span>
                    {slotName(row.slot, lang)} ·{' '}
                    {copy(
                      lang,
                      `第 ${row.index + 1} 孔`,
                      `Socket ${row.index + 1}`,
                      `第 ${row.index + 1} 孔`,
                    )}
                  </span>
                  <b>
                    {pick(row.gem.name, lang)} <NgBadge tier={row.gem.ngTier} />
                  </b>
                  <ul>
                    {row.effects.map((effect, index) => (
                      <li key={`${effect.type}-${index}`}>
                        {effect.text ? pick(effect.text, lang) : effect.type}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
