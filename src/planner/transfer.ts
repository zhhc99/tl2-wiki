import { type DbEquipment as PlannerEquipment } from '../domain'
import {
  activeGemEffects,
  buildSocketCount,
  classBases,
  emptyLoadout,
  isClassCompatible,
  itemFitsSlot,
  slots,
  statNames,
  twoHanded,
  type BuildState,
  type SocketLoadout,
  type Stat,
} from './model'
import { copy } from '../i18n'
import { localizedPath } from '../paths'
import type { Lang } from '../types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clampedInteger = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.trunc(value)))
    : fallback

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const base64UrlToBytes = (value: string) => {
  if (!value || value.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('invalid build data')
  const base64 = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

const compressText = async (value: string) => {
  const stream = new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const decompressText = async (bytes: Uint8Array) => {
  const input = new Uint8Array(bytes.length)
  input.set(bytes)
  const reader = new Blob([input.buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 100000) {
      await reader.cancel()
      throw new Error('build data too large')
    }
    chunks.push(value)
  }
  const output = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(output)
}

export type ImportError = 'empty' | 'format' | 'version' | 'class'

export type ParseBuildResult = { state: BuildState; skipped: number } | { error: ImportError }

export const serializeBuild = async (
  { classId, level, allocated, loadout, socketLoadout }: BuildState,
  lang: Lang,
) => {
  const equipment = Object.fromEntries(
    slots.flatMap((slot) => (loadout[slot] ? [[slot, loadout[slot]]] : [])),
  )
  const gems = Object.fromEntries(
    slots.flatMap((slot) =>
      socketLoadout[slot]?.some(Boolean) ? [[slot, socketLoadout[slot]]] : [],
    ),
  )
  const json = JSON.stringify({
    version: 1,
    classId,
    level,
    attributes: allocated,
    equipment,
    gems,
  })
  const buildCode = `TL2BUILD/1:${bytesToBase64Url(await compressText(json))}`
  const buildUrl = `https://zhhc99.github.io/tl2-wiki${localizedPath(lang, 'builds')}`
  return copy(
    lang,
    `Torchlight II Build\n\n在 Build Planner 中导入：\n${buildUrl}\n\n${buildCode}`,
    `Torchlight II Build\n\nImport into Build Planner:\n${buildUrl}\n\n${buildCode}`,
    `Torchlight II Build\n\n在 Build Planner 中匯入：\n${buildUrl}\n\n${buildCode}`,
  )
}

export const parseBuild = async (
  text: string,
  items: PlannerEquipment[],
): Promise<ParseBuildResult> => {
  const source = text.trim()
  if (!source) return { error: 'empty' }
  const match = source.match(/TL2BUILD\/(\d+):([A-Za-z0-9_-]+)/)
  if (!match) return { error: 'format' }
  if (match[1] !== '1') return { error: 'version' }
  let value: unknown
  try {
    value = JSON.parse(await decompressText(base64UrlToBytes(match[2])))
  } catch {
    return { error: 'format' }
  }
  if (!isRecord(value)) return { error: 'format' }
  if (value.version !== 1) return { error: 'version' }
  if (typeof value.classId !== 'string' || !Object.hasOwn(classBases, value.classId))
    return { error: 'class' }
  const classId = value.classId
  const attributes = isRecord(value.attributes) ? value.attributes : {}
  const allocated = Object.fromEntries(
    (Object.keys(statNames) as Stat[]).map((stat) => [
      stat,
      clampedInteger(attributes[stat], 0, 495, 0),
    ]),
  ) as Record<Stat, number>
  const level = clampedInteger(value.level, 1, 100, 100)
  const equipment = isRecord(value.equipment) ? value.equipment : {}
  const gems = isRecord(value.gems) ? value.gems : {}
  const byId = new Map(items.map((item) => [item.id, item]))
  const loadout = emptyLoadout()
  const socketLoadout: SocketLoadout = {}
  let skipped = 0
  for (const slot of slots) {
    const id = equipment[slot]
    if (id == null) continue
    const item = typeof id === 'string' ? byId.get(id) : null
    if (!item || !itemFitsSlot(item, slot) || !isClassCompatible(item, classId)) {
      skipped += 1
      continue
    }
    loadout[slot] = item.id
  }
  const main = loadout.main ? byId.get(loadout.main) : null
  if (main && twoHanded.has(main.subtype) && loadout.off) {
    loadout.off = null
    skipped += 1
  }
  for (const slot of slots) {
    const item = loadout[slot] ? byId.get(loadout[slot] as string) : null
    const ids = gems[slot]
    if (!item || !Array.isArray(ids)) continue
    const values: (string | null)[] = []
    for (const id of ids.slice(0, buildSocketCount(item))) {
      const gem = typeof id === 'string' ? byId.get(id) : null
      if (gem?.category === 'socketable' && activeGemEffects(gem, item).length) {
        values.push(gem.id)
      } else {
        values.push(null)
        if (id != null) skipped += 1
      }
    }
    if (values.some(Boolean)) socketLoadout[slot] = values
  }
  return { state: { classId, level, allocated, loadout, socketLoadout }, skipped }
}
