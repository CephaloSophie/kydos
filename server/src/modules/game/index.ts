import type { AppModule } from '../../core/AppModule.js';
import { gameRouter } from './game.routes.js';

export const gameModule: AppModule = { name: 'game', basePath: '/', router: gameRouter };

export { GameModel } from './game.model.js';
export { GameReplayModel } from './gameReplay.model.js';
export { SessionModel } from './session.model.js';
export { liveGameService } from './liveGame.service.js';
