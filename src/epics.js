import { createContext, useContext } from 'react';

// Les cartes du Kanban sont rendues par SVAR : elles lisent les epics via ce contexte.
export const EpicsContext = createContext([]);

export function useEpicName(id) {
  const epics = useContext(EpicsContext);
  return epics.find((e) => e.id === id)?.name ?? '';
}
