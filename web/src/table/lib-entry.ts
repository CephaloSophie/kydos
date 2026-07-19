/* Point d'entrée de la LIBRAIRIE npm : embarque le CSS puis ré-exporte l'API publique.
   (L'entrée applicative reste ./index.ts, sans effet de bord CSS.) */
import './belote-table.css';
export * from './index';
