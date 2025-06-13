import { config } from "dotenv";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import axios from "axios";
import cron from "node-cron";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

config();

const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL!;
const TARGETS = [
  "https://downdetector.com/status/aws-amazon-web-services/",
  "https://downdetector.com/status/google-cloud/", 
  "https://downdetector.com/status/cloudflare/",
  "https://downdetector.com/status/microsoft-azure/"
];

// Monitoring targets
console.log(`🎯 Monitoring ${TARGETS.length} services for outages`);

const StatusSchema = z.object({
  provider: z.string(),
  isDown: z.boolean(),
  reason: z.string(),
});
const ResponseSchema = z.object({ statuses: z.array(StatusSchema) });

type Status = z.infer<typeof StatusSchema>;

// Track previous status to only alert on changes
const previousStatus = new Map<string, boolean>();

const SYSTEM_PROMPT = `
You're analyzing DownDetector pages for ACTIVE WIDESPREAD OUTAGES only.

CRITICAL: Only report as "isDown: true" if you see CLEAR evidence of a significant current outage:

REQUIRED indicators for isDown=true:
- "Outage in progress" or similar active status
- Specific timestamps showing recent major spike (last 30 minutes)  
- "Major outage" or "Widespread outage" language
- Outage map showing red/orange areas
- Specific incident descriptions with recent times
- "Service disruption ongoing" type messages

DO NOT consider these as outages:
- Generic "User reports indicate problems" (this appears on most pages)
- Minor user complaints or isolated reports
- Historical outage information
- General service status pages
- Small number of user reports
- Past incidents or resolved issues

For each provider:
- provider: Exact name (AWS, Google Cloud, Cloudflare, Azure)
- isDown: true ONLY if there's clear evidence of major active outage RIGHT NOW
- reason: Specific current issue description (not generic text)

If unsure or only seeing minor reports, set isDown to false.

Return JSON format:
{
  "statuses": [
    { "provider": "AWS", "isDown": false, "reason": "No current major outages detected" }
  ]
}
`;

async function checkProviderStatus(url: string): Promise<Status | null> {
  try {
    // First, scrape the content
    const scrapeResult = await client.scrape.startAndWait({
      url,
      scrapeOptions: { 
        formats: ["markdown"],
      },
    });

    if (scrapeResult.status !== "completed" || !scrapeResult.data?.markdown) {
      throw new Error("Scrape failed or empty content");
    }

    const scrapedContent = scrapeResult.data.markdown;

    // Then process with OpenAI
    const currentTime = new Date().toISOString();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Current time: ${currentTime}\n\nAnalyze this DownDetector page for CURRENT status only:\n\n${scrapedContent}` }
      ],
      response_format: zodResponseFormat(ResponseSchema, "status_check"),
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) return null;
    
    try {
      const result = JSON.parse(responseContent);
      if (!result?.statuses?.[0]) return null;
      return result.statuses[0];
    } catch {
      return null;
    }
  } catch (err) {
    console.error(`❌ Failed to check ${url}`, err);
    return null;
  }
}

async function alertSlack(message: string) {
  try {
    await axios.post(SLACK_WEBHOOK, { text: message });
  } catch (err) {
    console.error("❌ Slack alert failed", err);
  }
}

async function runSmartCheck() {
  console.log(`\n🤖 Running AI outage check: ${new Date().toISOString()}`);
  const newIssues: string[] = [];
  const recoveredServices: string[] = [];
  const ongoingIssues: string[] = [];

  for (const url of TARGETS) {
    const status = await checkProviderStatus(url);
    const provider = status?.provider || url;
    const isCurrentlyDown = status?.isDown || false;
    const wasDown = previousStatus.get(provider) || false;

    if (isCurrentlyDown && !wasDown) {
      // New outage detected
      newIssues.push(`🔴 ${provider}: ${status?.reason}`);
      console.log(`🆕 NEW OUTAGE: ${provider}`);
    } else if (!isCurrentlyDown && wasDown) {
      // Service recovered
      recoveredServices.push(`✅ ${provider}: Service restored`);
      console.log(`🎉 RECOVERED: ${provider}`);
    } else if (isCurrentlyDown && wasDown) {
      // Ongoing issue (no alert needed)
      ongoingIssues.push(`🔴 ${provider}: ${status?.reason}`);
      console.log(`⏳ ONGOING: ${provider}`);
    } else {
      // Service is OK
      console.log(`✅ ${provider} is OK`);
    }

    // Update status tracking
    previousStatus.set(provider, isCurrentlyDown);
  }

  // Only send alerts if there are changes
  const alerts: string[] = [];
  if (newIssues.length > 0) {
    alerts.push(`🚨 NEW OUTAGES DETECTED:\n${newIssues.join("\n")}`);
  }
  if (recoveredServices.length > 0) {
    alerts.push(`🎉 SERVICES RECOVERED:\n${recoveredServices.join("\n")}`);
  }

  if (alerts.length > 0) {
    const alertMsg = alerts.join("\n\n");
    console.log(alertMsg);
    await alertSlack(alertMsg);
  } else if (ongoingIssues.length > 0) {
    console.log(`⏳ ${ongoingIssues.length} ongoing issues (no new alerts sent)`);
  } else {
    console.log("✅ No changes detected - all systems stable");
  }
}

// Run on start
runSmartCheck().catch(console.error);

// Schedule every hour
cron.schedule("0 * * * *", () => {
  runSmartCheck().catch(console.error);
});

console.log("🟢 AI-powered Netwatch running every hour...");