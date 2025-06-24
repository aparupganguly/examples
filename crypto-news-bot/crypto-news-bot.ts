// crypto-slack-bot.ts
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";
import axios from "axios";
import { config } from "dotenv";
import cron from "node-cron";
import fs from "fs/promises";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;
const CACHE_FILE = "crypto_news_cache.json";

const sources = [
  "https://www.coindesk.com",
  "https://decrypt.co",
  "https://cointelegraph.com"
];
    
const SYSTEM_PROMPT = `Summarize today's crypto news in 3-5 key takeaways. Only include articles published today (${new Date().toDateString()}). 

Format as clean bullet points without asterisks or markdown formatting. Use this structure:
• [Headline]: Brief description
• [Headline]: Brief description

Keep each point concise and impactful. Focus on breaking news and significant developments.`;

async function fetchNewsMarkdown(url: string): Promise<string | null> {
  const scrape = await client.scrape.startAndWait({
    url,
    sessionOptions: { solveCaptchas: true, useStealth: true },
    scrapeOptions: { formats: ["markdown"], includeTags: ["article", "main"], excludeTags: ["img"] },
  });
  return scrape?.data?.markdown || null;
}

async function generateSummary(content: string): Promise<string> {
  const truncatedContent = content.length > 80000 ? content.substring(0, 80000) : content;
  const chat = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: truncatedContent },
    ],
  });
  return chat.choices[0]?.message?.content || "No summary available.";
}

async function postToSlack(text: string) {
  await axios.post(SLACK_WEBHOOK_URL, { text });
}

async function loadCache(): Promise<string | null> {
  try {
    return await fs.readFile(CACHE_FILE, 'utf-8');
  } catch {
    return null;
  }
}

async function saveCache(content: string): Promise<void> {
  await fs.writeFile(CACHE_FILE, content, 'utf-8');
}

async function detectChanges(oldContent: string, newContent: string): Promise<boolean> {
  const chat = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Compare these two crypto news contents. Return 'YES' if there are significant new articles or updates, 'NO' if minimal changes." },
      { role: "user", content: `OLD:\n${oldContent.substring(0, 40000)}\n\nNEW:\n${newContent.substring(0, 40000)}` },
    ],
  });
  return chat.choices[0]?.message?.content?.toLowerCase().includes('yes') || false;
}

async function main(isDailyDigest = false) {
  let combinedMarkdown = "";
  for (const url of sources) {
    console.log(`\x1b[32mScraping: ${url}\x1b[0m`);
    const md = await fetchNewsMarkdown(url);
    if (md) combinedMarkdown += `\n\n${md}`;
  }

  if (!combinedMarkdown) {
    console.error("❌ Failed to fetch news");
    return;
  }

  const cachedContent = await loadCache();
  
  if (isDailyDigest || !cachedContent) {
    const summary = await generateSummary(combinedMarkdown);
    await postToSlack(`🚨 *Daily Crypto Digest*\n\n${summary}`);
    console.log("✅ Posted daily digest");
  } else {
    const hasChanges = await detectChanges(cachedContent, combinedMarkdown);
    if (hasChanges) {
      const summary = await generateSummary(combinedMarkdown);
      await postToSlack(`🔄 *Crypto News Update*\n\n${summary}`);
      console.log("✅ Posted update");
    } else {
      console.log("📊 No significant changes");
    }
  }

  await saveCache(combinedMarkdown);
}

cron.schedule("0 9 * * *", () => main(true));
cron.schedule("0 13,17,21 * * *", () => main());

main().catch(console.error);