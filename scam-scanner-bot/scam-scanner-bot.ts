import 'dotenv/config';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import readline from 'readline/promises';
import chalk from 'chalk';
import { parse } from 'tldts';

const HB_KEY = process.env.HYPERBROWSER_API_KEY;
if (!HB_KEY) throw new Error('Set HYPERBROWSER_API_KEY in env');

(async () => {
  /* prompt for URL */
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const url = (await rl.question('Enter store URL: ')).trim();
  rl.close();

  if (!/^https?:\/\//.test(url)) {
    console.error('URL must start with http:// or https://');
    process.exit(1);
  }

  console.log(chalk.cyan('🔍  Starting Hyperbrowser scrape…'));

  /* SCRAPE THE WEBSITE */
  const client = new Hyperbrowser({ apiKey: HB_KEY });
  
  try {
    const scrapeResult = await client.scrape.startAndWait({
      url,
      scrapeOptions: {
        formats: ['html', 'links'],
        waitUntil: 'networkidle',
        timeout: 30000
      }
    });

    if (scrapeResult.status !== 'completed') {
      console.error(chalk.red('Scrape failed:'), scrapeResult.error);
      process.exit(1);
    }

    const { data } = scrapeResult;
    if (!data) {
      console.error(chalk.red('No data returned from scrape'));
      process.exit(1);
    }

    /* ANALYZE SCRAPED DATA */
    const origin = parse(url).domain;
    const html = data.html || '';
    const links = data.links || [];

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /urgent.*sale/i,
      /limited.*time.*offer/i,
      /act.*now/i,
      /flash.*sale/i,
      /too.*good.*to.*be.*true/i,
      /wholesale.*price/i,
      /liquidation/i,
      /going.*out.*of.*business/i
    ];

    const suspiciousContent = suspiciousPatterns.filter(pattern => pattern.test(html));

    // Check for external links (potential redirects)
    const externalLinks = links.filter(link => {
      try {
        const linkDomain = parse(link).domain;
        return linkDomain && linkDomain !== origin;
      } catch {
        return false;
      }
    });

    // Check for insecure links
    const insecureLinks = links.filter(link => link.startsWith('http://'));

    // Check for suspicious TLD or very new domains
    const parsedUrl = parse(url);
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.pw'];
    const hasSuspiciousTld = suspiciousTlds.some(tld => url.includes(tld));

    // Check for missing important elements
    const hasContactInfo = /contact|support|help|phone|email|address/i.test(html);
    const hasPrivacyPolicy = /privacy.*policy|terms.*of.*service|terms.*and.*conditions/i.test(html);
    const hasSecurePayment = /secure.*payment|ssl|encryption|paypal|stripe/i.test(html);

    console.log(`
${chalk.bold('Scam Scanner Results')}
────────────────────────────────────────
${chalk.yellow('Suspicious Content Patterns')}: ${suspiciousContent.length}
${chalk.red('Insecure Links (HTTP)')}: ${insecureLinks.length}
${chalk.magenta('External Links')}: ${externalLinks.length}
${chalk.blue('Suspicious TLD')}: ${hasSuspiciousTld ? 'Yes' : 'No'}
${chalk.green('Has Contact Info')}: ${hasContactInfo ? 'Yes' : 'No'}
${chalk.green('Has Privacy Policy')}: ${hasPrivacyPolicy ? 'Yes' : 'No'}
${chalk.green('Mentions Secure Payment')}: ${hasSecurePayment ? 'Yes' : 'No'}
`.trim());

    // Show samples of concerning findings
    if (suspiciousContent.length > 0) {
      console.log(chalk.yellow('⚠  Suspicious content patterns detected'));
    }
    
    if (insecureLinks.length > 0) {
      console.log(chalk.red('✖  Sample insecure link →'), insecureLinks[0]);
    }
    
    if (externalLinks.length > 5) {
      console.log(chalk.magenta('❓  Many external links →'), externalLinks[0]);
    }

    if (hasSuspiciousTld) {
      console.log(chalk.red('⚠  Suspicious TLD detected →'), parsedUrl.domain);
    }

    // Overall risk assessment
    let riskScore = 0;
    if (suspiciousContent.length > 2) riskScore += 2;
    if (insecureLinks.length > 0) riskScore += 1;
    if (externalLinks.length > 10) riskScore += 1;
    if (hasSuspiciousTld) riskScore += 2;
    if (!hasContactInfo) riskScore += 1;
    if (!hasPrivacyPolicy) riskScore += 1;
    if (!hasSecurePayment) riskScore += 1;

    console.log('\n' + chalk.bold('Risk Assessment:'));
    if (riskScore >= 5) {
      console.log(chalk.red.bold('🚨 HIGH RISK - Likely scam website!'));
    } else if (riskScore >= 3) {
      console.log(chalk.yellow.bold('⚠️  MEDIUM RISK - Exercise caution'));
    } else {
      console.log(chalk.green.bold('✅ LOW RISK - Appears legitimate'));
    }

  } catch (error) {
    console.error(chalk.red('Error during scraping:'), error);
    process.exit(1);
  }

})().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});