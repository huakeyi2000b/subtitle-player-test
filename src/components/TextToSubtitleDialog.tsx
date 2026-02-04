import { useState } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getStoredApiKey } from '@/components/SettingsDialog';
import type { Subtitle } from '@/lib/subtitleParser';

const LANGUAGES = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh', name: '中文' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'ar', name: '阿拉伯语' },
];

interface TextToSubtitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  audioFile: File | null;
  videoDuration: number;
  existingSubtitles: Subtitle[];
  onGenerated: (subtitles: Subtitle[]) => void;
}

export function TextToSubtitleDialog({ 
  isOpen, 
  onClose, 
  audioFile, 
  videoDuration,
  existingSubtitles,
  onGenerated 
}: TextToSubtitleDialogProps) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'correct' | 'generate'>('correct');
  const [useShortSubtitles, setUseShortSubtitles] = useState(false);

  // Determine default mode based on existing subtitles
  const hasExistingSubtitles = existingSubtitles.length > 0;

  // Calculate text similarity using Levenshtein distance
  const calculateSimilarity = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
  };

  // Clean text for comparison
  const cleanTextForComparison = (text: string): string => {
    return text
      .replace(/[，。！？；：、""''（）【】,.!?;:()"'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Smart text segmentation function (restored original for song compatibility)
  const smartTextSegmentation = (text: string): string[] => {
    // Clean and normalize text
    const cleanText = text
      .replace(/第\s*\d+\s*段[:：]\s*/g, '') // Remove paragraph markers
      .replace(/^\d+[.、]\s*/gm, '') // Remove numbered lists
      .trim();

    if (!cleanText) return [];

    // Check if text has line breaks - prioritize them for segmentation
    const hasLineBreaks = /\n/.test(cleanText);
    
    if (hasLineBreaks) {
      // Split by line breaks first
      const lines = cleanText.split(/\n+/).filter(line => line.trim().length > 0);
      
      // If lines are reasonable length, use them directly
      const reasonableLines = [];
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) return;
        
        // If line is too long (>80 chars), try to split it further
        if (trimmedLine.length > 80) {
          // Try to split by punctuation first
          const punctSplit = [];
          let current = '';
          
          for (let i = 0; i < trimmedLine.length; i++) {
            const char = trimmedLine[i];
            current += char;
            
            if (/[。！？；，.!?;,]/.test(char) && current.trim().length > 10) {
              punctSplit.push(current.trim());
              current = '';
            }
          }
          
          if (current.trim().length > 0) {
            punctSplit.push(current.trim());
          }
          
          // If punctuation split worked, use it
          if (punctSplit.length > 1) {
            reasonableLines.push(...punctSplit);
          } else {
            // Force split by character count (every 40-50 chars)
            for (let i = 0; i < trimmedLine.length; i += 45) {
              const chunk = trimmedLine.slice(i, i + 45).trim();
              if (chunk.length > 0) {
                reasonableLines.push(chunk);
              }
            }
          }
        } else {
          reasonableLines.push(trimmedLine);
        }
      });
      
      return reasonableLines;
    }
    
    // No line breaks - check for punctuation
    const hasPunctuation = /[。！？；，.!?;,]/.test(cleanText);
    
    if (hasPunctuation) {
      // Split by punctuation
      const segments = [];
      let currentSentence = '';
      
      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        currentSentence += char;
        
        if (/[。！？；，.!?;,]/.test(char)) {
          const trimmed = currentSentence.trim();
          if (trimmed.length > 0) {
            segments.push(trimmed);
          }
          currentSentence = '';
        }
      }
      
      if (currentSentence.trim().length > 0) {
        segments.push(currentSentence.trim());
      }
      
      return segments.filter(s => s.length > 0);
    }
    
    // No punctuation and no line breaks - force split by character count
    // This handles cases like continuous text without any separators
    const segments = [];
    const maxCharsPerSegment = 40; // Reasonable reading length
    
    for (let i = 0; i < cleanText.length; i += maxCharsPerSegment) {
      let segment = cleanText.slice(i, i + maxCharsPerSegment);
      
      // Try to break at word boundaries if possible
      if (i + maxCharsPerSegment < cleanText.length) {
        const spaceIndex = segment.lastIndexOf(' ');
        if (spaceIndex > maxCharsPerSegment * 0.7) {
          segment = segment.slice(0, spaceIndex);
        }
      }
      
      const trimmed = segment.trim();
      if (trimmed.length > 0) {
        segments.push(trimmed);
      }
    }
    
    return segments;
  };

  // Correct subtitles using user-provided text
  const correctSubtitlesWithText = (text: string, existingSubtitles: Subtitle[]): Subtitle[] => {
    if (!text.trim() || existingSubtitles.length === 0) {
      return existingSubtitles;
    }
    
    const textSegments = smartTextSegmentation(text.trim());
    
    if (textSegments.length === 0) {
      return existingSubtitles;
    }
    
    const correctedSubtitles = [...existingSubtitles];
    
    // If we have roughly the same number of segments as subtitles, do 1:1 mapping
    if (Math.abs(textSegments.length - existingSubtitles.length) <= existingSubtitles.length * 0.3) {
      const ratio = textSegments.length / existingSubtitles.length;
      
      correctedSubtitles.forEach((subtitle, index) => {
        const segmentIndex = Math.floor(index * ratio);
        if (segmentIndex < textSegments.length) {
          const newText = textSegments[segmentIndex].trim();
          if (newText) {
            subtitle.text = newText;
          }
        }
      });
    } else {
      // Similarity-based matching for different lengths
      const usedSegments = new Set<number>();
      
      correctedSubtitles.forEach((subtitle) => {
        let bestMatch = -1;
        let bestSimilarity = 0;
        
        const cleanSubtitle = cleanTextForComparison(subtitle.text);
        
        textSegments.forEach((segment, segmentIndex) => {
          if (usedSegments.has(segmentIndex)) return;
          
          const cleanSegment = cleanTextForComparison(segment);
          const similarity = calculateSimilarity(cleanSubtitle, cleanSegment);
          
          if (similarity > bestSimilarity && similarity > 0.3) {
            bestSimilarity = similarity;
            bestMatch = segmentIndex;
          }
        });
        
        if (bestMatch >= 0) {
          subtitle.text = textSegments[bestMatch].trim();
          usedSegments.add(bestMatch);
        }
      });
    }
    
    return correctedSubtitles;
  };

  // Convert text to subtitles using AI
  const convertTextToSubtitles = async (
    text: string,
    audioFile: File,
    languageCode: string = 'auto',
    onProgress?: (status: string) => void
  ): Promise<Subtitle[]> => {
    onProgress?.('正在分析文本...');

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('text', text);
    formData.append('language_code', languageCode);

    const localApiKey = getStoredApiKey();
    if (localApiKey) {
        formData.append('api_key', localApiKey);
    }

    onProgress?.('正在生成字幕时间轴...');

    try {
        const { data, error } = await supabase.functions.invoke('text-to-subtitle', {
            body: formData,
        });

        if (error) {
            console.error('文本转字幕错误:', error);
            throw new Error(error.message || '文本转字幕失败');
        }

        if (!data || !data.subtitles) {
            throw new Error('无法生成字幕');
        }

        onProgress?.('字幕生成完成');
        return data.subtitles as Subtitle[];
    } catch (error) {
        console.error('文本转字幕转换失败:', error);
        throw error;
    }
  };

  const splitTextToSubtitlesInternal = (text: string, videoDuration: number): Subtitle[] => {
    console.log('Input text for splitting:', text);
    
    const cleanText = text.replace(/第\s*\d+\s*段[:：]\s*/g, '').replace(/^\d+[.、]\s*/gm, '').trim();
    console.log('Cleaned text:', cleanText);
    
    // First check for line breaks
    const hasLineBreaks = /\n/.test(cleanText);
    
    if (hasLineBreaks) {
        console.log('Found line breaks, splitting by lines');
        const lines = cleanText.split(/\n+/).filter(line => line.trim().length > 0);
        console.log('Lines:', lines);
        
        if (lines.length > 1) {
            const subtitles: Subtitle[] = [];
            const timePerLine = videoDuration / lines.length;

            lines.forEach((line, index) => {
                const startTime = index * timePerLine;
                const endTime = (index + 1) * timePerLine;

                subtitles.push({
                    id: index + 1,
                    startTime: Math.max(0, startTime),
                    endTime: Math.min(videoDuration, endTime),
                    text: line.trim()
                });
            });

            return subtitles;
        }
    }
    
    // If no line breaks, try punctuation
    const sentences = [];
    let currentSentence = '';

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        currentSentence += char;
        if (/[。！？；，.!?;,]/.test(char)) {
            const trimmed = currentSentence.trim();
            if (trimmed.length > 0) {
                sentences.push(trimmed);
            }
            currentSentence = '';
        }
    }

    if (currentSentence.trim().length > 0) {
        sentences.push(currentSentence.trim());
    }

    console.log('Initial sentences:', sentences);

    // If no punctuation found, force split by character count
    if (sentences.length <= 1 && cleanText.length > 50) {
        console.log('No punctuation found, force splitting by character count');
        const segments = [];
        const maxCharsPerSegment = 40;
        
        for (let i = 0; i < cleanText.length; i += maxCharsPerSegment) {
            let segment = cleanText.slice(i, i + maxCharsPerSegment);
            
            // Try to break at space if possible
            if (i + maxCharsPerSegment < cleanText.length) {
                const spaceIndex = segment.lastIndexOf(' ');
                if (spaceIndex > maxCharsPerSegment * 0.7) {
                    segment = segment.slice(0, spaceIndex);
                }
            }
            
            const trimmed = segment.trim();
            if (trimmed.length > 0) {
                segments.push(trimmed);
            }
        }
        
        console.log('Force split segments:', segments);
        
        if (segments.length > 0) {
            const subtitles: Subtitle[] = [];
            const timePerSegment = videoDuration / segments.length;

            segments.forEach((segment, index) => {
                const startTime = index * timePerSegment;
                const endTime = (index + 1) * timePerSegment;

                subtitles.push({
                    id: index + 1,
                    startTime: Math.max(0, startTime),
                    endTime: Math.min(videoDuration, endTime),
                    text: segment.trim()
                });
            });

            return subtitles;
        }
    }

    const filteredSentences = sentences.filter(s => s.length > 0);
    const mergedSentences = [];
    for (let i = 0; i < filteredSentences.length; i++) {
        const sentence = filteredSentences[i];
        if (/^[。！？；，.!?;,""''""'']+$/.test(sentence) && mergedSentences.length > 0) {
            mergedSentences[mergedSentences.length - 1] += sentence;
        } else {
            mergedSentences.push(sentence);
        }
    }

    console.log('Final merged sentences:', mergedSentences);

    if (mergedSentences.length === 0) {
        return [];
    }

    const subtitles: Subtitle[] = [];
    const timePerSentence = videoDuration / mergedSentences.length;

    mergedSentences.forEach((sentence, index) => {
        const trimmedSentence = sentence.trim();
        const startTime = index * timePerSentence;
        const endTime = (index + 1) * timePerSentence;

        subtitles.push({
            id: subtitles.length + 1,
            startTime: Math.max(0, startTime),
            endTime: Math.min(videoDuration, endTime),
            text: trimmedSentence
        });
    });

    return subtitles;
  };

  // 专门用于播音短字幕的函数 - 智能句逗断句 + 空格分段
  const splitSpeechToShortSubtitles = (text: string, videoDuration: number): Subtitle[] => {
    console.log('Creating intelligent short subtitles for speech:', text);
    
    const cleanText = text.replace(/第\s*\d+\s*段[:：]\s*/g, '').replace(/^\d+[.、]\s*/gm, '').trim();
    
    const segments = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        current += char;
        
        // Track quote state - keep quoted content together
        if ((char === '"' || char === '"' || char === '"') && !inQuotes) {
            inQuotes = true;
        } else if ((char === '"' || char === '"' || char === '"') && inQuotes) {
            inQuotes = false;
            // Always keep quoted content as one segment
            segments.push(current.trim());
            current = '';
            continue;
        }
        
        // Smart sentence and comma breaking (only when not in quotes)
        if (!inQuotes) {
            // Break on multiple spaces (空格分段)
            if (/\s{2,}/.test(current)) {
                // Found multiple spaces, split here
                const beforeSpaces = current.replace(/\s{2,}.*$/, '').trim();
                if (beforeSpaces.length > 0) {
                    segments.push(beforeSpaces);
                }
                current = current.replace(/^.*?\s{2,}/, '').trim();
                if (current.length > 0) {
                    current = current + (i < cleanText.length - 1 ? '' : '');
                } else {
                    current = '';
                }
                continue;
            }
            
            // Break on sentence endings (句号断句)
            if (/[。！？.!?]/.test(char)) {
                segments.push(current.trim());
                current = '';
            }
            // Break on commas for longer segments (逗号断句) - more aggressive
            else if (/[，,]/.test(char)) {
                const trimmed = current.trim();
                // Break on comma if the segment is getting long (reduced threshold)
                if (trimmed.length >= 6) {
                    segments.push(trimmed);
                    current = '';
                }
                // If too short, continue building the segment
            }
            // Break on semicolons and other major punctuation
            else if (/[；;：:]/.test(char)) {
                segments.push(current.trim());
                current = '';
            }
            // Break on dashes (破折号断句)
            else if (/[——\-\-]/.test(char)) {
                segments.push(current.trim());
                current = '';
            }
            // Break on pause markers - more aggressive
            else if (/[、]/.test(char)) {
                const trimmed = current.trim();
                if (trimmed.length >= 4) {
                    segments.push(trimmed);
                    current = '';
                }
            }
        }
    }
    
    // Add remaining text
    if (current.trim().length > 0) {
        segments.push(current.trim());
    }
    
    // Post-process: clean up segments intelligently
    const finalSegments = [];
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (!segment.trim()) continue;
        
        // Merge standalone punctuation with previous segment
        if (/^[。！？；，.!?;,""''""''、：:（）()]+$/.test(segment) && finalSegments.length > 0) {
            finalSegments[finalSegments.length - 1] += segment;
        }
        // Merge very short segments (< 3 chars) with previous, unless it's a complete thought
        else if (segment.length < 3 && finalSegments.length > 0 && !/[。！？.!?]$/.test(segment)) {
            finalSegments[finalSegments.length - 1] += segment;
        }
        // Merge closing quotes that got separated
        else if (/^[""'']/.test(segment) && finalSegments.length > 0) {
            finalSegments[finalSegments.length - 1] += segment;
        }
        else {
            finalSegments.push(segment);
        }
    }
    
    const cleanSegments = finalSegments.filter(s => s.trim().length > 0);
    
    if (cleanSegments.length === 0) {
        return [];
    }

    const subtitles: Subtitle[] = [];
    const timePerSegment = videoDuration / cleanSegments.length;

    cleanSegments.forEach((segment, index) => {
        const startTime = index * timePerSegment;
        const endTime = (index + 1) * timePerSegment;

        subtitles.push({
            id: index + 1,
            startTime: Math.max(0, startTime),
            endTime: Math.min(videoDuration, endTime),
            text: segment.trim()
        });
    });

    console.log(`Generated ${subtitles.length} intelligent short subtitles with space segmentation`);
    return subtitles;
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('请输入文本内容');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      let subtitles: Subtitle[];

      if (mode === 'correct' && hasExistingSubtitles) {
        // Correct existing subtitles
        setProgress(25);
        subtitles = correctSubtitlesWithText(text.trim(), existingSubtitles);
        setProgress(100);
        
        toast.success(`成功修正 ${subtitles.length} 条字幕`);
      } else if (mode === 'generate' && audioFile) {
        // Use transcribe API to get AI subtitles, then replace text content
        try {
          setProgress(25);
          
          // Get AI subtitles using transcribe API
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('language_code', language === 'auto' ? 'auto' : language);
          
          const localApiKey = getStoredApiKey();
          if (localApiKey) {
            formData.append('api_key', localApiKey);
          }
          
          const { data, error } = await supabase.functions.invoke('transcribe', {
            body: formData,
          });
          
          if (error) throw error;
          if (!data || !data.words) throw new Error('无法获取转录结果');
          
          setProgress(50);
          
          // Create AI subtitles with improved timing logic
          const words = data.words;
          const aiSubtitles: Subtitle[] = [];
          let currentWords: any[] = [];
          let subtitleId = 1;
          
          const createSubtitle = () => {
            if (currentWords.length === 0) return;
            
            let aiText = currentWords.map(w => w.text).join(' ');
            
            aiSubtitles.push({
              id: subtitleId++,
              startTime: currentWords[0].start,
              endTime: currentWords[currentWords.length - 1].end,
              text: aiText.trim(),
            });
            currentWords = [];
          };

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const nextWord = words[i + 1];
            
            currentWords.push(word);
            
            const duration = word.end - currentWords[0].start;
            const wordCount = currentWords.length;
            
            // Calculate gap to next word
            const gapToNext = nextWord ? nextWord.start - word.end : 0;
            
            // Break conditions (improved)
            const shouldBreak = 
              // Natural sentence endings
              /[。！？.!?]/.test(word.text) ||
              // Long pause detected (>0.5s gap)
              gapToNext > 0.5 ||
              // Duration limit (4-6 seconds)
              duration >= 4 ||
              // Word count limit (10-20 words)
              wordCount >= 12 ||
              // Last word
              i === words.length - 1;
            
            if (shouldBreak) {
              createSubtitle();
            }
          }
          
          setProgress(75);
          
          // Now replace AI text with user text using sequence alignment
          const userSegments = useShortSubtitles ? 
            (() => {
              const shortSubtitles = splitSpeechToShortSubtitles(text.trim(), videoDuration);
              return shortSubtitles.map(sub => sub.text);
            })() :
            smartTextSegmentation(text.trim());
          
          if (userSegments && userSegments.length > 0) {
            // Use dynamic time warping-like alignment
            const finalSubtitles: Subtitle[] = [];
            
            // Simple character-level similarity for Chinese text
            const calculateTextSimilarity = (text1: string, text2: string): number => {
              const chars1 = Array.from(text1.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''));
              const chars2 = Array.from(text2.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''));
              
              if (chars1.length === 0 || chars2.length === 0) return 0;
              
              let matches = 0;
              const minLength = Math.min(chars1.length, chars2.length);
              
              // Check character overlap
              chars1.forEach(char1 => {
                if (chars2.includes(char1)) {
                  matches++;
                }
              });
              
              return matches / Math.max(chars1.length, chars2.length);
            };
            
            // Create alignment matrix
            const alignmentMatrix: number[][] = [];
            for (let i = 0; i < userSegments.length; i++) {
              alignmentMatrix[i] = [];
              for (let j = 0; j < aiSubtitles.length; j++) {
                alignmentMatrix[i][j] = calculateTextSimilarity(userSegments[i], aiSubtitles[j].text);
              }
            }
            
            // Find best alignment path using greedy approach
            const usedAI = new Set<number>();
            const alignments: Array<{userIndex: number, aiIndex: number}> = [];
            
            // First pass: find high-confidence matches
            for (let i = 0; i < userSegments.length; i++) {
              let bestAI = -1;
              let bestScore = 0;
              
              for (let j = 0; j < aiSubtitles.length; j++) {
                if (!usedAI.has(j) && alignmentMatrix[i][j] > bestScore && alignmentMatrix[i][j] > 0.3) {
                  bestScore = alignmentMatrix[i][j];
                  bestAI = j;
                }
              }
              
              if (bestAI !== -1) {
                alignments.push({ userIndex: i, aiIndex: bestAI });
                usedAI.add(bestAI);
              }
            }
            
            // Sort alignments by user index to maintain order
            alignments.sort((a, b) => a.userIndex - b.userIndex);
            
            // Fill in the gaps with interpolation
            let lastUserIndex = -1;
            let lastAIIndex = -1;
            
            alignments.forEach((alignment, index) => {
              const { userIndex, aiIndex } = alignment;
              
              // Fill gap before this alignment
              if (lastUserIndex !== -1 && userIndex > lastUserIndex + 1) {
                const gapUserStart = lastUserIndex + 1;
                const gapUserEnd = userIndex - 1;
                const gapAIStart = lastAIIndex + 1;
                const gapAIEnd = aiIndex - 1;
                
                const userGapSize = gapUserEnd - gapUserStart + 1;
                const aiGapSize = Math.max(1, gapAIEnd - gapAIStart + 1);
                
                for (let i = 0; i < userGapSize; i++) {
                  const userIdx = gapUserStart + i;
                  const aiIdx = gapAIStart + Math.floor((i / userGapSize) * aiGapSize);
                  const safeAIIdx = Math.min(Math.max(gapAIStart, aiIdx), Math.min(gapAIEnd, aiSubtitles.length - 1));
                  
                  if (safeAIIdx >= 0 && safeAIIdx < aiSubtitles.length) {
                    const aiSub = aiSubtitles[safeAIIdx];
                    finalSubtitles.push({
                      id: finalSubtitles.length + 1,
                      startTime: aiSub.startTime,
                      endTime: aiSub.endTime,
                      text: userSegments[userIdx]
                    });
                  }
                }
              }
              
              // Add the aligned segment
              const aiSub = aiSubtitles[aiIndex];
              finalSubtitles.push({
                id: finalSubtitles.length + 1,
                startTime: aiSub.startTime,
                endTime: aiSub.endTime,
                text: userSegments[userIndex]
              });
              
              lastUserIndex = userIndex;
              lastAIIndex = aiIndex;
            });
            
            // Handle remaining user segments at the beginning
            if (alignments.length > 0 && alignments[0].userIndex > 0) {
              const firstAlignment = alignments[0];
              for (let i = 0; i < firstAlignment.userIndex; i++) {
                const aiIdx = Math.min(i, firstAlignment.aiIndex - 1, aiSubtitles.length - 1);
                if (aiIdx >= 0) {
                  const aiSub = aiSubtitles[aiIdx];
                  finalSubtitles.unshift({
                    id: 0, // Will be renumbered
                    startTime: aiSub.startTime,
                    endTime: aiSub.endTime,
                    text: userSegments[i]
                  });
                }
              }
            }
            
            // Handle remaining user segments at the end
            if (alignments.length > 0 && lastUserIndex < userSegments.length - 1) {
              for (let i = lastUserIndex + 1; i < userSegments.length; i++) {
                const aiIdx = Math.min(lastAIIndex + (i - lastUserIndex), aiSubtitles.length - 1);
                if (aiIdx >= 0) {
                  const aiSub = aiSubtitles[aiIdx];
                  finalSubtitles.push({
                    id: finalSubtitles.length + 1,
                    startTime: aiSub.startTime,
                    endTime: aiSub.endTime,
                    text: userSegments[i]
                  });
                }
              }
            }
            
            // If no good alignments found, fall back to simple mapping
            if (finalSubtitles.length === 0) {
              const ratio = aiSubtitles.length / userSegments.length;
              userSegments.forEach((segment, index) => {
                const aiIndex = Math.min(Math.floor(index * ratio), aiSubtitles.length - 1);
                const aiSub = aiSubtitles[aiIndex];
                finalSubtitles.push({
                  id: index + 1,
                  startTime: aiSub.startTime,
                  endTime: aiSub.endTime,
                  text: segment
                });
              });
            }
            
            // Renumber IDs
            finalSubtitles.forEach((sub, index) => {
              sub.id = index + 1;
            });
            
            subtitles = finalSubtitles;
          } else {
            // No user segments, use AI subtitles
            subtitles = aiSubtitles;
          }
          
          setProgress(100);
          toast.success(`AI时间轴+用户文本生成 ${subtitles.length} 条字幕`);
          
        } catch (error) {
          console.error('AI生成失败，详细错误:', error);
          console.warn('AI生成失败，使用简单分割模式:', error);
          // Fallback to short subtitle splitting for speech
          setProgress(50);
          subtitles = useShortSubtitles ? 
            splitSpeechToShortSubtitles(text.trim(), videoDuration) :
            splitTextToSubtitlesInternal(text.trim(), videoDuration);
          setProgress(100);
          
          toast.success(`使用${useShortSubtitles ? '短字幕' : '简单'}模式生成 ${subtitles.length} 条字幕`);
        }
      } else if (mode === 'generate' && !audioFile) {
        // Use short subtitle splitting for speech content when no audio file
        setProgress(50);
        subtitles = useShortSubtitles ? 
          splitSpeechToShortSubtitles(text.trim(), videoDuration) :
          splitTextToSubtitlesInternal(text.trim(), videoDuration);
        setProgress(100);
        
        toast.success(`成功生成 ${subtitles.length} 条${useShortSubtitles ? '短' : ''}字幕`);
      } else {
        toast.error('请选择正确的模式或确保有必要的文件');
        return;
      }

      if (subtitles.length === 0) {
        toast.error('无法处理字幕，请检查文本内容');
        return;
      }

      onGenerated(subtitles);
      onClose();
      
      // Reset form
      setText('');
      setLanguage('auto');
      setProgress(0);
      setUseShortSubtitles(false);
    } catch (error) {
      console.error('Process subtitles error:', error);
      toast.error(error instanceof Error ? error.message : '处理字幕失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {hasExistingSubtitles ? '修正字幕错别字' : '文本转字幕'}
          </DialogTitle>
          <DialogDescription>
            {hasExistingSubtitles 
              ? '使用正确的文本内容修正现有字幕中的错别字'
              : '将文本内容转换为带时间轴的字幕'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {mode === 'correct' ? '正确的文本内容' : '文本内容'}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === 'correct' 
                  ? '请粘贴或输入正确的文本内容，用于修正现有字幕中的错别字...'
                  : '请粘贴或输入要转换为字幕的文本内容...'
              }
              className="min-h-[200px] bg-secondary border-border resize-none"
              disabled={isGenerating}
            />
            <div className="text-xs text-muted-foreground">
              {text.length} 个字符
            </div>
          </div>

          {/* Mode Selection */}
          {hasExistingSubtitles && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">处理模式</Label>
              <Select value={mode} onValueChange={(value: 'correct' | 'generate') => setMode(value)} disabled={isGenerating}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  side="bottom" 
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="bg-card border-border z-[100] max-h-[200px] overflow-y-auto"
                >
                  <SelectItem value="correct">修正错别字 - 保持现有时间轴</SelectItem>
                  <SelectItem value="generate">重新生成 - 重新生成时间轴</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {mode === 'correct' 
                  ? '保持现有时间轴，只修正文字内容（推荐）' 
                  : '使用AI重新生成字幕时间轴，无音频时使用简单分割'
                }
              </div>
            </div>
          )}

          {/* Short Subtitle Option - only for generate mode */}
          {mode === 'generate' && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">字幕类型</Label>
              <Select value={useShortSubtitles ? "short" : "normal"} onValueChange={(value) => setUseShortSubtitles(value === "short")} disabled={isGenerating}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  side="bottom" 
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="bg-card border-border z-[100] max-h-[200px] overflow-y-auto"
                >
                  <SelectItem value="normal">普通字幕 - 适合歌曲内容</SelectItem>
                  <SelectItem value="short">短字幕 - 适合播音内容</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {useShortSubtitles 
                  ? '短字幕：智能句逗断句，适合播音内容' 
                  : '普通字幕：保持原有分割逻辑，适合歌曲内容'
                }
              </div>
            </div>
          )}

          {/* Language Selection - only for generate mode */}
          {mode === 'generate' && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">语言</Label>
              <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  side="bottom" 
                  align="start"
                  sideOffset={4}
                  avoidCollisions={false}
                  className="bg-card border-border z-[100] max-h-[200px] overflow-y-auto"
                >
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Info */}
          <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
            {mode === 'correct' ? (
              <>
                <p>• 修正模式：保持现有字幕的时间轴，只替换文字内容</p>
                <p>• 自动匹配：使用智能算法将文本与现有字幕匹配</p>
                <p>• 纯前端处理：无需网络请求，处理速度快</p>
              </>
            ) : (
              <>
                <p>• 普通字幕：优先按换行符分割，其次按标点符号，适合歌曲</p>
                <p>• 短字幕：智能句逗断句和空格分段，适合播音内容</p>
                <p>• AI时间轴：有音频时使用AI生成精确时间轴</p>
                <p>• 容错处理：API失败时自动降级到简单模式</p>
              </>
            )}
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {mode === 'correct' ? '修正中...' : '生成中...'}
                </span>
                <span className="text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            取消
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !text.trim()}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'correct' ? '修正中...' : '生成中...'}
              </>
            ) : (
              <>
                {mode === 'correct' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {mode === 'correct' ? '修正字幕' : '生成字幕'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}