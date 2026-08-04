import { Router } from 'express';
import { asyncHandler } from '../../core/asyncHandler.js';
import { requireAuthentication, type AuthenticatedRequest } from '../../shared/authentication.js';
import { taskService } from './task.service.js';
import { archiveService } from '../archive/archive.service.js';

export const taskRouter = Router();

// Toutes les routes tasks nécessitent une authentification.
taskRouter.use(requireAuthentication);

taskRouter.get('/tasks', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, priority, version, area } = req.query as Record<string, string | undefined>;
  const list = await taskService.list({ status, priority, version, area });
  res.json({ tasks: list });
}));

taskRouter.get('/tasks/:taskId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const task = await taskService.findByTaskId(String(req.params.taskId));
  res.json({ task });
}));

taskRouter.post('/tasks', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const created = await taskService.create(req.body, req.username!);
  res.status(201).json({ task: created });
}));

taskRouter.patch('/tasks/:taskId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { note, ...patch } = req.body as { note?: string } & Record<string, unknown>;
  const updated = await taskService.update(String(req.params.taskId), patch, req.username!, note);
  res.json({ task: updated });
}));

taskRouter.delete('/tasks/:taskId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await taskService.remove(String(req.params.taskId), req.username!);
  res.json(result);
}));

taskRouter.get('/tasks/:taskId/archive', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const entries = await archiveService.listForTask(String(req.params.taskId));
  res.json({ archive: entries });
}));
