import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy", // The frontend needs to be aware if it's missing, but we shouldn't crash
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Chat Endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(401).json({ error: "Gemini API key is not configured." });
      }

      const { messages, thinkingMode } = req.body;
      
      const formattedMessages = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const model = thinkingMode ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const config: any = {
        systemInstruction: "You are a highly capable AI Assistant for Team AXOTIC. Help users manage projects, inventory, scheduling, and provide deep reasoning when necessary. Be friendly, professional, and concise.",
      };

      if (thinkingMode) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      // Convert history to what SDK expects for single turn, wait, the SDK's chat does not support sending raw history via generateContent without correct roles?
      // Actually, `@google/genai` allows passing history using `contents` array.
      
      const response = await ai.models.generateContent({
        model,
        contents: formattedMessages,
        config,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during chat processing." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
