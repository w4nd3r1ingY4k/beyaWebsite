import express from 'express';
import { tasksHandler } from '../app-setup.js';
const router = express.Router();

// POST /api/v1/tasks
router.post('/api/v1/tasks', async (req, res) => {
  try {
    const { operation, payload } = req.body;
    if (!operation) {
      return res.status(400).json({ error: 'operation is required' });
    }
    const event = { operation, payload };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Tasks error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/tasks/board/:boardId
router.get('/api/v1/tasks/board/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.query;
    const event = { operation: 'getTasksByBoard', payload: { boardId, userId } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Tasks board error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/tasks/spaces
router.post('/api/v1/tasks/spaces', async (req, res) => {
  try {
    const event = { operation: 'createSpace', payload: req.body };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Create space error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/tasks/:taskId
router.get('/api/v1/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;
    const event = { operation: 'getTask', payload: { taskId, userId } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Get task error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/tasks/:taskId
router.put('/api/v1/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId, ...updates } = req.body;
    const event = { operation: 'updateTask', payload: { taskId, userId, ...updates } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Update task error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/v1/tasks/:taskId
router.delete('/api/v1/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;
    const event = { operation: 'deleteTask', payload: { taskId, userId } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Delete task error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/tasks/:taskId/subtasks
router.get('/api/v1/tasks/:taskId/subtasks', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;
    const event = { operation: 'getSubTasksByTask', payload: { taskId, userId } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 Get subtasks error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/sla/timers/check
router.post('/api/v1/sla/timers/check', async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }
    const event = { operation: 'checkSLACompliance', payload: { taskId } };
    const result = await tasksHandler(event);
    if (result && typeof result.statusCode === 'number') {
      let body = result.body;
      try { body = typeof body === 'string' ? JSON.parse(body) : body; } catch {}
      return res.status(result.statusCode).json(body);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error('🔥 SLA check error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 