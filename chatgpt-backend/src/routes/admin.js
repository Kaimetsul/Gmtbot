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

// Create user (admin only, alternative to /register)
router.post("/users", authMiddleware, adminOnly, async (req, res) => {
  const { email, password, name, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "User already exists" });
  const hashed = await import('bcryptjs').then(b => b.hash(password, 10));
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: role || "user",
      createdById: req.user.id
    }
  });
  res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
});

// Check if current user is admin
router.get("/is-admin", authMiddleware, (req, res) => {
  res.json({ isAdmin: req.user.role === "admin" });
});

export default router; 