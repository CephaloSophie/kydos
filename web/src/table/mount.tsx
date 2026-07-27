import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BeloteTable, type BeloteTableProps } from './BeloteTable';
import { StandaloneBeloteTable, type StandaloneBeloteTableProps } from './StandaloneBeloteTable';

export interface MountHandle {
  /** Démonte la table et libère le nœud React. */
  unmount: () => void;
}

/**
 * mountBeloteTable — monte la table connectée (socket + API) dans un élément DOM,
 * en une ligne, depuis n'importe quelle application web (ou une WebView).
 *
 *   const handle = mountBeloteTable(document.getElementById('table')!, {
 *     config: { socketUrl: 'https://ville-1.exemple.com', token, tableId },
 *   });
 *   // plus tard : handle.unmount();
 */
export function mountBeloteTable(element: HTMLElement, props: BeloteTableProps): MountHandle {
  const root: Root = createRoot(element);
  root.render(<StrictMode><BeloteTable {...props} /></StrictMode>);
  return { unmount: () => root.unmount() };
}

/**
 * mountStandaloneBeloteTable — monte la table AUTONOME (sans backend, pilotée localement),
 * utile pour tester/démontrer le module isolément.
 */
export function mountStandaloneBeloteTable(element: HTMLElement, props: StandaloneBeloteTableProps = {}): MountHandle {
  const root: Root = createRoot(element);
  root.render(<StrictMode><StandaloneBeloteTable {...props} /></StrictMode>);
  return { unmount: () => root.unmount() };
}
