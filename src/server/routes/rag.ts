// src/server/routes/rag.ts

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// --- INITIALIZE CLIENTS ---
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});
// The only change is on the line below:
const generativeModel = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
});

// --- REUSABLE RETRIEVAL FUNCTION ---
async function findMatchingDocuments(query: string) {
  const result = await embeddingModel.embedContent(query);
  const queryEmbedding = result.embedding.values;

  const { data: documents, error: rpcError } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
    },
  );

  if (rpcError) {
    throw rpcError;
  }

  return documents;
}

// --- API ENDPOINT FOR GENERATION ---
router.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    console.log(`Finding documents for question: "${question}"`);
    const documents = await findMatchingDocuments(question);

    if (!documents || documents.length === 0) {
      console.log("No relevant documents found.");
      return res.status(200).json({
        answer:
          "I'm sorry, I don't have enough information to answer that question.",
      });
    }

    const context = documents.map((doc) => doc.content).join("\n\n");

    const prompt = `
      You are an expert real estate assistant for Charney Companies.
      Your task is to answer the user's question based *only* on the provided context about available condo units.
      Do not make up any information. If the answer is not in the context, clearly state that you don't have that information.
      Keep your answer concise and professional.

      CONTEXT:
      ---
      ${context}
      ---

      QUESTION:
      ${question}

      ANSWER:
    `;

    console.log("Generating answer with Gemini...");
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    res.status(200).json({ answer, sources: documents });
  } catch (error) {
    console.error("Error in RAG ask endpoint:", error);
    res.status(500).json({ error: "Failed to process your question." });
  }
});

export default router;
