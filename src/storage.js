import { REF_SPRINT, BACKLOG, sprintId } from './sprints.js';

// Tout est stocké dans le localStorage du navigateur : rien n'est envoyé ailleurs.
const KEY = 'sprint-kanban:v1';

const DEFAULT_STATE = {
  range: { from: REF_SPRINT - 1, to: REF_SPRINT + 3 },
  epics: [{ id: 'epic-exemple', name: 'Epic exemple' }],
  cards: [
    {
      id: 1,
      label: 'Exemple de feature',
      type: 'mapi',
      epic: 'epic-exemple',
      column: sprintId(REF_SPRINT),
      points: 5,
      specVersion: '1.0',
      appVersion: '2.3.0',
      jira: 'PROJ-123',
      daysSpent: 2,
    },
    {
      id: 2,
      label: 'Autre feature',
      type: 'statistiques',
      column: BACKLOG,
      points: 8,
      specVersion: '0.2',
      appVersion: '',
      jira: 'PROJ-124',
      daysSpent: 0,
    },
  ],
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // stockage indisponible ou corrompu : on repart des valeurs par défaut
  }
  return normalize(DEFAULT_STATE);
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const MAX_SPRINTS = 16;

export function isValidRange({ from, to }) {
  return from >= 1 && from <= to && to - from < MAX_SPRINTS;
}

export function normalize(state) {
  if (!state || !Array.isArray(state.cards)) throw new Error('Format invalide');
  let range = { from: Number(state.range?.from), to: Number(state.range?.to) };
  if (!isValidRange(range)) {
    range = DEFAULT_STATE.range;
  }
  const epics = (Array.isArray(state.epics) ? state.epics : [])
    .filter((e) => e && e.id != null)
    .map((e) => ({ id: String(e.id), name: String(e.name ?? '').trim() || 'Epic sans nom' }));
  const epicIds = new Set(epics.map((e) => e.id));
  // Une feature rattachée à une epic inconnue redevient « sans epic ».
  const cards = state.cards.map(cleanCard).map((c) => (epicIds.has(c.epic) ? c : { ...c, epic: '' }));
  return { range, epics, cards };
}

export const NUMERIC_FIELDS = ['points', 'daysSpent'];
const FIELDS = ['id', 'label', 'type', 'epic', 'column', 'points', 'specVersion', 'appVersion', 'jira', 'daysSpent'];

export function toNumber(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function newId() {
  return crypto.randomUUID();
}

// Ne garde que les champs métier (le store SVAR peut ajouter des champs internes).
export function cleanCard(card) {
  const out = {};
  for (const f of FIELDS) out[f] = card[f] ?? '';
  for (const f of NUMERIC_FIELDS) out[f] = toNumber(card[f]);
  if (!out.id || String(out.id).startsWith('temp://')) out.id = newId();
  return out;
}

export function exportFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sprint-kanban-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFile(file) {
  return normalize(JSON.parse(await file.text()));
}
