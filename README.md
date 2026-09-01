# Fantasy Football Offline Draft Tracker

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=lanceheld_offline-draft&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=lanceheld_offline-draft)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=lanceheld_offline-draft&metric=coverage)](https://sonarcloud.io/summary/new_code?id=lanceheld_offline-draft)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=lanceheld_offline-draft&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=lanceheld_offline-draft)
[![Security issues](https://sonarcloud.io/api/project_badges/measure?project=lanceheld_offline-draft&metric=software_quality_security_issues)](https://sonarcloud.io/summary/new_code?id=lanceheld_offline-draft)

A single-page app for tracking an in-person (offline) fantasy football draft. Load a
ranked player list from a CSV, then use it as a live draft board: check players off as
they're drafted, track who's on your own roster vs. drafted by other coaches, and get
warnings when you're about to draft a player who clashes with your bye weeks or team
stacking. All data is stored locally in the browser (IndexedDB) — there is no backend,
account system, or network sync.

## Why this exists

Draft night for an offline fantasy league usually means someone tracking picks on a
spreadsheet or a stack of printed rankings. This app replaces that with an interactive
board: sortable/filterable player rankings, one-click "drafted by me" / "drafted by
someone else" toggles, a live roster summary against your league's position limits, and
visual clash warnings (bye week overlaps, same-team stacking) so you can draft faster
and with fewer mistakes.

## Core features

- **CSV import** — upload a rankings CSV (see format below) to populate the player
  pool. Re-uploading with players already on the board prompts for confirmation, since
  it replaces all players and clears every coach's draft status.
- **Draft board table** — all players in one sortable, filterable table:
  - Sort by rank, position, name, team, or bye week.
  - Filter by position (multi-select) and by name (substring search).
  - Two checkboxes per row: **Mine** (drafted by the active coach) and **Other**
    (drafted by someone outside the tracked coaches). Rows drafted by you are
    highlighted green; rows drafted by another tracked coach or marked "other" are
    highlighted red. A player already drafted by another tracked coach shows that
    coach's name and can't be re-marked.
  - **Clash indicators** on undrafted rows: a bye-week warning icon if you already
    have a player at the same position with the same bye week, and a team-stack icon
    if you already have a player at the same position from the same NFL team.
- **Multi-coach tracking** — add, rename, and remove coaches from a single browser
  session (useful when one person is running the board for the whole draft table).
  Switch the "active coach" to mark picks for whoever is currently on the clock; each
  coach's roster and drafted players are tracked independently. At least one coach
  must always exist.
- **Roster summary sidebar** — for the active coach, a live count of total players
  drafted against the league roster size, plus a per-position breakdown (drafted /
  limit) with the drafted players listed under each position and their bye week.
- **Persistent local storage** — players, coaches, and the active coach selection are
  saved to IndexedDB as you go, so a page refresh (or closing/reopening the browser)
  doesn't lose draft progress.

## CSV format

The uploaded file must be a CSV with a header row containing at least these columns
(case-insensitive, matched by name rather than position):

| Column     | Type   | Notes                                                          |
| ---------- | ------ | -------------------------------------------------------------- |
| `rank`     | number | Overall rank, used for the default sort order.                 |
| `position` | string | Must be one of `QB`, `RB`, `WR`, `TE`, `K`, `DP`, `DST`, `HC`. |
| `name`     | string | Player (or team/coach, for DST/HC) name.                       |
| `team`     | string | NFL team abbreviation, used for team-stack clash detection.    |
| `bye`      | number | Bye week, used for bye-week clash detection.                   |

Rows that fail validation (invalid rank/position/bye, missing name/team) are skipped
and reported in an error dialog after upload; valid rows are still imported. A sample
file is included at [data/players.csv](data/players.csv).

## Roster limits

Position limits used for the roster summary are defined in
[src/@types/RosterLimits.ts](src/@types/RosterLimits.ts) and currently are:

| Position | Limit |
| -------- | ----- |
| QB       | 2     |
| RB       | 5     |
| WR       | 5     |
| TE       | 2     |
| K        | 2     |
| DST      | 2     |
| DP       | 2     |
| HC       | 2     |

Edit `ROSTER_LIMITS` in that file to match your league's roster construction.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev server and build
- [MUI (Material UI) 9](https://mui.com/) for components
- [idb](https://github.com/jakearchibald/idb) as an IndexedDB wrapper for persistence
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [uuid](https://github.com/uuidjs/uuid) for generating player/coach IDs
- [Jest](https://jestjs.io/) + [Testing Library](https://testing-library.com/) for tests
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting

There is no backend: all app state lives in the browser's IndexedDB, scoped to the
origin the app is served from.

## Getting started

```sh
npm install
npm run dev
```

Then open the printed local URL and upload a rankings CSV to begin.

## Scripts

| Command              | Description                                     |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Start the Vite dev server.                      |
| `npm run build`      | Type-check (`tsc -b`) and build for production. |
| `npm run preview`    | Preview the production build locally.           |
| `npm run lint`       | Run oxlint.                                     |
| `npm test`           | Run the Jest test suite.                        |
| `npm run test:watch` | Run Jest in watch mode.                         |

## Project structure

```text
src/
  App.tsx                    # top-level layout: app bar, player table, roster summary
  main.tsx                   # React root, theme provider
  index.css                  # global styles
  csv.ts                     # CSV parsing/validation into Player[]
  db.ts                      # IndexedDB persistence (players, coaches, meta)
  @enums/
    ActionType.ts             # AppContext reducer action type tags
    Position.ts               # POSITIONS list + Position type
    ResolutionType.ts         # how a removed coach's players are resolved (other/undrafted)
    SortableColumn.ts         # player table sortable column keys
    SortDirection.ts          # asc/desc
  @types/
    Actions.ts                # AppContext reducer action union
    AppContextValue.ts        # shape of the useAppContext() value (state + actions)
    AppState.ts               # reducer state shape (players, coaches, activeCoachId, loaded)
    Coach.ts                  # Coach type
    ColumnDef.ts               # player table column definition
    CsvParseResult.ts         # { players, errors } shape returned by csv.ts
    DraftDB.ts                 # idb DBSchema for IndexedDB (players/coaches/meta stores)
    Player.ts                  # Player type, positions
    RosterLimits.ts             # Roster limits (ROSTER_LIMITS, ROSTER_SIZE)
  hooks/
    useAppContext.ts           # AppContext instance + useAppContext() hook
  state/
    AppContext.tsx              # global app state (reducer) + persistence side effects
  components/
    CsvUploader.tsx             # file upload + replace-confirmation + error reporting
    CoachManager.tsx            # add/rename/remove coaches, active coach selector
    PlayerTable.tsx             # sortable/filterable draft board with clash detection
    PositionFilter.tsx          # position multi-select filter popover
    NameFilter.tsx               # name search filter popover
    RosterSummary.tsx           # active coach's roster progress by position
```

## Data persistence & privacy

All player rankings, coach names, and draft picks are stored only in your browser's
IndexedDB — nothing is sent to a server. Data is scoped per-browser-profile, so it
won't sync across devices or browsers. Clearing site data (or using a different
browser/profile) resets the draft board.
