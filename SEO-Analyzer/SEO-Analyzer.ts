import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import { z } from "zod";
import readline from "readline";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
};

const colors = {
  green: "\x1b[32m",
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const main = async () => {
  try {
    const userInput = await askQuestion("Enter the website URL to analyze: ");
    
    let url = userInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    console.log(
      `${colors.cyan}Analyzing SEO for: ${url}...${colors.reset}`,
    );

    const schema = z.object({
      url: z.string(),
      overallScore: z.number().min(0).max(100),
      summary: z.string(),
      issues: z.array(z.object({
        type: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        issue: z.string(),
        recommendation: z.string(),
      })),
      strengths: z.array(z.string()),
      quickWins: z.array(z.string()),
    });

    type SEOAnalysisData = z.infer<typeof schema>;

    const result = await client.extract.startAndWait({
      urls: [url],
      prompt: `Perform a comprehensive SEO analysis of this webpage. Analyze:

1. Title Tags - length (50-60 chars), uniqueness, keyword inclusion
2. Meta Descriptions - length (150-160 chars), compelling copy, keywords
3. Headings - proper H1-H6 hierarchy, keyword usage, structure
4. Content - quality, length, keyword density, readability
5. Images - alt text, file names, optimization
6. Links - internal/external linking, anchor text
7. Technical SEO - page structure, schema markup, accessibility

Provide:
- An overall SEO score (0-100)
- A summary of the page's SEO status
- List of issues categorized by severity (critical, high, medium, low)
- Specific recommendations for each issue
- Current strengths of the page
- Quick wins for immediate improvement`,
      schema: schema,
    });

    // Display results
    console.log(`${colors.green}`);
    console.log("=".repeat(60));
    console.log(`SEO ANALYSIS RESULTS FOR: ${url}`);
    console.log("=".repeat(60));

    if (result.status === "completed" && result.data) {
      const data = result.data as SEOAnalysisData;
      
      console.log(`\nOVERALL SEO SCORE: ${data.overallScore}/100`);
      console.log(`\nSUMMARY:\n${data.summary}`);

      if (data.issues && data.issues.length > 0) {
        console.log(`\nISSUES FOUND (${data.issues.length}):`);
        data.issues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.severity.toUpperCase()} - ${issue.type}`);
          console.log(`   Issue: ${issue.issue}`);
          console.log(`   Recommendation: ${issue.recommendation}`);
        });
      }

      if (data.strengths && data.strengths.length > 0) {
        console.log(`\nSTRENGTHS:`);
        data.strengths.forEach((strength, index) => {
          console.log(`${index + 1}. ${strength}`);
        });
      }

      if (data.quickWins && data.quickWins.length > 0) {
        console.log(`\nQUICK WINS:`);
        data.quickWins.forEach((win, index) => {
          console.log(`${index + 1}. ${win}`);
        });
      }
    } else {
      console.log("SEO analysis failed or no data found.");
      console.log("Result:", JSON.stringify(result, null, 2));
    }

    console.log("=".repeat(60));
    console.log(`${colors.reset}`);
  } catch (error) {
    console.error(
      `${colors.yellow}Error during SEO analysis:${colors.reset}`,
      error,
    );
  } finally {
    rl.close();
  }
};

main();