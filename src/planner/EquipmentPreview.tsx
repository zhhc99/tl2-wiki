import { ChevronDown, Gem, RefreshCw, Shield, X } from 'lucide-react'
import { asset } from '../domain'
import { copy, pick } from '../i18n'
import { NgBadge } from '../WikiUi'
import type { Lang } from '../types'
import type { EquippedRow, PreviewSnapshot } from './calculations'
import { slotName, statNames, type Slot } from './model'

export interface EquipmentPreviewProps {
  lang: Lang
  preview: EquippedRow
  candidate: boolean
  level: number
  model: PreviewSnapshot
  onClose: () => void
  onEquip: () => void
  onReplace: (slot: Slot) => void
  onChooseGem: (slot: Slot, index: number) => void
  onRemoveGem: (slot: Slot, index: number) => void
}

export function EquipmentPreview({
  lang,
  preview,
  candidate,
  level,
  model,
  onClose,
  onEquip,
  onReplace,
  onChooseGem,
  onRemoveGem,
}: EquipmentPreviewProps) {
  return (
    <div
      className="gear-preview-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="gear-preview"
        role="dialog"
        aria-modal="true"
        aria-label={copy(lang, '装备速览', 'Equipment quick view', '裝備快速預覽')}
      >
        <header>
          <div>
            <span>
              {slotName(preview.slot, lang)} ·{' '}
              {candidate
                ? copy(lang, '装备前预览', 'Preview before equipping', '裝備前預覽')
                : copy(lang, '速览', 'Quick view', '快速預覽')}
            </span>
            <h2>
              {pick(preview.item.name, lang)} <NgBadge tier={preview.item.ngTier} />
            </h2>
          </div>
          <button onClick={onClose} aria-label={copy(lang, '关闭', 'Close', '關閉')}>
            <X />
          </button>
        </header>
        <div className="gear-preview-title">
          <img
            className={`rarity-border ${preview.item.rarity}`}
            src={asset(preview.item.iconPath)}
            alt=""
          />
          <div>
            <b>Lv {preview.item.level}</b>
            {preview.item.set && <span>{pick(preview.item.set, lang)}</span>}
            <div className="gear-preview-requirements">
              <small className={level >= preview.item.requiredLevel ? 'ok' : 'blocked'}>
                {copy(
                  lang,
                  `需求等级 ${preview.item.requiredLevel || '—'}`,
                  `Requires level ${preview.item.requiredLevel || '—'}`,
                  `需求等級 ${preview.item.requiredLevel || '—'}`,
                )}
              </small>
              {model.requirements.map((requirement) => (
                <small className={requirement.ok ? 'ok' : 'blocked'} key={requirement.stat}>
                  {pick(statNames[requirement.stat], lang)} {requirement.value}
                </small>
              ))}
            </div>
          </div>
        </div>
        <div className="gear-preview-values">
          {preview.item.damagePerSecond && (
            <div>
              <span>{copy(lang, '每秒伤害', 'Damage per Second', '每秒傷害')}</span>
              <b>
                {Math.round(preview.item.damagePerSecond[0])}
                {preview.item.damagePerSecond[1] !== preview.item.damagePerSecond[0]
                  ? `–${Math.round(preview.item.damagePerSecond[1])}`
                  : ''}
              </b>
            </div>
          )}
          {preview.item.speed != null && (
            <div>
              <span>{copy(lang, '攻击间隔', 'Attack Interval', '攻擊間隔')}</span>
              <b>{preview.item.speed.toFixed(2)}s</b>
            </div>
          )}
          {Boolean(model.damage[0] || model.damage[1]) && (
            <div>
              <span>{copy(lang, '基础伤害', 'Base damage', '基礎傷害')}</span>
              <b>
                {Math.round(model.damage[0])}–{Math.round(model.damage[1])}
              </b>
            </div>
          )}
          {Boolean(model.armor[0] || model.armor[1]) && (
            <div>
              <span>{copy(lang, '基础护甲', 'Base armor', '基礎護甲')}</span>
              <b>
                {Math.round(model.armor[0])}–{Math.round(model.armor[1])}
              </b>
            </div>
          )}
        </div>
        {preview.item.effects.length > 0 && (
          <section>
            <h3>{copy(lang, '装备效果', 'Equipment effects', '裝備效果')}</h3>
            <ul>
              {preview.item.effects.map((effect, index) => (
                <li key={`${effect.type}-${index}`}>
                  {effect.text ? pick(effect.text, lang) : effect.type}
                </li>
              ))}
            </ul>
          </section>
        )}
        {preview.item.setBonuses.length > 0 && (
          <details className="gear-preview-set">
            <summary>
              <span>{copy(lang, '套装效果', 'Set bonuses', '套裝效果')}</span>
              <b>{preview.item.set && pick(preview.item.set, lang)}</b>
              <ChevronDown size={18} />
            </summary>
            <ul>
              {preview.item.setBonuses.map((effect, index) => (
                <li key={`${effect.pieces}-${effect.type}-${index}`}>
                  <b>
                    {effect.pieces} {copy(lang, '件', 'pieces', '件')}
                  </b>
                  <span>{effect.text ? pick(effect.text, lang) : effect.type}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {model.sockets.length > 0 && (
          <section className="gear-preview-sockets">
            <h3>{copy(lang, '插槽', 'Sockets', '插槽')}</h3>
            <div>
              {model.sockets.map((row) => (
                <article key={row.index}>
                  <span className="socket-index">
                    <Gem size={15} />
                    {row.index + 1}
                  </span>
                  {row.gem ? (
                    <>
                      <img src={asset(row.gem.iconPath)} alt="" />
                      <span>
                        <b>
                          {pick(row.gem.name, lang)} <NgBadge tier={row.gem.ngTier} />
                        </b>
                        <small>
                          Lv {row.gem.level} ·{' '}
                          {row.effects
                            .map((effect) => (effect.text ? pick(effect.text, lang) : effect.type))
                            .join(' · ')}
                        </small>
                      </span>
                      <button onClick={() => onChooseGem(preview.slot, row.index)}>
                        {copy(lang, '更换', 'Replace', '更換')}
                      </button>
                      <button
                        className="clear-gem"
                        onClick={() => onRemoveGem(preview.slot, row.index)}
                        aria-label={copy(lang, '移除镶嵌物', 'Remove socketable', '移除鑲嵌物')}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="choose-gem"
                      onClick={() => onChooseGem(preview.slot, row.index)}
                    >
                      {copy(lang, '选择镶嵌物', 'Choose socketable', '選擇鑲嵌物')}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        <footer>
          {candidate ? (
            <button className="preview-replace" onClick={onEquip}>
              <Shield size={16} />
              {copy(lang, '装备到栏位', 'Equip item', '裝備至欄位')}
            </button>
          ) : (
            <button className="preview-replace" onClick={() => onReplace(preview.slot)}>
              <RefreshCw size={16} />
              {copy(lang, '更换装备', 'Replace item', '更換裝備')}
            </button>
          )}
          <button onClick={onClose}>{copy(lang, '关闭', 'Close', '關閉')}</button>
        </footer>
      </section>
    </div>
  )
}
