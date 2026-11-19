import type { ReactNode } from 'react'
import { IconSpadeOutline14 } from '../base/icons.js'
import type {
  Sts2CardLevel,
  Sts2CardRow,
  Sts2CardsData,
  Sts2CardTemplate,
  Sts2OverviewData,
  Sts2Profile,
  Sts2RelicRow,
  Sts2RelicsData,
  Sts2RunData,
} from '../../services/api/sts2.js'
import { useSettings } from '../../services/settings.js'
import styles from './Sts2CardView.module.css'

const COPY = {
  zh: {
    profile: '玩家档案',
    cards: '卡牌排行',
    relics: '遗物排行',
    run: '对局详情',
    overview: '环境总览',
    winRate: '胜率',
    totalRuns: '总对局',
    wins: '胜利',
    losses: '失败',
    maxA: '最高 A',
    avgFloor: '平均层数',
    avgAsc: '平均攀升',
    avgTime: '平均时长',
    daysActive: '活跃天数',
    records: '纪录',
    fastestWin: '最快胜利',
    maxHit: '最高单击',
    bestDpt: '最佳 DPT',
    highestA: '最高攀升胜利',
    top: 'Top {p}%',
    characters: '角色',
    recentRuns: '最近对局',
    victory: '胜利',
    defeat: '失败',
    abandoned: '放弃',
    floor: '{n} 层',
    floorLabel: '层数',
    ascension: 'A{a}',
    ascensionLabel: '攀升',
    duration: '时长',
    date: '日期',
    death: '死因',
    combats: '战斗记录',
    turns: '{n} 回合',
    rank: '#',
    name: '名称',
    character: '角色',
    score: 'Score',
    pick: 'Pick%',
    hold: 'Hold%',
    wrPick: 'WR拿',
    wrSkip: 'WR跳',
    delta: 'Delta',
    rarity: '稀有度',
    runs: '{n} 局',
    winRateOf: '胜率 {p}%',
    maxAOf: '最高 A{a}',
    noData: '没有可展示的数据',
  },
  en: {
    profile: 'Player Profile',
    cards: 'Card Ranking',
    relics: 'Relic Ranking',
    run: 'Run Detail',
    overview: 'Meta Overview',
    winRate: 'Win rate',
    totalRuns: 'Runs',
    wins: 'Wins',
    losses: 'Losses',
    maxA: 'Max A',
    avgFloor: 'Avg floor',
    avgAsc: 'Avg ascension',
    avgTime: 'Avg time',
    daysActive: 'Active days',
    records: 'Records',
    fastestWin: 'Fastest win',
    maxHit: 'Max hit',
    bestDpt: 'Best DPT',
    highestA: 'Highest win',
    top: 'Top {p}%',
    characters: 'Characters',
    recentRuns: 'Recent runs',
    victory: 'Victory',
    defeat: 'Defeat',
    abandoned: 'Abandoned',
    floor: 'Floor {n}',
    floorLabel: 'Floor',
    ascension: 'A{a}',
    ascensionLabel: 'Ascension',
    duration: 'Time',
    date: 'Date',
    death: 'Death',
    combats: 'Combats',
    turns: '{n} turns',
    rank: '#',
    name: 'Name',
    character: 'Character',
    score: 'Score',
    pick: 'Pick%',
    hold: 'Hold%',
    wrPick: 'WR pick',
    wrSkip: 'WR skip',
    delta: 'Delta',
    rarity: 'Rarity',
    runs: '{n} runs',
    winRateOf: 'Win {p}%',
    maxAOf: 'Max A{a}',
    noData: 'No data to display',
  },
}

type Copy = typeof COPY.zh

const useCopy = (): Copy => {
  const locale = useSettings((state) => state.locale)
  return locale === 'en-US' ? COPY.en : COPY.zh
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

const pct = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'

const duration = (seconds: number | undefined) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '—'
  }
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}`
    : `${minutes}:${String(total % 60).padStart(2, '0')}`
}

const date = (value: string | undefined) => (value ? value.slice(0, 10) : '—')

const nameOf = (
  value: {
    display_name?: { zh?: string; en?: string }
    card_name?: { zh?: string; en?: string }
    relic_name?: { zh?: string; en?: string }
    character_name?: { zh?: string; en?: string }
  },
  locale: string
) =>
  (locale === 'en-US'
    ? value.display_name?.en ?? value.card_name?.en ?? value.relic_name?.en ?? value.character_name?.en
    : value.display_name?.zh ?? value.card_name?.zh ?? value.relic_name?.zh ?? value.character_name?.zh) ||
  value.display_name?.zh ||
  value.card_name?.zh ||
  value.relic_name?.zh ||
  value.character_name?.zh ||
  '—'

const combatName = (
  combat: {
    encounter_name?: { zh?: string; en?: string }
    encounter_display_name?: { zh?: string; en?: string }
    encounter?: string
  },
  locale: string
) =>
  (locale === 'en-US'
    ? combat.encounter_display_name?.en ?? combat.encounter_name?.en
    : combat.encounter_display_name?.zh ?? combat.encounter_name?.zh) ||
  combat.encounter ||
  '—'

const Shell = ({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  children: ReactNode
}) => (
  <section className={styles.card}>
    <header className={styles.header}>
      <div className={styles.brand}>
        <IconSpadeOutline14 />
        SKADA
      </div>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>{title}</h3>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </div>
      {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
    </header>
    <div className={styles.body}>{children}</div>
  </section>
)

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.stat}>
    <span className={styles.statValue}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
)

const RecordItem = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.record}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)

const ProfileCard = ({
  value,
  locale,
  level,
}: {
  value: Sts2Profile
  locale: string
  level: Sts2CardLevel
}) => {
  const c = useCopy()
  const s = value.summary ?? {}
  const p = value.percentiles ?? {}
  const records = value.records ?? {}
  const characters = value.characters ?? []
  const runs = value.recent_runs ?? []
  const top = (v: number | undefined) =>
    typeof v === 'number' ? fill(c.top, { p: Math.max(0, 100 - v).toFixed(0) }) : '—'
  const runsToShow = level === 3 ? 20 : 8
  return (
    <Shell
      title={value.player_name ?? c.profile}
      subtitle={fill(c.runs, { n: s.total_runs ?? 0 })}
      badge={fill(c.ascension, { a: s.max_ascension_victory ?? 0 })}
    >
      <div className={styles.hero}>
        <div>
          <div className={styles.winRate}>{pct(s.win_rate)}</div>
          <div className={styles.heroLabel}>{c.winRate}</div>
        </div>
        <div className={styles.heroStat}>
          <strong>{s.total_runs ?? 0}</strong>
          <span>{c.totalRuns}</span>
        </div>
        <div className={styles.heroStat}>
          <strong>
            {s.victories ?? 0}/{s.defeats ?? 0}
          </strong>
          <span>
            {c.wins} / {c.losses}
          </span>
        </div>
        <div className={styles.heroStat}>
          <strong>{(s.avg_floor ?? 0).toFixed(1)}</strong>
          <span>{c.avgFloor}</span>
        </div>
      </div>

      <div className={styles.statGrid}>
        <Stat label={c.avgAsc} value={`A${(s.avg_ascension ?? 0).toFixed(1)}`} />
        <Stat label={c.avgTime} value={duration(s.avg_duration_sec)} />
        <Stat label={c.daysActive} value={String(s.days_active ?? '—')} />
        <Stat label={c.highestA} value={fill(c.ascension, { a: records.highest_ascension_victory ?? 0 })} />
      </div>

      {level >= 2 ? (
        <>
          <div className={styles.chips}>
            <span className={styles.chip}>{c.winRate} {top(p.win_rate)}</span>
            <span className={styles.chip}>{c.avgFloor} {top(p.avg_floor)}</span>
            <span className={styles.chip}>{c.bestDpt} {top(p.avg_dpt)}</span>
          </div>

          <div className={styles.sectionTitle}>{c.records}</div>
          <div className={styles.records}>
            <RecordItem label={c.fastestWin} value={duration(records.fastest_win_sec)} />
            <RecordItem label={c.maxHit} value={records.max_hit?.toFixed(0) ?? '—'} />
            <RecordItem label={c.bestDpt} value={records.best_dpt?.toFixed(1) ?? '—'} />
            <RecordItem label={c.highestA} value={fill(c.ascension, { a: records.highest_ascension_victory ?? 0 })} />
          </div>

          <div className={styles.sectionTitle}>{c.characters}</div>
          <div className={styles.characters}>
            {characters.map((character) => (
              <div key={character.character} className={styles.character}>
                <div className={styles.characterTop}>
                  <span>{nameOf(character, locale)}</span>
                  <span className={styles.muted}>{fill(c.runs, { n: character.runs ?? 0 })}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${Math.min(100, character.win_rate ?? 0)}%` }}
                  />
                </div>
                <div className={styles.characterMeta}>
                  <span>{fill(c.winRateOf, { p: (character.win_rate ?? 0).toFixed(1) })}</span>
                  <span>{fill(c.maxAOf, { a: character.max_ascension_victory ?? 0 })}</span>
                </div>
              </div>
            ))}
          </div>

          <details className={styles.details}>
            <summary>{c.recentRuns} · {Math.min(runsToShow, runs.length)}</summary>
            <div className={styles.runs}>
              {runs.slice(0, runsToShow).map((run, index) => (
                <div key={run.run_id ?? index} className={styles.run}>
                  <span className={run.is_victory ? styles.victory : styles.defeat}>
                    {run.is_victory ? c.victory : run.abandoned ? c.abandoned : c.defeat}
                  </span>
                  <span>{fill(c.ascension, { a: run.ascension ?? 0 })}</span>
                  <span>{fill(c.floor, { n: run.floor_reached ?? 0 })}</span>
                  <span>{nameOf(run, locale)}</span>
                  <span className={styles.muted}>{duration(run.duration_sec)}</span>
                  <span className={styles.muted}>{date(run.created_at)}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : null}
    </Shell>
  )
}

const RankingCard = ({
  template,
  data,
  locale,
  level,
}: {
  template: 'cards' | 'relics'
  data: Sts2CardsData | Sts2RelicsData
  locale: string
  level: Sts2CardLevel
}) => {
  const c = useCopy()
  const cards = (data as Sts2CardsData).cards ?? []
  const relics = (data as Sts2RelicsData).relics ?? []
  const rows = template === 'cards' ? cards : relics
  const limit = level === 1 ? 5 : level === 2 ? 10 : 20
  const subtitle = nameOf(
    { display_name: data.character_filter_name } as Sts2CardRow,
    locale
  )
  return (
    <Shell
      title={template === 'cards' ? c.cards : c.relics}
      subtitle={subtitle !== '—' ? subtitle : undefined}
    >
      <div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
          <span>{c.rank}</span>
          <span>{c.name}</span>
          <span>{template === 'cards' ? c.character : c.rarity}</span>
          <span>{template === 'cards' ? c.score : c.hold}</span>
          <span>{c.wrPick}</span>
          <span>{c.wrSkip}</span>
          <span>{c.delta}</span>
        </div>
        {rows.slice(0, limit).map((row, index) => {
          const card = row as Sts2CardRow
          const relic = row as Sts2RelicRow
          const delta = card.win_rate_delta
          return (
            <div key={`${row.rank ?? index}`} className={styles.tableRow}>
              <span className={styles.rank}>{row.rank ?? index + 1}</span>
              <span className={styles.tableName}>{nameOf(row, locale)}</span>
              <span className={styles.muted}>
                {template === 'cards'
                  ? card.character_name?.zh ?? card.character ?? '—'
                  : relic.rarity ?? '—'}
              </span>
              <span>{template === 'cards' ? (card.skada_score ?? 0).toFixed(1) : pct(relic.hold_rate)}</span>
              <span>{pct(row.win_rate_picked)}</span>
              <span>{pct(row.win_rate_skipped)}</span>
              <span className={delta !== undefined && delta < 0 ? styles.defeat : styles.victory}>
                {delta !== undefined ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </Shell>
  )
}

const RunCard = ({
  data,
  locale,
  level,
}: {
  data: Sts2RunData
  locale: string
  level: Sts2CardLevel
}) => {
  const c = useCopy()
  const run = data.run
  const combats = data.combats ?? []
  if (!run) {
    return <Shell title={c.run}>{c.noData}</Shell>
  }
  const combatsToShow = level === 1 ? 0 : level === 2 ? 8 : combats.length
  return (
    <Shell
      title={`${c.run} #${run.run_id ?? '—'}`}
      subtitle={[run.player_name, nameOf(run, locale), fill(c.ascension, { a: run.ascension ?? 0 })]
        .filter(Boolean)
        .join(' · ')}
      badge={run.is_victory ? c.victory : run.abandoned ? c.abandoned : c.defeat}
    >
      <div className={styles.statGrid}>
        <Stat label={c.floorLabel} value={fill(c.floor, { n: run.floor_reached ?? 0 })} />
        <Stat label={c.duration} value={duration(run.duration_sec)} />
        <Stat label={c.date} value={date(run.created_at)} />
        <Stat label={c.ascensionLabel} value={fill(c.ascension, { a: run.ascension ?? 0 })} />
      </div>
      {run.death_cause ? (
        <div className={styles.death}>
          {c.death}: {run.death_cause_name?.zh ?? run.death_cause}
        </div>
      ) : null}
      {combatsToShow > 0 ? (
        <>
          <div className={styles.sectionTitle}>{c.combats}</div>
          <div className={styles.combats}>
            {combats.slice(0, combatsToShow).map((combat, index) => (
              <div key={index} className={styles.combat}>
                <span className={styles.rank}>{combat.floor ?? '—'}</span>
                <span className={styles.tableName}>{combatName(combat, locale)}</span>
                <span className={styles.muted}>{combat.type ?? combat.enc_type ?? '—'}</span>
                <span className={styles.muted}>{fill(c.turns, { n: combat.turns ?? 0 })}</span>
                <span className={combat.won ? styles.victory : styles.defeat}>
                  {combat.won ? c.victory : c.defeat}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  )
}

const OverviewCard = ({
  data,
  locale,
  level,
}: {
  data: Sts2OverviewData
  locale: string
  level: Sts2CardLevel
}) => {
  const c = useCopy()
  const characters = data.character_win_rates ?? []
  const visible = level === 1 ? characters.slice(0, 3) : characters
  return (
    <Shell title={c.overview} subtitle={data.unique_players ? `${data.unique_players.toLocaleString()} ${c.totalRuns}` : undefined}>
      <div className={styles.statGrid}>
        <Stat label={c.totalRuns} value={(data.total_runs ?? 0).toLocaleString()} />
        <Stat label={c.winRate} value={pct(data.win_rate)} />
        <Stat label={c.avgFloor} value={(data.average_floor ?? 0).toFixed(1)} />
        <Stat label={c.avgTime} value={duration(data.avg_time)} />
      </div>
      <div className={styles.sectionTitle}>{c.characters}</div>
      <div className={styles.characters}>
        {visible.map((character) => (
          <div key={character.character} className={styles.character}>
            <div className={styles.characterTop}>
              <span>{nameOf(character, locale)}</span>
              <span className={styles.muted}>{fill(c.runs, { n: character.total_runs ?? 0 })}</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${Math.min(100, character.win_rate ?? 0)}%` }}
              />
            </div>
            <div className={styles.characterMeta}>
              <span>{fill(c.winRateOf, { p: (character.win_rate ?? 0).toFixed(1) })}</span>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}

export const Sts2CardView = ({
  template,
  level,
  data,
}: {
  template: Sts2CardTemplate
  level: Sts2CardLevel
  data: unknown
}) => {
  const locale = useSettings((state) => state.locale)
  switch (template) {
    case 'profile':
      return <ProfileCard value={data as Sts2Profile} locale={locale} level={level} />
    case 'cards':
    case 'relics':
      return (
        <RankingCard
          template={template}
          data={data as Sts2CardsData | Sts2RelicsData}
          locale={locale}
          level={level}
        />
      )
    case 'run':
      return <RunCard data={data as Sts2RunData} locale={locale} level={level} />
    case 'overview':
      return <OverviewCard data={data as Sts2OverviewData} locale={locale} level={level} />
    default:
      return null
  }
}
