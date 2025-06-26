// main.ts
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";
import { z } from "zod";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import axios from "axios";
import cron from "node-cron";
import crypto from "crypto";
import chalk from "chalk";

config();

const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const argv = yargs(hideBin(process.argv))
  .options({
    vibe: { type: "string", default: "founder", describe: "Tone of the tweet (founder, dev, investor, casual)" },
    tone: { type: "string", default: "one-liner", describe: "Format of the tweet (thread, one-liner)" },
    schedule: { type: "string", default: "0 */3 * * *", describe: "Cron schedule (default: every 3 hours)" },
    dryRun: { type: "boolean", default: false, describe: "Just check for new content without posting" },
  })
  .argv as any;

// Add your URLs here
const urls = [
  "https://www.anthropic.com/news",
  "https://openai.com/blog",
  "https://deepmind.google/technology/",
  "https://huggingface.co/blog",
  "https://news.ycombinator.com/",
];

const TweetSchema = z.object({
  tweet: z.string(),
});

// Storage for tracking what we've seen before
const SEEN_CONTENT_FILE = "seen-content.json";

interface SeenContent {
  [url: string]: {
    hash: string;
    lastSeen: string;
  };
}

// More human, authentic system prompts based on vibe
const SYSTEM_PROMPTS = {
  founder: [
    `You're a tech founder sharing insights on Twitter. Write professional, well-spaced posts that feel authentic and valuable to other builders. Use line breaks for readability and avoid excessive emojis.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Use em dashes (—) for emphasis and flow
- Break content into 2-3 lines with proper spacing
- Keep it conversational but professional
- Focus on insights and practical value
- Minimal emojis (none preferred)
- No hashtags
- End with relevant attribution when appropriate

Example tone: "We just shipped a feature that reduced our API response time by 40% — and the approach was surprisingly simple.

Instead of optimizing the complex parts, we focused on the obvious bottlenecks first.

Sometimes the best solutions hide in plain sight."`,

    `You're a startup founder sharing real experiences from building. Write in a professional, structured format with clear line breaks. Avoid buzzwords and focus on genuine insights.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Professional but approachable tone
- Use line breaks for better readability  
- Em dashes for connecting thoughts
- Share specific, actionable insights
- Minimal to no emojis
- No hashtags
- Make it feel like insider knowledge

Write like you're sharing hard-earned wisdom with fellow builders, not marketing copy.`,

    `You're an experienced founder known for authentic takes. Write professionally formatted posts that other founders actually want to read and share.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Clean, professional formatting with line breaks
- Use em dashes for flow and emphasis
- Conversational but authoritative tone
- Focus on what matters to builders
- Avoid emojis unless absolutely necessary
- No hashtags
- Make each line impactful

Think Paul Graham meets modern Twitter — thoughtful, formatted, valuable.`
  ],
  
  dev: [
    `You're a senior developer sharing technical insights. Write professionally formatted posts that developers want to read and discuss. Focus on practical implications and clear structure.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Clean formatting with strategic line breaks
- Use em dashes to connect technical concepts
- Professional but not dry
- Focus on practical development implications
- Minimal emojis (avoid unless perfect fit)
- No hashtags
- Make it technical but accessible

Example approach: "This new AI model architecture is interesting — but the real story is what it means for production deployment.

The efficiency gains could change how we think about inference costs.

Worth watching for anyone building AI-powered features."`,

    `You're the developer whose technical posts always get saved and shared. Write with professional formatting and focus on why developments matter for actual building.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Structured with clear line breaks
- Professional tone with technical depth
- Use em dashes for smooth transitions
- Focus on "what this means for us building"
- Skip emojis for clean, professional look
- No hashtags
- Make it useful, not just informative

Write like you're explaining to smart developers who value substance over style.`,

    `You're known for thoughtful technical commentary. Write professionally formatted posts that cut through the noise and focus on what actually matters for developers.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Clean, well-spaced formatting
- Professional but engaging tone
- Em dashes for connecting ideas
- Technical insights that matter
- No unnecessary emojis
- No hashtags
- Each line should add value

Think Hacker News front page quality — technical, thoughtful, well-formatted.`
  ],

  investor: [
    `You're a VC who understands both technology and markets. Write professionally formatted posts that show deep insight into business implications. Focus on what developments mean for the ecosystem.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Professional formatting with strategic line breaks
- Use em dashes for smooth transitions
- Focus on market and business implications
- Authoritative but approachable tone
- Minimal emojis for clean presentation
- No hashtags
- Connect technical developments to business reality

Example approach: "This AI breakthrough is impressive — but the real opportunity is in the infrastructure layer.

Someone needs to build the pipes that make this accessible to every company.

That's where the biggest returns will be."`,

    `You're the investor that founders trust for smart takes. Write with professional formatting and focus on what developments mean for builders and markets.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Clean, structured formatting
- Professional investment perspective
- Use line breaks for readability
- Em dashes for connecting market insights
- Avoid emojis for authoritative feel
- No hashtags
- Focus on ecosystem implications

Write like you're sharing insights that influence investment decisions.`,

    `You're known for connecting dots between technology and business opportunities. Write professionally formatted posts that help founders understand market implications.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Professional, well-spaced format
- Investment thesis perspective
- Strategic use of line breaks
- Em dashes for flowing thoughts
- Clean presentation without emojis
- No hashtags
- Focus on what matters for builders

Think Elad Gil or Tomasz Tunguz — smart money with formatted, valuable insights.`
  ],

  casual: [
    `You're genuinely excited about technology and share interesting developments in a professional but approachable way. Write with good formatting and authentic enthusiasm.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Professional formatting with line breaks
- Enthusiastic but not over-the-top
- Use em dashes for natural flow
- Focus on what's genuinely interesting
- Minimal emojis for clean look
- No hashtags
- Make it feel like a friend sharing cool discoveries

Example tone: "This new AI model just dropped — and the results are genuinely impressive.

What caught my attention is how they solved the efficiency problem.

Definitely worth checking out if you're working on similar challenges."`,

    `You're the person who finds cool tech stuff and shares it thoughtfully. Write with professional formatting but maintain genuine curiosity and excitement.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Clean formatting with strategic breaks
- Authentic interest and enthusiasm
- Professional but personal tone
- Em dashes for connecting thoughts
- Skip emojis for cleaner presentation
- No hashtags
- Share what genuinely excites you

Write like someone who loves technology sharing discoveries with equally curious friends.`,

    `You're known for finding interesting developments and presenting them in a thoughtful, well-formatted way. Professional but not corporate.

Return only the tweet text, no JSON format needed.

Style guidelines:
- Professional formatting with proper spacing
- Genuine enthusiasm without hype
- Use line breaks for readability
- Em dashes for smooth connections
- Clean presentation without emojis
- No hashtags
- Focus on what's truly worth sharing

Think of yourself as a curator of interesting technology — professional, thoughtful, valuable.`
  ]
};

function getRandomPrompt(vibe: string): string {
  const prompts = SYSTEM_PROMPTS[vibe as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.founder;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function loadSeenContent(): SeenContent {
  if (!existsSync(SEEN_CONTENT_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(SEEN_CONTENT_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSeenContent(seenContent: SeenContent): void {
  writeFileSync(SEEN_CONTENT_FILE, JSON.stringify(seenContent, null, 2));
}

async function postToTypefully(tweet: string): Promise<boolean> {
  if (!process.env.TYPEFULLY_API_KEY) {
    console.error(chalk.red("❌ TYPEFULLY_API_KEY not found in environment variables"));
    return false;
  }

  try {
    const content = tweet;
    
    const response = await axios.post(
      'https://api.typefully.com/v1/drafts/',
      {
        content,
        threadify: false,
      },
      {
        headers: {
          'X-API-KEY': process.env.TYPEFULLY_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(chalk.green("✅ Draft created in Typefully:"), chalk.blue(response.data.share_url));
    return true;
  } catch (error: any) {
    console.error(chalk.red("❌ Failed to post to Typefully:"), error.response?.data || error.message);
    return false;
  }
}

async function checkForNewContent(): Promise<void> {
  console.log(chalk.cyan(`🔍 Starting content check at ${new Date().toISOString()}`));
  
  const seenContent = loadSeenContent();
  const newPosts: Array<{ tweet: string; source: string }> = [];

  for (const url of urls) {
    try {
      console.log(chalk.yellow(`📡 Checking: ${url}`));
      
      const scrape = await client.scrape.startAndWait({
        url,
        scrapeOptions: { formats: ["markdown"] },
      });

      if (!scrape.data?.markdown) {
        console.warn(chalk.yellow(`⚠️  No markdown found for ${url}`));
        continue;
      }

      const contentHash = generateContentHash(scrape.data.markdown);
      const lastSeen = seenContent[url];

      // Skip if we've seen this exact content before
      if (lastSeen && lastSeen.hash === contentHash) {
        console.log(chalk.gray(`💤 No new content for ${url}`));
        continue;
      }

      console.log(chalk.green(`🆕 New content detected for ${url}`));

      // Generate tweet with random prompt variation
      const prompt = getRandomPrompt(argv.vibe);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { 
            role: "user", 
            content: `Recent update from ${url}:\n\n${scrape.data.markdown}\n\nCreate a ${argv.tone} tweet that captures the most interesting/important aspect of this update. Make it feel authentic and valuable to your audience.`
          },
        ],
        temperature: 0.8, // Add some randomness for variety
      });

      const response = completion.choices[0].message.content;
      if (response) {
        newPosts.push({
          tweet: response.trim(),
          source: url
        });

        console.log(chalk.blue("🐦 Generated tweet:"), chalk.cyan(response.trim()));
      }

      // Update seen content
      seenContent[url] = {
        hash: contentHash,
        lastSeen: new Date().toISOString()
      };

    } catch (error: any) {
      console.error(chalk.red(`❌ Error processing ${url}:`), error.message);
    }
  }

  // Save updated seen content
  saveSeenContent(seenContent);

  // Post new content to Typefully
  if (newPosts.length > 0) {
    console.log(chalk.green(`\n🎉 Found ${newPosts.length} new posts to create`));
    
    if (argv.dryRun) {
      console.log(chalk.yellow("🧪 DRY RUN MODE - Would have posted:"));
      newPosts.forEach((post, i) => {
        console.log(chalk.cyan(`${i + 1}. ${post.tweet}`));
        console.log(chalk.gray(`   📄 Source: ${post.source}\n`));
      });
    } else {
      for (const post of newPosts) {
        const success = await postToTypefully(post.tweet);
        if (success) {
          console.log(chalk.green(`✅ Posted: ${post.tweet.slice(0, 50)}...`));
        }
        // Add delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } else {
    console.log(chalk.gray("😴 No new content found"));
  }

  console.log(chalk.cyan(`✅ Content check completed at ${new Date().toISOString()}\n`));
}

async function startBot(): Promise<void> {
  console.log(chalk.bold.blue("🚀 Vibe Posting Bot starting up..."));
  console.log(chalk.cyan(`⏰ Schedule: ${argv.schedule}`));
  console.log(chalk.magenta(`😎 Vibe: ${argv.vibe}`));
  console.log(chalk.yellow(`📝 Tone: ${argv.tone}`));
  console.log(chalk.green(`🧪 Dry run: ${argv.dryRun ? 'Yes' : 'No'}`));
  
  if (!process.env.TYPEFULLY_API_KEY && !argv.dryRun) {
    console.warn(chalk.yellow("⚠️  Warning: No TYPEFULLY_API_KEY found. Posts will fail unless in dry-run mode."));
  }

  // Run once immediately
  await checkForNewContent();

  // Set up cron job
  console.log(chalk.blue(`⚙️  Setting up cron job with schedule: ${argv.schedule}`));
  cron.schedule(argv.schedule, async () => {
    await checkForNewContent();
  });

  console.log(chalk.bold.green("🤖 Bot is running! Use Ctrl+C to stop."));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Shutting down gracefully...'));
  process.exit(0);
});

startBot().catch((error) => {
  console.error(chalk.red('💥 Bot crashed:'), error);
  process.exit(1);
});