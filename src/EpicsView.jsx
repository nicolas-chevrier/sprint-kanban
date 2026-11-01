import { useState } from 'react';
import { Button } from '@svar-ui/react-core';

import { featureType } from './types.js';
import { sprintOf } from './sprints.js';
import { toNumber } from './storage.js';

// Backlog en dernier, puis par sprint croissant.
function bySprint(a, b) {
  const sa = sprintOf(a.column) ?? Infinity;
  const sb = sprintOf(b.column) ?? Infinity;
  return sa - sb;
}

function sprintSpan(cards) {
  const sprints = cards.map((c) => sprintOf(c.column)).filter((n) => n != null);
  if (!sprints.length) return 'Backlog';
  const min = Math.min(...sprints);
  const max = Math.max(...sprints);
  return min === max ? `Sprint ${min}` : `Sprints ${min} → ${max}`;
}

function EpicName({ name, onRename }) {
  const [draft, setDraft] = useState(name);
  const commit = () => {
    const v = draft.trim();
    if (v && v !== name) onRename(v);
    else setDraft(name);
  };
  return (
    <input
      className="epic-name"
      value={draft}
      aria-label="Nom de l'epic"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function EpicSection({ epic, cards, onRename, onDelete, onOpen, onAddFeature }) {
  const sorted = [...cards].sort(bySprint);
  const points = cards.reduce((s, c) => s + toNumber(c.points), 0);
  const days = cards.reduce((s, c) => s + toNumber(c.daysSpent), 0);

  return (
    <section className={epic ? 'epic' : 'epic epic-none'}>
      <header className="epic-head">
        {epic ? (
          <EpicName key={epic.name} name={epic.name} onRename={onRename} />
        ) : (
          <h2 className="epic-name">Sans epic</h2>
        )}
        <div className="epic-stats">
          <span>{cards.length} features</span>
          <span>Σ {points} pts</span>
          <span>{days} j passés</span>
          {cards.length > 0 && <span>{sprintSpan(cards)}</span>}
        </div>
        {epic && (
          <div className="epic-actions">
            <Button onClick={onAddFeature}>+ Feature</Button>
            <Button type="danger" onClick={onDelete}>
              Supprimer
            </Button>
          </div>
        )}
      </header>
      {sorted.length > 0 ? (
        <table className="epic-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Feature</th>
              <th>Jira</th>
              <th>Sprint</th>
              <th>Spec</th>
              <th>App</th>
              <th className="num">Pts</th>
              <th className="num">Jours</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const type = featureType(c.type);
              const n = sprintOf(c.column);
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} title="Modifier la feature">
                  <td>
                    <span className="feature-type" style={{ '--type-color': type.color }}>
                      {type.label}
                    </span>
                  </td>
                  <td className="epic-feature">{c.label}</td>
                  <td className="feature-jira">{c.jira || '—'}</td>
                  <td>{n == null ? 'Backlog' : `Sprint ${n}`}</td>
                  <td>{c.specVersion || '—'}</td>
                  <td>{c.appVersion || '—'}</td>
                  <td className="num">{c.points}</td>
                  <td className="num">{c.daysSpent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="epic-empty">Aucune feature{epic ? ' dans cette epic' : ''}.</p>
      )}
    </section>
  );
}

export default function EpicsView({ epics, cards, onAdd, onRename, onDelete, onOpen, onAddFeature }) {
  const [name, setName] = useState('');
  const orphans = cards.filter((c) => !c.epic);

  function submit(e) {
    e?.preventDefault?.();
    const v = name.trim();
    if (!v) return;
    onAdd(v);
    setName('');
  }

  return (
    <div className="epics">
      <form className="epic-new" onSubmit={submit}>
        <input
          value={name}
          placeholder="Nom de la nouvelle epic"
          aria-label="Nom de la nouvelle epic"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit(e)}
        />
        <Button type="primary" onClick={() => submit()}>
          + Epic
        </Button>
      </form>
      {epics.length === 0 && <p className="epic-empty">Aucune epic pour l'instant.</p>}
      {epics.map((epic) => (
        <EpicSection
          key={epic.id}
          epic={epic}
          cards={cards.filter((c) => c.epic === epic.id)}
          onRename={(v) => onRename(epic.id, v)}
          onDelete={() => onDelete(epic.id)}
          onOpen={onOpen}
          onAddFeature={() => onAddFeature(epic.id)}
        />
      ))}
      {orphans.length > 0 && <EpicSection epic={null} cards={orphans} onOpen={onOpen} />}
    </div>
  );
}
