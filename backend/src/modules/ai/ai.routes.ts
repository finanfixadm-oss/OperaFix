import express from 'express';
const router = express.Router();
router.post('/execute', async (req, res) => {
  const { action, payload } = req.body;
  if (action === 'assign') return res.json({ message: 'Asignación ejecutada', payload });
  if (action === 'update') return res.json({ message: 'Actualización ejecutada', payload });
  res.json({ message: 'Acción no reconocida' });
});
export default router;