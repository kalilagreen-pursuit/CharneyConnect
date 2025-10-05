// scripts/ingest-data.ts

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// --- CONFIGURATION ---
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  throw new Error(
    "Missing environment variables. Requires VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, and GEMINI_API_KEY.",
  );
}

// --- INITIALIZE CLIENTS ---
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- MAIN INGESTION LOGIC ---

async function ingestUnits() {
  console.log("Starting ingestion for 'Units' via Gemini...");

  const { data: units, error } = await supabase.from("Units").select(`
      id, unit_number, price, floor, status, notes,
      Projects ( name ),
      FloorPlans ( plan_name, bedrooms, bathrooms, sq_ft )
    `);

  if (error) {
    console.error("Error fetching units:", error);
    return;
  }

  if (!units || units.length === 0) {
    console.log("No units found to ingest.");
    return;
  }

  console.log(`Found ${units.length} units to process.`);

  const documentsToEmbed = units
    .map((unit) => {
      if (Array.isArray(unit.Projects) || Array.isArray(unit.FloorPlans))
        return null;

      const floorPlan = unit.FloorPlans;
      const project = unit.Projects;

      const content =
        `Unit Information: Project: ${project?.name || "N/A"}. Unit Number: ${unit.unit_number}. Floor: ${unit.floor}. Status: ${unit.status}. Price: $${unit.price?.toLocaleString()}. Layout: ${floorPlan?.plan_name || "N/A"}, featuring ${floorPlan?.bedrooms} bedrooms and ${floorPlan?.bathrooms} bathrooms. Size: ${floorPlan?.sq_ft} square feet. Notes: ${unit.notes || "None"}.`
          .trim()
          .replace(/\s+/g, " ");

      return {
        content: content,
        metadata: {
          doc_type: "unit",
          unit_id: unit.id,
          unit_number: unit.unit_number,
          project_name: project?.name,
        },
      };
    })
    .filter(Boolean);

  const contents = documentsToEmbed.map((doc) => doc!.content);

  // --- MODIFIED SECTION: Process embeddings in chunks ---
  console.log("Creating embeddings with Gemini in chunks...");
  const chunkSize = 100; // The API's maximum batch size
  const allEmbeddings = [];

  for (let i = 0; i < contents.length; i += chunkSize) {
    const chunk = contents.slice(i, i + chunkSize);
    console.log(
      `  Processing chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(contents.length / chunkSize)}...`,
    );

    const result = await geminiModel.batchEmbedContents({
      requests: chunk.map((text) => ({ content: { parts: [{ text }] } })),
    });

    // Add the embeddings from this chunk to our main list
    allEmbeddings.push(...result.embeddings.map((item) => item.values));
  }
  // --- END OF MODIFIED SECTION ---

  const embeddings = allEmbeddings; // This now contains all 106 embeddings

  const recordsToInsert = documentsToEmbed.map((doc, i) => ({
    project_id: null,
    doc_type: "unit",
    content: doc!.content,
    metadata: doc!.metadata,
    embedding: embeddings[i],
  }));

  console.log(`Inserting ${recordsToInsert.length} records into rag_docs...`);
  const { error: insertError } = await supabase
    .from("rag_docs")
    .insert(recordsToInsert);

  if (insertError) {
    console.error("Error inserting records into rag_docs:", insertError);
  } else {
    console.log(
      "✅ Successfully ingested all units into the vector store using Gemini!",
    );
  }
}

// --- SCRIPT EXECUTION ---
async function main() {
  console.log("Clearing existing 'unit' documents from rag_docs...");
  await supabase.from("rag_docs").delete().eq("doc_type", "unit");
  await ingestUnits();
}

main().catch(console.error);
