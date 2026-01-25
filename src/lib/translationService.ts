import type { Subtitle } from './subtitleParser';

export interface TranslatedSubtitle extends Subtitle {
  translatedText?: string;
}

export interface TranslationOptions {
  targetLanguage: string;
  sourceLanguage?: string;
}

export const TRANSLATION_LANGUAGES = [
  { code: 'en', name: '英语' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'it', name: '意大利语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' },
];

const BATCH_SIZE = 20; // Translate 20 subtitles at a time

export async function translateSubtitles(
  subtitles: Subtitle[],
  options: TranslationOptions,
  onProgress?: (progress: number) => void
): Promise<TranslatedSubtitle[]> {
  const { targetLanguage, sourceLanguage } = options;
  const result: TranslatedSubtitle[] = [];
  
  // Process in batches
  for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
    const batch = subtitles.slice(i, i + BATCH_SIZE);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        subtitles: batch,
        targetLanguage,
        sourceLanguage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '翻译失败');
    }

    const data = await response.json();
    result.push(...data.translatedSubtitles);
    
    // Update progress
    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + batch.length) / subtitles.length) * 100)));
    }
  }

  return result;
}
