// ============================================================================
// Momentum Lab — canonical data model.
//
// This file is the single source of truth for the shape of Momentum Lab's data.
// As we split the app into per-screen modules and later add the Raspberry Pi
// sync server, both the app and the server will import these types — so the
// meaning of an Experiment, Note, etc. can never drift between client and
// server. The running app (src/app.ts) will be migrated onto these types
// screen by screen in the next steps.
// ============================================================================

export type FoundationId =
  | 'body' | 'mind' | 'habits' | 'think' | 'values' | 'comm' | 'spirit';

export type NoteType = 'book' | 'principle' | 'reminder' | 'insight';
export type Verdict = 'Keep' | 'Iterate' | 'Kill' | 'Inconclusive';
export type ExperimentStatus = 'Planned' | 'Running' | 'Closed';
export type MetricDir = 'up' | 'down';
export type ItemStatus = 'testing' | 'keep' | 'drop';

// Sync housekeeping — added in Phase B, present on every syncable record.
export interface SyncMeta {
  updatedAt?: number;   // epoch ms of last change
  deleted?: boolean;    // tombstone, so deletions sync like any other change
}

export interface Metric {
  id: string;
  name: string;
  unit: string;
  dir: MetricDir;       // is higher or lower better?
  baseline: number | null;
  target: number | null;
}

export interface LogEntry {
  id: string;
  date: string;                       // YYYY-MM-DD
  note: string;
  values: Record<string, number>;     // metricId -> value
}

export interface Media {
  id: string;
  type: 'before' | 'after';
  date: string;
  caption: string;
  dataUrl: string;                    // base64 (will become a file ref on the Pi)
}

export interface AAR {
  worked?: string;
  failed?: string;
  lesson?: string;
}

export interface WeeklyNote { date: string; text: string; }

export interface Experiment extends SyncMeta {
  id: string;
  title: string;
  foundations: FoundationId[];
  hypothesis: string;
  successCriteria: string;
  start: string;
  end: string;
  status: ExperimentStatus;
  weight?: number;                    // importance, feeds The Base score
  metrics: Metric[];
  logs: LogEntry[];
  media: Media[];
  weeklyNotes: WeeklyNote[];
  aar: AAR;
  verdict: Verdict | '';
  closedAt?: string;
}

export interface RoutineItem {
  id: string;
  name: string;
  tag: string;
  status: ItemStatus;
  note: string;
}

export interface Routine extends SyncMeta {
  id: string;
  title: string;
  foundations: FoundationId[];
  items: RoutineItem[];
  done: Record<string, string[]>;     // date -> itemIds completed that day
  created: string;
}

export interface Note extends SyncMeta {
  id: string;
  date: string;
  type: NoteType;
  title: string;
  body: string;
  source: string;
}

export interface Idea extends SyncMeta {
  id: string;
  text: string;
  foundation: FoundationId;
  status: 'raw' | 'testing' | 'proven' | 'dropped';
}

export interface AppState {
  meta: { name: string; created: string };
  experiments: Experiment[];
  routines: Routine[];
  notes: Note[];
  ideas: Idea[];
}

export interface Foundation {
  id: FoundationId;
  name: string;
  color: string;
}

export const FOUNDATIONS: Foundation[] = [
  { id: 'body',   name: 'Body',          color: '#ef6a4a' },
  { id: 'mind',   name: 'Mind',          color: '#4aa3ef' },
  { id: 'habits', name: 'Habits',        color: '#d4a72c' },
  { id: 'think',  name: 'Thinking',      color: '#9b6bef' },
  { id: 'values', name: 'Values',        color: '#36cf80' },
  { id: 'comm',   name: 'Communication', color: '#ef4a9b' },
  { id: 'spirit', name: 'Spirit',        color: '#4ad6d6' }
];
