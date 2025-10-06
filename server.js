// server.js

const express = require('express');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { persona } = require('./persona.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ✅ Initialize new Gemini client (auto-picks GEMINI_API_KEY from .env)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });


// ✅ Use latest model (as per docs)
const MODEL_NAME = "gemini-2.0-flash"; // or "gemini-2.0-pro" for higher quality

// API endpoint
app.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: "Question cannot be empty." });
  }

  try {
    const prompt = `${persona}\nInterviewer's Question: ${question}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    // response.text gives the AI output
    res.json({ answer: response.text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: 'Failed to get a response from the AI.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});
