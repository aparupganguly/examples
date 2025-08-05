import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import { z } from "zod";
import * as fs from "fs";
import OpenAI from "openai";

config();

// Configuration
const CONFIG = {
  HYPERBROWSER_API_KEY: process.env.HYPERBROWSER_API_KEY,
  FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY,
  OUTPUT_FILE: "extracted-data.json",
  GPT_OSS_MODEL: "accounts/fireworks/models/gpt-oss-20b"
} as const;

const client = new Hyperbrowser({
  apiKey: CONFIG.HYPERBROWSER_API_KEY,
});

const openai = new OpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: CONFIG.FIREWORKS_API_KEY
});

const CitySchema = z.object({
  city: z.string(),
  country: z.string(),
  population: z.number(),
  rank: z.number(),
});

const ResponseSchema = z.object({ cities: z.array(CitySchema) });

const SYSTEM_PROMPT = `You are a helpful assistant that can extract information from markdown and convert it into a structured format.
Ensure the output adheres to the following:
- city: The name of the city
- country: The name of the country
- population: The population of the city
- rank: The rank of the city

Provide the extracted data as a JSON object. Parse the Markdown content carefully to identify and categorize the city details accurately.`;

// Utility function to extract data with retry logic
async function extractDataWithRetry(markdown: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Extraction attempt ${attempt}/${maxRetries} using gpt-oss-20b`);
      
      const completion = await openai.chat.completions.create({
        model: CONFIG.GPT_OSS_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT + "\n\nProvide your response in the following JSON format:\n" + JSON.stringify({
              cities: [
                {
                  city: "string",
                  country: "string", 
                  population: "number",
                  rank: "number"
                }
              ]
            }, null, 2),
          },
          { 
            role: "user", 
            content: markdown 
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content received from the model");
      }

      return content;
    } catch (error: any) {
      const isConnectionError = error.code === 'ECONNREFUSED' || error.message?.includes('Connection error');
      
      if (isConnectionError) {
        console.warn(`⚠️  Cannot connect to gpt-oss-20b API`);
        console.warn(`💡 Make sure your FIREWORKS_API_KEY is set in .env`);
      } else {
        console.warn(`⚠️  Attempt ${attempt} failed:`, error.message || error);
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

const main = async () => {
  console.log(`🚀 Starting web extraction with Hyperbrowser + gpt-oss-20b`);
  
  // Step 1: Scrape with Hyperbrowser
  console.log("📄 Scraping webpage...");
  const scrapeResult = await client.scrape.startAndWait({
    url: "https://en.wikipedia.org/wiki/List_of_largest_cities",
    scrapeOptions: {
      // Only return the markdown for the scraped data
      formats: ["markdown"],
      // Only include the table element with class `wikitable` from the page
      includeTags: [".wikitable"],
      // Remove any img tags from the table
      excludeTags: ["img"],
    },
  });
  console.log("✅ Scraping completed");
  
  if (scrapeResult.status === "failed") {
    console.error("❌ Scrape failed:", scrapeResult.error);
    return;
  }
  
  if (!scrapeResult.data?.markdown) {
    console.error("❌ No markdown data found in the scrape result");
    return;
  }

  // Step 2: Extract with local gpt-oss-120b model
  console.log("🧠 Extracting structured data...");
  const content = await extractDataWithRetry(scrapeResult.data.markdown);
  console.log("✅ Extraction completed");

  // Clean the response (remove markdown code blocks if present)
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const cities = JSON.parse(cleanContent);
    const validatedData = ResponseSchema.parse(cities);
    const data = JSON.stringify(validatedData, null, 2);
    fs.writeFileSync(CONFIG.OUTPUT_FILE, data);
    console.log(`✅ Extracted data saved to ${CONFIG.OUTPUT_FILE}`);
    console.log(`📊 Found ${validatedData.cities.length} cities`);
  } catch (error) {
    console.error("❌ Failed to parse or validate JSON response:", error);
    console.log("Raw response:", content);
    
    // Save raw response for debugging
    fs.writeFileSync("debug-raw-response.txt", content);
    console.log("🐛 Raw response saved to debug-raw-response.txt for analysis");
  }
};

main().catch(console.error);