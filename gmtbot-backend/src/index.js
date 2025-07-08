import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import sessionRoutes from "./routes/sessions.js";
import groupRoutes from "./routes/groups.js";
import llmProxyRoutes from "./routes/llmProxy.js";

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("GMTBOT Backend API is running!");
});

// TODO: Add routes here
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/llm", llmProxyRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 