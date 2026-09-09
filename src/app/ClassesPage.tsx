import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { classPresentation } from '../data'
import {
  asset,
  type ClassSkillSummary,
  type DbClass,
  type DbClassSkill,
  type DbSkillRank,
  type SkillGraphs,
} from '../domain'
import { copy, pick, tr } from '../i18n'
import { NumberInput } from '../NumberInput'
import type { Lang } from '../types'
import { EffectLine, graphValue } from './EffectLine'
import { originalName, PageHeader, SectionTitle } from '../WikiUi'

export function ClassesPage({
  lang,
  classId,
  classes,
  skills,
  selectedSkill,
  skillGraphs,
  skillHref,
  classHref,
  heading,
}: {
  lang: Lang
  classId: string
  classes: DbClass[]
  skills: ClassSkillSummary[]
  selectedSkill: DbClassSkill
  skillGraphs: SkillGraphs
  skillHref: (skill: ClassSkillSummary) => string
  classHref: (classId: string) => string
  heading?: string
}) {
  const hero = classes.find((item) => item.id === classId) ?? classes[0]
  const trees = hero.trees.map((tree) => ({
    ...tree,
    skills: skills.filter((skill) => skill.classId === hero.id && skill.treeId === tree.id),
  }))
  const tree = trees.find((item) => item.id === selectedSkill.treeId) ?? trees[0]
  const preservedScroll = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (preservedScroll.current === null) return
    window.scrollTo(0, preservedScroll.current)
    preservedScroll.current = null
  }, [selectedSkill.id])
  const preserveScroll = () => {
    preservedScroll.current = window.scrollY
  }
  return (
    <>
      <PageHeader section={tr(lang, 'navClasses')} title={heading ?? tr(lang, 'classesTitle')}>
        {copy(
          lang,
          '选择职业和技能树，查看游戏说明、每级数值与阶段奖励。',
          'Choose a class and skill tree to inspect its in-game description, rank values and tier bonuses.',
          '選擇職業與技能樹，查看遊戲說明、各級數值與階段獎勵。',
        )}
      </PageHeader>
      <div className="content page-body">
        <div className="segmented class-tabs">
          {classes.map((item) => (
            <Link
              key={item.id}
              className={item.id === hero.id ? 'active' : ''}
              to={classHref(item.id)}
              preventScrollReset
            >
              <span style={{ color: classPresentation[item.id].accent }}>
                {classPresentation[item.id].monogram}
              </span>
              {pick(item.name, lang)}
            </Link>
          ))}
        </div>
        <section className="class-overview">
          <div>
            <span className="label">{hero.name.en}</span>
            <h2>{pick(hero.name, lang)}</h2>
            <p>{pick(hero.description, lang)}</p>
          </div>
        </section>
        <div className="skill-layout">
          <section>
            <div className="section-row">
              <SectionTitle eyebrow={tr(lang, 'skillTrees')} title={pick(tree.name, lang)} />
              <div className="segmented tree-tabs">
                {trees.map((item) => (
                  <Link
                    className={item.id === tree.id ? 'active' : ''}
                    to={skillHref(item.skills[0]!)}
                    key={item.id}
                    preventScrollReset
                    onClick={preserveScroll}
                  >
                    {pick(item.name, lang)} <small>{item.skills.length}</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="skill-table">
              {tree.skills.map((skill) => (
                <Link
                  key={skill.id}
                  className={selectedSkill.id === skill.id ? 'active' : ''}
                  to={skillHref(skill)}
                  preventScrollReset
                  onClick={preserveScroll}
                >
                  <img src={asset(skill.iconPath)} alt="" />
                  <span>
                    <b>{pick(skill.name, lang)}</b>
                    <small>
                      {skill.kind === 'active' ? tr(lang, 'active') : tr(lang, 'passive')} ·{' '}
                      {tr(lang, 'unlocks')} {skill.level}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </Link>
              ))}
            </div>
          </section>
          <SkillPanel
            key={selectedSkill.id}
            skill={selectedSkill}
            lang={lang}
            skillGraphs={skillGraphs}
          />
        </div>
      </div>
    </>
  )
}

export function SkillPanel({
  skill,
  lang,
  skillGraphs,
}: {
  skill: DbClassSkill
  lang: Lang
  skillGraphs: SkillGraphs
}) {
  const [rank, setRank] = useState(1)
  const [characterLevel, setCharacterLevel] = useState(100)
  const selectedRank = skill.ranks.find((item) => item.rank === rank) || skill.ranks[0]
  const metricUsesCharacterLevel = (metric: DbSkillRank['metrics'][number]) =>
    Boolean(metric.scalingGraph && metric.kind !== 'manaCost' && metric.kind !== 'manaPerSecond')
  const hasLevelScaling = Boolean(
    selectedRank?.effects.some((effect) => effect.scalingGraph) ||
      selectedRank?.metrics.some(metricUsesCharacterLevel),
  )
  useEffect(() => {
    if (selectedRank) setCharacterLevel(selectedRank.requiredLevel || skill.level)
  }, [selectedRank?.rank, skill.level])
  return (
    <aside className="skill-panel">
      <div className="skill-heading">
        <img src={asset(skill.iconPath)} alt="" />
        <div>
          <span className="label">
            {skill.kind === 'active' ? tr(lang, 'active') : tr(lang, 'passive')} ·{' '}
            {tr(lang, 'unlocks')} {skill.level}
          </span>
          <h2>{pick(skill.name, lang)}</h2>
          {originalName(skill.name, lang) && (
            <small className="original-name">{skill.name.en}</small>
          )}
        </div>
      </div>
      <p className="skill-description">{pick(skill.description, lang)}</p>
      {skill.requirement && (
        <div className="skill-requirement">
          <b>{tr(lang, 'requirement')}</b>
          <span>{pick(skill.requirement, lang)}</span>
        </div>
      )}
      {skill.ranks.length > 0 && (
        <section className="rank-section">
          <div className="rank-controls">
            <div className="rank-control">
              <label htmlFor={`rank-${skill.id}`}>
                {tr(lang, 'rank')} <strong>{rank}</strong> / {skill.maxRank}
              </label>
              <input
                id={`rank-${skill.id}`}
                type="range"
                min="1"
                max={skill.maxRank}
                value={rank}
                onChange={(event) => setRank(Number(event.target.value))}
              />
            </div>
            {hasLevelScaling && (
              <label className="skill-character-level">
                <span>{tr(lang, 'characterLevel')}</span>
                <NumberInput
                  min={selectedRank?.requiredLevel || 1}
                  max={100}
                  value={characterLevel}
                  onChange={setCharacterLevel}
                />
              </label>
            )}
          </div>
          <h3>{tr(lang, 'skillValues')}</h3>
          {selectedRank &&
          (selectedRank.description ||
            selectedRank.metrics.length ||
            selectedRank.effects.length) ? (
            <>
              {selectedRank.description && (
                <p className="rank-description">{pick(selectedRank.description, lang)}</p>
              )}
              {selectedRank.metrics.length > 0 && (
                <div className="skill-metrics">
                  {selectedRank.metrics.map((metric, index) => {
                    const value = metricUsesCharacterLevel(metric)
                      ? (graphValue(skillGraphs[metric.scalingGraph as string], characterLevel) ??
                        metric.value)
                      : metric.value
                    return (
                      <div key={`${metric.kind}-${index}`}>
                        <span>{tr(lang, metric.kind)}</span>
                        <b>
                          {metric.kind === 'weaponDamagePct' || metric.kind === 'chargeScalePct'
                            ? `${value}%`
                            : value}
                        </b>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedRank.effects.length > 0 && (
                <ul className="display-effect-list">
                  {selectedRank.effects.map((effect, index) => (
                    <EffectLine
                      key={`${effect.type}-${index}`}
                      effect={effect}
                      lang={lang}
                      playerLevel={characterLevel}
                      skillGraphs={skillGraphs}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="empty-values">{tr(lang, 'noRankValues')}</p>
          )}
        </section>
      )}
      {skill.tiers.length > 0 && (
        <section className="tier-bonuses">
          <h3>{tr(lang, 'tierBonuses')}</h3>
          {skill.tiers.map((tier) => (
            <div key={tier.rank}>
              <b>
                {tr(lang, 'rank')} {tier.rank}
              </b>
              <p>{pick(tier.text, lang)}</p>
            </div>
          ))}
        </section>
      )}
    </aside>
  )
}
