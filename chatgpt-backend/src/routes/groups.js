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

// Middleware to check admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all groups for a user (groups they're a member of)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userGroups = await prisma.groupMember.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            groupSessions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1 // Get the most recent session
            }
          }
        }
      },
      orderBy: {
        group: {
          name: 'asc'
        }
      }
    });

    // Transform the data to a cleaner format
    const groups = userGroups.map(member => ({
      id: member.group.id,
      name: member.group.name,
      role: member.role,
      members: member.group.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role
      })),
      lastSession: member.group.groupSessions[0] || null
    }));

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group (admin only)
router.post('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, description, selectedUsers } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create the group
    const group = await prisma.group.create({
      data: {
        name,
        createdById: req.user.id
      }
    });

    // Add the creator as a member with admin role
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.user.id,
        role: 'admin'
      }
    });

    // Add selected users as members
    if (selectedUsers && selectedUsers.length > 0) {
      const memberData = selectedUsers.map(userId => ({
        groupId: group.id,
        userId: parseInt(userId),
        role: 'member'
      }));

      await prisma.groupMember.createMany({
        data: memberData
      });
    }

    // Fetch the created group with members
    const createdGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json(createdGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get group sessions
router.get('/:groupId/sessions', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const sessions = await prisma.groupSession.findMany({
      where: {
        groupId: parseInt(groupId)
      },
      include: {
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
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
    console.error('Error fetching group sessions:', error);
    res.status(500).json({ error: 'Failed to fetch group sessions' });
  }
});

// Create a new group session
router.post('/:groupId/sessions', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const session = await prisma.groupSession.create({
      data: {
        name: name || 'New Group Chat',
        groupId: parseInt(groupId)
      },
      include: {
        messages: true
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Error creating group session:', error);
    res.status(500).json({ error: 'Failed to create group session' });
  }
});

// Get a specific group session with messages
router.get('/:groupId/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { groupId, sessionId } = req.params;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const session = await prisma.groupSession.findFirst({
      where: {
        id: parseInt(sessionId),
        groupId: parseInt(groupId)
      },
      include: {
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Group session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching group session:', error);
    res.status(500).json({ error: 'Failed to fetch group session' });
  }
});

// Add a message to a group session
router.post('/:groupId/sessions/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { groupId, sessionId } = req.params;
    const { content } = req.body;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Verify the session belongs to the group
    const session = await prisma.groupSession.findFirst({
      where: {
        id: parseInt(sessionId),
        groupId: parseInt(groupId)
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Group session not found' });
    }

    // Create the message
    const message = await prisma.groupMessage.create({
      data: {
        content,
        groupSessionId: parseInt(sessionId),
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Error adding group message:', error);
    res.status(500).json({ error: 'Failed to add group message' });
  }
});

// Update group session name
router.put('/:groupId/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { groupId, sessionId } = req.params;
    const { name } = req.body;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    await prisma.groupSession.update({
      where: { 
        id: parseInt(sessionId),
        groupId: parseInt(groupId)
      },
      data: { name }
    });

    // Fetch the updated session with messages
    const updatedSession = await prisma.groupSession.findFirst({
      where: {
        id: parseInt(sessionId),
        groupId: parseInt(groupId)
      },
      include: {
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating group session:', error);
    res.status(500).json({ error: 'Failed to update group session' });
  }
});

// Delete a group session
router.delete('/:groupId/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { groupId, sessionId } = req.params;

    // Check if user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Delete all messages in the session first
    await prisma.groupMessage.deleteMany({
      where: { groupSessionId: parseInt(sessionId) }
    });

    // Delete the session
    await prisma.groupSession.delete({
      where: { 
        id: parseInt(sessionId),
        groupId: parseInt(groupId)
      }
    });

    res.json({ message: 'Group session deleted successfully' });
  } catch (error) {
    console.error('Error deleting group session:', error);
    res.status(500).json({ error: 'Failed to delete group session' });
  }
});

export default router; 