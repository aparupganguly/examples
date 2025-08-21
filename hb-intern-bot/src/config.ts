import fs from 'fs';
import * as yaml from 'yaml';
import { Config, BotConfig, SourceConfig } from './types.js';

export function loadConfig(configPath: string): Config {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(content) as Config;
  
  validateConfig(config);
  return applyDefaults(config);
}

function validateConfig(config: Config): void {
  if (!config || !config.bots || !Array.isArray(config.bots)) {
    throw new Error('Config must have a "bots" array');
  }

  for (const bot of config.bots) {
    validateBot(bot);
  }
}

function validateBot(bot: BotConfig): void {
  if (!bot.name || typeof bot.name !== 'string') {
    throw new Error('Bot must have a "name" string');
  }

  if (!bot.mode || typeof bot.mode !== 'string') {
    throw new Error(`Bot "${bot.name}" must have a "mode" string`);
  }

  if (!bot.sources || typeof bot.sources !== 'object') {
    throw new Error(`Bot "${bot.name}" must have a "sources" object`);
  }

  validateSources(bot.sources, bot.name);

  if (bot.include && !Array.isArray(bot.include)) {
    throw new Error(`Bot "${bot.name}" include must be an array of strings`);
  }

  if (bot.exclude && !Array.isArray(bot.exclude)) {
    throw new Error(`Bot "${bot.name}" exclude must be an array of strings`);
  }
}

function validateSources(sources: SourceConfig, botName: string): void {
  if (sources.reddit && sources.reddit.subs && !Array.isArray(sources.reddit.subs)) {
    throw new Error(`Bot "${botName}" reddit.subs must be an array of strings`);
  }

  if (sources.blogs && !Array.isArray(sources.blogs)) {
    throw new Error(`Bot "${botName}" blogs must be an array of strings`);
  }
}

function applyDefaults(config: Config): Config {
  return {
    ...config,
    bots: config.bots.map(bot => applyBotDefaults(bot))
  };
}

function applyBotDefaults(bot: BotConfig): BotConfig {
  const defaults = getModeDefaults(bot.mode);
  
  return {
    ...bot,
    sources: {
      ...defaults.sources,
      ...bot.sources
    },
    include: bot.include || defaults.include || [],
    exclude: bot.exclude || defaults.exclude || []
  };
}

function getModeDefaults(mode: string): Partial<BotConfig> {
  switch (mode) {
    case 'ai':
      return {
        sources: {
          hn: true,
          reddit: { subs: ['MachineLearning', 'LocalLLaMA', 'Artificial'] },
          producthunt: true,
          blogs: []
        },
        include: ['ai', 'machine learning', 'llm', 'gpt', 'openai', 'anthropic'],
        exclude: ['hiring', 'who is hiring', 'promo']
      };
    
    case 'devtools':
      return {
        sources: {
          hn: true,
          reddit: { subs: ['programming', 'webdev', 'devops'] },
          producthunt: true,
          blogs: []
        },
        include: ['development', 'framework', 'library', 'tool', 'cli', 'api'],
        exclude: ['hiring', 'job', 'career']
      };
    
    case 'startup':
      return {
        sources: {
          hn: true,
          reddit: { subs: ['startups', 'entrepreneur'] },
          producthunt: true,
          blogs: []
        },
        include: ['startup', 'funding', 'launch', 'saas', 'business'],
        exclude: ['hiring', 'job posting']
      };
    
    default:
      return {
        sources: { hn: true },
        include: [],
        exclude: []
      };
  }
}

export function printSampleConfig(): void {
  const sample = `bots:
  - name: "AI Daily"
    mode: "ai"
    sources:
      hn: true
      reddit:
        subs: ["MachineLearning", "LocalLLaMA", "Artificial", "startups"]
      producthunt: true
      blogs:
        - "https://openai.com/blog"
        - "https://www.anthropic.com/news"
        - "https://deepmind.google/discover/blog"
    include: ["open source", "launch", "models", "inference", "pricing", "vector", "RAG"]
    exclude: ["hiring", "who is hiring", "promo"]
    
  - name: "DevTools Watch"
    mode: "devtools"
    sources:
      hn: true
      reddit: 
        subs: ["programming", "dataengineering", "devops"]
      producthunt: true
      blogs:
        - "https://vercel.com/changelog"
        - "https://github.blog/changelog/"
        - "https://aws.amazon.com/about-aws/whats-new/"
    include: ["framework", "library", "cli", "api", "tool"]
    exclude: ["hiring", "job", "career"]`;

  console.log(sample);
}
