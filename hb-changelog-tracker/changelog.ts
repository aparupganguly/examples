import { config } from "dotenv";
import axios from "axios";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";

config();

// Validate required environment variables
const requiredEnvVars = ['HYPERBROWSER_API_KEY', 'OPENAI_API_KEY', 'SLACK_WEBHOOK_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;
const urls = [
  "https://openai.com/blog",
  "https://www.anthropic.com/news",
  "https://deepmind.google/discover/blog",
  "https://www.ycombinator.com/blog",
  "https://huggingface.co/blog"
];

const SYSTEM_PROMPT = `You're an AI assistant that summarizes new updates from product or research blogs. Return a crisp, professional changelog-style summary of what's new.`

async function scrapeAndSummarize(url: string): Promise<string | null> {
  const result = await client.scrape.startAndWait({
    url,
    scrapeOptions: {
      formats: ["markdown"],
      includeTags: ["article", "main", ".changelog", ".post", ".blog"],
      excludeTags: ["img", "script", "style"],
    },
  });

  if (result.status === "failed" || !result.data?.markdown) {
    return null;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: result.data.markdown },
    ],
  });

  return completion.choices[0].message.content;
}

async function notifySlack(text: string, url: string) {
  await axios.post(SLACK_WEBHOOK_URL, {
    text: `📰 Update detected at *${url}*:\n\n${text}`,
  });
}

async function main() {
  for (const url of urls) {
    console.log(`🔍 Scraping ${url}`);
    const summary = await scrapeAndSummarize(url);
    if (summary) {
      console.log("✅ Update found. Sending to Slack...");
      await notifySlack(summary, url);
    } else {
      console.log("⚠️ No updates or failed scrape.");
    }
  }
}

main().catch(console.error);