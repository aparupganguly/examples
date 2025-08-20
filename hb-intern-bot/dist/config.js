"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.printSampleConfig = printSampleConfig;
const fs_1 = __importDefault(require("fs"));
const yaml = __importStar(require("yaml"));
function loadConfig(configPath) {
    if (!fs_1.default.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }
    const content = fs_1.default.readFileSync(configPath, 'utf8');
    const config = yaml.parse(content);
    validateConfig(config);
    return applyDefaults(config);
}
function validateConfig(config) {
    if (!config || !config.bots || !Array.isArray(config.bots)) {
        throw new Error('Config must have a "bots" array');
    }
    for (const bot of config.bots) {
        validateBot(bot);
    }
}
function validateBot(bot) {
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
function validateSources(sources, botName) {
    if (sources.reddit && sources.reddit.subs && !Array.isArray(sources.reddit.subs)) {
        throw new Error(`Bot "${botName}" reddit.subs must be an array of strings`);
    }
    if (sources.blogs && !Array.isArray(sources.blogs)) {
        throw new Error(`Bot "${botName}" blogs must be an array of strings`);
    }
}
function applyDefaults(config) {
    return {
        ...config,
        bots: config.bots.map(bot => applyBotDefaults(bot))
    };
}
function applyBotDefaults(bot) {
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
function getModeDefaults(mode) {
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
function printSampleConfig() {
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
//# sourceMappingURL=config.js.map