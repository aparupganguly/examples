#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("./config.js");
const main_js_1 = require("./main.js");
const watch_js_1 = require("./watch.js");
const writer_js_1 = require("./out/writer.js");
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        config: '',
        out: './out',
        since: '24h',
        top: 10,
        deck: false,
        slack: false,
        theme: 'modern',
        reset: false
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        switch (arg) {
            case '--config':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--config requires a path argument');
                    process.exit(1);
                }
                options.config = nextArg;
                i++;
                break;
            case '--out':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--out requires a directory path');
                    process.exit(1);
                }
                options.out = nextArg;
                i++;
                break;
            case '--since':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--since requires a time window (24h, 48h, 7d)');
                    process.exit(1);
                }
                if (!['24h', '48h', '7d'].includes(nextArg)) {
                    console.error('--since must be one of: 24h, 48h, 7d');
                    process.exit(1);
                }
                options.since = nextArg;
                i++;
                break;
            case '--top':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--top requires a number');
                    process.exit(1);
                }
                const topNum = parseInt(nextArg, 10);
                if (isNaN(topNum) || topNum < 1) {
                    console.error('--top must be a positive number');
                    process.exit(1);
                }
                options.top = topNum;
                i++;
                break;
            case '--watch':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--watch requires an interval in minutes');
                    process.exit(1);
                }
                const watchNum = parseInt(nextArg, 10);
                if (isNaN(watchNum) || watchNum < 1) {
                    console.error('--watch must be a positive number of minutes');
                    process.exit(1);
                }
                options.watch = watchNum;
                i++;
                break;
            case '--theme':
                if (!nextArg || nextArg.startsWith('--')) {
                    console.error('--theme requires a theme name');
                    process.exit(1);
                }
                if (!['modern', 'dark', 'neon'].includes(nextArg)) {
                    console.error('--theme must be one of: modern, dark, neon');
                    process.exit(1);
                }
                options.theme = nextArg;
                i++;
                break;
            case '--deck':
                options.deck = true;
                break;
            case '--slack':
                options.slack = true;
                break;
            case '--reset':
                options.reset = true;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                printHelp();
                process.exit(1);
        }
    }
    return options;
}
function printHelp() {
    console.log(`
hb-intern - Research Intern Bots

USAGE:
  npx hb-intern --config bots.config.yaml [OPTIONS]

OPTIONS:
  --config <path>    YAML config of bots/sources (required)
  --out <dir>        Output directory (default: ./out)
  --since <window>   Time window: 24h, 48h, 7d (default: 24h)
  --top <N>          Number of top events to include (default: 10)
  --deck             Generate PDF presentation deck
  --slack            Send digest to Slack webhook
  --watch <mins>     Run continuously every N minutes
  --theme <name>     Deck theme: modern, dark, neon (default: modern)
  --reset            Reset watch state (ignore previously seen events)
  --help, -h         Show this help

ENVIRONMENT VARIABLES:
  HYPERBROWSER_API_KEY  Required for scraping
  OPENAI_API_KEY        Optional for AI summaries
  SLACK_WEBHOOK_URL     Required if using --slack

EXAMPLES:
  npx hb-intern --config bots.config.yaml
  npx hb-intern --config bots.config.yaml --deck --theme dark
  npx hb-intern --config bots.config.yaml --watch 180 --slack
  npx hb-intern --config bots.config.yaml --since 48h --top 15

For more info: https://docs.hyperbrowser.ai
  `);
}
function validateEnvironment() {
    if (!process.env.HYPERBROWSER_API_KEY) {
        console.error('Error: HYPERBROWSER_API_KEY environment variable is required');
        console.error('Get an API key at https://hyperbrowser.ai');
        process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
        console.warn('Warning: OPENAI_API_KEY not set. Summaries will use fallback heuristics.');
    }
}
async function main() {
    const options = parseArgs();
    // Check if config file exists
    if (!options.config) {
        console.error('Error: --config argument is required');
        console.error('\nHere\'s a sample config file:\n');
        (0, config_js_1.printSampleConfig)();
        console.error('\nSave this as bots.config.yaml and run:');
        console.error('npx hb-intern --config bots.config.yaml');
        process.exit(1);
    }
    try {
        validateEnvironment();
        // Load and validate config
        const config = (0, config_js_1.loadConfig)(options.config);
        console.log(`Loaded config with ${config.bots.length} bot(s)`);
        // Ensure output directory exists
        (0, writer_js_1.ensureOutputDir)(options.out);
        // Initialize watch manager
        const watchManager = new watch_js_1.WatchManager(options.out);
        // Reset state if requested
        if (options.reset) {
            console.log('Resetting watch state...');
            watchManager.reset();
        }
        // Validate Slack webhook if needed
        if (options.slack && !process.env.SLACK_WEBHOOK_URL) {
            console.error('Error: SLACK_WEBHOOK_URL environment variable is required when using --slack');
            process.exit(1);
        }
        // Create run function
        const runFunction = async () => {
            await (0, main_js_1.run)(config, options, watchManager);
        };
        // Run once or start watch loop
        if (options.watch) {
            await (0, watch_js_1.runWatchLoop)(runFunction, options.watch, watchManager);
        }
        else {
            await runFunction();
        }
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
// Handle process signals gracefully
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Exiting gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Exiting gracefully...');
    process.exit(0);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map