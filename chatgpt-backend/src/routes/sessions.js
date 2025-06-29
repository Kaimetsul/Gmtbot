import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get all sessions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create a new session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    const session = await prisma.session.create({
      data: {
        name: name || 'New Chat',
        userId: req.user.id
      },
      include: {
        messages: true
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get a specific session with messages
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId: req.user.id
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Add a message to a session
router.post('/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, role } = req.body;

    // Verify the session belongs to the user
    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        role, // 'user' or 'assistant'
        sessionId: parseInt(sessionId),
        userId: req.user.id
      }
    });

    // Update session name if it's the first user message and session name is default
    if (role === 'user' && session.name === 'New Chat') {
      const truncatedName = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await prisma.session.update({
        where: { id: parseInt(sessionId) },
        data: { name: truncatedName }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Update session name
router.put('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;

    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.session.update({
      where: { id: parseInt(sessionId) },
      data: { name }
    });

    // Fetch the updated session with messages
    const updatedSession = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId: req.user.id
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a session
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(sessionId),
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete all messages in the session first
    await prisma.message.deleteMany({
      where: { sessionId: parseInt(sessionId) }
    });

    // Delete the session
    await prisma.session.delete({
      where: { id: parseInt(sessionId) }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router; 