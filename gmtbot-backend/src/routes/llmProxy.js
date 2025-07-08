import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Proxy POST /api/llm/process to the real LLM API (correct endpoint and flow UUID)
router.post('/process', async (req, res) => {
  try {
    const response = await fetch(
      'https://langflowbubblemvp-production.up.railway.app/api/v1/run/c0504846-5aeb-4bde-b8a9-19185e33f7a3',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'LLM proxy error', details: error.message });
  }
});

export default router; 