import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import cron from 'node-cron';

interface Config {
  cadence_hours?: number;
  notify?: { slack_webhook?: string };
  urls: Array<{ id: string; url: string; group?: string; extract?: string }>;
  rules?: { taggers?: Array<{ pattern: string; tag: string }> };
}

interface Snapshot {
  text: string;
  hash: string;
  timestamp: string;
}

const hb = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function loadConfig(): Config {
  return parseYaml(readFileSync('config.yaml', 'utf8'));
}

function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function log(message: string): void {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${timestamp} IST] ${message}`);
}

function hoursToCronExpression(hours: number): string {
  // Convert hours to cron expression: "0 */N * * *" (every N hours)
  return `0 */${hours} * * *`;
}

function readSnap(id: string): Snapshot | null {
  const path = join('.data/snapshots', `${id}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function writeSnap(id: string, text: string): void {
  const snapshot = { text, hash: sha(text), timestamp: new Date().toISOString() };
  writeFileSync(join('.data/snapshots', `${id}.json`), JSON.stringify(snapshot, null, 2));
}

async function browse(url: string): Promise<string> {
  const result = await hb.scrape.startAndWait({
    url: url,
  });
  return result.data?.text || '';
}

async function analyzeContent(id: string, url: string, prevText: string | null, currText: string): Promise<string> {
  const isInitial = !prevText;
  const systemPrompt = isInitial 
    ? 'You are a research intern briefing your founder. Analyze this content and provide insights in this format: Key Points: [3-4 clean bullets] Strategic Insights: [2-3 sentences] Business Impact: [1-2 sentences] Priority: P1/P2 Tags: [2-3 relevant tags]. Keep it clean and readable.'
    : 'You are a research intern briefing your founder on changes. Format: Changes: [3-4 clean bullets] Strategic Impact: [2-3 sentences] Business Implications: [1-2 sentences] Priority: P0/P1/P2 Tags: [2-3 relevant tags]. Keep it clean and readable.';
  
  const userContent = isInitial
    ? `Analyze ${url} (${id}) for competitive intelligence:\n\n${currText.slice(0, 3000)}`
    : `Analyze changes for ${id}:\n\nPREVIOUS:\n${prevText?.slice(0, 2000)}\n\nCURRENT:\n${currText.slice(0, 2000)}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }]
  });
  return response.choices[0]?.message?.content || (isInitial ? 'Initial baseline established' : 'No analysis available');
}

async function generatePlan(urls: string[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a research intern. Create a brief monitoring plan (3-4 sentences max per URL) explaining what to watch and why it matters. Keep it clean and Slack-ready with minimal formatting.' },
      { role: 'user', content: `Brief monitoring plan for: ${urls.join(', ')}` }
    ]
  });
  return response.choices[0]?.message?.content || 'No plan available';
}

function diffChanged(prev: Snapshot | null, curr: string): boolean {
  return !prev || prev.hash !== sha(curr);
}

async function notifySlack(webhook: string, content: string): Promise<void> {
  try {
    // Slack supports up to 40,000 characters, but we'll use 35,000 to be safe
    let message = content;
    if (content.length > 35000) {
      // Smart truncation: keep the beginning and add truncation notice
      message = content.slice(0, 34900) + '\n\n...(message truncated due to length)';
    }
    
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (error) {
    console.warn('Slack notification failed:', error);
  }
}

async function writeReport(group: string, changes: Array<{ id: string; url: string; summary: string }>, plan: string): Promise<string> {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const filename = `${Date.now()}.md`;
  
  let content = `COMPETITIVE INTELLIGENCE REPORT\nGroup: ${group} | ${timestamp} IST\n\nMONITORING STRATEGY:\n${plan}\n\nFINDINGS:\n\n`;
  
  if (changes.length > 0) {
    for (const change of changes) {
      content += `${change.id.replace('_', ' ').toUpperCase()}\nSource: ${change.url}\n\n${change.summary}\n\n---\n\n`;
    }
    
    const p0Count = changes.filter(c => c.summary.includes('P0')).length;
    const p1Count = changes.filter(c => c.summary.includes('P1')).length;
    
    content += `SUMMARY:\n`;
    if (p0Count > 0) content += `CRITICAL (P0): ${p0Count} urgent changes\n`;
    if (p1Count > 0) content += `HIGH PRIORITY (P1): ${p1Count} important developments\n`;
    content += `Total updates: ${changes.length} sources\n\n`;
    content += `ACTIONS:\n- Immediate: Review P0 changes\n- This week: Analyze P1 implications\n- Strategic: Update positioning\n\n`;
  } else {
    content += `No changes detected. All sources stable.\n\n`;
  }
  
  content += `Generated by Hyperbrowser Research Agent`;
  writeFileSync(join('.data/reports', filename), content);
  return content;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function processUrl(urlConfig: { id: string; url: string }): Promise<{ id: string; url: string; summary: string } | null> {
  try {
    log(`Processing ${urlConfig.id}...`);
    const currText = await withTimeout(browse(urlConfig.url), 60000);
    const prevSnap = readSnap(urlConfig.id);
    
    if (diffChanged(prevSnap, currText)) {
      const summary = await analyzeContent(urlConfig.id, urlConfig.url, prevSnap?.text || null, currText);
      writeSnap(urlConfig.id, currText);
      log(`✓ Changes detected in ${urlConfig.id}`);
      return { id: urlConfig.id, url: urlConfig.url, summary };
    }
    log(`○ No changes in ${urlConfig.id}`);
    return null;
  } catch (error) {
    log(`✗ Error processing ${urlConfig.id}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function runBatch(urls: Array<{ id: string; url: string }>, concurrency = 4): Promise<Array<{ id: string; url: string; summary: string }>> {
  const results: Array<{ id: string; url: string; summary: string }> = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processUrl));
    results.push(...batchResults.filter(r => r !== null));
  }
  return results;
}

async function runMonitoring(): Promise<void> {
  const groupFilter = process.argv.includes('--group') ? process.argv[process.argv.indexOf('--group') + 1] : null;
  mkdirSync('.data/snapshots', { recursive: true });
  mkdirSync('.data/reports', { recursive: true });
  
  const config = loadConfig();
  const filteredUrls = groupFilter ? config.urls.filter(u => u.group === groupFilter) : config.urls;
  if (filteredUrls.length === 0) { 
    log('No URLs to process'); 
    return; 
  }
  
  log(`Starting monitoring run for ${filteredUrls.length} URLs${groupFilter ? ` (group: ${groupFilter})` : ''}`);
  
  const plan = await generatePlan(filteredUrls.map(u => u.url));
  const changes = await runBatch(filteredUrls);
  
  if (changes.length > 0) {
    const report = await writeReport(groupFilter || 'all', changes, plan);
    log(`✓ Report generated with ${changes.length} changes`);
    if (config.notify?.slack_webhook) {
      const webhook = config.notify.slack_webhook.replace('${SLACK_WEBHOOK_URL}', process.env.SLACK_WEBHOOK_URL || '');
      if (webhook && webhook !== '${SLACK_WEBHOOK_URL}') {
        await notifySlack(webhook, report);
        log('✓ Slack notification sent');
      }
    }
  } else { 
    log('○ No changes detected across all sources'); 
  }
  
  log('Monitoring run completed\n');
}

async function startContinuousMode(): Promise<void> {
  const config = loadConfig();
  const cadenceHours = config.cadence_hours || 3;
  const cronExpression = hoursToCronExpression(cadenceHours);
  
  log(`🚀 Starting Research Bot in continuous mode`);
  log(`📅 Schedule: Every ${cadenceHours} hours (${cronExpression})`);
  log(`🎯 Monitoring ${config.urls.length} URLs`);
  log(`Press Ctrl+C to stop\n`);
  
  // Run immediately on startup
  log('⚡ Running initial monitoring...');
  await runMonitoring().catch(error => log(`Error in monitoring: ${error}`));
  
  // Schedule recurring runs
  const task = cron.schedule(cronExpression, async () => {
    log('⏰ Scheduled monitoring triggered');
    await runMonitoring().catch(error => log(`Error in monitoring: ${error}`));
  }, {
    scheduled: false
  });
  
  task.start();
  log(`✅ Scheduler started. Next run in ${cadenceHours} hours.`);
  
  // Keep the process alive
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down gracefully...');
    task.destroy();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 Received SIGTERM, shutting down...');
    task.destroy();
    process.exit(0);
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isContinuous = args.includes('--continuous');
  const isOnce = args.includes('--once');
  
  if (isContinuous) {
    await startContinuousMode();
  } else if (isOnce || (!isContinuous && !isOnce)) {
    // Default to one-shot mode for backward compatibility
    log('🔄 Running in one-shot mode');
    await runMonitoring();
  }
}

main().catch(error => {
  log(`Fatal error: ${error}`);
  process.exit(1);
});
