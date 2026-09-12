import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router'
import {
  allText,
  asset,
  ngLabel,
  type DbClass,
  type DbEquipment,
  type EquipmentIndexEntry,
  type EquipmentSummary,
  type Rarity,
} from '../domain'
import { copy, pick, tr, type UIKey } from '../i18n'
import { SelectControl } from '../SelectControl'
import type { ItemCategory, Lang } from '../types'
import { EquipmentDrawer } from './EquipmentDrawer'
import { classRequirementName, rarityName, subtypeName } from './labels'
import { Loading, NgBadge, PageHeader } from '../WikiUi'

export function ItemsPage({
  lang,
  items,
  classes,
  searchRequest,
  onGamble,
  itemHref,
  selected,
  selectedVariants,
  documentTitle,
  onSelect,
  onClose,
  dataReady = true,
  totalCount = items.length,
}: {
  lang: Lang
  items: EquipmentSummary[]
  classes: DbClass[]
  searchRequest: string | null
  onGamble: (item: EquipmentSummary) => void
  itemHref: (item: EquipmentSummary) => string
  selected: DbEquipment | null
  selectedVariants: DbEquipment[]
  documentTitle?: string
  onSelect: (item: EquipmentSummary) => void
  onClose: () => void
  dataReady?: boolean
  totalCount?: number
}) {
  const [category, setCategory] = useState<'all' | ItemCategory>('all')
  const [rarity, setRarity] = useState<'all' | Rarity>('all')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  useEffect(() => {
    if (!searchRequest) return
    setCategory('all')
    setRarity('all')
    setLevel('all')
    setQuery(searchRequest)
  }, [searchRequest])
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === 'all' || item.category === category) &&
          (rarity === 'all' || item.rarity === rarity) &&
          (level === 'all' ||
            (level === '100'
              ? item.level >= 100
              : item.level >= Number(level) && item.level < Number(level) + 20)) &&
          ('searchText' in item
            ? (item as EquipmentIndexEntry).searchText
            : `${allText(item.name)} ${ngLabel(item.ngTier) || ''} ${item.subtype} ${item.set ? allText(item.set) : ''}`
          ).includes(query.toLowerCase()),
      ),
    [items, category, rarity, level, query],
  )
  useEffect(() => setCurrentPage(1), [category, rarity, level, query])
  const perPage = 40
  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
  const categoryKey = (value: string): UIKey =>
    value === 'weapon'
      ? 'weapon'
      : value === 'armor'
        ? 'armorCat'
        : value === 'trinket'
          ? 'trinket'
          : value === 'pet'
            ? 'petGear'
            : value === 'socketable'
              ? 'socketable'
              : 'all'
  return (
    <>
      <PageHeader
        section={tr(lang, 'navItems')}
        title={tr(lang, 'itemsTitle')}
        documentTitle={documentTitle}
      >
        {copy(
          lang,
          '按名称、类型、稀有度、等级或物品效果查找装备。',
          'Find equipment by name, type, rarity, level or item effect.',
          '依名稱、類型、稀有度、等級或裝備效果搜尋裝備。',
        )}
      </PageHeader>
      <div className="content page-body">
        <div className="data-toolbar">
          <label className="data-search">
            <Search size={16} />
            <input
              disabled={!dataReady}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy(
                lang,
                '搜索名称、类型、套装或效果…',
                'Search name, type, set or effect…',
                '搜尋名稱、類型、套裝或效果…',
              )}
            />
          </label>
          <SelectControl
            className="filter-select"
            disabled={!dataReady}
            label={copy(lang, '装备类型', 'Equipment type', '裝備類型')}
            value={category}
            onChange={(value) => setCategory(value as typeof category)}
            options={['all', 'weapon', 'armor', 'trinket', 'pet', 'socketable'].map((value) => ({
              value,
              label: tr(lang, categoryKey(value)),
            }))}
          />
          <SelectControl
            className="filter-select"
            disabled={!dataReady}
            label={copy(lang, '稀有度', 'Rarity', '稀有度')}
            value={rarity}
            onChange={(value) => setRarity(value as typeof rarity)}
            options={[
              { value: 'all', label: tr(lang, 'allRarity') },
              ...(['rare', 'unique', 'legendary'] as Rarity[]).map((value) => ({
                value,
                label: rarityName(value, lang),
              })),
            ]}
          />
          <SelectControl
            className="filter-select"
            disabled={!dataReady}
            label={copy(lang, '物品等级', 'Item level', '物品等級')}
            value={level}
            onChange={setLevel}
            options={[
              { value: 'all', label: copy(lang, '全部等级', 'All levels', '所有等級') },
              ...[0, 20, 40, 60, 80, 100].map((value) => ({
                value: String(value),
                label: `Lv ${value}${value < 100 ? `–${value + 19}` : '+'}`,
              })),
            ]}
          />
        </div>
        <div className="result-meta">
          <span>
            {(query || category !== 'all' || rarity !== 'all' || level !== 'all'
              ? filtered.length
              : totalCount
            ).toLocaleString()}{' '}
            {tr(lang, 'itemsFound')}
          </span>
          <span>
            {copy(
              lang,
              `第 ${currentPage} / ${pages} 页`,
              `Page ${currentPage} of ${pages}`,
              `第 ${currentPage} / ${pages} 頁`,
            )}
          </span>
        </div>
        {!items.length ? (
          <Loading lang={lang} />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{copy(lang, '名称', 'Name', '名稱')}</th>
                  <th>{copy(lang, '类型', 'Type', '類型')}</th>
                  <th>{copy(lang, '稀有度', 'Rarity', '稀有度')}</th>
                  <th>{tr(lang, 'level')}</th>
                  <th>{copy(lang, '职业', 'Class', '職業')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} onClick={() => onSelect(item)}>
                    <td>
                      <div className="item-name">
                        <img
                          className={`rarity-border ${item.rarity}`}
                          src={asset(item.iconPath)}
                          alt=""
                        />
                        <span>
                          <b>
                            <Link
                              to={itemHref(item)}
                              preventScrollReset
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                onSelect(item)
                              }}
                            >
                              {pick(item.name, lang)} <NgBadge tier={item.ngTier} />
                            </Link>
                          </b>
                          {item.set && <small>{pick(item.set, lang)}</small>}
                        </span>
                      </div>
                    </td>
                    <td>{subtypeName(item.subtype, lang)}</td>
                    <td>
                      <div className="item-badges">
                        <span className={`rarity ${item.rarity}`}>
                          {rarityName(item.rarity, lang)}
                        </span>
                        {item.set && (
                          <span className="set-tag">{copy(lang, '套装', 'Set', '套裝')}</span>
                        )}
                      </div>
                    </td>
                    <td>{item.level}</td>
                    <td>
                      {item.classRequirement
                        ? classRequirementName(item.classRequirement, classes, lang)
                        : ''}
                    </td>
                    <td>
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={currentPage}
          pages={pages}
          setPage={setCurrentPage}
          lang={lang}
          disabled={!dataReady}
        />
      </div>
      {selected && (
        <EquipmentDrawer
          key={selected.id}
          item={selected}
          variants={selectedVariants}
          classes={classes}
          lang={lang}
          onClose={onClose}
          onGamble={onGamble}
        />
      )}
    </>
  )
}

function Pagination({
  page,
  pages,
  setPage,
  lang,
  disabled,
}: {
  page: number
  pages: number
  setPage: (page: number) => void
  lang: Lang
  disabled: boolean
}) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={disabled || page <= 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft size={15} />
        {copy(lang, '上一页', 'Previous', '上一頁')}
      </button>
      <span>
        {page} / {pages}
      </span>
      <button disabled={disabled || page >= pages} onClick={() => setPage(page + 1)}>
        {copy(lang, '下一页', 'Next', '下一頁')}
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
