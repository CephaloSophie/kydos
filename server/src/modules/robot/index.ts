import type { AppModule } from '../../core/AppModule.js';
import { robotRouter } from './robot.routes.js';

export const robotModule: AppModule = { name: 'robot', basePath: '/', router: robotRouter };
export { RobotModel } from './robot.model.js';
