import { config } from "dotenv";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import fs from "fs";
import readline from "readline";

config();

const SiteSchema = z.object({
  url: z.string(),
  headline: z.string(),
  features: z.array(z.string()),
  pricing: z.string(),
  usp: z.string(),
});
const ReportSchema = z.object({ sites: z.array(SiteSchema) });

async function promptForUrls(): Promise<string[]> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log("🚀 Welcome to Competitor Analyzer Bot!");
    console.log("📝 Please enter 2 competitor website URLs to compare");
    console.log("💡 You can enter URLs with or without https:// (we'll add it automatically)");
    console.log("💡 Type 'quit' to exit\n");

    const urls: string[] = [];
    const maxUrls = 2;
    
    const normalizeUrl = (input: string): string => {
      let url = input.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      return url;
    };
    
    const askForUrl = () => {
      if (urls.length >= maxUrls) {
        console.log(`\n✅ Got ${maxUrls} URLs. Starting analysis...`);
        rl.close();
        resolve(urls);
        return;
      }
      
      rl.question(`Enter URL ${urls.length + 1} of ${maxUrls} (or 'quit'): `, (input) => {
        const trimmed = input.trim().toLowerCase();
        
        if (trimmed === 'quit') {
          console.log("👋 Goodbye!");
          rl.close();
          process.exit(0);
        }
        
        if (trimmed === '') {
          console.log("⚠️ Please enter a URL");
          askForUrl();
          return;
        }
        try {
          const normalizedUrl = normalizeUrl(input.trim());
          new URL(normalizedUrl);
          urls.push(normalizedUrl);
          console.log(`✅ Added: ${normalizedUrl}`);
          askForUrl();
        } catch {
          console.log("⚠️ Invalid URL format. Please try again (e.g., 'google.com' or 'https://google.com')");
          askForUrl();
        }
      });
    };
    
    askForUrl();
  });
}

async function analyzeCompetitors() {
  try {
    const urls = await promptForUrls();
    
    if (urls.length === 0) {
      console.log("❌ No URLs provided. Exiting.");
      return;
    }

    // Initialize clients
    const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    
    console.log(`\n🔎 Starting analysis of ${urls.length} competitor websites...\n`);

    const markdowns: Record<string, string> = {};

    for (const url of urls) {
      console.log(`🔎 Scraping: ${url}`);
      try {
        const res = await client.scrape.startAndWait({
          url,
          scrapeOptions: { formats: ["markdown"] },
        });

        if (res.status === "completed" && res.data?.markdown) {
          markdowns[url] = res.data.markdown;
          console.log(`✅ Successfully scraped: ${url}`);
        } else {
          console.warn(`⚠️ Failed to scrape: ${url} - Status: ${res.status}`);
        }
      } catch (error) {
        console.error(`❌ Error scraping ${url}:`, error);
      }
    }

    if (Object.keys(markdowns).length === 0) {
      console.error("❌ No websites were successfully scraped. Exiting.");
      return;
    }

    console.log(`\n🤖 Analyzing ${Object.keys(markdowns).length} scraped websites with AI...\n`);

    const combinedContent = Object.entries(markdowns)
      .map(([url, content]: [string, string]) => `URL: ${url}\n\n${content}`)
      .join("\n\n---\n\n");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts competitive insights from scraped site markdowns. For each website, return: url, headline, key features[], pricing model, and a short USP (Unique Selling Proposition).",
          },
          { role: "user", content: combinedContent },
        ],
        response_format: zodResponseFormat(ReportSchema, "sites"),
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content in AI response");
      }

      const parsed = JSON.parse(content);
      const sites = ReportSchema.parse(parsed).sites;

      const report = sites
        .map(
          (s: typeof SiteSchema._type) =>
            `\n🧩 ${s.url}\nHeadline: ${s.headline}\nFeatures: ${s.features.join(", ")}\nPricing: ${s.pricing}\nUSP: ${s.usp}\n`
        )
        .join("\n");

      console.log("📊 COMPETITOR ANALYSIS REPORT");
      console.log("================================");
      console.log(report);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `competitor-report-${timestamp}.md`;
      fs.writeFileSync(filename, `# Competitor Analysis Report\n\nGenerated on: ${new Date().toLocaleString()}\n\n${report}`);
      console.log(`\n✅ Report saved to ${filename}`);
    } catch (error) {
      console.error("❌ Error during AI analysis:", error);
    }
  } catch (error) {
    console.error("❌ An unexpected error occurred:", error);
  }
}
analyzeCompetitors();