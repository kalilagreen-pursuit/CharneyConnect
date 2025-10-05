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

// We need two different models for RAG
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});
const generativeModel = genAI.getGenerativeModel({ model: "gemini-pro" });

// --- REUSABLE RETRIEVAL FUNCTION ---
async function findMatchingDocuments(query: string) {
  // 1. Get the embedding for the user's question from Gemini
  const result = await embeddingModel.embedContent(query);
  const queryEmbedding = result.embedding.values;

  // 2. Call the Supabase database function to find matching documents
  const { data: documents, error: rpcError } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.7, // How similar the documents must be (0.0 to 1.0)
      match_count: 5, // Return the top 5 most similar documents
    },
  );

  if (rpcError) {
    throw rpcError;
  }

  return documents;
}

// --- API ENDPOINT FOR GENERATION ---
router.post("/rag/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    // Step 1: RETRIEVAL - Find documents relevant to the user's question.
    console.log(`Finding documents for question: "${question}"`);
    const documents = await findMatchingDocuments(question);

    // If no relevant documents are found, we can't answer the question.
    if (!documents || documents.length === 0) {
      console.log("No relevant documents found.");
      return res
        .status(200)
        .json({
          answer:
            "I'm sorry, I don't have enough information to answer that question.",
        });
    }

    // Step 2: AUGMENTATION - Create a context block from the document contents.
    const context = documents.map((doc) => doc.content).join("\n\n");

    // Step 3: GENERATION - Create a prompt and ask the generative model.
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

    console.log("Generating answer with Gemini-Pro...");
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    res.status(200).json({ answer, sources: documents }); // Also return sources for debugging
  } catch (error) {
    console.error("Error in RAG ask endpoint:", error);
    res.status(500).json({ error: "Failed to process your question." });
  }
});

export default router;
