import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import { OpenAI } from 'openai';
import chalk from 'chalk';
    
const argv = yargs(hideBin(process.argv))
  .option('url', { alias: 'u', demandOption: true, type: 'string', describe: 'Target URL' })
  .option('key', { alias: 'k',  type: 'string',  describe: 'Hyperbrowser API key (else env)' })
  .option('openai-key', { type: 'string', describe: 'OpenAI API key (else env)' })
  .option('json',{           type: 'boolean', default: false, describe: 'Machine-readable output' })
  .option('analyze', { alias: 'a', type: 'boolean', default: false, describe: 'Use OpenAI to analyze and suggest improvements' })
  .help().parseSync();

const HB_KEY = argv.key || process.env.HYPERBROWSER_API_KEY;
const OPENAI_KEY = argv['openai-key'] || process.env.OPENAI_API_KEY;

if (!HB_KEY) {
  console.error(chalk.red('❌  Provide Hyperbrowser API key via --key or HYPERBROWSER_API_KEY.'));
  process.exit(1);
}

if (argv.analyze && !OPENAI_KEY) {
  console.error(chalk.red('❌  OpenAI API key required for analysis. Use --openai-key or OPENAI_API_KEY.'));
  process.exit(1);
}

// Initialize OpenAI client if needed
const openai = argv.analyze ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

async function analyzeUIWithScreenshot(screenshotBase64: string, url: string, isJsonMode: boolean = false) {
  if (!openai) return null;

  if (!isJsonMode) {
    console.log(chalk.blue('🧠 Analyzing UI screenshot with OpenAI Vision...'));
  }
  
  const prompt = `Analyze this website screenshot and provide a comprehensive UI/UX analysis for: ${url}

Please provide:
**Visual Summary**: Brief overview of the design, layout, and color scheme
**Colors**: List the primary colors you can identify in the design
**Typography**: Describe the font choices and text hierarchy
**UI/UX Issues**: Top 3 specific problems you notice
**Improvements**: Top 3 actionable suggestions to enhance the design
**Accessibility**: Key accessibility issues and recommendations
**Modern Trends**: 2-3 current design trends that could improve this site

Keep each section concise and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ 
        role: 'user', 
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${screenshotBase64}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    if (!isJsonMode) {
      console.error(chalk.red('❌ OpenAI vision analysis failed:'), error);
    }
    return null;
  }
}

function extractColorsFromHTML(html: string): string[] {
  const colors = new Set<string>();
  
  // Extract hex colors
  const hexMatches = html.match(/#[0-9a-fA-F]{3,8}/g);
  if (hexMatches) {
    hexMatches.forEach(color => colors.add(color.toLowerCase()));
  }
  
  // Extract rgb/rgba colors
  const rgbMatches = html.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) {
    rgbMatches.forEach(color => colors.add(color.replace(/\s+/g, '')));
  }
  
  return Array.from(colors);
}

function extractFontsFromHTML(html: string): string[] {
  const fonts = new Set<string>();
  
  // Extract font-family declarations
  const fontMatches = html.match(/font-family\s*:\s*([^;]+)/gi);
  if (fontMatches) {
    fontMatches.forEach(match => {
      const fontFamily = match.split(':')[1];
      if (fontFamily) {
        fontFamily
          .replace(/['"]/g, '')
          .split(',')
          .map(f => f.trim())
          .filter(f => f && f !== 'inherit' && f !== 'initial' && f !== 'unset')
          .forEach(font => fonts.add(font));
      }
    });
  }
  
  return Array.from(fonts);
}

(async () => {
  try {
    /* ── 1. Call the OFFICIAL scrape endpoint with screenshot ──────────── */
    const hb = new Hyperbrowser({ apiKey: HB_KEY });
    
    if (!argv.json) {
      console.log(chalk.blue('🔍 Starting scrape job with screenshot...'));
    }
    
    const result = await hb.scrape.startAndWait({
      url: argv.url,
      scrapeOptions: {
        formats: ['screenshot', 'html'],
        timeout: 30000,
        waitFor: 2000
      }
    });

    if (result.status !== 'completed') {
      throw new Error(`Scrape job failed: ${result.error || 'Unknown error'}`);
    }

    /* ── 2. Extract colors and fonts from HTML ──────────────────────────── */
    const colors = result.data?.html ? extractColorsFromHTML(result.data.html) : [];
    const fonts = result.data?.html ? extractFontsFromHTML(result.data.html) : [];

    /* ── 3. AI Analysis using screenshot (if requested) ──────────────────── */
    let analysis = null;
    if (argv.analyze && result.data?.screenshot) {
      // Debug: Let's see what format the screenshot data is in
      if (!argv.json) {
        console.log(chalk.yellow('🔍 Debug: Screenshot data type:', typeof result.data.screenshot));
        console.log(chalk.yellow('🔍 Debug: Screenshot data length:', result.data.screenshot.length));
        console.log(chalk.yellow('🔍 Debug: Screenshot data preview:', result.data.screenshot.substring(0, 100) + '...'));
      }
      
      // Handle different screenshot formats
      let screenshotBase64: string | null = result.data.screenshot;
      
      // If it's a URL, we need to fetch and convert it
      if (typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('http')) {
        if (!argv.json) {
          console.log(chalk.blue('📸 Downloading screenshot from URL...'));
        }
        try {
          const response = await fetch(screenshotBase64);
          const buffer = await response.arrayBuffer();
          screenshotBase64 = Buffer.from(buffer).toString('base64');
        } catch (error) {
          console.error(chalk.red('❌ Failed to download screenshot:'), error);
          screenshotBase64 = null;
        }
      }
      
      // If it's already base64 but has a data URL prefix, remove it
      if (typeof screenshotBase64 === 'string' && screenshotBase64.startsWith('data:')) {
        screenshotBase64 = screenshotBase64.split(',')[1];
      }
      
      if (screenshotBase64 && typeof screenshotBase64 === 'string') {
        analysis = await analyzeUIWithScreenshot(screenshotBase64, argv.url, argv.json);
      }
    }

    const output = { colors, fonts };

    /* ── 4. Print results ────────────────────────────────────────────────── */
    if (argv.json) {
      console.log(JSON.stringify({ 
        ...output, 
        analysis: analysis || undefined,
        screenshotAvailable: !!result.data?.screenshot
      }, null, 2));
    } else {
      console.log(chalk.cyan(`\n🎨  Colors (${output.colors.length})`));
      if (output.colors.length > 0) {
        output.colors.forEach(c => console.log('   •', c));
      } else {
        console.log(chalk.gray('   No colors detected'));
      }
      
      console.log(chalk.cyan(`\n🖋  Fonts (${output.fonts.length})`));
      if (output.fonts.length > 0) {
        output.fonts.forEach(f => console.log('   •', f));
      } else {
        console.log(chalk.gray('   No fonts detected'));
      }
      
      if (analysis) {
        console.log(chalk.magenta('\n🧠 AI Visual Analysis & Suggestions:'));
        console.log(chalk.gray('─'.repeat(50)));
        
        // Format analysis with colors and remove asterisks
        const formattedAnalysis = analysis
          .split('\n')
          .map(line => {
            // Check if line is a header (starts with **text**)
            if (line.match(/^\*\*([^*]+)\*\*/)) {
              // Remove asterisks and format as colored header
              const headerText = line.replace(/^\*\*([^*]+)\*\*:?/, '$1');
              return chalk.cyan.bold(headerText + ':');
            }
            // Regular content line - remove any remaining asterisks
            return chalk.white(line.replace(/\*\*/g, ''));
          })
          .join('\n');
        
        console.log(formattedAnalysis);
      }
      
      console.log(''); // Add final newline for cleaner output
    }
  } catch (error) {
    console.error(chalk.red('❌ Error occurred:'), error);
    console.error(chalk.yellow('💡 Tip: Make sure your Hyperbrowser API key is valid and has screenshot permissions'));
    process.exit(1);
  }
})();