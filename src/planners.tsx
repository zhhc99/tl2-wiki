import { useEffect, useMemo, useState } from 'react'
import { copy } from './i18n'
import { type DbClass, type DbEquipment as PlannerEquipment } from './domain'
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
  changeClass,
  classBases,
  emptyBuild,
  equipItem,
  normalizeBuild,
  removeItem as removeBuildItem,
  type BuildState,
  type Slot,
} from './planner/model'
import { parseBuild, serializeBuild } from './planner/transfer'

export function BuildsPage({
  lang,
  items,
  classes,
  onLoadItems,
}: {
  lang: Lang
  items: PlannerEquipment[]
  classes: DbClass[]
  onLoadItems: () => void
}) {
  const [build, setBuild] = useState<BuildState>(emptyBuild)
  const [picker, setPicker] = useState<Slot | null>(null)
  const [gemPicker, setGemPicker] = useState<{ slot: Slot; index: number } | null>(null)
  const [previewSlot, setPreviewSlot] = useState<Slot | null>(null)
  const [candidate, setCandidate] = useState<EquippedRow | null>(null)
  const [query, setQuery] = useState('')
  const [gemQuery, setGemQuery] = useState('')
  const [restored, setRestored] = useState(false)
  const [transfer, setTransfer] = useState<TransferDialogState | null>(null)
  const [notice, setNotice] = useState('')
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  useEffect(() => {
    if (restored) return
    try {
      const saved = JSON.parse(localStorage.getItem('tl2-build') || 'null')
      if (saved) {
        const initial = emptyBuild()
        const restoredBuild: BuildState = {
          ...initial,
          classId:
            typeof saved.classId === 'string' && Object.hasOwn(classBases, saved.classId)
              ? saved.classId
              : initial.classId,
          level: typeof saved.level === 'number' ? saved.level : initial.level,
          allocated: { ...initial.allocated, ...saved.allocated },
          loadout: { ...initial.loadout, ...saved.loadout },
          socketLoadout: saved.socketLoadout || {},
        }
        setBuild(restoredBuild)
        if (Object.values(restoredBuild.loadout).some(Boolean)) onLoadItems()
      }
    } catch {
      /* ignore invalid old data */
    }
    setRestored(true)
  }, [onLoadItems, restored])
  useEffect(() => {
    if (!restored || !items.length) return
    setBuild((current) => normalizeBuild(current, byId))
  }, [byId, items.length, restored])
  useEffect(() => {
    if (restored)
      try {
        localStorage.setItem('tl2-build', JSON.stringify(build))
      } catch {
        /* storage may be unavailable */
      }
  }, [build, restored])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const { classId, level, allocated, loadout, socketLoadout } = build

  const planner = useMemo(
    () => calculatePlannerSnapshot({ ...build, byId, lang }),
    [build, byId, lang],
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
            socketLoadout,
            byId,
            planner,
          })
        : null,
    [preview, candidate, socketLoadout, byId, planner],
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
    setBuild((current) => equipItem(current, candidate.slot, candidate.item))
    setCandidate(null)
    setPreviewSlot(null)
  }
  const chooseGem = (gem: PlannerEquipment) => {
    if (!gemPicker) return
    const { slot, index } = gemPicker
    setBuild((current) => {
      const values = [...(current.socketLoadout[slot] || [])]
      values[index] = gem.id
      return { ...current, socketLoadout: { ...current.socketLoadout, [slot]: values } }
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
    setBuild(emptyBuild())
    setPreviewSlot(null)
    setCandidate(null)
    setGemPicker(null)
  }
  const removeItem = (slot: Slot) => {
    setBuild((current) => removeBuildItem(current, slot))
    if (previewSlot === slot) setPreviewSlot(null)
  }
  const openItemPicker = (slot: Slot) => {
    onLoadItems()
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
    setBuild((current) => {
      const values = [...(current.socketLoadout[slot] || [])]
      values[index] = null
      return { ...current, socketLoadout: { ...current.socketLoadout, [slot]: values } }
    })
  }
  const exportBuild = async () => {
    let text: string
    try {
      text = await serializeBuild(build, lang)
    } catch {
      setNotice(
        copy(
          lang,
          '暂时无法生成配装代码。',
          'Build code could not be generated right now.',
          '目前無法產生配裝代碼。',
        ),
      )
      return
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setNotice(copy(lang, '配装代码已复制。', 'Build code copied.', '配裝代碼已複製。'))
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
          ? copy(lang, '请先粘贴配装代码。', 'Paste a build code first.', '請先貼上配裝代碼。')
          : result.error === 'version'
            ? copy(
                lang,
                '此配装版本不受支持。',
                'This build uses an unsupported version.',
                '此配裝版本不受支援。',
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
                  '无法读取这段配装代码，请确认内容完整。',
                  'This build code could not be read. Check that it is complete.',
                  '無法讀取這段配裝代碼，請確認內容完整。',
                )
      setTransfer({ ...transfer, message })
      return
    }
    const { state, skipped } = result
    setBuild(state)
    setPreviewSlot(null)
    setCandidate(null)
    setPicker(null)
    setGemPicker(null)
    setTransfer(null)
    setNotice(
      skipped
        ? copy(
            lang,
            `配装已导入，已跳过 ${skipped} 个不可用条目。`,
            `Build imported; ${skipped} unavailable entries were skipped.`,
            `配裝已匯入，已略過 ${skipped} 個不可用項目。`,
          )
        : copy(lang, '配装已导入。', 'Build imported.', '配裝已匯入。'),
    )
  }
  const retryCopy = async () => {
    if (!transfer || transfer.mode !== 'export') return
    try {
      await navigator.clipboard.writeText(transfer.text)
      setTransfer(null)
      setNotice(copy(lang, '配装代码已复制。', 'Build code copied.', '配裝代碼已複製。'))
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
  const changeBuildClass = (classId: string) => {
    setBuild((current) => changeClass(current, classId, byId))
    setPreviewSlot(null)
    setCandidate(null)
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
        classes={classes}
        classId={classId}
        level={level}
        allocated={allocated}
        loadout={loadout}
        socketLoadout={socketLoadout}
        byId={byId}
        planner={planner}
        onClassChange={changeBuildClass}
        onLevelChange={(level) => setBuild((current) => ({ ...current, level }))}
        onAllocatedChange={(stat, value) =>
          setBuild((current) => ({
            ...current,
            allocated: { ...current.allocated, [stat]: value },
          }))
        }
        onOpenImport={() => {
          onLoadItems()
          setTransfer({ mode: 'import', text: '', message: '' })
        }}
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
            setBuild((current) => removeBuildItem(current, picker))
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
