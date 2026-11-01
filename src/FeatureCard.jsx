import { featureType } from './types.js';
import { useEpicName } from './epics.js';

export default function FeatureCard({ card }) {
  const type = featureType(card.type);
  const epic = useEpicName(card.epic);
  return (
    <div className="feature" style={{ '--type-color': type.color }}>
      <div className="feature-head">
        <span className="feature-type">{type.label}</span>
        <span className="feature-points" title="Points de complexité">
          {card.points ?? 0} pts
        </span>
      </div>
      <div className="feature-title">{card.label}</div>
      {epic && (
        <div className="feature-epic" title="Epic">
          ◆ {epic}
        </div>
      )}
      <div className="feature-meta">
        <span className="feature-jira">{card.jira || 'Sans Jira'}</span>
        <span title="Version de spec">
          <b>Spec</b> {card.specVersion || '—'}
        </span>
        <span title="Version applicative">
          <b>App</b> {card.appVersion || '—'}
        </span>
        <span title="Jours passés">
          <b>Jours</b> {card.daysSpent ?? 0}
        </span>
      </div>
    </div>
  );
}
