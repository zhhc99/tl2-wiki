import { useEffect, useMemo, useState } from 'react'
import { classes } from './data'
import { copy } from './i18n'
import { type DbEquipment as PlannerEquipment } from './domain'
import { PageHeader } from './WikiUi'
import type { Lang } from './types'
import {
  calculatePlannerSnapshot,
  calculatePreviewSnapshot,
  filterEquipmentForSlot,
  filterGemsForItem,
  type EquippedRow,
} from './planner/calculations'
import { BuildWorkspace } from './planner/BuildWorkspace'
import { EquipmentPreview } from './planner/EquipmentPreview'
import {
  BuildTransferDialog,
  EquipmentPickerDialog,
  GemPickerDialog,
  type TransferDialogState,
} from './planner/PlannerDialogs'
import {
  buildSocketCount,
  emptyLoadout,
  isClassCompatible,
  slots,
  twoHanded,
  type BuildState,
  type Slot,
  type SocketLoadout,
  type Stat,
} from './planner/model'
import { parseBuild, serializeBuild } from './planner/transfer'

export function BuildsPage({ lang, items }: { lang: Lang; items: PlannerEquipment[] }) {
  const [classId, setClassId] = useState('berserker')
  const [level, setLevel] = useState(100)
  const [allocated, setAllocated] = useState<Record<Stat, number>>({
    str: 0,
    dex: 0,
    foc: 0,
    vit: 0,
  })
  const [loadout, setLoadout] = useState<Record<Slot, string | null>>(emptyLoadout)
  const [socketLoadout, setSocketLoadout] = useState<SocketLoadout>({})
  const [picker, setPicker] = useState<Slot | null>(null)
  const [gemPicker, setGemPicker] = useState<{ slot: Slot; index: number } | null>(null)
  const [previewSlot, setPreviewSlot] = useState<Slot | null>(null)
  const [candidate, setCandidate] = useState<EquippedRow | null>(null)
  const [query, setQuery] = useState('')
  const [gemQuery, setGemQuery] = useState('')
  const [restored, setRestored] = useState(false)
  const [transfer, setTransfer] = useState<TransferDialogState | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tl2-build') || 'null')
      if (saved) {
        setClassId(saved.classId || 'berserker')
        setLevel(saved.level || 100)
        setAllocated((current) => ({ ...current, ...saved.allocated }))
        setLoadout({ ...emptyLoadout(), ...saved.loadout })
        setSocketLoadout(saved.socketLoadout || {})
      }
    } catch {
      /* ignore invalid old data */
    } finally {
      setRestored(true)
    }
  }, [])
  useEffect(() => {
    if (restored)
      try {
        localStorage.setItem(
          'tl2-build',
          JSON.stringify({ classId, level, allocated, loadout, socketLoadout }),
        )
      } catch {
        /* storage may be unavailable */
      }
  }, [classId, level, allocated, loadout, socketLoadout, restored])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  useEffect(() => {
    if (!restored || !items.length) return
    setLoadout((current) => {
      let changed = false
      const next = { ...current }
      for (const slot of slots) {
        const item = current[slot] ? byId.get(current[slot] as string) : null
        if (item && !isClassCompatible(item, classId)) {
          next[slot] = null
          changed = true
        }
      }
      const main = next.main ? byId.get(next.main) : null
      if (main && twoHanded.has(main.subtype) && next.off) {
        next.off = null
        changed = true
      }
      return changed ? next : current
    })
    setPreviewSlot(null)
    setCandidate(null)
  }, [classId, items, byId, restored])
  useEffect(() => {
    if (!restored || !items.length) return
    setSocketLoadout((current) => {
      let changed = false
      const next: SocketLoadout = {}
      for (const slot of slots) {
        const item = loadout[slot] ? byId.get(loadout[slot] as string) : null
        const values = (current[slot] || [])
          .slice(0, item ? buildSocketCount(item) : 0)
          .map((id) => (id && byId.get(id)?.category === 'socketable' ? id : null))
        if (values.some(Boolean)) next[slot] = values
        if (JSON.stringify(values) !== JSON.stringify(current[slot] || [])) changed = true
      }
      return changed ? next : current
    })
  }, [loadout, items.length, byId, restored])

  const planner = useMemo(
    () =>
      calculatePlannerSnapshot({
        classId,
        level,
        allocated,
        loadout,
        socketLoadout,
        byId,
        lang,
      }),
    [classId, level, allocated, loadout, socketLoadout, byId, lang],
  )
  const preview =
    candidate ||
    (previewSlot ? planner.equipped.find((row) => row.slot === previewSlot) : undefined)
  const previewModel = useMemo(
    () =>
      preview
        ? calculatePreviewSnapshot({
            preview,
            candidate: Boolean(candidate),
            level,
            socketLoadout,
            byId,
            planner,
          })
        : null,
    [preview, candidate, level, socketLoadout, byId, planner],
  )
  const pickerItems = useMemo(
    () => (picker ? filterEquipmentForSlot({ items, slot: picker, query, classId }) : []),
    [items, picker, query, classId],
  )
  const gemPickerItem =
    gemPicker && loadout[gemPicker.slot]
      ? byId.get(loadout[gemPicker.slot] as string) || null
      : null
  const gemPickerItems = useMemo(
    () => (gemPickerItem ? filterGemsForItem({ items, item: gemPickerItem, query: gemQuery }) : []),
    [items, gemPickerItem, gemQuery],
  )

  const chooseItem = (item: PlannerEquipment) => {
    if (!picker) return
    setCandidate({ slot: picker, item })
    setPicker(null)
    setQuery('')
  }
  const equipCandidate = () => {
    if (!candidate) return
    setLoadout((current) => ({
      ...current,
      [candidate.slot]: candidate.item.id,
      ...(candidate.slot === 'main' && twoHanded.has(candidate.item.subtype) ? { off: null } : {}),
    }))
    setSocketLoadout((current) => ({
      ...current,
      [candidate.slot]: [],
      ...(candidate.slot === 'main' && twoHanded.has(candidate.item.subtype) ? { off: [] } : {}),
    }))
    setCandidate(null)
    setPreviewSlot(null)
  }
  const chooseGem = (gem: PlannerEquipment) => {
    if (!gemPicker) return
    const { slot, index } = gemPicker
    setSocketLoadout((current) => {
      const values = [...(current[slot] || [])]
      values[index] = gem.id
      return { ...current, [slot]: values }
    })
    setGemPicker(null)
    setGemQuery('')
    setPreviewSlot(slot)
  }
  const closePreview = () => {
    setPreviewSlot(null)
    setCandidate(null)
  }
  const resetBuild = () => {
    setClassId('berserker')
    setLevel(100)
    setAllocated({ str: 0, dex: 0, foc: 0, vit: 0 })
    setLoadout(emptyLoadout())
    setSocketLoadout({})
    setPreviewSlot(null)
    setCandidate(null)
    setGemPicker(null)
  }
  const removeItem = (slot: Slot) => {
    setLoadout((current) => ({ ...current, [slot]: null }))
    setSocketLoadout((current) => ({ ...current, [slot]: [] }))
    if (previewSlot === slot) setPreviewSlot(null)
  }
  const openItemPicker = (slot: Slot) => {
    setPicker(slot)
    setQuery('')
  }
  const openPreview = (slot: Slot) => {
    setCandidate(null)
    setPreviewSlot(slot)
  }
  const openGemPicker = (slot: Slot, index: number) => {
    setGemPicker({ slot, index })
    setGemQuery('')
    closePreview()
  }
  const removeGem = (slot: Slot, index: number) => {
    setSocketLoadout((current) => {
      const values = [...(current[slot] || [])]
      values[index] = null
      return { ...current, [slot]: values }
    })
  }
  const currentBuild = (): BuildState => ({ classId, level, allocated, loadout, socketLoadout })
  const exportBuild = async () => {
    let text: string
    try {
      text = await serializeBuild(currentBuild())
    } catch {
      setNotice(
        copy(
          lang,
          '暂时无法生成配装文字。',
          'Build text could not be created right now.',
          '目前無法產生配裝文字。',
        ),
      )
      return
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setNotice(copy(lang, '配装文字已复制。', 'Build text copied.', '配裝文字已複製。'))
    } catch {
      setTransfer({
        mode: 'export',
        text,
        message: copy(
          lang,
          '浏览器无法写入剪贴板，请手动复制。',
          'Your browser could not write to the clipboard. Copy the text manually.',
          '瀏覽器無法寫入剪貼簿，請手動複製。',
        ),
      })
    }
  }
  const pasteBuild = async () => {
    try {
      if (!navigator.clipboard?.readText) throw new Error('clipboard unavailable')
      const text = await navigator.clipboard.readText()
      setTransfer({ mode: 'import', text, message: '' })
    } catch {
      setTransfer((current) =>
        current && current.mode === 'import'
          ? {
              ...current,
              message: copy(
                lang,
                '无法读取剪贴板，请在下方手动粘贴。',
                'Clipboard access was blocked. Paste the text below manually.',
                '無法讀取剪貼簿，請在下方手動貼上。',
              ),
            }
          : current,
      )
    }
  }
  const importBuild = async () => {
    if (!transfer || transfer.mode !== 'import') return
    if (!items.length) {
      setTransfer({
        ...transfer,
        message: copy(
          lang,
          '装备仍在加载，请稍后再试。',
          'Equipment is still loading. Try again in a moment.',
          '裝備仍在載入，請稍後再試。',
        ),
      })
      return
    }
    const result = await parseBuild(transfer.text, items)
    if ('error' in result) {
      const message =
        result.error === 'empty'
          ? copy(lang, '请先粘贴配装文字。', 'Paste build text first.', '請先貼上配裝文字。')
          : result.error === 'version'
            ? copy(
                lang,
                '此配装来自不支持的版本。',
                'This build uses an unsupported version.',
                '此配裝來自不支援的版本。',
              )
            : result.error === 'class'
              ? copy(
                  lang,
                  '配装中的职业无法识别。',
                  'The class in this build is not recognized.',
                  '無法辨識此配裝的職業。',
                )
              : copy(
                  lang,
                  '无法识别这段配装文字，请确认内容完整。',
                  'This build text could not be read. Check that it is complete.',
                  '無法辨識這段配裝文字，請確認內容完整。',
                )
      setTransfer({ ...transfer, message })
      return
    }
    const { state, skipped } = result
    setClassId(state.classId)
    setLevel(state.level)
    setAllocated(state.allocated)
    setLoadout(state.loadout)
    setSocketLoadout(state.socketLoadout)
    setPreviewSlot(null)
    setCandidate(null)
    setPicker(null)
    setGemPicker(null)
    setTransfer(null)
    setNotice(
      skipped
        ? copy(
            lang,
            `配装已导入，${skipped} 项无效内容已跳过。`,
            `Build imported; ${skipped} unavailable entries were skipped.`,
            `配裝已匯入，已略過 ${skipped} 項無效內容。`,
          )
        : copy(lang, '配装已导入。', 'Build imported.', '配裝已匯入。'),
    )
  }
  const retryCopy = async () => {
    if (!transfer || transfer.mode !== 'export') return
    try {
      await navigator.clipboard.writeText(transfer.text)
      setTransfer(null)
      setNotice(copy(lang, '配装文字已复制。', 'Build text copied.', '配裝文字已複製。'))
    } catch {
      setTransfer({
        ...transfer,
        message: copy(
          lang,
          '仍无法写入剪贴板，请选中文字后手动复制。',
          'Clipboard access is still blocked. Select the text and copy it manually.',
          '仍無法寫入剪貼簿，請選取文字後手動複製。',
        ),
      })
    }
  }
  const closeGemPicker = () => {
    if (!gemPicker) return
    setGemPicker(null)
    setGemQuery('')
    setPreviewSlot(gemPicker.slot)
  }

  return (
    <>
      <PageHeader
        section={copy(lang, '角色', 'Character', '角色')}
        title={copy(lang, '配装', 'Build planner', '配裝')}
      >
        {copy(
          lang,
          '选择职业、分配属性点并穿戴装备，集中查看属性、基础数值和装备需求。',
          'Choose a class, allocate attribute points and equip a full loadout to inspect stats, base values and requirements.',
          '選擇職業、分配屬性點並穿上裝備，集中查看屬性、基礎數值與裝備需求。',
        )}
      </PageHeader>
      <BuildWorkspace
        lang={lang}
        itemsReady={Boolean(items.length)}
        classId={classId}
        level={level}
        allocated={allocated}
        loadout={loadout}
        socketLoadout={socketLoadout}
        byId={byId}
        planner={planner}
        onClassChange={setClassId}
        onLevelChange={setLevel}
        onAllocatedChange={(stat, value) =>
          setAllocated((current) => ({ ...current, [stat]: value }))
        }
        onOpenImport={() => setTransfer({ mode: 'import', text: '', message: '' })}
        onExport={exportBuild}
        onReset={resetBuild}
        onPreview={openPreview}
        onOpenPicker={openItemPicker}
        onRemoveItem={removeItem}
      />
      {preview && previewModel && (
        <EquipmentPreview
          lang={lang}
          preview={preview}
          candidate={Boolean(candidate)}
          level={level}
          model={previewModel}
          onClose={closePreview}
          onEquip={equipCandidate}
          onReplace={(slot) => {
            openItemPicker(slot)
            closePreview()
          }}
          onChooseGem={openGemPicker}
          onRemoveGem={removeGem}
        />
      )}
      {picker && (
        <EquipmentPickerDialog
          lang={lang}
          slot={picker}
          query={query}
          items={pickerItems}
          onQueryChange={setQuery}
          onClose={() => setPicker(null)}
          onClear={() => {
            setLoadout((current) => ({ ...current, [picker]: null }))
            setSocketLoadout((current) => ({ ...current, [picker]: [] }))
            setPicker(null)
          }}
          onChoose={chooseItem}
        />
      )}
      {gemPicker && gemPickerItem && (
        <GemPickerDialog
          lang={lang}
          selection={gemPicker}
          equipmentItem={gemPickerItem}
          query={gemQuery}
          items={gemPickerItems}
          onQueryChange={setGemQuery}
          onClose={closeGemPicker}
          onChoose={chooseGem}
        />
      )}
      {transfer && (
        <BuildTransferDialog
          lang={lang}
          transfer={transfer}
          onTextChange={(text) => setTransfer({ ...transfer, text, message: '' })}
          onClose={() => setTransfer(null)}
          onPaste={pasteBuild}
          onSubmit={transfer.mode === 'import' ? importBuild : retryCopy}
        />
      )}
      {notice && (
        <div className="build-snackbar" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </>
  )
}
