import type { TranslatedSubtitle } from './translationService';
import type { SubtitleStyle } from '@/components/SubtitleStyleSettings';
import { getFontFamilyCSS } from '@/components/SubtitleStyleSettings';
import { normalizeSubtitleText } from './transcriptionService';

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
  canvasHeight: number
): void {
  if (!subtitle) return;

  const hasTranslatedText = subtitle.translatedText;
  const showOriginal = style.showOriginal;
  const showTranslation = style.showTranslation && hasTranslatedText;

  if (!showOriginal && !showTranslation) return;

  // Calculate position
  const padding = 20;
  const lineHeight = 1.4;
  let yPosition: number;

  // Prepare text lines
  const lines: Array<{ text: string; fontSize: number; color: string; fontWeight: number; fontFamily: string }> = [];
  
  const isTranslationAbove = style.translationPosition === 'above';

  if (isTranslationAbove && showTranslation && subtitle.translatedText) {
    lines.push({
      text: normalizeSubtitleText(subtitle.translatedText),
      fontSize: style.translationFontSize * 2, // 乘以2倍
      color: style.translationFontColor,
      fontWeight: getFontWeight(style.translationFontWeight),
      fontFamily: getFontFamilyCSS(style.translationFontFamily),
    });
  }

  if (showOriginal) {
    lines.push({
      text: normalizeSubtitleText(subtitle.text),
      fontSize: style.fontSize * 2, // 乘以2倍
      color: style.fontColor,
      fontWeight: getFontWeight(style.fontWeight),
      fontFamily: getFontFamilyCSS(style.fontFamily),
    });
  }

  if (!isTranslationAbove && showTranslation && subtitle.translatedText) {
    lines.push({
      text: normalizeSubtitleText(subtitle.translatedText),
      fontSize: style.translationFontSize * 2, // 乘以2倍
      color: style.translationFontColor,
      fontWeight: getFontWeight(style.translationFontWeight),
      fontFamily: getFontFamilyCSS(style.translationFontFamily),
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

  // Draw text lines
  let currentY = bgY + 15;
  
  lines.forEach((line, i) => {
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
    ctx.fillStyle = line.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const textY = currentY + (i > 0 ? 8 : 0);
    ctx.fillText(line.text, canvasWidth / 2, textY, maxWidth - 40);
    
    currentY = textY + line.fontSize * lineHeight;
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

    const hasTranslation = sub.translatedText;
    
    if (translationPosition === 'above' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(sub.translatedText!));
    }
    
    if (includeOriginal) {
      lines.push(normalizeSubtitleText(sub.text));
    }
    
    if (translationPosition === 'below' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(sub.translatedText!));
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

    const hasTranslation = sub.translatedText;
    
    if (translationPosition === 'above' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(sub.translatedText!));
    }
    
    if (includeOriginal) {
      lines.push(normalizeSubtitleText(sub.text));
    }
    
    if (translationPosition === 'below' && includeTranslation && hasTranslation) {
      lines.push(normalizeSubtitleText(sub.translatedText!));
    }

    lines.push('');
  });

  return lines.join('\n');
}
