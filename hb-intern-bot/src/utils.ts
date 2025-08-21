import crypto from 'crypto';
import { ParsedWindow } from './types.js';

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sha1(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export function parseWindow(s: '24h' | '48h' | '7d'): ParsedWindow {
  const now = new Date();
  const hours = s === '24h' ? 24 : s === '48h' ? 48 : 168; // 7d = 168h
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  return {
    startISO: start.toISOString(),
    endISO: now.toISOString(),
    hours
  };
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function relTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeScores(nums: number[]): (x: number) => number {
  if (nums.length === 0) return (x: number) => 0;
  
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min;
  
  if (range === 0) return (x: number) => 0.5;
  
  return (x: number) => Math.max(0, Math.min(1, (x - min) / range));
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isReputableDomain(domain: string): boolean {
  const reputable = [
    'github.com',
    'arxiv.org', 
    'vercel.com',
    'openai.com',
    'anthropic.com',
    'deepmind.google',
    'aws.amazon.com',
    'microsoft.com',
    'google.com',
    'techcrunch.com',
    'ycombinator.com',
    'stripe.com',
    'cloudflare.com'
  ];
  
  return reputable.some(rep => domain.includes(rep));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function addJitter(baseMs: number, jitterPercent: number = 10): number {
  const jitter = baseMs * (jitterPercent / 100);
  return baseMs + (Math.random() * jitter * 2 - jitter);
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

export function parseHours(timeStr: string): number {
  const match = timeStr.match(/^(\d+)([hd])$/);
  if (!match) return 24; // default
  
  const [, num, unit] = match;
  const hours = parseInt(num, 10);
  return unit === 'h' ? hours : hours * 24;
}
