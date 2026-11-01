// Référence : le sprint 7 a commencé le 19 octobre 2026, chaque sprint dure 3 semaines.
export const REF_SPRINT = 7;
export const REF_START = new Date(2026, 9, 19);
export const SPRINT_DAYS = 21;

export const BACKLOG = 'backlog';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sprintStart(n) {
  return addDays(REF_START, (n - REF_SPRINT) * SPRINT_DAYS);
}

export function sprintEnd(n) {
  const d = sprintStart(n + 1);
  d.setDate(d.getDate() - 1);
  return d;
}

export function sprintAt(date) {
  let n = REF_SPRINT;
  while (date < sprintStart(n)) n--;
  while (date >= sprintStart(n + 1)) n++;
  return n;
}

export function sprintId(n) {
  return `sprint-${n}`;
}

// Numéro de sprint d'une colonne, ou null pour le backlog.
export function sprintOf(column) {
  const m = /^sprint-(\d+)$/.exec(column || '');
  return m ? Number(m[1]) : null;
}

const fmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function sprintDates(n) {
  return `${fmt.format(sprintStart(n))} → ${fmt.format(sprintEnd(n))}`;
}
