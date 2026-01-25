import type { TranslatedSubtitle } from './translationService';
import type { SubtitleStyle } from '@/components/SubtitleStyleSettings';
import { getFontFamilyCSS, getTextEffectsCSS, removePunctuationFromText } from '@/components/SubtitleStyleSettings';
import { normalizeSubtitleText } from './transcriptionService';
import { getAnimatedTextForCanvas } from '@/hooks/useSubtitleEffect';

// Function to split bilingual text (same as in MediaPlayer and SubtitleList)
function splitBilingualText(text: string): { original: string; translated: string } | null {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const englishRegex = /[a-zA-Z]/;
  
  if (chineseRegex.test(text) && englishRegex.test(text)) {
    // Pattern 1: Chinese text followed by English
    const pattern1 = /^([\u4e00-\u9fa5\s，。！？；：、""''（）【】]+)\s*([a-zA-Z\s,.'!?;:()"-]+)$/;
    const match1 = text.match(pattern1);
    if (match1) {
      return {
        original: match1[1].trim(),
        translated: match1[2].trim()
      };
    }
    
    // Pattern 2: English followed by Chinese
    const pattern2 = /^([a-zA-Z\s,.'!?;:()"-]+)\s*([\u4e00-\u9fa5\s，。！？；：、""''（）【】]+)$/;
    const match2 = text.match(pattern2);
    if (match2) {
      return {
        original: match2[2].trim(),
        translated: match2[1].trim()
      };
    }
    
    // Pattern 3: Try to split by sentence boundaries
    const sentences = text.split(/[.!?。！？]\s+/);
    if (sentences.length >= 2) {
      const firstPart = sentences[0];
      const secondPart = sentences.slice(1).join(' ');
      
      if (chineseRegex.test(firstPart) && englishRegex.test(secondPart)) {
        return {
          original: firstPart.trim(),
          translated: secondPart.trim()
        };
      } else if (englishRegex.test(firstPart) && chineseRegex.test(secondPart)) {
        return {
          original: secondPart.trim(),
          translated: firstPart.trim()
        };
      }
    }
  }
  
  return null;
}

export interface VideoExportOptions {
  format: 'horizontal' | 'vertical';
  quality: 'high' | 'medium' | 'low';
  includeSubtitles: boolean;
}

export interface ExportProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'complete';
  progress: number;
  message: string;
}

// Get font weight value
const getFontWeight = (weight: 'normal' | 'medium' | 'bold'): number => {
  switch (weight) {
    case 'bold': return 700;
    case 'medium': return 500;
    default: return 400;
  }
};

// Draw subtitle text on canvas
export function drawSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  subtitle: TranslatedSubtitle | null,
  style: SubtitleStyle,
  canvasWidth: number,
  canvasHeight: number,
  currentTime?: number
): void {
  if (!subtitle) return;

  // Check for translatedText field (from translation feature)
  const hasTranslatedText = subtitle.translatedText;
  // Check for mixed bilingual text in the main text field
  const splitResult = splitBilingualText(subtitle.text);
  
  const showOriginal = style.showOriginal;
  const showTranslation = style.showTranslation && (hasTranslatedText || splitResult);

  if (!showOriginal && !showTranslation) return;

  // Calculate animation state if currentTime is provided
  const subtitleDuration = subtitle.endTime - subtitle.startTime;
  const elapsedTime = currentTime ? Math.max(0, currentTime - subtitle.startTime) : subtitleDuration;

  // Determine original and translated text
  let originalTextRaw: string;
  let translatedTextRaw: string | undefined;

  if (hasTranslatedText) {
    // Use translatedText field
    originalTextRaw = subtitle.text;
    translatedTextRaw = subtitle.translatedText;
  } else if (splitResult) {
    // Use split bilingual text
    originalTextRaw = splitResult.original;
    translatedTextRaw = splitResult.translated;
  } else {
    // Only original text
    originalTextRaw = subtitle.text;
    translatedTextRaw = undefined;
  }

  // Apply text processing
  let originalText = normalizeSubtitleText(originalTextRaw);
  let translatedText = translatedTextRaw ? normalizeSubtitleText(translatedTextRaw) : undefined;

  if (style.removePunctuation) {
    originalText = removePunctuationFromText(originalText);
    if (translatedText) {
      translatedText = removePunctuationFromText(translatedText);
    }
  }

  // Apply animation effects
  const originalAnimated = getAnimatedTextForCanvas(
    originalText,
    style.effect,
    style.effectSpeed,
    elapsedTime,
    subtitleDuration
  );
  const translatedAnimated = translatedText ? getAnimatedTextForCanvas(
    translatedText,
    style.effect,
    style.effectSpeed,
    elapsedTime,
    subtitleDuration
  ) : { displayText: '', scrollOffset: 0 };

  // Calculate position
  const padding = 20;
  const lineHeight = 1.4;
  let yPosition: number;

  // Prepare text lines with animation
  const lines: Array<{ 
    text: string; 
    fontSize: number; 
    color: string; 
    fontWeight: number; 
    fontFamily: string;
    isTranslation: boolean;
    scrollOffset?: number;
  }> = [];
  
  const isTranslationAbove = style.translationPosition === 'above';

  if (isTranslationAbove && showTranslation && translatedText) {
    lines.push({
      text: translatedAnimated.displayText,
      fontSize: style.translationFontSize * 2, // 乘以2倍
      color: style.translationFontColor,
      fontWeight: getFontWeight(style.translationFontWeight),
      fontFamily: getFontFamilyCSS(style.translationFontFamily),
      isTranslation: true,
      scrollOffset: translatedAnimated.scrollOffset,
    });
  }

  if (showOriginal) {
    lines.push({
      text: originalAnimated.displayText,
      fontSize: style.fontSize * 2, // 乘以2倍
      color: style.fontColor,
      fontWeight: getFontWeight(style.fontWeight),
      fontFamily: getFontFamilyCSS(style.fontFamily),
      isTranslation: false,
      scrollOffset: originalAnimated.scrollOffset,
    });
  }

  if (!isTranslationAbove && showTranslation && translatedText) {
    lines.push({
      text: translatedAnimated.displayText,
      fontSize: style.translationFontSize * 2, // 乘以2倍
      color: style.translationFontColor,
      fontWeight: getFontWeight(style.translationFontWeight),
      fontFamily: getFontFamilyCSS(style.translationFontFamily),
      isTranslation: true,
      scrollOffset: translatedAnimated.scrollOffset,
    });
  }

  // Calculate total height
  const totalHeight = lines.reduce((sum, line, i) => {
    return sum + line.fontSize * lineHeight + (i > 0 ? 8 : 0);
  }, 0);

  // Calculate Y position based on style.position
  switch (style.position) {
    case 'top':
      yPosition = padding + totalHeight / 2;
      break;
    case 'center':
      yPosition = canvasHeight / 2;
      break;
    default: // bottom
      yPosition = canvasHeight - padding - totalHeight / 2 - 40; // Extra padding for controls
  }

  // Calculate background dimensions
  const maxWidth = canvasWidth * 0.85;
  let bgWidth = 0;

  lines.forEach(line => {
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
    const textWidth = ctx.measureText(line.text).width;
    bgWidth = Math.max(bgWidth, Math.min(textWidth + 40, maxWidth));
  });

  const bgHeight = totalHeight + 20;
  const bgX = (canvasWidth - bgWidth) / 2;
  const bgY = yPosition - bgHeight / 2;

  // Draw background
  const bgOpacity = style.backgroundOpacity / 100;
  ctx.fillStyle = hexToRgba(style.backgroundColor, bgOpacity);
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 8);
  ctx.fill();

  // Draw text lines with animation
  let currentY = bgY + 15;
  
  lines.forEach((line, i) => {
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const textY = currentY;
    // Calculate x position with scroll offset
    let textX = canvasWidth / 2;
    if (line.scrollOffset && line.scrollOffset > 0) {
      // Apply scroll effect: scrollOffset 100 = fully right (off screen), 0 = centered
      const scrollDistance = canvasWidth * (line.scrollOffset / 100);
      textX = canvasWidth / 2 + scrollDistance;
    }
    
    // Apply text effects based on style
    const textStroke = line.isTranslation ? style.translationTextStroke : style.textStroke;
    const textStrokeWidth = line.isTranslation ? style.translationTextStrokeWidth : style.textStrokeWidth;
    const textStrokeColor = line.isTranslation ? style.translationTextStrokeColor : style.textStrokeColor;
    const textShadow = line.isTranslation ? style.translationTextShadow : style.textShadow;
    const textShadowBlur = line.isTranslation ? style.translationTextShadowBlur : style.textShadowBlur;
    const textShadowColor = line.isTranslation ? style.translationTextShadowColor : style.textShadowColor;
    const textShadowOffsetX = line.isTranslation ? style.translationTextShadowOffsetX : style.textShadowOffsetX;
    const textShadowOffsetY = line.isTranslation ? style.translationTextShadowOffsetY : style.textShadowOffsetY;
    
    // Draw shadow first (if enabled)
    if (textShadow) {
      ctx.save();
      ctx.shadowColor = textShadowColor;
      ctx.shadowBlur = textShadowBlur * 2; // Scale for canvas
      ctx.shadowOffsetX = textShadowOffsetX * 2;
      ctx.shadowOffsetY = textShadowOffsetY * 2;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, textX, textY, maxWidth - 40);
      ctx.restore();
    }
    
    // Draw stroke (if enabled)
    if (textStroke) {
      ctx.strokeStyle = textStrokeColor;
      ctx.lineWidth = textStrokeWidth * 2; // Scale for canvas
      ctx.lineJoin = 'round';
      ctx.strokeText(line.text, textX, textY, maxWidth - 40);
    }
    
    // Draw main text
    ctx.fillStyle = line.color;
    if (!textShadow) { // Only draw if shadow wasn't already drawn
      ctx.fillText(line.text, textX, textY, maxWidth - 40);
    }
    
    // Move to next line position
    currentY += line.fontSize * lineHeight + (i < lines.length - 1 ? 12 : 0); // Add spacing between lines
  });
}

// Helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Find subtitle at given time
export function findSubtitleAtTime(
  subtitles: TranslatedSubtitle[],
  time: number
): TranslatedSubtitle | null {
  return subtitles.find(sub => time >= sub.startTime && time <= sub.endTime) || null;
}

// Export SRT with bilingual options
export function exportBilingualSRT(
  subtitles: TranslatedSubtitle[],
  options: {
    includeOriginal: boolean;
    includeTranslation: boolean;
    translationPosition: 'above' | 'below';
  }
): string {
  const { includeOriginal, includeTranslation, translationPosition } = options;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  return subtitles.map((sub, index) => {
    const lines: string[] = [];
    lines.push(String(index + 1));
    lines.push(`${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}`);

    // Check for translatedText field or split bilingual text
    const hasTranslatedText = sub.translatedText;
    const splitResult = splitBilingualText(sub.text);
    
    let originalText: string;
    let translatedText: string | undefined;

    if (hasTranslatedText) {
      originalText = sub.text;
      translatedText = sub.translatedText;
    } else if (splitResult) {
      originalText = splitResult.original;
      translatedText = splitResult.translated;
    } else {
      originalText = sub.text;
      translatedText = undefined;
    }

    const hasTranslation = translatedText !== undefined;
    
    if (translationPosition === 'above' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(translatedText!));
    }
    
    if (includeOriginal) {
      lines.push(normalizeSubtitleText(originalText));
    }
    
    if (translationPosition === 'below' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(translatedText!));
    }

    return lines.join('\n');
  }).join('\n\n');
}

// Export VTT with bilingual options
export function exportBilingualVTT(
  subtitles: TranslatedSubtitle[],
  options: {
    includeOriginal: boolean;
    includeTranslation: boolean;
    translationPosition: 'above' | 'below';
  }
): string {
  const { includeOriginal, includeTranslation, translationPosition } = options;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const lines: string[] = ['WEBVTT', ''];

  subtitles.forEach((sub, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}`);

    // Check for translatedText field or split bilingual text
    const hasTranslatedText = sub.translatedText;
    const splitResult = splitBilingualText(sub.text);
    
    let originalText: string;
    let translatedText: string | undefined;

    if (hasTranslatedText) {
      originalText = sub.text;
      translatedText = sub.translatedText;
    } else if (splitResult) {
      originalText = splitResult.original;
      translatedText = splitResult.translated;
    } else {
      originalText = sub.text;
      translatedText = undefined;
    }

    const hasTranslation = translatedText !== undefined;
    
    if (translationPosition === 'above' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(translatedText!));
    }
    
    if (includeOriginal) {
      lines.push(normalizeSubtitleText(originalText));
    }
    
    if (translationPosition === 'below' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(translatedText!));
    }

    lines.push('');
  });

  return lines.join('\n');
}
