#!/usr/bin/env tsx
import { Hyperbrowser } from "@hyperbrowser/sdk";
import readline from "readline";
import chalk from "chalk";
import { config } from "dotenv";

config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askURL = (): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(chalk.cyan("Enter the URL to scan: "), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const isBroken = (status: number | undefined): boolean => {
  // Only consider these as definitely broken:
  // 404 Not Found, 410 Gone, 500+ server errors
  return status === 404 || status === 410 || (status !== undefined && status >= 500);
};

const getStatusMessage = (status: number | undefined, url: string): { message: string; color: any; category: 'working' | 'suspicious' | 'blocked' | 'broken' | 'unknown' } => {
  if (!status) {
    return {
      message: `? → ${url} (no response - might work in browser)`,
      color: chalk.gray,
      category: 'unknown'
    };
  }
  
  if (status >= 200 && status < 300) {
    return {
      message: `${status} → ${url}`,
      color: chalk.green,
      category: 'working'
    };
  }
  
  if (status === 403) {
    return {
      message: `${status} → ${url} (bot protection - likely works in browser)`,
      color: chalk.yellow,
      category: 'blocked'
    };
  }
  
  if (status === 404 || status === 410) {
    return {
      message: `${status} → ${url} (actually broken)`,
      color: chalk.red,
      category: 'broken'
    };
  }
  
  if (status >= 500) {
    return {
      message: `${status} → ${url} (server error)`,
      color: chalk.red,
      category: 'broken'
    };
  }
  
  return {
    message: `${status} → ${url} (suspicious - check manually)`,
    color: chalk.magenta,
    category: 'suspicious'
  };
};

const checkLinkStatus = async (url: string, referer?: string): Promise<number | undefined> => {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    ...(referer && { 'Referer': referer })
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Try HEAD request first
    const headResponse = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      headers
    });
    
    clearTimeout(timeoutId);
    
    // If HEAD returns 405 (Method Not Allowed), try GET
    if (headResponse.status === 405) {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        const getResponse = await fetch(url, { 
          method: 'GET',
          signal: controller2.signal,
          headers
        });
        
        clearTimeout(timeoutId2);
        return getResponse.status;
      } catch (getError) {
        return undefined;
      }
    }
    
    return headResponse.status;
  } catch (error) {
    // If HEAD fails completely, try GET request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal,
        headers
      });
      
      clearTimeout(timeoutId);
      return response.status;
    } catch (getError) {
      return undefined;
    }
  }
};

const extractLinksFromHTML = (html: string): string[] => {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    
    // Decode HTML entities
    href = href
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Only include absolute URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      links.push(href);
    }
  }

  return [...new Set(links)]; // Remove duplicates
};

const main = async () => {
  const url = await askURL();
  const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY });

  console.log(chalk.blue("\n🔍 Scraping page and extracting links...\n"));

  try {
    const result = await client.scrape.startAndWait({
      url,
      scrapeOptions: {
        formats: ["html"]
      }
    });

    if (!result.data?.html) {
      console.error(chalk.red("No HTML content received"));
      return;
    }

    const links = extractLinksFromHTML(result.data.html);
    
    if (links.length === 0) {
      console.log(chalk.yellow("No external links found on this page."));
      return;
    }

    console.log(chalk.blue(`Found ${links.length} unique external links. Checking status...\n`));

    let brokenCount = 0;
    let blockedCount = 0;
    let unknownCount = 0;
    let suspiciousCount = 0;
    const statusCounts: Record<number, number> = {};

    for (const link of links) {
      console.log(chalk.gray(`Checking: ${link}`));
      const status = await checkLinkStatus(link, url);
      
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      
      const { message, color, category } = getStatusMessage(status, link);
      console.log(color(message));

      if (category === 'blocked') {
        blockedCount++;
      } else if (category === 'broken') {
        brokenCount++;
      } else if (category === 'unknown') {
        unknownCount++;
      } else if (category === 'suspicious') {
        suspiciousCount++;
      }
      
      // Small delay to be polite to servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("\n");
    console.log(
      chalk.yellowBright(
        `📊 Summary for ${links.length} links:`
      )
    );
    console.log(chalk.green(`✅ Working: ${links.length - brokenCount - blockedCount - unknownCount - suspiciousCount}`));
    console.log(chalk.red(`❌ Actually broken: ${brokenCount}`));
    console.log(chalk.yellow(`🚫 Bot-blocked: ${blockedCount}`));
    console.log(chalk.gray(`❓ Unknown (no response): ${unknownCount}`));
    if (suspiciousCount > 0) {
      console.log(chalk.magenta(`⚠️  Suspicious: ${suspiciousCount}`));
    }
    
    if (unknownCount > 0 || blockedCount > 0) {
      console.log(chalk.cyan(`\n💡 Note: Links marked as "unknown" or "bot-blocked" might work fine in a real browser`));
    }
    
    // Show status code breakdown
    if (Object.keys(statusCounts).length > 0) {
      console.log(chalk.gray("\nStatus code breakdown:"));
      Object.entries(statusCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([status, count]) => {
          const color = Number(status) >= 400 ? chalk.red : chalk.green;
          console.log(color(`  ${status}: ${count} links`));
        });
    }

  } catch (error) {
    console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error));
  }
};

main().catch((err) => {
  console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
  process.exit(1);
});