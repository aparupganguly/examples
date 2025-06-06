import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import OpenAI from "openai";
import * as readlineSync from "readline-sync";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a helpful assistant that answers questions about a GitHub repository.
Use the following scraped content to provide concise, relevant answers.
If you can't find an answer, say so politely.
Format your responses in plain text without markdown formatting like asterisks or bold text.
Use simple numbered lists and clean formatting.
`;

const main = async () => {
  const url = readlineSync.question("🔗 Enter GitHub repository URL: ");
  if (!url) {
    console.error("❌ Please provide a GitHub repo URL.");
    process.exit(1);
  }

  console.log(`🔎 Scraping GitHub repository: ${url}`);
  const scrapeResult = await client.scrape.startAndWait({
    url: url,
    scrapeOptions: {
      formats: ["markdown"],
      includeTags: [
        ".markdown-body", // README and other markdown docs
        ".js-navigation-item", // file/folder listings
        ".Box-row", // repository file structure
        "[data-testid='repos-file-tree']", // file tree structure
        ".repository-content", // main repository content
        ".BorderGrid-cell", // repository stats and info
        ".numbers-summary", // repository statistics
        ".Progress", // language statistics bar
        ".color-fg-default", // language names and percentages
        "[data-testid='repository-topic']", // repository topics
        ".commit-tease", // recent commit info
        ".js-recent-activity-container", // recent activity
        ".ref-selector-button", // branch selector button
        "[data-testid='branch-picker-ref-selector']", // branch picker
        ".SelectMenu-item", // branch list items
        ".octicon-git-branch", // branch icons and names
        ".branch-name", // branch name elements
        ".js-issue-title", // issues
        ".js-pull-request-title", // PRs
        ".discussion-item", // discussions
        ".release-entry" // changelogs
      ],
      excludeTags: ["script", "style"],
    },
  });

  if (scrapeResult.status === "failed" || !scrapeResult.data?.markdown) {
    console.error("❌ Scraping failed or returned no data.");
    return;
  }

  console.log("🤖 Ready to chat about this repository!\n");

  while (true) {
    const userQuestion = readlineSync.question("💬 Ask a question (or type 'exit' to quit): ");
    if (userQuestion.toLowerCase() === "exit") {
      console.log("👋 Goodbye!");
      break;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + scrapeResult.data!.markdown },
        { role: "user", content: userQuestion },
      ],
    });

    console.log(`\x1b[32m🤖 ${completion.choices[0].message.content}\x1b[0m\n`);
  }
};

main();