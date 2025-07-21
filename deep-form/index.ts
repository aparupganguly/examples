#!/usr/bin/env tsx
import { config } from "dotenv";
import readline from "readline";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import OpenAI from "openai";
import chalk from "chalk";

config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (q: string): Promise<string> =>
  new Promise((res) => rl.question(q, res));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const main = async () => {
  const url = await prompt(chalk.cyan("🔗 Enter URL to scan: "));
  rl.close();

  console.log(chalk.gray("\n⚙️  Scraping with Hyperbrowser...\n"));

  const hb = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY!,
  });

  const response = await hb.scrape.startAndWait({ 
    url,
    scrapeOptions: {
      formats: ["html"]
    }
  });

  // Check if there's an error in the response
  if (response.error) {
    console.log(chalk.red(`❌ Error scraping: ${response.error}`));
    return;
  }

  // Access the HTML from the response data
  const html = response.data?.html;
  
  if (!html) {
    console.log(chalk.yellow("⚠️  No HTML content found."));
    return;
  }

  // Look for all form elements, not just inputs
  const formElements: string[] = [];
  
  // Get input elements
  const inputMatches = html.matchAll(/<input[^>]+>/gi);
  const inputTags = Array.from(inputMatches).map((match) => match[0]);
  
  // Get textarea elements
  const textareaMatches = html.matchAll(/<textarea[^>]*>.*?<\/textarea>/gi);
  const textareaTags = Array.from(textareaMatches).map((match) => match[0]);
  
  // Get select elements
  const selectMatches = html.matchAll(/<select[^>]*>.*?<\/select>/gi);
  const selectTags = Array.from(selectMatches).map((match) => match[0]);
  
  // Get button elements that might be form-related
  const buttonMatches = html.matchAll(/<button[^>]*type=["']?submit["']?[^>]*>.*?<\/button>/gi);
  const buttonTags = Array.from(buttonMatches).map((match) => match[0]);

  // Combine all form elements
  formElements.push(...inputTags, ...textareaTags, ...selectTags, ...buttonTags);
  
  // Clean up formatting
  const cleanedElements = formElements.map((element) =>
    element.replace(/\s+/g, " ").trim()
  );

  if (cleanedElements.length === 0) {
    console.log(chalk.yellow("⚠️  No form elements found."));
    return;
  }

  console.log(chalk.green(`✅ Found ${cleanedElements.length} form elements:`));
  cleanedElements.forEach((element, i) => {
    const type = element.match(/<(\w+)/)?.[1]?.toUpperCase() || "UNKNOWN";
    const preview = element.slice(0, 100);
    console.log(chalk.gray(`${i + 1}. [${type}] ${preview}...`));
  });

  console.log(chalk.blue("\n🧠 Analyzing form structure with OpenAI...\n"));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a web security expert analyzing form elements for potential threats. Focus on identifying suspicious patterns, phishing indicators, or malicious form behaviors. Be concise and specific. Avoid markdown formatting - use plain text only.",
      },
      {
        role: "user",
        content: `Analyze these form elements for security risks:\n\n${cleanedElements.join("\n\n")}\n\nWebsite: ${url}`,
      },
    ],
  });

  const result = completion.choices[0].message.content;
  
  // Clean up any markdown formatting and extra whitespace
  const cleanResult = result
    ?.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    ?.replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
    ?.replace(/#{1,6}\s/g, '')        // Remove headers
    ?.trim();

  console.log(chalk.green("📋 Security Analysis:\n"));
  console.log(cleanResult);
};

main();