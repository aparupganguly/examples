import { Event, ThemeColors, BotConfig } from '../types.js';
export declare function themeColors(theme: 'modern' | 'dark' | 'neon'): ThemeColors;
export declare function wrapLines(text: string, maxWidth: number, fontSize: number, font: any): string[];
export declare function generateDeck(events: Event[], bot: BotConfig, theme?: string): Promise<Uint8Array>;
//# sourceMappingURL=deck.d.ts.map