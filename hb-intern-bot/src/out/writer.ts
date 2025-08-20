import fs from 'fs';
import path from 'path';
import { Event, BotConfig, DigestItem } from '../types.js';
import { slug, timestamp, relTime, truncate } from '../utils.js';
import { generateDeck } from '../pipeline/deck.js';

export async function writeDigest(
  events: Event[],
  bot: BotConfig,
  outputDir: string,
  options: {
    generateDeck?: boolean;
    theme?: string;
    sendSlack?: boolean;
    slackWebhook?: string;
  } = {}
): Promise<void> {
  const botSlug = slug(bot.name);
  const botDir = path.join(outputDir, botSlug);
  
  // Ensure bot directory exists
  fs.mkdirSync(botDir, { recursive: true });
  
  const ts = timestamp();
  
  // Write digest markdown
  await writeDigestMarkdown(events, bot, botDir, ts);
  
  // Write events JSONL
  await writeEventsJsonl(events, botDir);
  
  // Generate PDF deck if requested
  if (options.generateDeck && events.length > 0) {
    await writeDeck(events, bot, botDir, options.theme || 'modern');
  }
  
  // Send Slack notification if requested
  if (options.sendSlack && options.slackWebhook) {
    await sendSlackDigest(events.slice(0, 5), bot, options.slackWebhook);
  }
  
  console.log(`[${bot.name}] wrote digest.md, events.jsonl${options.generateDeck ? ', deck.pdf' : ''}${options.sendSlack ? ', slack: OK' : ''}`);
}

async function writeDigestMarkdown(events: Event[], bot: BotConfig, botDir: string, ts: string): Promise<void> {
  const digestPath = path.join(botDir, `${ts}-digest.md`);
  
  let markdown = `# ${bot.name} Digest\n\n`;
  markdown += `**Built with [Hyperbrowser](https://hyperbrowser.ai)**\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n`;
  markdown += `Events: ${events.length}\n\n`;
  
  if (events.length === 0) {
    markdown += 'No events found matching the criteria.\n';
  } else {
    markdown += '## Top Stories\n\n';
    
    events.forEach((event, index) => {
      markdown += `### ${index + 1}. ${event.title}\n\n`;
      markdown += `**Source:** ${event.source.toUpperCase()}${event.subreddit ? ` (r/${event.subreddit})` : ''}\n`;
      markdown += `**Score:** ${(event.score || 0).toFixed(2)}\n`;
      markdown += `**Engagement:** ${event.points} points, ${event.comments} comments\n`;
      markdown += `**Posted:** ${relTime(event.created_at)}\n`;
      if (event.domain) {
        markdown += `**Domain:** ${event.domain}\n`;
      }
      markdown += `**URL:** [${truncate(event.url, 60)}](${event.url})\n\n`;
      
      if (event.summary) {
        markdown += '**Summary:**\n';
        markdown += event.summary + '\n\n';
      }
      
      if (event.why_matters) {
        markdown += '**Why it matters:**\n';
        markdown += event.why_matters + '\n\n';
      }
      
      markdown += '---\n\n';
    });
  }
  
  markdown += '\n## Sources\n\n';
  if (bot.sources.hn) markdown += '- Hacker News\n';
  if (bot.sources.reddit?.subs) {
    markdown += `- Reddit: ${bot.sources.reddit.subs.map(s => `r/${s}`).join(', ')}\n`;
  }
  if (bot.sources.producthunt) markdown += '- Product Hunt\n';
  if (bot.sources.blogs && bot.sources.blogs.length > 0) {
    markdown += `- Blogs: ${bot.sources.blogs.length} sources\n`;
  }
  
  markdown += '\n---\n\n';
  markdown += 'Follow @hyperbrowser for updates.\n';
  
  fs.writeFileSync(digestPath, markdown, 'utf8');
}

async function writeEventsJsonl(events: Event[], botDir: string): Promise<void> {
  const eventsPath = path.join(botDir, 'events.jsonl');
  
  const lines = events.map(event => JSON.stringify(event)).join('\n');
  fs.writeFileSync(eventsPath, lines, 'utf8');
}

async function writeDeck(events: Event[], bot: BotConfig, botDir: string, theme: string): Promise<void> {
  try {
    const deckBytes = await generateDeck(events.slice(0, 7), bot, theme);
    const deckPath = path.join(botDir, 'deck.pdf');
    fs.writeFileSync(deckPath, deckBytes);
  } catch (error) {
    console.error(`Error generating deck for ${bot.name}:`, error);
  }
}

async function sendSlackDigest(topEvents: Event[], bot: BotConfig, webhookUrl: string): Promise<void> {
  if (topEvents.length === 0) return;
  
  try {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🤖 ${bot.name} Digest`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Built with *Hyperbrowser* • ${new Date().toLocaleString()}`
          }
        ]
      },
      {
        type: 'divider'
      }
    ];
    
    topEvents.forEach((event, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${index + 1}. ${truncate(event.title, 80)}*\n${event.why_matters || 'Trending in tech community'}\n\n*Source:* ${event.source.toUpperCase()}${event.subreddit ? ` (r/${event.subreddit})` : ''} • *Score:* ${(event.score || 0).toFixed(2)} • ${event.points} points, ${event.comments} comments`
        }
      });
      
      // Add button in separate block to avoid type conflicts
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View'
            },
            url: event.url,
            action_id: `view_${event.id}`
          } as any
        ]
      });
      
      if (index < topEvents.length - 1) {
        blocks.push({ type: 'divider' });
      }
    });
    
    const payload = {
      blocks,
      text: `${bot.name} Digest - ${topEvents.length} top stories`
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('Error sending Slack digest:', error);
    throw error;
  }
}

export function ensureOutputDir(outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
}

export function getDigestItems(events: Event[]): DigestItem[] {
  return events.map(event => ({
    title: event.title,
    url: event.url,
    summary: event.summary || '',
    why_matters: event.why_matters || '',
    score: event.score || 0,
    source: event.source,
    points: event.points,
    comments: event.comments
  }));
}
