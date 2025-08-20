"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.themeColors = themeColors;
exports.wrapLines = wrapLines;
exports.generateDeck = generateDeck;
const pdf_lib_1 = require("pdf-lib");
const utils_js_1 = require("../utils.js");
function themeColors(theme) {
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
function wrapLines(text, maxWidth, fontSize, font) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (textWidth <= maxWidth) {
            currentLine = testLine;
        }
        else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            }
            else {
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
async function generateDeck(events, bot, theme = 'modern') {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const colors = themeColors(theme);
    // Parse colors
    const bgColor = hexToRgb(colors.bg);
    const fgColor = hexToRgb(colors.fg);
    const accColor = hexToRgb(colors.acc);
    // Load fonts
    const titleFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
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
        await addEventSlide(pdfDoc, event, bgColor, fgColor, accColor, titleFont, bodyFont, pageWidth, pageHeight, margin, contentWidth);
    }
    return await pdfDoc.save();
}
async function addCoverSlide(pdfDoc, botName, bgColor, fgColor, accColor, titleFont, bodyFont, pageWidth, pageHeight, margin) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    // Background
    page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: (0, pdf_lib_1.rgb)(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255)
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
        color: (0, pdf_lib_1.rgb)(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
    });
    // Subtitle with Hyperbrowser branding
    const subtitle = `Built with Hyperbrowser • ${(0, utils_js_1.timestamp)()}`;
    const subtitleSize = 16;
    const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle, subtitleSize);
    page.drawText(subtitle, {
        x: (pageWidth - subtitleWidth) / 2,
        y: pageHeight / 2 - 20,
        size: subtitleSize,
        font: bodyFont,
        color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
    });
    // Accent line
    page.drawRectangle({
        x: (pageWidth - 200) / 2,
        y: pageHeight / 2 - 50,
        width: 200,
        height: 3,
        color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
    });
}
async function addEventSlide(pdfDoc, event, bgColor, fgColor, accColor, titleFont, bodyFont, pageWidth, pageHeight, margin, contentWidth) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    // Background
    page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: (0, pdf_lib_1.rgb)(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255)
    });
    let yPosition = pageHeight - margin - 30;
    // Title
    const titleSize = 24;
    const titleLines = wrapLines((0, utils_js_1.truncate)(event.title, 100), contentWidth - 100, titleSize, titleFont);
    for (const line of titleLines) {
        page.drawText(line, {
            x: margin,
            y: yPosition,
            size: titleSize,
            font: titleFont,
            color: (0, pdf_lib_1.rgb)(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
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
        color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
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
                        color: (0, pdf_lib_1.rgb)(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
                    });
                    yPosition -= summarySize + 8;
                }
            }
            else {
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
            color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
        });
        yPosition -= 25;
        const whyMattersLines = wrapLines(event.why_matters, contentWidth - 100, 13, bodyFont);
        for (const line of whyMattersLines) {
            page.drawText(line, {
                x: margin + 20,
                y: yPosition,
                size: 13,
                font: bodyFont,
                color: (0, pdf_lib_1.rgb)(fgColor.r / 255, fgColor.g / 255, fgColor.b / 255)
            });
            yPosition -= 20;
        }
    }
    // URL at bottom
    const urlText = (0, utils_js_1.truncate)(event.url, 80);
    page.drawText(urlText, {
        x: margin,
        y: margin + 20,
        size: 10,
        font: bodyFont,
        color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
    });
    // Score indicator
    const scoreText = `Score: ${(event.score || 0).toFixed(2)}`;
    const scoreWidth = bodyFont.widthOfTextAtSize(scoreText, 10);
    page.drawText(scoreText, {
        x: pageWidth - margin - scoreWidth,
        y: margin + 20,
        size: 10,
        font: bodyFont,
        color: (0, pdf_lib_1.rgb)(accColor.r / 255, accColor.g / 255, accColor.b / 255)
    });
}
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}
//# sourceMappingURL=deck.js.map