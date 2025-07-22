import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { Hyperbrowser } from '@hyperbrowser/sdk';

// 1. Parse CLI flags
const argv = yargs(hideBin(process.argv))
  .option('url', { type: 'string', demandOption: true, describe: 'Page URL to analyze' })
  .option('mode', { 
    type: 'string', 
    choices: ['basic', 'advanced'], 
    default: 'basic', 
    describe: 'Analysis mode: basic (content analysis) or advanced (AI-powered page structure analysis)' 
  })
  .help().parseSync() as { url: string; mode: 'basic' | 'advanced' };

if (!process.env.HYPERBROWSER_API_KEY) {
  console.error(chalk.red('❌  Set HYPERBROWSER_API_KEY in your env'));
  process.exit(1);
}

async function main() {
  const { url, mode } = argv;
  console.log(chalk.cyan(`🔍 Analyzing ${url}…`));

  // 2. Initialize Hyperbrowser client
  const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
  
  try {
    if (mode === 'advanced') {
      await runAdvancedAnalysis(client, url);
    } else {
      await runBasicAnalysis(client, url);
    }
  } catch (error: any) {
    console.error(chalk.red('❌ Analysis failed:'), error.message);
  }

  console.log(chalk.gray('💡 Tip: Use --mode advanced for AI-powered page structure analysis'));
}

async function runBasicAnalysis(client: any, url: string) {
  console.log(chalk.yellow('⚡ Running basic content analysis...'));
  
  // 3. Start scrape job and wait for completion
  const result = await client.scrape.startAndWait({ url });
  const content = result.markdown || result.content || '';
  
  // 4. Analyze content for different resource types
  const analysis = analyzeContent(content);
  
  // 5. Display results in a nice table
  console.log(chalk.green('\n📊 Resource Summary:'));
  console.log(chalk.white('─'.repeat(40)));
  
  Object.entries(analysis).forEach(([type, count]) => {
    const icon = getResourceIcon(type);
    const color = getResourceColor(type);
    console.log(`${icon} ${color(type.padEnd(12))} ${chalk.bold(count.toString())}`);
  });
  
  console.log(chalk.white('─'.repeat(40)));
  console.log(chalk.gray(`📄 Content length: ${content.length.toLocaleString()} characters`));
}

async function runAdvancedAnalysis(client: any, url: string) {
  try {
    console.log(chalk.yellow('🤖 Using AI-powered Browser Use agent for detailed page analysis...'));
    
    // Use Browser Use agent to analyze page structure and resources
    const result = await client.agents.browserUse.startAndWait({
      task: `Go to ${url} and analyze the page structure and resources. 
             Please provide:
             1. Count all images visible on the page
             2. Count all links on the page
             3. Identify any external scripts or stylesheets referenced in the HTML
             4. Analyze the page structure (headers, sections, etc.)
             5. Look for any performance-related observations (large images, many elements, etc.)
             
             Format your response as a clear analysis with specific counts and observations.`,
      initialUrl: url
    });
    
    console.log(chalk.green('\n🤖 AI Analysis Results:'));
    console.log(chalk.white('─'.repeat(50)));
    console.log(result.result);
    console.log(chalk.white('─'.repeat(50)));
    
  } catch (error: any) {
    console.error(chalk.red('❌ Advanced analysis failed:'), error.message);
    console.log(chalk.yellow('🔄 Falling back to basic analysis...'));
    await runBasicAnalysis(client, url);
  }
}

function analyzeContent(content: string) {
  return {
    'Images': (content.match(/!\[.*?\]\(.*?\)/g) || []).length,
    'Links': (content.match(/\[.*?\]\(.*?\)/g) || []).length,
    'Scripts': (content.match(/<script/gi) || []).length,
    'Stylesheets': (content.match(/<link.*?rel=["\']stylesheet/gi) || []).length,
  };
}

function getResourceIcon(type: string): string {
  const icons: Record<string, string> = {
    'Images': '🖼️',
    'Links': '🔗',
    'Scripts': '📜',
    'Stylesheets': '🎨',
  };
  return icons[type] || '📄';
}

function getResourceColor(type: string) {
  const colors: Record<string, any> = {
    'Images': chalk.magenta,
    'Links': chalk.blue,
    'Scripts': chalk.yellow,
    'Stylesheets': chalk.green,
  };
  return colors[type] || chalk.white;
}

main().catch(console.error); 