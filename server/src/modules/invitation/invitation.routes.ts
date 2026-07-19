import { Router } from 'express';
import { requireAuthentication } from '../../shared/authentication.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import { invitationController } from './invitation.controller.js';

export const invitationRouter = Router();
invitationRouter.post('/teams/:id/invite', requireAuthentication, asyncHandler((req, res) => invitationController.invite(req, res)));
invitationRouter.get('/invitations', requireAuthentication, asyncHandler((req, res) => invitationController.listReceived(req, res)));
invitationRouter.get('/teams/:id/invitations', requireAuthentication, asyncHandler((req, res) => invitationController.listSentByTeam(req, res)));
invitationRouter.post('/invitations/:id/accept', requireAuthentication, asyncHandler((req, res) => invitationController.accept(req, res)));
invitationRouter.post('/invitations/:id/decline', requireAuthentication, asyncHandler((req, res) => invitationController.decline(req, res)));
