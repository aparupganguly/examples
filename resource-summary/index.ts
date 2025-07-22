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
  console.log(chalk.cyan(`🔍 Analyzing ${url} in ${mode} mode…`));

  // 2. Initialize Hyperbrowser client
  const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });
  
  if (mode === 'advanced') {
    await runAdvancedAnalysis(client, url);
  } else {
    await runBasicAnalysis(client, url);
  }
}

async function runBasicAnalysis(client: any, url: string) {
  try {
    // Basic scraping approach
    const result = await client.scrape.startAndWait({ url });

    if (result.data) {
      console.log(chalk.bold(`\n📊 Basic Resource Summary for ${url}`));
      console.log('─'.repeat(50));
      console.log(chalk.green('✅ Successfully scraped the webpage'));
      
      if (result.data.metadata) {
        console.log(`${chalk.bold('Title:')} ${result.data.metadata.title || 'N/A'}`);
        console.log(`${chalk.bold('URL:')} ${result.data.metadata.url || url}`);
      }
      
      if (result.data.markdown) {
        const contentLength = result.data.markdown.length;
        console.log(`${chalk.bold('Content length:')} ${chalk.cyan(contentLength)} characters`);
        
        const resourceAnalysis = analyzeContent(result.data.markdown, result.data.html);
        displayResourceAnalysis(resourceAnalysis);
      }
    } else {
      console.log(chalk.red('❌ No data returned from scraping'));
    }
  } catch (error: any) {
    console.error(chalk.red('❌ Scraping failed:'), error.message);
  }
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
             6. Check if there are any async-loaded content or dynamic elements
             
             Format your response as a clear, structured summary with specific counts and observations.`,
      sessionOptions: {
        acceptCookies: true
      }
    });

    if (result.data?.finalResult) {
      console.log(chalk.bold(`\n🚀 Advanced Page Analysis for ${url}`));
      console.log('═'.repeat(60));
      console.log(result.data.finalResult);
      console.log('═'.repeat(60));
      console.log(chalk.green('✅ Advanced analysis completed'));
    } else {
      console.log(chalk.red('❌ No analysis result returned'));
      // Fallback to basic analysis
      console.log(chalk.yellow('🔄 Falling back to basic analysis...'));
      await runBasicAnalysis(client, url);
    }
  } catch (error: any) {
    console.error(chalk.red('❌ Advanced analysis failed:'), error.message);
    console.log(chalk.yellow('🔄 Falling back to basic analysis...'));
    await runBasicAnalysis(client, url);
  }
}

function analyzeContent(markdown?: string, html?: string): Record<string, number> {
  const analysis: Record<string, number> = {
    images: 0,
    links: 0,
    scripts: 0,
    stylesheets: 0
  };

  const content = markdown || html || '';
  
  // Count images (markdown and HTML)
  analysis.images = (content.match(/!\[.*?\]\(.*?\)|<img[^>]*>/gi) || []).length;
  
  // Count links
  analysis.links = (content.match(/\[.*?\]\(.*?\)|<a[^>]*>/gi) || []).length;
  
  // Count scripts (in HTML)
  if (html) {
    analysis.scripts = (html.match(/<script[^>]*>/gi) || []).length;
    analysis.stylesheets = (html.match(/<link[^>]*rel="stylesheet"[^>]*>|<style[^>]*>/gi) || []).length;
  }

  return analysis;
}

function displayResourceAnalysis(analysis: Record<string, number>) {
  console.log(chalk.bold('\n🔍 Content Analysis:'));
  console.log('─'.repeat(30));
  
  const icons: Record<string, string> = {
    images: '🖼️',
    links: '🔗',
    scripts: '⚡',
    stylesheets: '🎨'
  };
  
  Object.entries(analysis).forEach(([type, count]) => {
    if (count > 0) {
      const icon = icons[type] || '📦';
      console.log(`${icon} ${chalk.bold(type.padEnd(12))} ${chalk.cyan(count.toString().padStart(3))}`);
    }
  });
  
  console.log('─'.repeat(30));
  console.log(chalk.gray('💡 Tip: Use --mode advanced for AI-powered page structure analysis'));
}

main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});