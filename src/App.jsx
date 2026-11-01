import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Kanban, Editor, Willow } from '@svar-ui/react-kanban';
import { Button, Globals, Locale, context } from '@svar-ui/react-core';
import { fr } from '@svar-ui/kanban-locales';
import { fr as coreFr } from '@svar-ui/core-locales';

import FeatureCard from './FeatureCard.jsx';
import EpicsView from './EpicsView.jsx';
import { EpicsContext } from './epics.js';
import { FEATURE_TYPES, NO_TYPE } from './types.js';
import { BACKLOG, sprintAt, sprintDates, sprintId } from './sprints.js';
import {
  MAX_SPRINTS,
  NUMERIC_FIELDS,
  cleanCard,
  isValidRange,
  exportFile,
  importFile,
  loadState,
  newId,
  saveState,
  toNumber,
} from './storage.js';

const NEW_CARD = {
  label: 'Nouvelle feature',
  type: '',
  points: 0,
  specVersion: '',
  appVersion: '',
  jira: '',
  daysSpent: 0,
};

const NO_EPIC_ID = 'none';

const getEditorItems = (epics) => [
  { comp: 'text', key: 'label', label: 'Feature', required: true },
  {
    comp: 'richselect',
    key: 'type',
    label: 'Type',
    options: FEATURE_TYPES.map(({ id, label }) => ({ id, label })),
  },
  {
    comp: 'richselect',
    key: 'epic',
    label: 'Epic',
    options: [
      { id: NO_EPIC_ID, label: '— Sans epic —' },
      ...epics.map(({ id, name }) => ({ id, label: name })),
    ],
  },
  { comp: 'text', key: 'jira', label: 'N° Jira' },
  { comp: 'text', key: 'points', label: 'Points de complexité' },
  { comp: 'text', key: 'specVersion', label: 'Version de spec' },
  { comp: 'text', key: 'appVersion', label: 'Version applicative' },
  { comp: 'text', key: 'daysSpent', label: 'Jours passés' },
];

// Le composant Kanban réinitialise son store dès qu'une de ces props change :
// on lui passe des références stables.
const FILTERS = new Map();
const CARD_SHAPE = { menu: true };

function sumBy(cards, column, field) {
  return cards.filter((c) => c.column === column).reduce((s, c) => s + toNumber(c[field]), 0);
}

function columnLabel(id, n, cards) {
  const pts = sumBy(cards, id, 'points');
  const title = n == null ? 'Backlog\n ' : `Sprint ${n}\n${sprintDates(n)}`;
  return `${title}\nΣ ${pts} pts`;
}

function buildColumns(range, cards, current) {
  const cols = [{ id: BACKLOG, label: columnLabel(BACKLOG, null, cards), css: 'col-backlog' }];
  for (let n = range.from; n <= range.to; n++) {
    const id = sprintId(n);
    cols.push({
      id,
      label: columnLabel(id, n, cards),
      css: n === current ? 'col-current' : n < current ? 'col-past' : '',
      metadata: { sprint: n },
    });
  }
  return cols;
}

// Champ numérique validé à la sortie du champ ou sur Entrée (pas à chaque frappe).
function SprintInput({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  // Revient à la valeur courante ; elle sera mise à jour si la plage est acceptée.
  const commit = () => {
    onCommit(parseInt(draft, 10));
    setDraft(String(value));
  };
  return (
    <input
      type="number"
      min="1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function Board() {
  const initial = useMemo(loadState, []);
  const current = useMemo(() => sprintAt(new Date()), []);
  const { showModal } = useContext(context.helpers);

  const [range, setRange] = useState(initial.range);
  const [cards, setCards] = useState(initial.cards);
  const [epics, setEpics] = useState(initial.epics);
  const [tab, setTab] = useState('kanban');
  const editorItems = useMemo(() => getEditorItems(epics), [epics]);
  // Données fournies au Kanban à son montage ; changer `board` remonte le composant.
  const [board, setBoard] = useState(() => ({
    key: 0,
    cards: initial.cards,
    columns: buildColumns(initial.range, initial.cards, current),
  }));
  const [api, setApi] = useState(null);
  const [saved, setSaved] = useState(true);
  const fileInput = useRef(null);

  const remount = useCallback(
    (nextRange, nextCards, nextEpics) => {
      setApi(null);
      if (nextEpics) setEpics(nextEpics);
      setCards(nextCards);
      setRange(nextRange);
      setBoard((b) => ({
        key: b.key + 1,
        cards: nextCards,
        columns: buildColumns(nextRange, nextCards, current),
      }));
    },
    [current],
  );

  const init = useCallback((kanban) => {
    // Sans id fourni, SVAR crée un id « temp:// » en attente d'un serveur, qui casse l'éditeur.
    kanban.intercept('add-card', (ev) => {
      ev.id = ev.id ?? newId();
      ev.card = { ...NEW_CARD, ...ev.card };
    });
    kanban.intercept('update-card', (ev) => {
      for (const f of NUMERIC_FIELDS) if (f in ev.card) ev.card[f] = toNumber(ev.card[f]);
      if (ev.card.epic === NO_EPIC_ID) ev.card.epic = '';
    });
    const sync = () => setCards(kanban.getCards().map(cleanCard));
    for (const a of ['add-card', 'update-card', 'move-card', 'delete-card', 'duplicate-card']) {
      kanban.on(a, sync);
    }
    if (import.meta.env.DEV) window.kanban = kanban;
    setApi(kanban);
  }, []);

  // Filtre par type : aucun type sélectionné = toutes les features.
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const matchesFilter = useCallback(
    (card) => typeFilter.size === 0 || typeFilter.has(card.type || ''),
    [typeFilter],
  );
  const visibleCards = useMemo(() => cards.filter(matchesFilter), [cards, matchesFilter]);

  function toggleType(id) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    api?.exec('filter-cards', { filter: typeFilter.size ? matchesFilter : null, tag: 'type' });
  }, [api, typeFilter, matchesFilter]);

  // Met à jour la somme des points (des features affichées) dans l'en-tête de chaque colonne.
  useEffect(() => {
    if (!api) return;
    for (const col of buildColumns(range, visibleCards, current)) {
      api.exec('update-column', { id: col.id, column: { label: col.label } });
    }
  }, [api, visibleCards, range, current]);

  useEffect(() => {
    setSaved(saveState({ range, epics, cards }));
  }, [range, epics, cards]);

  function addEpic(name) {
    setEpics((prev) => [...prev, { id: newId(), name }]);
  }

  function renameEpic(id, name) {
    setEpics((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  }

  async function deleteEpic(id) {
    const epic = epics.find((e) => e.id === id);
    const linked = cards.filter((c) => c.epic === id);
    try {
      await showModal({
        title: `Supprimer l'epic « ${epic?.name} » ?`,
        message: linked.length
          ? `${linked.length} feature(s) resteront sur le kanban, sans epic.`
          : 'Elle ne contient aucune feature.',
      });
    } catch {
      return;
    }
    for (const c of linked) api?.exec('update-card', { id: c.id, card: { epic: '' } });
    setEpics((prev) => prev.filter((e) => e.id !== id));
  }

  function openFeature(id) {
    api?.exec('select-card', { id });
  }

  function addFeatureToEpic(epic) {
    api?.exec('add-card', { card: { column: BACKLOG, epic }, edit: true });
  }

  // Les features d'un sprint retiré de l'affichage repassent dans le backlog.
  function changeRange(next) {
    if (next.from === range.from && next.to === range.to) return;
    if (!isValidRange(next)) {
      showModal({
        title: 'Plage invalide',
        message: `Choisissez de 1 à ${MAX_SPRINTS} sprints consécutifs.`,
        buttons: ['ok'],
      }).catch(() => {});
      return;
    }
    const visible = new Set([BACKLOG]);
    for (let n = next.from; n <= next.to; n++) visible.add(sprintId(n));
    const hidden = cards.filter((c) => !visible.has(c.column));
    if (hidden.length) {
      showModal({
        title: 'Masquer des sprints ?',
        message: `${hidden.length} feature(s) seront déplacées dans le backlog.`,
      }).then(
        () => remount(next, cards.map((c) => (visible.has(c.column) ? c : { ...c, column: BACKLOG }))),
        () => {},
      );
    } else {
      remount(next, cards);
    }
  }

  function addFeature() {
    api?.exec('add-card', { card: { column: BACKLOG }, edit: true });
  }

  async function onImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await importFile(file);
      await showModal({
        title: 'Importer ce fichier ?',
        message: `${data.cards.length} feature(s), ${data.epics.length} epic(s). Les données actuelles seront remplacées.`,
      });
      remount(data.range, data.cards, data.epics);
    } catch (err) {
      if (err) alert(`Import impossible : ${err.message || err}`);
    }
  }

  async function deleteCurrent() {
    const data = api?.getState().editorData;
    if (!data) return;
    try {
      await showModal({ title: 'Supprimer cette feature ?', message: 'Action irréversible.' });
    } catch {
      return;
    }
    api.exec('delete-card', { id: data.id });
    api.exec('select-card', { id: null });
  }

  const bottomBar = {
    items: [
      { comp: 'button', id: 'delete', text: 'Supprimer', type: 'danger', onClick: deleteCurrent },
      { comp: 'spacer' },
      { comp: 'button', id: 'close', text: 'Annuler' },
      { comp: 'button', id: 'save', text: 'Enregistrer', type: 'primary' },
    ],
  };

  // Ferme la modale une fois la carte mise à jour par l'éditeur (d'où le différé).
  function onEditorSave() {
    setTimeout(() => api?.exec('select-card', { id: null }));
  }

  const totalPoints = visibleCards.reduce((s, c) => s + toNumber(c.points), 0);
  const totalDays = visibleCards.reduce((s, c) => s + toNumber(c.daysSpent), 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>Sprint Kanban</h1>
          <span className="app-sub">
            Sprint en cours : <strong>{current}</strong> ({sprintDates(current)})
          </span>
        </div>
        <nav className="app-tabs" role="tablist">
          {[
            ['kanban', 'Kanban'],
            ['epics', `Epics (${epics.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="app-range" hidden={tab !== 'kanban'}>
          <label>
            Sprints
            <SprintInput value={range.from} onCommit={(from) => changeRange({ ...range, from })} />
          </label>
          <label>
            à
            <SprintInput value={range.to} onCommit={(to) => changeRange({ ...range, to })} />
          </label>
        </div>
        <div className="app-stats">
          <span>
            {typeFilter.size ? `${visibleCards.length} / ${cards.length}` : cards.length} features
          </span>
          <span>Σ {totalPoints} pts</span>
          <span>{totalDays} j passés</span>
          {!saved && <span className="warn">Non sauvegardé (stockage local indisponible)</span>}
        </div>
        <div className="app-legend" role="group" aria-label="Filtrer par type">
          <span className="app-legend-title">Filtrer :</span>
          {[...FEATURE_TYPES, NO_TYPE].map((t) => (
            <button
              key={t.id}
              type="button"
              className={typeFilter.has(t.id) ? 'active' : ''}
              aria-pressed={typeFilter.has(t.id)}
              style={{ '--type-color': t.color }}
              onClick={() => toggleType(t.id)}
            >
              <i />
              {t.label}
            </button>
          ))}
          {typeFilter.size > 0 && (
            <button type="button" className="clear" onClick={() => setTypeFilter(new Set())}>
              Tous
            </button>
          )}
        </div>
        <div className="app-actions">
          <Button type="primary" onClick={addFeature}>
            + Feature
          </Button>
          <Button onClick={() => exportFile({ range, epics, cards })}>Exporter</Button>
          <Button onClick={() => fileInput.current?.click()}>Importer</Button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onImport} />
        </div>
      </header>
      {/* Le Kanban reste monté (simplement masqué) pour garder son état et son éditeur. */}
      <EpicsContext.Provider value={epics}>
        <div className="app-board" hidden={tab !== 'kanban'}>
          <Kanban
            key={board.key}
            cards={board.cards}
            columns={board.columns}
            filters={FILTERS}
            card={CARD_SHAPE}
            cardContent={FeatureCard}
            init={init}
          />
        </div>
      </EpicsContext.Provider>
      {tab === 'epics' && (
        <EpicsView
          epics={epics}
          cards={visibleCards}
          onAdd={addEpic}
          onRename={renameEpic}
          onDelete={deleteEpic}
          onOpen={openFeature}
          onAddFeature={addFeatureToEpic}
        />
      )}
      {api && (
        <Editor
          api={api}
          items={editorItems}
          bottomBar={bottomBar}
          topBar={false}
          autoSave={false}
          placement="modal"
          onSave={onEditorSave}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Willow fonts={false}>
      <Locale words={{ ...coreFr, ...fr }}>
        <Globals>
          <Board />
        </Globals>
      </Locale>
    </Willow>
  );
}
