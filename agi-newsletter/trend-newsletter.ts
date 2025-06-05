// newsletter.ts
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import { z } from "zod";
import OpenAI from "openai";
import { Resend } from "resend";
import { zodResponseFormat } from "openai/helpers/zod";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// 1️⃣ Define the user array
const users = [
  { name: "Aparup", email: "aparupganguly86@gmail.com" },
  { name: "Bob", email: "delivered@resend.dev" },
  { name: "Charlie", email: "bounced@resend.dev" },
];

// 2️⃣ List of URLs to scrape
const urls = [
  "https://www.anthropic.com/news",
  "https://openai.com/blog",
  "https://deepmind.com/blog",
  "https://news.ycombinator.com/front",
];

// 3️⃣ Newsletter schema
const NewsletterSchema = z.object({
  newsletter: z.string(),
});

const SYSTEM_PROMPT = `You are a helpful assistant that can read the following markdown content from multiple webpages and generate a concise, human-friendly newsletter draft.
- Summarize the key announcements, updates, or blog posts.
- Write in a friendly, approachable tone.
- Do not use any HTML, just plain text.
- Keep it short and engaging.`;

// 4️⃣ Main function
const main = async () => {
  console.log("🔍 Starting to scrape pages...");

  let combinedMarkdown = "";

  for (const url of urls) {
    console.log(`🌐 Scraping ${url}`);
    const scrapeResult = await client.scrape.startAndWait({
      url,
      scrapeOptions: {
        formats: ["markdown"],
        includeTags: ["body"],
        excludeTags: ["img"],
      },
    });

    if (scrapeResult.status === "failed") {
      console.error(`❌ Scrape failed for ${url}:`, scrapeResult.error);
      continue;
    }

    if (!scrapeResult.data || !scrapeResult.data.markdown) {
      console.warn(`⚠️ No markdown data found for ${url}`);
      continue;
    }

    combinedMarkdown += `\n\n### Content from ${url}\n\n`;
    combinedMarkdown += scrapeResult.data.markdown;
  }

  if (!combinedMarkdown) {
    console.error("🚫 No markdown data found from any URLs.");
    return;
  }

  console.log("🤖 Generating newsletter draft with OpenAI...");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: combinedMarkdown },
    ],
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    console.error("🚫 Failed to get newsletter content from OpenAI response.");
    return;
  }

  const newsletterDraft = content;

  // 5️⃣ Personalize and send the newsletter for each user
  for (const user of users) {
    const personalizedNewsletter = `Hello, ${user.name},\n\n${newsletterDraft}`;

    // Send email via Resend
    try {
      const emailResponse = await resend.emails.send({
        from: "onboarding@resend.dev", // Using Resend's verified domain for testing
        to: user.email,
        subject: "Your Weekly AI Newsletter",
        text: personalizedNewsletter,
      });
      console.log(`📧 Sent newsletter to ${user.email}:`, emailResponse);
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
    }
  }

  console.log("📨 All newsletters generated and sent successfully!");
};

main();