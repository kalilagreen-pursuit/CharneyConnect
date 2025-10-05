// scripts/ingest-data.ts

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import "dotenv/config"; // Make sure to install this: npm install dotenv

// --- CONFIGURATION ---
// These keys must be in your Replit Secrets.
// We use the SERVICE KEY here because this is a trusted server-side script that needs to write data.
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  throw new Error("Missing environment variables. Check your Replit Secrets.");
}

// Initialize clients
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- MAIN INGESTION LOGIC ---

/**
 * Fetches all units, formats them into text chunks,
 * creates embeddings, and stores them in the rag_docs table.
 */
async function ingestUnits() {
  console.log("Starting ingestion for 'Units'...");

  // 1. GATHER THE DATA: Fetch all units with their related floor plan details.
  const { data: units, error } = await supabase.from("Units").select(`
      unit_number,
      price,
      floor,
      status,
      notes,
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

  // 2. PROCESS & FORMAT: Turn each unit's data into a descriptive text chunk.
  const documentsToEmbed = units
    .map((unit) => {
      // Type guard to satisfy TypeScript
      if (Array.isArray(unit.Projects) || Array.isArray(unit.FloorPlans))
        return null;

      const floorPlan = unit.FloorPlans;
      const project = unit.Projects;

      // Create a clean, searchable paragraph for each unit.
      const content = `
      Unit Information:
      Project: ${project?.name || "N/A"}.
      Unit Number: ${unit.unit_number}.
      Floor: ${unit.floor}.
      Status: ${unit.status}.
      Price: $${unit.price?.toLocaleString()}.
      Layout: ${floorPlan?.plan_name || "N/A"}, featuring ${floorPlan?.bedrooms} bedrooms and ${floorPlan?.bathrooms} bathrooms.
      Size: ${floorPlan?.sq_ft} square feet.
      Notes: ${unit.notes || "None"}.
    `
        .trim()
        .replace(/\s+/g, " "); // Clean up whitespace

      return {
        content: content,
        metadata: {
          doc_type: "unit",
          unit_id: unit.id, // Assuming your unit has an 'id' pk
          unit_number: unit.unit_number,
          project_name: project?.name,
        },
      };
    })
    .filter(Boolean); // Filter out any nulls

  // 3. CREATE EMBEDDINGS: Call OpenAI to get vectors for each document.
  // We send the content of all documents in a single API call for efficiency.
  const contents = documentsToEmbed.map((doc) => doc!.content);

  console.log("Creating embeddings with OpenAI...");
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small", // Using the 1536-dimension model
    input: contents,
  });

  const embeddings = embeddingResponse.data.map((item) => item.embedding);

  // 4. STORE IN DATABASE: Combine the original data with its new embedding.
  const recordsToInsert = documentsToEmbed.map((doc, i) => ({
    project_id: null, // You can link this later if needed
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
    console.log("✅ Successfully ingested all units into the vector store!");
  }
}

// --- SCRIPT EXECUTION ---
async function main() {
  // Clear the table first to avoid duplicates on re-runs
  console.log("Clearing existing 'unit' documents from rag_docs...");
  await supabase.from("rag_docs").delete().eq("doc_type", "unit");

  // Run the ingestion
  await ingestUnits();

  // You can add more functions here later for FAQs, etc.
  // await ingestFaqs();
}

main().catch(console.error);
