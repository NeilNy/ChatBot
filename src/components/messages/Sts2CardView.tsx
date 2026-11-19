import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
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
    players: '玩家',
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
    more: '展开全部 {n} 条',
    me: '本人',
    community: '社区对比',
    communityShort: '社区',
    growth: '月度成长',
    moreData: '补充数据',
    sample: '样本',
    deckWin: '卡组胜率',
    confidence: '置信度',
    offered: '报价',
    ownedWin: '拿后胜率',
    finalRelics: '最终遗物',
    deathCauses: '常见死因',
    damaging: '高伤害遭遇',
    avgDamage: '平均伤害',
    timesSeen: '出现',
    avgBlock: '平均格挡',
    energy: '能量效率',
    brief: '简介',
    standard: '标准',
    detail: '详细',
    level: '卡片层级',
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
    players: 'players',
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
    more: 'Show all {n}',
    me: 'You',
    community: 'Community',
    communityShort: 'Community',
    growth: 'Monthly growth',
    moreData: 'More data',
    sample: 'Sample',
    deckWin: 'Deck WR',
    confidence: 'Confidence',
    offered: 'Offered',
    ownedWin: 'WR owned',
    finalRelics: 'Final relics',
    deathCauses: 'Common deaths',
    damaging: 'Hardest encounters',
    avgDamage: 'Avg damage',
    timesSeen: 'Seen',
    avgBlock: 'Avg block',
    energy: 'Energy',
    brief: 'Brief',
    standard: 'Standard',
    detail: 'Detailed',
    level: 'Card detail level',
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
  control,
  children,
}: {
  title: string
  subtitle?: string
  badge?: string
  control?: ReactNode
  children: ReactNode
}) => (
  <section className={styles.card}>
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <IconSpadeOutline14 />
          SKADA
        </div>
        {control}
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

const Segmented = ({
  value,
  onChange,
}: {
  value: Sts2CardLevel
  onChange: (value: Sts2CardLevel) => void
}) => {
  const c = useCopy()
  return (
    <div className={styles.segmented} role="group" aria-label={c.level}>
      {(
        [
          [1, c.brief],
          [2, c.standard],
          [3, c.detail],
        ] as const
      ).map(([level, label]) => (
        <button
          key={level}
          type="button"
          aria-pressed={value === level}
          className={clsx(styles.segment, value === level && styles.segmentActive)}
          onClick={() => onChange(level)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

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
  control,
}: {
  value: Sts2Profile
  locale: string
  level: Sts2CardLevel
  control: ReactNode
}) => {
  const c = useCopy()
  const s = value.summary ?? {}
  const p = value.percentiles ?? {}
  const records = value.records ?? {}
  const characters = value.characters ?? []
  const runs = value.recent_runs ?? []
  const top = (v: number | undefined) =>
    typeof v === 'number' ? fill(c.top, { p: Math.max(0, 100 - v).toFixed(0) }) : '—'
  const runsToShow = level === 3 ? 20 : level === 2 ? 5 : 0
  return (
    <Shell
      title={value.player_name ?? c.profile}
      subtitle={fill(c.runs, { n: s.total_runs ?? 0 })}
      badge={fill(c.ascension, { a: s.max_ascension_victory ?? 0 })}
      control={control}
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

          {level === 3 && value.radar ? (
            <>
              <div className={styles.sectionTitle}>{c.community}</div>
              <div className={styles.compare}>
                <div className={`${styles.compareRow} ${styles.compareHeader}`}>
                  <span />
                  <span>{c.me}</span>
                  <span>{c.communityShort}</span>
                </div>
                {[
                  [c.winRate, pct(value.radar.player?.win_rate), pct(value.radar.community?.win_rate)],
                  [c.avgFloor, (value.radar.player?.avg_floor ?? 0).toFixed(1), (value.radar.community?.avg_floor ?? 0).toFixed(1)],
                  [c.bestDpt, (value.radar.player?.avg_dpt ?? 0).toFixed(1), (value.radar.community?.avg_dpt ?? 0).toFixed(1)],
                  [c.avgBlock, (value.radar.player?.avg_block ?? 0).toFixed(1), (value.radar.community?.avg_block ?? 0).toFixed(1)],
                  [c.energy, pct(value.radar.player?.energy_efficiency), pct(value.radar.community?.energy_efficiency)],
                ].map(([label, player, community]) => (
                  <div className={styles.compareRow} key={label}>
                    <span>{label}</span>
                    <strong>{player}</strong>
                    <span>{community}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {level === 3 && (value.growth?.length ?? 0) > 0 ? (
            <>
              <div className={styles.sectionTitle}>{c.growth}</div>
              <div className={styles.growthGrid}>
                {value.growth?.map((item) => (
                  <div className={styles.growthCell} key={item.month}>
                    <span>{item.month}</span>
                    <strong>{pct(item.win_rate)}</strong>
                    <span className={styles.muted}>{fill(c.runs, { n: item.runs ?? 0 })}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {runsToShow > 0 ? (
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
          ) : null}
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
  control,
}: {
  template: 'cards' | 'relics'
  data: Sts2CardsData | Sts2RelicsData
  locale: string
  level: Sts2CardLevel
  control: ReactNode
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
      control={control}
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
        {rows.slice(0, Math.min(limit, 10)).map((row, index) => {
          const card = row as Sts2CardRow
          const relic = row as Sts2RelicRow
          const delta = card.win_rate_delta
          return (
            <div key={`${row.rank ?? index}-${index}`} className={styles.tableRow}>
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
        {limit > 10 && rows.length > 10 ? (
          <details className={styles.details}>
            <summary>{fill(c.more, { n: Math.min(rows.length, limit) })}</summary>
            {rows.slice(10, limit).map((row, index) => {
              const card = row as Sts2CardRow
              const relic = row as Sts2RelicRow
              const delta = card.win_rate_delta
              return (
                <div key={`${row.rank ?? index + 10}-${index}`} className={styles.tableRow}>
                  <span className={styles.rank}>{row.rank ?? index + 11}</span>
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
          </details>
        ) : null}
      </div>
      {level === 3 ? (
        <>
          <div className={styles.sectionTitle}>{c.moreData}</div>
          <div className={styles.detailList}>
            {rows.slice(0, 5).map((row, index) => {
              const card = row as Sts2CardRow
              const relic = row as Sts2RelicRow
              return (
                <div className={styles.detailRow} key={`detail-${index}`}>
                  <span className={styles.tableName}>{nameOf(row, locale)}</span>
                  <span className={styles.muted}>
                    {template === 'cards'
                      ? `${c.sample} ${(card.seen ?? 0).toLocaleString()} · ${c.deckWin} ${pct(card.deck_win_rate)} · ${card.rarity ?? '—'} · ${card.confidence ?? '—'}`
                      : `${c.offered} ${(relic.times_offered ?? 0).toLocaleString()} · ${c.hold} ${pct(relic.hold_rate)} · ${c.ownedWin} ${pct(relic.win_rate_owned)} · ${relic.rarity ?? '—'}`}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </Shell>
  )
}

const RunCard = ({
  data,
  locale,
  level,
  control,
}: {
  data: Sts2RunData
  locale: string
  level: Sts2CardLevel
  control: ReactNode
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
      control={control}
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
      {level === 3 && (data.final_relics?.length ?? 0) > 0 ? (
        <>
          <div className={styles.sectionTitle}>{c.finalRelics}</div>
          <div className={styles.relicChips}>
            {data.final_relics?.map((relic) => (
              <span className={styles.relicChip} key={relic.relic_id ?? relic.display_name?.zh}>
                {nameOf(relic, locale)}
              </span>
            ))}
          </div>
        </>
      ) : null}
      {combatsToShow > 0 ? (
        <details className={styles.details}>
          <summary>{c.combats} · {Math.min(combatsToShow, combats.length)}</summary>
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
        </details>
      ) : null}
    </Shell>
  )
}

const OverviewCard = ({
  data,
  locale,
  level,
  control,
}: {
  data: Sts2OverviewData
  locale: string
  level: Sts2CardLevel
  control: ReactNode
}) => {
  const c = useCopy()
  const characters = data.character_win_rates ?? []
  const visible = level === 1 ? characters.slice(0, 3) : characters
  return (
    <Shell
      title={c.overview}
      subtitle={data.unique_players ? `${data.unique_players.toLocaleString()} ${c.players}` : undefined}
      control={control}
    >
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
      {level === 3 && (data.death_cause_top10?.length ?? 0) > 0 ? (
        <>
          <div className={styles.sectionTitle}>{c.deathCauses}</div>
          <div className={styles.miniList}>
            {data.death_cause_top10?.slice(0, 5).map((item) => (
              <div className={styles.miniRow} key={item.death_cause ?? item.display_name?.zh}>
                <span className={styles.tableName}>{nameOf(item, locale)}</span>
                <strong>{(item.count ?? 0).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {level === 3 && (data.most_damaging_encounters?.length ?? 0) > 0 ? (
        <>
          <div className={styles.sectionTitle}>{c.damaging}</div>
          <div className={styles.miniList}>
            {data.most_damaging_encounters?.slice(0, 5).map((item) => (
              <div className={styles.miniRow} key={item.encounter ?? item.display_name?.zh}>
                <span className={styles.tableName}>{nameOf(item, locale)}</span>
                <span className={styles.muted}>
                  {c.avgDamage} {(item.avg_damage_taken ?? 0).toFixed(1)} · {c.timesSeen}{' '}
                  {(item.times_seen ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  )
}

export const Sts2CardView = ({
  template,
  level: initialLevel,
  data,
}: {
  template: Sts2CardTemplate
  level: Sts2CardLevel
  data: unknown
}) => {
  const locale = useSettings((state) => state.locale)
  const [level, setLevel] = useState<Sts2CardLevel>(initialLevel)

  useEffect(() => {
    setLevel(initialLevel)
  }, [initialLevel])

  const control = <Segmented value={level} onChange={setLevel} />

  switch (template) {
    case 'profile':
      return (
        <ProfileCard
          value={data as Sts2Profile}
          locale={locale}
          level={level}
          control={control}
        />
      )
    case 'cards':
    case 'relics':
      return (
        <RankingCard
          template={template}
          data={data as Sts2CardsData | Sts2RelicsData}
          locale={locale}
          level={level}
          control={control}
        />
      )
    case 'run':
      return <RunCard data={data as Sts2RunData} locale={locale} level={level} control={control} />
    case 'overview':
      return (
        <OverviewCard
          data={data as Sts2OverviewData}
          locale={locale}
          level={level}
          control={control}
        />
      )
    default:
      return null
  }
}
