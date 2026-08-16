import { Router } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { signAdminToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Champs requis: username, password' });
      return;
    }
    const UserModel = mongoose.model('User');
    const user = await UserModel.findOne({ username }).lean() as any;
    if (!user) {
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Accès admin requis' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }
    const token = signAdminToken(user._id.toString());
    res.json({
      token,
      admin: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
