// main.ts

import { config } from "dotenv";
import chalk from "chalk";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import { chromium } from "playwright-core";

config();

const client = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY! });

const HEADERS = [
  "access-control-allow-origin",
  "content-security-policy",
  "strict-transport-security",
  "set-cookie",
  "x-frame-options",
];

const TIPS: Record<string, string> = {
  "access-control-allow-origin": "Consider specifying only trusted origins.",
  "content-security-policy": "Add a CSP to prevent XSS attacks.",
  "strict-transport-security": "HSTS is active.",
  "set-cookie": "Ensure cookies have HttpOnly and Secure flags.",
  "x-frame-options": "Protects against clickjacking.",
};

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log(chalk.red("❌ Usage: npx tsx headers.ts https://example.com"));
    process.exit(1);
  }

  console.log(chalk.blue(`🌐 Starting stealth session for: ${url}`));

  // stealth session creation
  const session = await client.sessions.create({
    useStealth: true,
    solveCaptchas: true,
    device: ["desktop"],
    operatingSystems: ["macos"],
    locales: ["en"],
  });

  // Connect Playwright via WebSocket
  const browser = await chromium.connectOverCDP(session.wsEndpoint!);
  const page = (await browser.contexts())[0].pages()[0];

  // Set a longer timeout and wait for load instead of networkidle
  await page.goto(url, { 
    timeout: 60000,  // Increase timeout to 60 seconds
    waitUntil: "load" // Wait for load event instead of networkidle
  });
  
  // Additional wait to ensure page is stable
  await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
  console.log(chalk.green(`✅ Reached: ${page.url()}`));

  // Pull HTTP headers via Playwright request
  const response = await page.request.fetch(page.url());
  const respHeaders = response.headers();

  console.log(chalk.yellow("\n🔍 Security header report:\n"));
  HEADERS.forEach((h) => {
    const val = respHeaders[h] || respHeaders[h.toLowerCase()];
    if (val) {
      console.log(chalk.green(`✅ ${h}: ${val}`));
      console.log(`   ${chalk.gray("Tip:")} ${TIPS[h]}\n`);
    } else {
      console.log(chalk.red(`❌ ${h}: missing`));
      console.log(`   ${chalk.gray("Tip:")} ${TIPS[h]}\n`);
    }
  });

  await browser.close();
  await client.sessions.stop(session.id);
}

main().catch((err) => console.error(chalk.red("❌ Error:"), err));