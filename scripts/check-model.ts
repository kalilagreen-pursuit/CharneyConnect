// scripts/check-model.ts

import "dotenv/config";

async function listAvailableModels() {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    console.error(
      "🔴 ERROR: GEMINI_API_KEY is not set in your Replit Secrets.",
    );
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;

  try {
    console.log(
      "🔍 Asking Google's REST API directly for a list of available models...",
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`🔴 API Error: ${response.status} ${response.statusText}`);
      console.error("   Response Body:", errorBody);
      throw new Error("Failed to fetch models from the REST API.");
    }

    const data = await response.json();
    const models = data.models || [];

    if (models.length === 0) {
      console.log("🟡 No models were returned by the API for your key.");
      return;
    }

    console.log("✅ Success! Here are the models your API key can access:\n");

    for (const m of models) {
      // We only care about models that can actually generate content
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`  - Model Name: ${m.name}`);
        console.log(`    Display Name: ${m.displayName}`);
        console.log(`    Description: ${m.description.substring(0, 80)}...`);
        console.log(
          `    Supported Methods: ${m.supportedGenerationMethods.join(", ")}\n`,
        );
      }
    }

    console.log(
      "➡️ Use one of the 'Model Name' values (e.g., 'models/gemini-1.0-pro-001') in your rag.ts file.",
    );
  } catch (error) {
    console.error(
      "🔴 An error occurred while trying to list the models:",
      error,
    );
  }
}

listAvailableModels();
