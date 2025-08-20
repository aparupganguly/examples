import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Event, ThemeColors, BotConfig } from '../types.js';
import { truncate, timestamp } from '../utils.js';

export function themeColors(theme: 'modern' | 'dark' | 'neon'): ThemeColors {
  switch (theme) {
    case 'dark':
      return {
        bg: '#1a1a1a',
        fg: '#ffffff',
        acc: '#00FF88'
      };
    case 'neon':
      return {
        bg: '#0a0a0a',
        fg: '#00ff00',
        acc: '#ff00ff'
      };
    case 'modern':
    default:
      return {
        bg: '#ffffff',
        fg: '#333333',
        acc: '#00FF88'
      };
  }
}

export function wrapLines(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (textWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, break it
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

export async function generateDeck(
  events: Event[],
  bot: BotConfig,
  theme: string = 'modern'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const colors = themeColors(theme as 'modern' | 'dark' | 'neon');
  
  // Parse colors
  const bgColor = hexToRgb(colors.bg);
  const fgColor = hexToRgb(colors.fg);
  const accColor = hexToRgb(colors.acc);
  
  // Load fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // A4 landscape dimensions (595.28 x 841.89 points)
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  
  // Cover slide
  await addCoverSlide(pdfDoc, bot.name, bgColor, fgColor, accColor, titleFont, bodyFont, pageWidth, pageHeight, margin);
  
  // Take top 5-7 events for slides
  const topEvents = events.slice(0, Math.min(7, events.length));
  
  for (const event of topEvents) {
    await addEventSlide(
      pdfDoc,
      event,
      bgColor,
      fgColor,
      accColor,
      titleFont,
      bodyFont,
      pageWidth,
      pageHeight,
      margin,
      contentWidth
    );
  }
  
  return await pdfDoc.save();
}

async function addCoverSlide(
  pdfDoc: PDFDocument,
  botName: string,
  bgColor: { r: number; g: number; b: number },
  fgColor: { r: number; g: number; b: number },
  accColor: { r: number; g: number; b: number },
  titleFont: any,
  bodyFont: any,
  pageWidth: number,
  pageHeight: number,
  margin: number
): Promise<void> {
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255)
  });
  
  // Title
  const title = `${botName} Digest`;
  const titleSize = 36;
  const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
  
  page.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: pageHeight / 2 + 50,
    size: titleSize,
    font: titleFont,
    color: rgb(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
  });
  
  // Subtitle with Hyperbrowser branding
  const subtitle = `Built with Hyperbrowser • ${timestamp()}`;
  const subtitleSize = 16;
  const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle, subtitleSize);
  
  page.drawText(subtitle, {
    x: (pageWidth - subtitleWidth) / 2,
    y: pageHeight / 2 - 20,
    size: subtitleSize,
    font: bodyFont,
    color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
  });
  
  // Accent line
  page.drawRectangle({
    x: (pageWidth - 200) / 2,
    y: pageHeight / 2 - 50,
    width: 200,
    height: 3,
    color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
  });
}

async function addEventSlide(
  pdfDoc: PDFDocument,
  event: Event,
  bgColor: { r: number; g: number; b: number },
  fgColor: { r: number; g: number; b: number },
  accColor: { r: number; g: number; b: number },
  titleFont: any,
  bodyFont: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
): Promise<void> {
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  
  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255)
  });
  
  let yPosition = pageHeight - margin - 30;
  
  // Title
  const titleSize = 24;
  const titleLines = wrapLines(truncate(event.title, 100), contentWidth - 100, titleSize, titleFont);
  
  for (const line of titleLines) {
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: titleSize,
      font: titleFont,
      color: rgb(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
    });
    yPosition -= titleSize + 10;
  }
  
  yPosition -= 20;
  
  // Source and stats
  const sourceText = `${event.source.toUpperCase()}${event.subreddit ? ` • r/${event.subreddit}` : ''} • ${event.points} points • ${event.comments} comments`;
  page.drawText(sourceText, {
    x: margin,
    y: yPosition,
    size: 12,
    font: bodyFont,
    color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
  });
  
  yPosition -= 40;
  
  // Summary
  if (event.summary) {
    const summarySize = 14;
    const summaryLines = event.summary.split('\n');
    
    for (const line of summaryLines) {
      if (line.trim()) {
        const wrappedLines = wrapLines(line, contentWidth - 100, summarySize, bodyFont);
        for (const wrappedLine of wrappedLines) {
          page.drawText(wrappedLine, {
            x: margin + 20,
            y: yPosition,
            size: summarySize,
            font: bodyFont,
            color: rgb(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
          });
          yPosition -= summarySize + 8;
        }
      } else {
        yPosition -= summarySize + 8;
      }
    }
  }
  
  yPosition -= 20;
  
  // Why it matters
  if (event.why_matters) {
    page.drawText('Why it matters:', {
      x: margin,
      y: yPosition,
      size: 14,
      font: titleFont,
      color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
    });
    yPosition -= 25;
    
    const whyMattersLines = wrapLines(event.why_matters, contentWidth - 100, 13, bodyFont);
    for (const line of whyMattersLines) {
      page.drawText(line, {
        x: margin + 20,
        y: yPosition,
        size: 13,
        font: bodyFont,
        color: rgb(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
      });
      yPosition -= 20;
    }
  }
  
  // URL at bottom
  const urlText = truncate(event.url, 80);
  page.drawText(urlText, {
    x: margin,
    y: margin + 20,
    size: 10,
    font: bodyFont,
    color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
  });
  
  // Score indicator
  const scoreText = `Score: ${(event.score || 0).toFixed(2)}`;
  const scoreWidth = bodyFont.widthOfTextAtSize(scoreText, 10);
  page.drawText(scoreText, {
    x: pageWidth - margin - scoreWidth,
    y: margin + 20,
    size: 10,
    font: bodyFont,
    color: rgb(accColor.r / 255, accColor.g / 255, accColor.b / 255)
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
