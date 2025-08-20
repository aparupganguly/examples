import { Hyperbrowser } from '@hyperbrowser/sdk';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


interface Event {
  id: string;
  source: 'hn' | 'reddit';
  title: string;
  url: string;
  points: number;
  comments: number;
  created_at: string;
  domain?: string;
  score?: number;
}

interface Cluster {
  id: string;
  title_hint: string;
  events: Event[];
  max_score: number;
  keywords: string[];
  prediction?: Prediction;
}

interface Prediction {
  claim: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  citations: Array<{ title: string; url: string; }>;
}

interface CLIArgs {
  mode: string;
  window: string;
  top: number;
  out: string;
  subs: string[];
}


const IMPACT_KEYWORDS = [
  'launch', 'open source', 'released', 'funding', 'acquired', 'breakthrough',
  'announce', 'partnership', 'ipo', 'beta', 'ga'
];

const MODE_CONFIGS = {
  ai: ['r/MachineLearning', 'r/LocalLLaMA', 'r/artificial'],
  crypto: ['r/CryptoCurrency', 'r/bitcoin', 'r/ethereum'],
  devtools: ['r/programming', 'r/webdev', 'r/javascript'],
  fintech: ['r/fintech', 'r/investing', 'r/startups']
};


function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    mode: 'ai',
    window: '24h',
    top: 10,
    out: './oracle',
    subs: MODE_CONFIGS.ai
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--mode':
        if (next && MODE_CONFIGS[next as keyof typeof MODE_CONFIGS]) {
          parsed.mode = next;
          parsed.subs = MODE_CONFIGS[next as keyof typeof MODE_CONFIGS];
        }
        i++;
        break;
      case '--window':
        if (next) parsed.window = next;
        i++;
        break;
      case '--top':
        if (next) parsed.top = parseInt(next) || 10;
        i++;
        break;
      case '--out':
        if (next) parsed.out = next;
        i++;
        break;
      case '--subs':
        if (next) parsed.subs = next.split(',');
        i++;
        break;
    }
  }

  return parsed;
}

function sha1(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function extractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}


class DataFetcher {
  private hb: Hyperbrowser;

  constructor(apiKey: string) {
    this.hb = new Hyperbrowser({ apiKey });
  }

  async fetchHackerNews(): Promise<Event[]> {
    console.log('Fetching Hacker News...');
    const events: Event[] = [];

    try {
      const result = await this.hb.scrape.startAndWait({
        url: 'https://news.ycombinator.com/',
        scrapeOptions: { formats: ['markdown'] }
      });

      if (result.data?.markdown) {
        events.push(...this.parseHNContent(result.data.markdown));
      }

      console.log(`  Found ${events.length} HN items`);
    } catch (error) {
      console.error('Error fetching HN:', error);
    }

    return events;
  }

  async fetchReddit(subreddits: string[]): Promise<Event[]> {
    console.log(`Fetching Reddit (${subreddits.length} subs)...`);
    const events: Event[] = [];

    for (const sub of subreddits) {
      try {
        await this.sleep(1000); 
        
        const result = await this.hb.scrape.startAndWait({
          url: `https://old.reddit.com/${sub}/hot/.json`,
          scrapeOptions: { formats: ['markdown'] }
        });

        if (result.data?.markdown) {
          events.push(...this.parseRedditContent(result.data.markdown, sub));
        }

        console.log(`  ${sub}: found content`);
      } catch (error) {
        console.error(`Error fetching ${sub}:`, error);
      }
    }

    return events;
  }

  private parseHNContent(content: string): Event[] {
    const events: Event[] = [];
    
    // Parse HN content from markdown
    
    const lines = content.split('\n');

    for (const line of lines) {
      // Try multiple patterns for HN posts
      let match = line.match(/\[(.*?)\]\((.*?)\).*?(\d+)\s+points.*?(\d+)\s+comments/);
      
      // Alternative pattern for markdown links with scores
      if (!match) {
        match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match && line.includes('point')) {
          const pointMatch = line.match(/(\d+)\s+point/);
          const commentMatch = line.match(/(\d+)\s+comment/);
          
          if (pointMatch && match[1] && match[2] && pointMatch[1]) {
            const [, title, url] = match;
            events.push({
              id: sha1(url),
              source: 'hn',
              title: title.trim(),
              url,
              points: parseInt(pointMatch[1]),
              comments: commentMatch && commentMatch[1] ? parseInt(commentMatch[1]) : 0,
              created_at: new Date().toISOString(),
              domain: extractDomain(url) || ''
            });
          }
        }
      } else if (match && match[1] && match[2] && match[3] && match[4]) {
        const [, title, url, points, comments] = match;
        events.push({
          id: sha1(url),
          source: 'hn',
          title: title.trim(),
          url,
          points: parseInt(points),
          comments: parseInt(comments),
          created_at: new Date().toISOString(),
          domain: extractDomain(url) || ''
        });
      }
    }

    // Successfully parsed HN events
    return events;
  }

  private parseRedditContent(content: string, subreddit: string): Event[] {
    const events: Event[] = [];
    
    // Parse Reddit JSON content
    
    const lines = content.split('\n');

    for (const line of lines) {
      // Try multiple patterns for Reddit posts
      let match = line.match(/\[(.*?)\]\((.*?)\).*?(\d+)\s+upvotes/);
      
      // Alternative patterns for Reddit markdown
      if (!match) {
        match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match && (line.includes('upvote') || line.includes('score') || line.includes('point'))) {
          const scoreMatch = line.match(/(\d+)\s+(?:upvote|score|point)/);
          
          if (scoreMatch && match[1] && match[2] && scoreMatch[1]) {
            const [, title, url] = match;
            events.push({
              id: sha1(url),
              source: 'reddit',
              title: title.trim(),
              url,
              points: parseInt(scoreMatch[1]),
              comments: 0, // Simplified
              created_at: new Date().toISOString(),
              domain: extractDomain(url) || ''
            });
          }
        }
      } else if (match && match[1] && match[2] && match[3]) {
        const [, title, url, upvotes] = match;
        events.push({
          id: sha1(url),
          source: 'reddit',
          title: title.trim(),
          url,
          points: parseInt(upvotes),
          comments: 0, // Simplified
          created_at: new Date().toISOString(),
          domain: extractDomain(url) || ''
        });
      }
    }

    // Successfully parsed Reddit events
    return events;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


class SignalProcessor {
  scoreEvents(events: Event[]): Event[] {
    return events.map(event => ({
      ...event,
      score: this.calculateScore(event, events)
    })).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private calculateScore(event: Event, allEvents: Event[]): number {
    const baseScore = Math.min(event.points / 100, 1); // Normalize points
    
    const impactBonus = IMPACT_KEYWORDS.some(keyword => 
      event.title.toLowerCase().includes(keyword)
    ) ? 0.3 : 0;

    const crossSourceBonus = allEvents.some(other => 
      other.source !== event.source && 
      other.domain === event.domain
    ) ? 0.2 : 0;

    return Math.min(baseScore + impactBonus + crossSourceBonus, 1);
  }

  clusterEvents(events: Event[]): Cluster[] {
    const clusters: Cluster[] = [];
    const processed = new Set<string>();

    for (const event of events) {
      if (processed.has(event.id)) continue;

      const cluster: Cluster = {
        id: `cluster-${clusters.length + 1}`,
        title_hint: event.title,
        events: [event],
        max_score: event.score || 0,
        keywords: this.extractKeywords(event.title)
      };

      processed.add(event.id);

      for (const other of events) {
        if (processed.has(other.id)) continue;
        
        if (this.areSimilar(event.title, other.title)) {
          cluster.events.push(other);
          cluster.max_score = Math.max(cluster.max_score, other.score || 0);
          processed.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters.sort((a, b) => b.max_score - a.max_score);
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .slice(0, 3);
  }

  private areSimilar(text1: string, text2: string): boolean {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    
    const intersection = Array.from(words1).filter(x => words2.has(x)).length;
    const union = new Set([...Array.from(words1), ...Array.from(words2)]).size;
    
    return union > 0 ? intersection / union > 0.7 : false;
  }
}


class PredictionEngine {
  private openai?: OpenAI;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generatePredictions(clusters: Cluster[], topK: number): Promise<Cluster[]> {
    console.log(`Generating predictions ${this.openai ? 'with AI' : 'with heuristics'}...`);

    const topClusters = clusters.slice(0, topK);

    for (const cluster of topClusters) {
      cluster.prediction = this.openai 
        ? await this.generateAIPrediction(cluster)
        : this.generateHeuristicPrediction(cluster);
    }

    return topClusters;
  }

  private async generateAIPrediction(cluster: Cluster): Promise<Prediction> {
    try {
      const prompt = `Analyze this tech trend and generate a prediction:

Title: ${cluster.title_hint}
Events: ${cluster.events.length}
Keywords: ${cluster.keywords.join(', ')}
Top URLs: ${cluster.events.slice(0, 2).map(e => e.url).join(', ')}

Generate a JSON response with:
{
  "claim": "Brief predictive statement (≤30 words)",
  "rationale": "One-line explanation",
  "confidence": "low|medium|high"
}`;

      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a tech analyst. Respond only with valid JSON. Do not include any text outside the JSON object.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content.trim());
      return {
        ...result,
        citations: cluster.events.slice(0, 2).map(e => ({
          title: e.title,
          url: e.url
        }))
      };
    } catch (error) {
      console.error('AI prediction failed:', error);
      return this.generateHeuristicPrediction(cluster);
    }
  }

  private generateHeuristicPrediction(cluster: Cluster): Prediction {
    const topEvent = cluster.events[0];
    if (!topEvent) {
      return {
        claim: 'Emerging trend detected',
        rationale: 'Insufficient data for detailed prediction',
        confidence: 'low',
        citations: []
      };
    }
    
    return {
      claim: `${topEvent.title.slice(0, 50)}... gaining momentum`,
      rationale: `${cluster.events.length} signals across multiple sources`,
      confidence: cluster.max_score > 0.7 ? 'high' : cluster.max_score > 0.4 ? 'medium' : 'low',
      citations: cluster.events.slice(0, 2).map(e => ({
        title: e.title,
        url: e.url
      }))
    };
  }
}

class OutputGenerator {
  async writeOutputs(clusters: Cluster[], events: Event[], outputDir: string, mode: string): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await Promise.all([
      this.writePredictionsMarkdown(clusters, outputDir, mode),
      this.writeEventsJsonl(events, outputDir),
      this.writeClustersJson(clusters, outputDir)
    ]);

    console.log(`Wrote outputs to ${outputDir}/`);
  }

  private async writePredictionsMarkdown(clusters: Cluster[], outputDir: string, mode: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const predictionsWithData = clusters.filter(c => c.prediction);

    let content = `# Tech Signal Predictions\n\n`;
    content += `**Built with [Hyperbrowser](https://hyperbrowser.ai)**\n\n`;
    content += `- **Generated**: ${timestamp}\n`;
    content += `- **Mode**: ${mode}\n`;
    content += `- **Predictions**: ${predictionsWithData.length}\n\n`;

    for (let i = 0; i < predictionsWithData.length; i++) {
      const cluster = predictionsWithData[i];
      if (!cluster || !cluster.prediction) continue;
      
      const pred = cluster.prediction;
      
      content += `## ${i + 1}. ${pred.claim} (confidence: ${pred.confidence.toUpperCase()})\n\n`;
      content += `- ${pred.rationale}\n`;
      content += `- Based on ${cluster.events.length} signals\n`;
      content += `- Keywords: ${cluster.keywords.slice(0, 3).join(', ')}\n\n`;
      
      content += `**Citations:**\n`;
      for (const citation of pred.citations) {
        content += `- [${citation.title.slice(0, 60)}...](${citation.url})\n`;
      }
      content += '\n';
    }

    content += `\nFollow @hyperbrowser for updates.\n`;
    fs.writeFileSync(path.join(outputDir, 'predictions.md'), content);
  }

  private async writeEventsJsonl(events: Event[], outputDir: string): Promise<void> {
    const content = events.map(event => JSON.stringify(event)).join('\n');
    fs.writeFileSync(path.join(outputDir, 'events.jsonl'), content);
  }

  private async writeClustersJson(clusters: Cluster[], outputDir: string): Promise<void> {
    const content = JSON.stringify(clusters, null, 2);
    fs.writeFileSync(path.join(outputDir, 'clusters.json'), content);
  }
}


async function main(): Promise<void> {
  try {
    const args = parseArgs();
    
    // Validate environment
    const hbApiKey = process.env.HYPERBROWSER_API_KEY;
    if (!hbApiKey) {
      console.error('Error: HYPERBROWSER_API_KEY environment variable is required');
      console.error('Get your API key at: https://hyperbrowser.ai');
      process.exit(1);
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    console.log(`\n🔮 HB-Predict starting...`);
    console.log(`Mode: ${args.mode}, Window: ${args.window}, Top: ${args.top}`);
    
    // Initialize components
    const fetcher = new DataFetcher(hbApiKey);
    const processor = new SignalProcessor();
    const predictor = new PredictionEngine(openaiApiKey);
    const outputGen = new OutputGenerator();

    // Fetch data
    console.log('\n📊 Fetching data...');
    const [hnEvents, redditEvents] = await Promise.all([
      fetcher.fetchHackerNews(),
      fetcher.fetchReddit(args.subs)
    ]);

    const allEvents = [...hnEvents, ...redditEvents].filter(e => e.points >= 10);
    console.log(`Found ${allEvents.length} total events`);

    if (allEvents.length === 0) {
      console.warn('No events found. Check your data sources.');
      return;
    }

    // Process events
    console.log('\n⚡ Processing signals...');
    const scoredEvents = processor.scoreEvents(allEvents);
    const clusters = processor.clusterEvents(scoredEvents);
    
    console.log(`Scored ${scoredEvents.length} events, clustered into ${clusters.length} groups`);

    // Generate predictions
    const clustersWithPredictions = await predictor.generatePredictions(clusters, args.top);

    // Write outputs
    await outputGen.writeOutputs(clustersWithPredictions, scoredEvents, args.out, args.mode);

    console.log(`\n✅ Analysis complete! Check ${args.out}/ for results.`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}


if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}