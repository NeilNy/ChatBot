import { useState } from 'react'
import clsx from 'clsx'
import { IconSpadeOutline14 } from '../base/icons.js'
import type { Sts2Character, Sts2Profile, Sts2Run } from '../../services/api/sts2.js'
import { useSettings } from '../../services/settings.js'
import styles from './Sts2ProfileEmbed.module.css'

const COPY = {
  zh: {
    brand: 'SKADA // 战绩档案',
    overview: '总览',
    characters: '角色',
    runs: '最近对局',
    growth: '成长',
    totalRuns: '总对局',
    victories: '胜利',
    defeats: '失败',
    winRate: '胜率',
    avgFloor: '平均层数',
    avgAscension: '平均攀升',
    avgDuration: '平均时长',
    daysActive: '活跃天数',
    top: 'Top {p}%',
    among: '共 {n} 名玩家',
    records: '纪录',
    fastestWin: '最快胜利',
    maxHit: '最高单击',
    bestDpt: '最佳 DPT',
    avgDpt: '平均 DPT',
    highestAscension: '最高攀升胜利',
    charRuns: '{n} 局',
    charWin: '胜率 {p}%',
    charAvg: '平均 A{a}',
    charMax: '最高 A{a} 胜利',
    all: '全部',
    wins: '胜利',
    losses: '失败',
    victory: '胜利',
    defeat: '失败',
    abandoned: '放弃',
    floor: '{n} 层',
    ascension: 'A{a}',
    duration: '时长',
    date: '日期',
    death: '死因',
    version: '版本',
    runId: '对局',
    noRuns: '没有符合条件的对局',
    growthTitle: '月度成长',
    growthRuns: '{n} 局',
    growthWin: '胜率 {p}%',
    noData: '没有可展示的档案数据',
  },
  en: {
    brand: 'SKADA // RUN PROFILE',
    overview: 'Overview',
    characters: 'Characters',
    runs: 'Recent Runs',
    growth: 'Growth',
    totalRuns: 'Runs',
    victories: 'Wins',
    defeats: 'Losses',
    winRate: 'Win rate',
    avgFloor: 'Avg floor',
    avgAscension: 'Avg ascension',
    avgDuration: 'Avg time',
    daysActive: 'Active days',
    top: 'Top {p}%',
    among: 'of {n} players',
    records: 'Records',
    fastestWin: 'Fastest win',
    maxHit: 'Max hit',
    bestDpt: 'Best DPT',
    avgDpt: 'Avg DPT',
    highestAscension: 'Highest win',
    charRuns: '{n} runs',
    charWin: 'Win rate {p}%',
    charAvg: 'Avg A{a}',
    charMax: 'A{a} win',
    all: 'All',
    wins: 'Wins',
    losses: 'Losses',
    victory: 'Victory',
    defeat: 'Defeat',
    abandoned: 'Abandoned',
    floor: 'Floor {n}',
    ascension: 'A{a}',
    duration: 'Time',
    date: 'Date',
    death: 'Death',
    version: 'Version',
    runId: 'Run',
    noRuns: 'No runs match this filter',
    growthTitle: 'Monthly growth',
    growthRuns: '{n} runs',
    growthWin: 'Win rate {p}%',
    noData: 'No profile data to display',
  },
}

type Copy = typeof COPY.zh

const useCopy = (): Copy => {
  const locale = useSettings((state) => state.locale)
  return locale === 'en-US' ? COPY.en : COPY.zh
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

const formatPct = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'

const formatDuration = (seconds: number | undefined) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '—'
  }
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

const formatDate = (value: string | undefined) => (value ? value.slice(0, 10) : '—')

const charName = (character: Sts2Character | Sts2Run, locale: string) =>
  (locale === 'en-US' ? character.display_name?.en : character.display_name?.zh) ||
  character.display_name?.zh ||
  character.character ||
  '—'

export const Sts2ProfileEmbed = ({ profile }: { profile: Sts2Profile }) => {
  const c = useCopy()
  const locale = useSettings((state) => state.locale)
  const [tab, setTab] = useState<'overview' | 'characters' | 'runs' | 'growth'>('overview')
  const [runFilter, setRunFilter] = useState<'all' | 'win' | 'loss'>('all')
  const [expandedRun, setExpandedRun] = useState<number | null>(null)

  const summary = profile.summary ?? {}
  const characters = profile.characters ?? []
  const percentiles = profile.percentiles ?? {}
  const records = profile.records ?? {}
  const runs = profile.recent_runs ?? []
  const growth = profile.growth ?? []
  const totalRuns = summary.total_runs ?? 0
  const winRate = summary.win_rate ?? 0

  if (totalRuns === 0 && !profile.player_name) {
    return <div className={styles.empty}>{c.noData}</div>
  }

  const filteredRuns = runs.filter((run) =>
    runFilter === 'all' ? true : runFilter === 'win' ? run.is_victory : !run.is_victory
  )
  const maxGrowthRuns = Math.max(...growth.map((item) => item.runs ?? 0), 1)

  return (
    <section className={styles.embed}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <IconSpadeOutline14 />
          {c.brand}
        </div>
        <h3 className={styles.name}>{profile.player_name ?? '—'}</h3>
        <div className={styles.hero}>
          <div>
            <div className={styles.winRate}>{formatPct(winRate)}</div>
            <div className={styles.heroLabel}>{c.winRate}</div>
          </div>
          <div className={styles.heroStat}>
            <strong>{totalRuns}</strong>
            <span>{c.totalRuns}</span>
          </div>
          <div className={styles.heroStat}>
            <strong>
              {summary.victories ?? 0}/{summary.defeats ?? 0}
            </strong>
            <span>
              {c.victories} / {c.defeats}
            </span>
          </div>
          <div className={styles.heroStat}>
            <strong>A{summary.max_ascension_victory ?? 0}</strong>
            <span>{c.highestAscension}</span>
          </div>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist">
        {(
          [
            ['overview', c.overview],
            ['characters', c.characters],
            ['runs', c.runs],
            ['growth', c.growth],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={clsx(styles.tab, tab === value && styles.tabActive)}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className={styles.body}>
        {tab === 'overview' ? (
          <>
            <div className={styles.statGrid}>
              <Stat label={c.avgFloor} value={summary.avg_floor?.toFixed(1) ?? '—'} />
              <Stat label={c.avgAscension} value={`A${summary.avg_ascension?.toFixed(1) ?? '—'}`} />
              <Stat label={c.avgDuration} value={formatDuration(summary.avg_duration_sec)} />
              <Stat label={c.daysActive} value={String(summary.days_active ?? '—')} />
            </div>

            <div className={styles.percentiles}>
              <Percentile label={c.winRate} value={percentiles.win_rate} total={percentiles.total_players} />
              <Percentile label={c.avgFloor} value={percentiles.avg_floor} />
              <Percentile label={c.avgDpt} value={percentiles.avg_dpt} />
              <Percentile label={c.avgDuration} value={percentiles.speed} />
            </div>

            <div className={styles.sectionTitle}>{c.records}</div>
            <div className={styles.records}>
              <Record label={c.fastestWin} value={formatDuration(records.fastest_win_sec)} />
              <Record label={c.maxHit} value={records.max_hit?.toFixed(0) ?? '—'} />
              <Record label={c.bestDpt} value={records.best_dpt?.toFixed(1) ?? '—'} />
              <Record label={c.highestAscension} value={`A${records.highest_ascension_victory ?? 0}`} />
            </div>
          </>
        ) : null}

        {tab === 'characters' ? (
          <div className={styles.characterGrid}>
            {characters.map((character) => (
              <article key={character.character} className={styles.characterCard}>
                <div className={styles.characterTop}>
                  <span className={styles.characterName}>{charName(character, locale)}</span>
                  <span className={styles.characterRuns}>
                    {fill(c.charRuns, { n: character.runs ?? 0 })}
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${Math.min(100, character.win_rate ?? 0)}%` }}
                  />
                </div>
                <div className={styles.characterMeta}>
                  <span>{fill(c.charWin, { p: (character.win_rate ?? 0).toFixed(1) })}</span>
                  <span>{fill(c.charMax, { a: character.max_ascension_victory ?? 0 })}</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === 'runs' ? (
          <>
            <div className={styles.filters}>
              {(
                [
                  ['all', c.all],
                  ['win', c.wins],
                  ['loss', c.losses],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={runFilter === value}
                  className={clsx(styles.filter, runFilter === value && styles.filterActive)}
                  onClick={() => setRunFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.runs}>
              {filteredRuns.length === 0 ? <div className={styles.noRuns}>{c.noRuns}</div> : null}
              {filteredRuns.map((run, index) => {
                const key = run.run_id ?? index
                const expanded = expandedRun === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={clsx(styles.run, expanded && styles.runExpanded)}
                    aria-expanded={expanded}
                    onClick={() => setExpandedRun(expanded ? null : key)}
                  >
                    <span
                      className={clsx(
                        styles.runStatus,
                        run.is_victory ? styles.victory : styles.defeat
                      )}
                    >
                      {run.is_victory ? c.victory : run.abandoned ? c.abandoned : c.defeat}
                    </span>
                    <span className={styles.runAsc}>{fill(c.ascension, { a: run.ascension ?? 0 })}</span>
                    <span className={styles.runFloor}>{fill(c.floor, { n: run.floor_reached ?? 0 })}</span>
                    <span className={styles.runChar}>{charName(run, locale)}</span>
                    <span className={styles.runTime}>{formatDuration(run.duration_sec)}</span>
                    <span className={styles.runDate}>{formatDate(run.created_at)}</span>
                    {expanded ? (
                      <span className={styles.runDetails}>
                        {run.death_cause ? (
                          <span>
                            {c.death}: {run.death_cause}
                          </span>
                        ) : null}
                        <span>
                          {c.version}: {run.game_version ?? '—'}
                        </span>
                        <span>
                          {c.runId}: #{run.run_id ?? '—'}
                        </span>
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {tab === 'growth' ? (
          <>
            <div className={styles.sectionTitle}>{c.growthTitle}</div>
            <div className={styles.growth}>
              {growth.map((item) => (
                <div key={item.month} className={styles.growthItem}>
                  <div className={styles.growthBarWrap}>
                    <div
                      className={styles.growthBar}
                      style={{ height: `${Math.max(6, ((item.runs ?? 0) / maxGrowthRuns) * 100)}%` }}
                    />
                  </div>
                  <div className={styles.growthMonth}>{item.month ?? '—'}</div>
                  <div className={styles.growthMeta}>
                    {fill(c.growthRuns, { n: item.runs ?? 0 })}
                    <br />
                    {fill(c.growthWin, { p: (item.win_rate ?? 0).toFixed(1) })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.stat}>
    <span className={styles.statValue}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
)

const Percentile = ({
  label,
  value,
  total,
}: {
  label: string
  value: number | undefined
  total?: number
}) => {
  const c = useCopy()
  if (typeof value !== 'number') {
    return null
  }
  const top = Math.max(0, Math.min(100, 100 - value))
  return (
    <span className={styles.percentile} title={total ? fill(c.among, { n: total }) : undefined}>
      <span>{label}</span>
      <strong>{fill(c.top, { p: top.toFixed(0) })}</strong>
    </span>
  )
}

const Record = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.record}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)
