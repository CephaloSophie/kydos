// ============================================================================
//  MODULE TABLE — composant de jeu autonome et réutilisable.
//  S'instancie avec un TableContext (config JSON) et s'expose :
//    • GameTable     : la table visuelle pure (props = état + callbacks)
//    • TableSurface  : adaptateur léger (enchère/contre rendus DANS la table)
//    • LocalTableEngine : pilote local (entraînement, IA vs IA, démo)
//    • ScoreView / DevDock : sous-composants
//  Utilisable pour : entraînement, salles en ligne, compétitions, événements.
// ============================================================================

export { GameTable, type TableVisualConfig } from './views/GameTable';
export { TableSurface } from './views/TableSurface';
export { ScoreView } from './views/ScoreView';
export { DevDock } from './views/DevDock';
export { LocalTableEngine } from './LocalTableEngine';

// ---- Module autonome (MVC) : contrôleur réseau + vue responsive + bootstrap ----
export { BeloteTableClient } from './client/BeloteTableClient';
export type {
  BeloteTableClientConfig,
  BeloteTableContext,
  BeloteTableEvent,
  BeloteTableSnapshot,
  BeloteGameState,
  BeloteTableAction,
  ConnectionStatus,
} from './client/types';
export { BeloteTable, useBeloteTable, type BeloteTableProps } from './BeloteTable';
export { StandaloneBeloteTable, type StandaloneBeloteTableProps } from './StandaloneBeloteTable';
export * from './parts';
export { TableStage, type TableStageProps } from './TableStage';
export { mountBeloteTable, mountStandaloneBeloteTable, type MountHandle } from './mount';

export {
  type TableConfig,
  type TableContext,
  type TableParticipant,
  type FeltTheme,
  DEFAULT_TABLE_CONFIG,
  buildTableConfig,
} from './TableConfig.model';
