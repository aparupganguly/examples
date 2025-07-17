import { config } from "dotenv";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";
import readline from "readline";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function extractMeta(url: string) {
  const scrape = await client.scrape.startAndWait({
    url,
    scrapeOptions: {
      formats: ["html"],
      timeout: 30000,
    },
  });
  if (scrape.status === "failed" || !scrape.data?.html) return null;
  return scrape.data.html;
}

async function analyzeMeta(html: string, url: string) {
  const prompt = `
Extract meta tags from this HTML and return ONLY valid JSON with no additional text or explanation:

\`\`\`html
${html}
\`\`\`

IMPORTANT: Return ONLY the JSON object below, with no markdown formatting, no explanations, no additional text:

{
  "url": "...",
  "title": "...",
  "description": "...",
  "ogTitle": "...",
  "ogDescription": "...",
  "ogImage": "...",
  "twitterCard": "...",
  "summary": "...",
  "useCases": ["...","...","..."]
}
`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  
  const content = res.choices[0].message.content;
  if (!content) {
    throw new Error("No content received from OpenAI");
  }
  
  // Try to extract JSON from the response
  let jsonStr = content;
  
  // Remove markdown code blocks
  jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  
  // Try to find JSON object in the response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  jsonStr = jsonStr.trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse JSON:", jsonStr.substring(0, 200) + "...");
    throw new Error(`Failed to parse OpenAI response as JSON: ${error}`);
  }
}

async function main() {
  console.log("🌐 Meta Scraper Tool");
  console.log("Enter a single URL to analyze");
  
  const url = await askQuestion("URL: ");
  
  if (!url.trim()) {
    console.log("❌ No URL provided");
    rl.close();
    return;
  }

  console.log(`🔍 Scraping meta from ${url.trim()}`);
  const html = await extractMeta(url.trim());
  if (!html) {
    console.warn(`⚠️ Failed to scrape ${url.trim()}`);
    rl.close();
    return;
  }
  
  console.log(`💡 Analyzing with GPT...`);
  const data = await analyzeMeta(html, url.trim());

  console.log("\n📊 Results:");
  console.log(JSON.stringify(data, null, 2));
  
  rl.close();
}

main().catch(console.error);