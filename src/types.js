// Types de feature et leur couleur d'identification.
export const FEATURE_TYPES = [
  { id: 'mapi', label: 'mapi', color: '#3367d6' },
  { id: 'statistiques', label: 'statistiques', color: '#2e9d5b' },
  { id: 'init', label: 'init', color: '#e08a00' },
  { id: 'rbin', label: 'rbin', color: '#8e44ad' },
  { id: 'rbex', label: 'rbex', color: '#d64545' },
];

export const NO_TYPE = { id: '', label: 'sans type', color: '#9aa0ae' };

export function featureType(id) {
  return FEATURE_TYPES.find((t) => t.id === id) || NO_TYPE;
}
