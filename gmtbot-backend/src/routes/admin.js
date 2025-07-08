import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "./auth.js";

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

// List all users (admin only)
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  res.json(users);
});

// Create a new user (admin only)
router.post("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.default.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "user",
        createdById: req.user.id
      }
    });

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Create a new group (admin only)
router.post("/groups", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, selectedUsers } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
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
        role: "admin"
      }
    });

    // Add selected users as members
    if (selectedUsers && selectedUsers.length > 0) {
      const memberData = selectedUsers.map(userId => ({
        groupId: group.id,
        userId: parseInt(userId),
        role: "member"
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
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Check if current user is admin
router.get("/is-admin", authMiddleware, (req, res) => {
  res.json({ isAdmin: req.user.role === "admin" });
});

export default router; 