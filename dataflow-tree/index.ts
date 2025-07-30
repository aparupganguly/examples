import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promises as fs } from 'fs';
import path from 'path';
import { Hyperbrowser } from '@hyperbrowser/sdk';

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
};

interface DataFlow {
  url: string;
  method: string;
  category: 'PII' | 'Analytics' | 'Business';
  piiFields: string[];
}

interface Output {
  timestamp: string;
  targetUrl: string;
  flows: DataFlow[];
}

function classifyRequest(url: string, description: string): { category: 'PII' | 'Analytics' | 'Business'; piiFields: string[] } {
  const text = `${url} ${description}`.toLowerCase();
  const piiFields: string[] = [];
  
  // Check for PII keywords
  const piiKeywords = ['email', 'phone', 'ssn', 'jwt', 'card', 'password', 'token', 'name', 'address'];
  piiKeywords.forEach(keyword => {
    if (text.includes(keyword)) piiFields.push(keyword);
  });
  
  // Check for analytics domains
  const analyticsHosts = ['google-analytics', 'segment', 'mixpanel', 'snowplow', 'facebook.com/tr'];
  const isAnalytics = analyticsHosts.some(host => text.includes(host));
  
  const category = isAnalytics ? 'Analytics' : (piiFields.length > 0 ? 'PII' : 'Business');
  
  return {
    category,
    piiFields: [...new Set(piiFields)]
  };
}

function parseAgentOutput(agentOutput: string, baseUrl: string): DataFlow[] {
  const flows: DataFlow[] = [];
  const text = agentOutput.toLowerCase();
  
  console.log('🔍 Parsing agent output for data flows...');
  
  // Main page request
  flows.push({
    url: baseUrl,
    method: 'GET',
    category: 'Business',
    piiFields: []
  });
  console.log('   ✓ Added main page request');
  
  // Look for forms with PII
  if (text.includes('form') && (text.includes('email') || text.includes('signup') || text.includes('login'))) {
    const { category, piiFields } = classifyRequest(`${baseUrl}/api/form`, agentOutput);
    flows.push({
      url: `${baseUrl}/api/form`,
      method: 'POST',
      category,
      piiFields
    });
    console.log(`   ✓ Found form collecting: ${piiFields.join(', ') || 'general data'}`);
  }
  
  // Look for analytics
  if (text.includes('analytics') || text.includes('tracking') || text.includes('google')) {
    flows.push({
      url: 'https://www.google-analytics.com/collect',
      method: 'POST',
      category: 'Analytics',
      piiFields: []
    });
    console.log('   ✓ Detected analytics/tracking');
  }
  
  return flows;
}

function buildTree(flows: DataFlow[]): string {
  let tree = flows[0]?.url || 'Unknown' + '\n';
  
  flows.forEach((flow, index) => {
    if (index === 0) return; // Skip main page in tree
    
    const isLast = index === flows.length - 1;
    const connector = isLast ? '└─' : '├─';
    const fieldsStr = flow.piiFields.length > 0 ? `: ${flow.piiFields.join(', ')}` : '';
    let line = `${connector} ${flow.method} ${new URL(flow.url).pathname}   [${flow.category}${fieldsStr}]`;
    
    if (flow.category === 'PII') {
      tree += colors.red(line) + '\n';
    } else if (flow.category === 'Analytics') {
      tree += colors.blue(line) + '\n';
    } else {
      tree += colors.white(line) + '\n';
    }
  });
  
  return tree;
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .option('url', { type: 'string', demandOption: true, description: 'Target URL to analyze' })
    .option('json', { type: 'boolean', default: false, description: 'Output machine-readable JSON' })
    .option('ci', { type: 'boolean', default: false, description: 'CI mode: exit 1 on new PII' })
    .help()
    .argv;

  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    console.error('Error: HYPERBROWSER_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    console.log(`Analyzing data flows for: ${argv.url}`);
    
    const hb = new Hyperbrowser({ apiKey });
    
    console.log('🤖 Starting Hyperbrowser agent analysis...');
    
    const result = await hb.agents.browserUse.startAndWait({
      task: `Analyze ${argv.url} for data collection:
      
1. Look for forms collecting personal data (email, name, phone, address, payment)
2. Check for analytics/tracking scripts (Google Analytics, Segment, Facebook, etc.)
3. Identify any PII collection points

Report what you find clearly.`,
      maxSteps: 20,
      sessionOptions: { timeoutMinutes: 2 }
    });

    console.log('🔍 Agent analysis completed');
    console.log('📝 Agent findings summary:', result.data?.finalResult?.substring(0, 200) + '...');
    
    const flows = parseAgentOutput(result.data?.finalResult || '', argv.url);
    console.log(`\n📊 Detected ${flows.length} data flow(s):`);
    
    flows.forEach((flow, index) => {
      const icon = flow.category === 'PII' ? '🔴' : flow.category === 'Analytics' ? '🔵' : '⚪';
      console.log(`  ${index + 1}. ${icon} ${flow.method} ${flow.url}`);
      if (flow.piiFields.length > 0) {
        console.log(`     └─ PII fields: ${flow.piiFields.join(', ')}`);
      }
      console.log(`     └─ Category: ${flow.category}`);
    });
    
    const output: Output = {
      timestamp: new Date().toISOString(),
      targetUrl: argv.url,
      flows
    };

    // Ensure output directory exists
    await fs.mkdir('out', { recursive: true });
    console.log('\n💾 Saving results to out/flows.json...');
    await fs.writeFile('out/flows.json', JSON.stringify(output, null, 2));

    // CI mode: check for new PII
    if (argv.ci) {
      console.log('🔒 CI mode: Checking for new PII endpoints...');
      try {
        const previous = JSON.parse(await fs.readFile('out/flows.json', 'utf-8')) as Output;
        const newPII = flows.filter(f => f.category === 'PII' && 
          !previous.flows.some(p => p.url === f.url && p.category === 'PII'));
        
        if (newPII.length > 0) {
          console.log(`🚨 Found ${newPII.length} new PII endpoint(s):`);
          newPII.forEach(pii => console.log(`   - ${pii.url}`));
          await fs.writeFile('out/alert.txt', `New PII endpoints:\n${newPII.map(f => f.url).join('\n')}`);
          console.error(colors.red('🚨 New PII endpoints detected! Check out/alert.txt'));
          process.exit(1);
        } else {
          console.log('✅ No new PII endpoints detected');
        }
      } catch (error) {
        console.log('ℹ️  No previous data found for comparison (first run)');
      }
    }

    // Output results
    if (argv.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log('\n🌳 Data Flow Tree:');
      console.log(buildTree(flows));
      
      const piiCount = flows.filter(f => f.category === 'PII').length;
      const analyticsCount = flows.filter(f => f.category === 'Analytics').length;
      const businessCount = flows.filter(f => f.category === 'Business').length;
      
      console.log('\n📊 Summary:');
      console.log(colors.red(`🔴 PII requests: ${piiCount}`));
      console.log(colors.blue(`🔵 Analytics requests: ${analyticsCount}`));
      console.log(colors.white(`⚪ Business requests: ${businessCount}`));
      console.log(`\n💾 Results saved to: out/flows.json`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}