import { Command } from 'commander';
import dotenv from 'dotenv';
import axios from 'axios';
import { chromium } from 'playwright-core';
import HyperbrowserClient from '@hyperbrowser/sdk';
import chalk from 'chalk';

dotenv.config();

type ClassifiedPattern = { name: string; evidence: string };
type ScanResult = { site: string; patterns_found: string[]; evidence: string[] };

const program = new Command();

program
  .name('dark-pattern-finder')
  .description('Scan websites for dark patterns using Hyperbrowser + Groq')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan one or more URLs for dark patterns')
  .argument('<urls...>', 'URL(s) to scan')
  .action(async (urls: string[]) => {
    try {
      validateEnv();
      const scanResults: ScanResult[] = [];

      for (const targetUrl of urls) {
        try {
          const singleResult = await analyzeUrl(targetUrl);
          scanResults.push(singleResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to analyze ${targetUrl}: ${message}`);
        }
      }

      printColoredResults(scanResults);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);

function validateEnv(): void {
  if (!process.env.HYPERBROWSER_API_KEY) {
    throw new Error('Missing HYPERBROWSER_API_KEY. Set it in your environment or .env');
  }
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY. Set it in your environment or .env');
  }
}

async function analyzeUrl(url: string): Promise<ScanResult> {
  const hyperbrowserClient = new (HyperbrowserClient as any)({ apiKey: process.env.HYPERBROWSER_API_KEY as string });


  let session;
  try {
    session = await hyperbrowserClient.createSession();
  } catch (e: any) {
    const details = formatSdkError(e);
    throw new Error(`Hyperbrowser createSession failed${details}`);
  }
  const withWs = await waitForWsEndpoint(hyperbrowserClient, session.id, 30000);

  try {
    const browser = await chromium.connectOverCDP(withWs.wsEndpoint as string);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();


    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const domText: string = await page.evaluate(() => document.body?.innerText || '');

    const uiElements = await page.evaluate(() => {
      const asRecord = (entries: [string, string | null][]) => {
        const result: Record<string, string | null> = {};
        for (const [key, value] of entries) result[key] = value;
        return result;
      };


      const buttons = Array.from(document.querySelectorAll('button'))
        .slice(0, 300)
        .map((el) => ({
          tag: el.tagName,
          text: el.innerText?.trim() || '',
          attrs: asRecord(el.getAttributeNames().map((n) => [n, el.getAttribute(n)])),
        }));


      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .slice(0, 300)
        .map((el) => ({
          tag: (el as HTMLElement).tagName,
          checked: (el as HTMLInputElement).checked,
          label: (el as HTMLElement).closest('label')?.innerText?.trim() || (el as HTMLElement).ariaLabel || '',
          attrs: asRecord((el as HTMLElement).getAttributeNames().map((n) => [n, (el as HTMLElement).getAttribute(n)])),
        }));


      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, .dialog, .popup'))
        .slice(0, 100)
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 2000) || '',
          attrs: asRecord(el.getAttributeNames().map((n) => [n, el.getAttribute(n)])),
        }));


      const timerSelector = '[class*="timer" i], [id*="timer" i], [class*="countdown" i], [id*="countdown" i]';
      const timers = Array.from(document.querySelectorAll(timerSelector))
        .slice(0, 100)
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 500) || '',
          attrs: asRecord(el.getAttributeNames().map((n) => [n, el.getAttribute(n)])),
        }));

      return { buttons, checkboxes, modals, timers };
    });

    await browser.close();

    const patterns = await classifyWithGroq(domText, uiElements);
    const normalized = normalizePatterns(patterns);

    return {
      site: url,
      patterns_found: normalized.map((p) => p.name),
      evidence: normalized.map((p) => p.evidence),
    };
  } finally {

    try {
      await hyperbrowserClient.stopSession(session.id);
    } catch {}
  }
}

function buildPrompt(domText: string, ui: unknown): string {
  return [
    'You are an expert UX analyst detecting dark patterns. Analyze this webpage data and identify specific deceptive practices.',
    '',
    'Dark pattern categories:',
    '- Scarcity: False urgency/limited time offers',
    '- Obstruction: Making cancellation/opt-out difficult',
    '- Sneaking: Hidden costs, pre-checked boxes, added items',
    '- Misdirection: Misleading buttons, buried important info',
    '- Forced Action: Required signups, mandatory sharing',
    '- Hidden Fees: Surprise charges at checkout',
    '',
    'For each pattern found, use the classifyPattern tool with:',
    '- name: Pattern type + brief description (e.g. "Scarcity - fake countdown timer")',
    '- evidence: Detailed explanation of what makes this deceptive (2-3 sentences)',
    '',
    'Only report clear, verifiable dark patterns with specific evidence.',
    '',
    'PAGE CONTENT:',
    truncate(domText, 12000),
    '',
    'UI ELEMENTS:',
    truncate(JSON.stringify(ui, null, 2), 8000),
  ].join('\n');
}

async function classifyWithGroq(domText: string, ui: unknown): Promise<ClassifiedPattern[]> {
  const prompt = buildPrompt(domText, ui);

  const tools = [
    {
      type: 'function',
      function: {
        name: 'classifyPattern',
        description: 'Classify a single dark pattern with concise evidence snippet from page content.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Pattern type and brief description (e.g. "Scarcity - fake timer", "Sneaking - hidden fees")' },
            evidence: { type: 'string', description: 'Detailed 2-3 sentence explanation of why this is deceptive, with specific examples from the page' },
          },
          required: ['name', 'evidence'],
          additionalProperties: false,
        },
      },
    },
  ];


  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const requestBody = {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return only verifiable findings. If unsure, return none.' },
          { role: 'user', content: prompt },
        ],
        tools,
        tool_choice: 'auto',
      };
      
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          timeout: 45000,
        }
      );

      const message = response.data?.choices?.[0]?.message;


      if (message?.tool_calls && Array.isArray(message.tool_calls)) {
        const extracted: ClassifiedPattern[] = [];
        for (const call of message.tool_calls) {
          if (call?.function?.name === 'classifyPattern') {
            try {
              const args = JSON.parse(call.function.arguments || '{}');
              if (typeof args.name === 'string' && typeof args.evidence === 'string') {
                extracted.push({ name: args.name, evidence: args.evidence });
              }
            } catch {}
          }
        }
        if (extracted.length > 0) return extracted;
      }


      const content: string = message?.content || '';
      const parsed = safeParsePatterns(content);
      if (parsed.length > 0) return parsed;

      return [];
    } catch (err: any) {
      if (attempt === maxAttempts) throw err;
      await sleep(400 * attempt);
    }
  }

  return [];
}

function safeParsePatterns(text: string): ClassifiedPattern[] {
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json
        .filter((item) => item && typeof item.name === 'string' && typeof item.evidence === 'string')
        .map((item) => ({ name: item.name, evidence: item.evidence }));
    }
    if (json && Array.isArray(json.patterns)) {
      return json.patterns
        .filter((item: any) => item && typeof item.name === 'string' && typeof item.evidence === 'string')
        .map((item: any) => ({ name: item.name, evidence: item.evidence }));
    }
  } catch {}
  return [];
}

function normalizePatterns(items: ClassifiedPattern[]): ClassifiedPattern[] {
  const unique: ClassifiedPattern[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.name}__${item.evidence}`.toLowerCase();
    if (!seen.has(key)) {
      unique.push({ name: item.name, evidence: item.evidence });
      seen.add(key);
    }
  }
  return unique.slice(0, 25);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max) + `\n...[truncated ${value.length - max} chars]`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWsEndpoint(client: any, sessionId: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    let info;
    try {
      info = await client.getSession(sessionId);
    } catch (e: any) {
      const details = formatSdkError(e);
      throw new Error(`Hyperbrowser getSession failed${details}`);
    }
    if (info.wsEndpoint) return info;
    await sleep(1000);
  }
  throw new Error('Timeout waiting for Hyperbrowser session wsEndpoint');
}

function printColoredResults(results: ScanResult[]): void {
  console.log(chalk.cyan.bold('\n🔍 Dark Pattern Scan Results\n'));
  
  for (const result of results) {
    console.log(chalk.blue.bold(`🌐 Site: ${result.site}`));
    
    if (result.patterns_found.length === 0) {
      console.log(chalk.green('✅ No dark patterns detected\n'));
      continue;
    }
    
    console.log(chalk.red.bold(`⚠️  Found ${result.patterns_found.length} dark pattern${result.patterns_found.length > 1 ? 's' : ''}:`));
    
    for (let i = 0; i < result.patterns_found.length; i++) {
      const pattern = result.patterns_found[i];
      const evidence = result.evidence[i] || '';
      
      const emoji = getPatternEmoji(pattern || '');
      console.log(chalk.red(`\n${emoji} ${chalk.bold(pattern)}`));
      console.log(chalk.gray(`   ${evidence}`));
    }
    console.log('');
  }
  
  printSummary(results);
}

function printSummary(results: ScanResult[]): void {
  const totalSites = results.length;
  const totalPatterns = results.reduce((sum, r) => sum + r.patterns_found.length, 0);
  const sitesWithPatterns = results.filter(r => r.patterns_found.length > 0).length;
  
  console.log(chalk.cyan.bold('📊 Summary'));
  console.log(chalk.white(`Sites scanned: ${totalSites}`));
  console.log(chalk.white(`Sites with dark patterns: ${sitesWithPatterns}`));
  console.log(chalk.white(`Total patterns found: ${totalPatterns}`));
  
  if (totalPatterns > 0) {
    const patternCounts: { [key: string]: number } = {};
    results.forEach(r => {
      r.patterns_found.forEach(p => {
        const type = p.split(' ')[0] || p;
        patternCounts[type] = (patternCounts[type] || 0) + 1;
      });
    });
    
    const sorted = Object.entries(patternCounts).sort(([,a], [,b]) => b - a);
    console.log(chalk.yellow('\nMost common patterns:'));
    sorted.slice(0, 3).forEach(([pattern, count]) => {
      const emoji = getPatternEmoji(pattern);
      console.log(chalk.yellow(`  ${emoji} ${pattern}: ${count}`));
    });
  }
  console.log('');
}

function getPatternEmoji(pattern: string): string {
  const lower = pattern.toLowerCase();
  if (lower.includes('scarcity')) return '⏰';
  if (lower.includes('obstruction')) return '🚧';
  if (lower.includes('sneaking')) return '🥷';
  if (lower.includes('misdirection')) return '🎯';
  if (lower.includes('forced')) return '🔒';
  if (lower.includes('hidden') || lower.includes('fee')) return '💰';
  return '⚠️';
}

function formatSdkError(e: any): string {
  const status = e?.statusCode || e?.response?.status;
  const statusStr = status ? ` (status ${status})` : '';
  if (e?.response && typeof e.response.text === 'function') {
    return `${statusStr}: ${e.message || ''}`;
  }
  const msg = e?.message || String(e);
  return `${statusStr}: ${msg}`;
}


