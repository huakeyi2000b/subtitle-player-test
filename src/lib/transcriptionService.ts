import { supabase } from '@/integrations/supabase/client';
import type { Subtitle } from './subtitleParser';
import { getStoredApiKey } from '@/components/SettingsDialog';

interface TranscriptionWord {
  text: string;
  start: number;
  end: number;
  speaker?: string;
}

interface TranscriptionResponse {
  text: string;
  words: TranscriptionWord[];
}

// Sentence-ending punctuation marks (Chinese and English)
const SENTENCE_END_MARKS = /[。？！.?!]/;
// Clause-ending punctuation marks for natural breaks
const CLAUSE_END_MARKS = /[，、；：,;:]/;

// Normalize subtitle text: remove unnecessary spaces while keeping proper word spacing
export function normalizeSubtitleText(text: string): string {
  // Remove spaces before punctuation (both English and Chinese)
  text = text.replace(/\s+([,.!?;:。，！？；：、·…—–\-\)\]）】」』'"])/g, '$1');
  // Remove spaces after opening punctuation
  text = text.replace(/([\(\[（【「『'""])\s+/g, '$1');
  // Remove ALL spaces between Chinese characters (including CJK punctuation)
  text = text.replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1$2');
  // Apply the Chinese space removal multiple times to catch consecutive characters
  while (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]\s+[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(text)) {
    text = text.replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1$2');
  }
  // Collapse multiple spaces into one
  text = text.replace(/\s{2,}/g, ' ');
  return text.trim();
}

// Check if a word ends a sentence
function endsWithSentencePunctuation(text: string): boolean {
  return SENTENCE_END_MARKS.test(text.slice(-1));
}

// Check if a word ends a clause
function endsWithClausePunctuation(text: string): boolean {
  return CLAUSE_END_MARKS.test(text.slice(-1));
}

// Group words into subtitle segments based on timing and sentence structure
// Priority: complete sentences > clause breaks > word limits > time limits
function groupWordsIntoSubtitles(words: TranscriptionWord[], maxDuration = 5, maxWords = 15): Subtitle[] {
  const subtitles: Subtitle[] = [];
  let currentWords: TranscriptionWord[] = [];
  let subtitleId = 1;

  const createSubtitle = () => {
    if (currentWords.length === 0) return;
    
    // Join words with proper spacing based on language
    let text = currentWords.map(w => w.text).join(' ');
    
    // Normalize subtitle text for proper display
    text = normalizeSubtitleText(text);
    
    subtitles.push({
      id: subtitleId++,
      startTime: currentWords[0].start,
      endTime: currentWords[currentWords.length - 1].end,
      text: text.trim(),
    });
    currentWords = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);
    
    const duration = word.end - currentWords[0].start;
    const wordCount = currentWords.length;
    
    // Check for sentence end - always break on complete sentences
    if (endsWithSentencePunctuation(word.text)) {
      createSubtitle();
      continue;
    }
    
    // Check for clause end when approaching limits
    if (endsWithClausePunctuation(word.text) && (duration >= maxDuration * 0.7 || wordCount >= maxWords * 0.7)) {
      createSubtitle();
      continue;
    }
    
    // Hard limits: break only if absolutely necessary
    if (duration >= maxDuration || wordCount >= maxWords) {
      // Look ahead to find a better break point (clause or sentence end within next 3 words)
      let breakIndex = -1;
      for (let j = i; j < Math.min(i + 3, words.length); j++) {
        if (endsWithSentencePunctuation(words[j].text) || endsWithClausePunctuation(words[j].text)) {
          breakIndex = j;
          break;
        }
      }
      
      // If found a better break point nearby, continue to it
      if (breakIndex > i && breakIndex - i <= 2) {
        continue;
      }
      
      // Otherwise, force break at current position
      createSubtitle();
    }
  }
  
  // Add remaining words
  createSubtitle();
  
  return subtitles;
}

export async function transcribeAudio(
  audioFile: File,
  languageCode: string = 'auto',
  onProgress?: (status: string) => void
): Promise<Subtitle[]> {
  onProgress?.('正在准备音频文件...');
  
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('language_code', languageCode);
  
  // Check for locally stored API key
  const localApiKey = getStoredApiKey();
  if (localApiKey) {
    formData.append('api_key', localApiKey);
  }
  
  onProgress?.('正在上传并转录...');
  
  const { data, error } = await supabase.functions.invoke('transcribe', {
    body: formData,
  });
  
  if (error) {
    console.error('Transcription error:', error);
    throw new Error(error.message || '转录失败');
  }
  
  if (!data || !data.words) {
    throw new Error('无法获取转录结果');
  }
  
  onProgress?.('正在生成字幕...');
  
  const transcription = data as TranscriptionResponse;
  const subtitles = groupWordsIntoSubtitles(transcription.words);
  
  return subtitles;
}

// Extract audio from video file
export async function extractAudioFromVideo(videoFile: File): Promise<File> {
  // For now, we'll send the video directly - ElevenLabs can handle video files
  // In a more advanced implementation, we could use Web Audio API to extract audio
  return videoFile;
}
