import { useState } from 'react'
import { Compass } from 'lucide-react'
import { type DbPhaseBeast } from '../domain'
import { copy, pick, tr } from '../i18n'
import type { Lang } from '../types'
import { Loading, originalName, PageHeader, SectionTitle } from '../WikiUi'

export function PhasesPage({ lang, phaseBeasts }: { lang: Lang; phaseBeasts: DbPhaseBeast[] }) {
  const [act, setAct] = useState(0)
  const filtered = phaseBeasts.filter((beast) => act === 0 || beast.act === act)
  const steps = [
    copy(
      lang,
      '每个主要室外大地图会出现一只相位兽；它发现玩家后会逃跑。',
      'A Phase Beast appears in each major outdoor overworld area and flees when it notices the player.',
      '每個主要室外大地圖會出現一隻相位獸；牠發現玩家後會逃跑。',
    ),
    copy(
      lang,
      '击杀相位兽会开启相位传送门；进入后需要完成一个短挑战。',
      'Killing it opens a Phase Portal leading to a short challenge.',
      '擊殺相位獸會開啟相位傳送門；進入後需要完成一個短挑戰。',
    ),
    copy(
      lang,
      '挑战由当前大地图决定。完成目标后领取场内奖励，再从出口离开。',
      'The current overworld area determines the challenge pool. Complete the objective, collect the room rewards, then take the exit.',
      '挑戰由目前大地圖決定。完成目標後領取場內獎勵，再從出口離開。',
    ),
  ]
  return (
    <>
      <PageHeader section={tr(lang, 'navPhases')} title={tr(lang, 'phasesTitle')}>
        {copy(
          lang,
          '先确认相位兽所在地图，再查看可能出现的挑战目标。',
          'Start with the area where the Phase Beast appears, then check its possible challenge objectives.',
          '先確認相位獸所在地圖，再查看可能出現的挑戰目標。',
        )}
      </PageHeader>
      <div className="content page-body">
        <section className="phase-guide">
          <figure>
            <img
              src={`${import.meta.env.BASE_URL}images/phase-beast.webp`}
              alt={copy(
                lang,
                '相位兽与相位传送门',
                'A Phase Beast and Phase Portal',
                '相位獸與相位傳送門',
              )}
            />
          </figure>
          <div>
            <SectionTitle
              eyebrow={copy(lang, '如何进入', 'How to enter', '如何進入')}
              title={copy(
                lang,
                '找到相位兽，开启挑战',
                'Find the beast and start the challenge',
                '找到相位獸，開啟挑戰',
              )}
            />
            <ol>
              {steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <div className="phase-toolbar">
          <SectionTitle
            eyebrow={copy(lang, '挑战地图', 'Challenge areas', '挑戰地圖')}
            title={copy(lang, '按幕查看', 'Browse by act', '按幕查看')}
          />
          <div className="segmented act-tabs">
            {[0, 1, 2, 3].map((value) => (
              <button
                key={value}
                className={act === value ? 'active' : ''}
                onClick={() => setAct(value)}
              >
                {value === 0 ? tr(lang, 'allActs') : `${tr(lang, 'act')} ${value}`}
              </button>
            ))}
          </div>
        </div>
        {!phaseBeasts.length ? (
          <Loading lang={lang} />
        ) : (
          <div className="phase-grid">
            {filtered.map((beast) => (
              <article className="phase-card" key={beast.id}>
                <header>
                  <span>
                    <Compass size={15} />
                    {tr(lang, 'act')} {beast.act}
                  </span>
                  <h2>{pick(beast.region, lang)}</h2>
                  {originalName(beast.region, lang) && <small>{beast.region.en}</small>}
                  <p>
                    {beast.challenges.length + beast.undocumented}{' '}
                    {copy(lang, '个相位房间', 'Phase rooms', '個相位房間')}
                  </p>
                </header>
                <div className="challenge-list">
                  {beast.challenges.map((challenge) => (
                    <section key={challenge.id}>
                      <span className="challenge-label">{tr(lang, 'objective')}</span>
                      <h3>{pick(challenge.name, lang)}</h3>
                      {originalName(challenge.name, lang) && <small>{challenge.name.en}</small>}
                    </section>
                  ))}
                  {beast.undocumented > 0 && (
                    <section className="undocumented-rooms">
                      <span className="challenge-label">
                        {copy(lang, '资料缺口', 'Missing text', '資料缺口')}
                      </span>
                      <p>
                        {copy(
                          lang,
                          `${beast.undocumented} 个房间没有游戏内说明。`,
                          `${beast.undocumented} rooms have no in-game instruction.`,
                          `${beast.undocumented} 個房間沒有遊戲內說明。`,
                        )}
                      </p>
                    </section>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
