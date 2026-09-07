import { CircleAlert, ClipboardPaste, Search, X } from 'lucide-react'
import { asset, type DbEquipment as PlannerEquipment } from '../domain'
import { copy, pick } from '../i18n'
import { NgBadge } from '../WikiUi'
import type { Lang } from '../types'
import { activeGemEffects, slotName, type Slot } from './model'

export function EquipmentPickerDialog({
  lang,
  slot,
  query,
  items,
  onQueryChange,
  onClose,
  onClear,
  onChoose,
}: {
  lang: Lang
  slot: Slot
  query: string
  items: PlannerEquipment[]
  onQueryChange: (query: string) => void
  onClose: () => void
  onClear: () => void
  onChoose: (item: PlannerEquipment) => void
}) {
  return (
    <div
      className="picker-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="item-picker">
        <header>
          <div>
            <span>{slotName(slot, lang)}</span>
            <h2>{copy(lang, '选择装备', 'Choose equipment', '選擇裝備')}</h2>
          </div>
          <button onClick={onClose} aria-label={copy(lang, '关闭', 'Close', '關閉')}>
            <X />
          </button>
        </header>
        <label className="picker-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy(
              lang,
              '搜索名称、套装或效果…',
              'Search name, set or effect…',
              '搜尋名稱、套裝或效果…',
            )}
          />
        </label>
        <div className="picker-list">
          <button className="clear-slot" onClick={onClear}>
            {copy(lang, '清空这个栏位', 'Clear this slot', '清除此欄位')}
          </button>
          {items.map((item) => (
            <button key={item.id} onClick={() => onChoose(item)}>
              <img className={`rarity-border ${item.rarity}`} src={asset(item.iconPath)} alt="" />
              <span>
                <b>
                  {pick(item.name, lang)} <NgBadge tier={item.ngTier} />
                </b>
                <small>
                  Lv {item.level}
                  {item.set ? ` · ${pick(item.set, lang)}` : ''}
                </small>
              </span>
              <em className={`rarity-dot ${item.rarity}`} />
            </button>
          ))}
          {!items.length && (
            <p>{copy(lang, '没有匹配装备。', 'No matching equipment.', '沒有符合的裝備。')}</p>
          )}
        </div>
      </section>
    </div>
  )
}

export function GemPickerDialog({
  lang,
  selection,
  equipmentItem,
  query,
  items,
  onQueryChange,
  onClose,
  onChoose,
}: {
  lang: Lang
  selection: { slot: Slot; index: number }
  equipmentItem: PlannerEquipment
  query: string
  items: PlannerEquipment[]
  onQueryChange: (query: string) => void
  onClose: () => void
  onChoose: (gem: PlannerEquipment) => void
}) {
  return (
    <div
      className="picker-backdrop gem-picker-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="item-picker gem-picker">
        <header>
          <div>
            <span>
              {slotName(selection.slot, lang)} ·{' '}
              {copy(
                lang,
                `第 ${selection.index + 1} 孔`,
                `Socket ${selection.index + 1}`,
                `第 ${selection.index + 1} 孔`,
              )}
            </span>
            <h2>{copy(lang, '选择宝石', 'Choose gem', '選擇寶石')}</h2>
          </div>
          <button onClick={onClose} aria-label={copy(lang, '关闭', 'Close', '關閉')}>
            <X />
          </button>
        </header>
        <label className="picker-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy(
              lang,
              '搜索宝石名称或效果…',
              'Search gem name or effect…',
              '搜尋寶石名稱或效果…',
            )}
          />
        </label>
        <div className="picker-list">
          {items.map((gem) => {
            const effects = activeGemEffects(gem, equipmentItem)
            return (
              <button key={gem.id} onClick={() => onChoose(gem)}>
                <img className={`rarity-border ${gem.rarity}`} src={asset(gem.iconPath)} alt="" />
                <span>
                  <b>
                    {pick(gem.name, lang)} <NgBadge tier={gem.ngTier} />
                  </b>
                  <small>
                    Lv {gem.level} ·{' '}
                    {effects
                      .map((effect) => (effect.text ? pick(effect.text, lang) : effect.type))
                      .join(' · ')}
                  </small>
                </span>
                <em className={`rarity-dot ${gem.rarity}`} />
              </button>
            )
          })}
          {!items.length && (
            <p>
              {copy(
                lang,
                '没有适用于该装备的宝石。',
                'No gems apply to this item.',
                '沒有適用於此裝備的寶石。',
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export type TransferDialogState = {
  mode: 'import' | 'export'
  text: string
  message: string
}

export function BuildTransferDialog({
  lang,
  transfer,
  onTextChange,
  onClose,
  onPaste,
  onSubmit,
}: {
  lang: Lang
  transfer: TransferDialogState
  onTextChange: (text: string) => void
  onClose: () => void
  onPaste: () => void
  onSubmit: () => void
}) {
  return (
    <div
      className="build-transfer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="build-transfer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="build-transfer-title"
      >
        <header>
          <div>
            <span>{copy(lang, '配装文字', 'Build text', '配裝文字')}</span>
            <h2 id="build-transfer-title">
              {transfer.mode === 'import'
                ? copy(lang, '导入配装', 'Import build', '匯入配裝')
                : copy(lang, '手动复制', 'Copy manually', '手動複製')}
            </h2>
          </div>
          <button onClick={onClose} aria-label={copy(lang, '关闭', 'Close', '關閉')}>
            <X />
          </button>
        </header>
        <div className="build-transfer-body">
          <p>
            {transfer.mode === 'import'
              ? copy(
                  lang,
                  '粘贴其他玩家分享的配装文字。',
                  'Paste build text shared by another player.',
                  '貼上其他玩家分享的配裝文字。',
                )
              : copy(
                  lang,
                  '复制下方文字即可分享这套配装。',
                  'Copy the text below to share this build.',
                  '複製下方文字即可分享這套配裝。',
                )}
          </p>
          <textarea
            autoFocus
            spellCheck={false}
            readOnly={transfer.mode === 'export'}
            value={transfer.text}
            onFocus={(event) => transfer.mode === 'export' && event.currentTarget.select()}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={
              transfer.mode === 'import'
                ? copy(lang, '在此粘贴配装文字…', 'Paste build text here…', '在此貼上配裝文字…')
                : undefined
            }
          />
          {transfer.message && (
            <p className="transfer-message" role="status">
              <CircleAlert size={16} />
              {transfer.message}
            </p>
          )}
        </div>
        <footer>
          {transfer.mode === 'import' && (
            <button className="paste-build" onClick={onPaste}>
              <ClipboardPaste size={16} />
              {copy(lang, '从剪贴板粘贴', 'Paste from clipboard', '從剪貼簿貼上')}
            </button>
          )}
          <button className="transfer-primary" onClick={onSubmit}>
            {transfer.mode === 'import'
              ? copy(lang, '导入配装', 'Import build', '匯入配裝')
              : copy(lang, '再次复制', 'Copy again', '再次複製')}
          </button>
        </footer>
      </section>
    </div>
  )
}
