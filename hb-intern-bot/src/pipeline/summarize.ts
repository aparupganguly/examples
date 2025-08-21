import OpenAI from 'openai';
import { Event } from '../types.js';
import { truncate } from '../utils.js';

let openaiClient: OpenAI | null = null;

export function initializeSummarizer(apiKey?: string): void {
  if (apiKey) {
    openaiClient = new OpenAI({ apiKey });
  }
}

export async function summarizeEvents(events: Event[]): Promise<Event[]> {
  const summarizedEvents = await Promise.all(
    events.map(async (event) => {
      try {
        const summary = await generateSummary(event);
        return {
          ...event,
          summary: summary.summary,
          why_matters: summary.why_matters
        };
      } catch (error) {
        console.warn(`Failed to summarize event ${event.id}:`, error);
        return {
          ...event,
          summary: generateFallbackSummary(event),
          why_matters: generateFallbackWhyMatters(event)
        };
      }
    })
  );

  return summarizedEvents;
}

async function generateSummary(event: Event): Promise<{ summary: string; why_matters: string }> {
  if (!openaiClient) {
    return {
      summary: generateFallbackSummary(event),
      why_matters: generateFallbackWhyMatters(event)
    };
  }

  const prompt = `Analyze this ${event.source} post and provide a concise summary and why it matters:

Title: ${event.title}
Source: ${event.source}${event.subreddit ? ` (r/${event.subreddit})` : ''}
Domain: ${event.domain || 'N/A'}
Points: ${event.points}
Comments: ${event.comments}
URL: ${event.url}

Instructions:
1. Summary: 3-5 bullet points, max 50 words total
2. Why it matters: 1-2 sentences explaining significance for developers/tech professionals

Format as JSON:
{
  "summary": "• Point 1\n• Point 2\n• Point 3",
  "why_matters": "Why this is significant..."
}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a tech analyst who summarizes news for developers and tech professionals. Be concise and focus on practical implications.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return {
          summary: truncate(parsed.summary || generateFallbackSummary(event), 200),
          why_matters: truncate(parsed.why_matters || generateFallbackWhyMatters(event), 150)
        };
      } catch {
        // If JSON parsing fails, try to extract summary and why_matters from text
        const summaryMatch = content.match(/"summary":\s*"([^"]+)"/);
        const whyMattersMatch = content.match(/"why_matters":\s*"([^"]+)"/);
        
        return {
          summary: summaryMatch?.[1] || generateFallbackSummary(event),
          why_matters: whyMattersMatch?.[1] || generateFallbackWhyMatters(event)
        };
      }
    }
  } catch (error) {
    console.warn('OpenAI API error:', error);
  }

  return {
    summary: generateFallbackSummary(event),
    why_matters: generateFallbackWhyMatters(event)
  };
}

function generateFallbackSummary(event: Event): string {
  const bullets = [];
  
  // Title summary
  bullets.push(`• ${truncate(event.title, 80)}`);
  
  // Source info
  if (event.domain && event.domain !== 'reddit.com' && event.domain !== 'news.ycombinator.com') {
    bullets.push(`• From ${event.domain}`);
  }
  
  // Engagement info
  if (event.points > 0 || event.comments > 0) {
    const engagement = [];
    if (event.points > 0) engagement.push(`${event.points} points`);
    if (event.comments > 0) engagement.push(`${event.comments} comments`);
    bullets.push(`• ${engagement.join(', ')}`);
  }

  return bullets.slice(0, 3).join('\n');
}

function generateFallbackWhyMatters(event: Event): string {
  const title = event.title.toLowerCase();
  
  // Determine category and generate appropriate why_matters
  if (title.includes('ai') || title.includes('llm') || title.includes('gpt') || title.includes('machine learning')) {
    return 'Significant AI/ML development that could impact developer tools and workflows.';
  }
  
  if (title.includes('open source') || title.includes('github')) {
    return 'Open source project that could benefit the developer community.';
  }
  
  if (title.includes('launch') || title.includes('release') || title.includes('announce')) {
    return 'New product or service launch relevant to tech professionals.';
  }
  
  if (title.includes('funding') || title.includes('acquisition')) {
    return 'Business development that may influence industry trends and opportunities.';
  }
  
  if (title.includes('security') || title.includes('vulnerability') || title.includes('breach')) {
    return 'Security development that developers should be aware of for best practices.';
  }
  
  if (event.source === 'hn' && event.points > 100) {
    return 'Highly-discussed topic on Hacker News indicating strong community interest.';
  }
  
  if (event.source === 'reddit' && event.points > 50) {
    return 'Popular discussion in developer community worth following.';
  }
  
  return 'Trending topic relevant to developers and tech professionals.';
}

export async function summarizeBatch(events: Event[], batchSize: number = 5): Promise<Event[]> {
  const results: Event[] = [];
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const summarized = await summarizeEvents(batch);
    results.push(...summarized);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < events.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
