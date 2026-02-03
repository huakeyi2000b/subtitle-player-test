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
import { splitTextToSubtitles } from '@/lib/textToSubtitleService';
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

  // Split user text into segments - more aggressive splitting for shorter subtitles
  const splitTextIntoSegments = (text: string): string[] => {
    // Normalize and clean the text
    let normalizedText = text
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove paragraph markers like "第1段：", "第2段：", etc.
    normalizedText = normalizedText
      .replace(/第\s*\d+\s*段\s*[：:]/g, '') // Remove "第X段："
      .replace(/第\s*[一二三四五六七八九十]+\s*段\s*[：:]/g, '') // Remove "第X段：" with Chinese numbers
      .replace(/段落\s*\d+\s*[：:]/g, '') // Remove "段落X："
      .replace(/\d+\s*[\.、]\s*/g, '') // Remove "1. " or "1、"
      .replace(/[（(]\s*\d+\s*[）)]/g, '') // Remove "(1)" or "（1）"
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();

    if (!normalizedText) return [];

    const segments: string[] = [];
    
    // First split by all punctuation marks (more aggressive)
    const parts = normalizedText.split(/([.!?。！？,，；;])/);
    
    for (let i = 0; i < parts.length; i += 2) {
      const text = parts[i]?.trim();
      const punct = parts[i + 1] || '';
      
      if (text) {
        const fullText = text + punct;
        const words = fullText.split(/\s+/);
        
        // If text is longer than 10 words, split it further
        if (words.length > 10) {
          // Split into chunks of 8-10 words
          for (let j = 0; j < words.length; j += 9) {
            const chunk = words.slice(j, j + 9).join(' ');
            if (chunk.trim()) {
              segments.push(chunk.trim());
            }
          }
        } else if (fullText.trim()) {
          segments.push(fullText.trim());
        }
      }
    }
    
    // If no punctuation found, force split by word count
    if (segments.length === 0) {
      const words = normalizedText.split(/\s+/);
      for (let i = 0; i < words.length; i += 8) {
        const chunk = words.slice(i, i + 8).join(' ');
        if (chunk.trim()) {
          segments.push(chunk.trim());
        }
      }
    }
    
    // Final pass: ensure no segment is too long and clean up
    const finalSegments: string[] = [];
    
    segments.forEach(segment => {
      // Additional cleanup for each segment
      let cleanSegment = segment
        .replace(/^[：:]\s*/, '') // Remove leading colons
        .replace(/^\s*[,，]\s*/, '') // Remove leading commas
        .trim();
      
      if (!cleanSegment) return;
      
      const words = cleanSegment.split(/\s+/);
      if (words.length > 10) {
        // Force split long segments into smaller chunks
        for (let i = 0; i < words.length; i += 8) {
          const chunk = words.slice(i, i + 8).join(' ');
          if (chunk.trim()) {
            finalSegments.push(chunk.trim());
          }
        }
      } else {
        finalSegments.push(cleanSegment);
      }
    });
    
    return finalSegments.filter(s => s.trim().length > 0);
  };

  // Correct subtitles using user-provided text
  const correctSubtitlesWithText = (text: string, existingSubtitles: Subtitle[]): Subtitle[] => {
    if (!text.trim() || existingSubtitles.length === 0) {
      return existingSubtitles;
    }
    
    const textSegments = splitTextIntoSegments(text.trim());
    
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
    
    // Prepare form data
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('text', text);
    formData.append('language_code', languageCode);
    
    // Check for locally stored API key
    const localApiKey = getStoredApiKey();
    if (localApiKey) {
      formData.append('api_key', localApiKey);
    }
    
    onProgress?.('正在生成字幕时间轴...');
    
    const { data, error } = await supabase.functions.invoke('text-to-subtitle', {
      body: formData,
    });
    
    if (error) {
      console.error('Text to subtitle error:', error);
      throw new Error(error.message || '文本转字幕失败');
    }
    
    if (!data || !data.subtitles) {
      throw new Error('无法生成字幕');
    }
    
    onProgress?.('字幕生成完成');
    
    return data.subtitles as Subtitle[];
  };

  // Simple text splitting fallback - use our improved logic with punctuation merging
  const splitTextToSubtitlesInternal = (
    text: string,
    videoDuration: number,
    maxWordsPerSubtitle: number = 8
  ): Subtitle[] => {
    // 清理文本，移除段落标记
    const cleanText = text
        .replace(/第\s*\d+\s*段[:：]\s*/g, '')
        .replace(/^\d+[.、]\s*/gm, '')
        .trim();

    // 按中文标点符号分割句子，包括逗号，但保留标点符号
    const sentences = [];
    let currentSentence = '';
    
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        currentSentence += char;
        
        // 如果遇到分割标点符号
        if (/[。！？；，.!?;,]/.test(char)) {
            const trimmed = currentSentence.trim();
            if (trimmed.length > 0) {
                sentences.push(trimmed);
            }
            currentSentence = '';
        }
    }
    
    // 添加剩余的文本
    if (currentSentence.trim().length > 0) {
        sentences.push(currentSentence.trim());
    }
    
    const filteredSentences = sentences.filter(s => s.length > 0);

    // 合并单独的标点符号到前一条
    const mergedSentences = [];
    for (let i = 0; i < filteredSentences.length; i++) {
        const sentence = filteredSentences[i];
        
        // 检测单独的标点符号：长度为1且字符码在标点符号范围内
        const charCode = sentence.charCodeAt(0);
        const isPunctOnly = sentence.length === 1 && (
            (charCode >= 8216 && charCode <= 8223) || // 各种引号
            (charCode >= 65281 && charCode <= 65374) || // 全角标点
            /[。！？；，.!?;,]/.test(sentence)
        );

        // 如果是单独的标点符号，合并到前一条
        if (isPunctOnly && mergedSentences.length > 0) {
            mergedSentences[mergedSentences.length - 1] += sentence;
        } else {
            mergedSentences.push(sentence);
        }
    }

    if (mergedSentences.length === 0) {
        return [];
    }

    const subtitles: Subtitle[] = [];
    const timePerSentence = videoDuration / mergedSentences.length;

    mergedSentences.forEach((sentence, index) => {
        const trimmedSentence = sentence.trim();

        // 直接使用完整句子，不再分割
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
        // Generate new subtitles with AI
        try {
          subtitles = await convertTextToSubtitles(
            text.trim(),
            audioFile,
            language === 'auto' ? 'auto' : language,
            (status) => {
              console.log('Progress:', status);
              if (status.includes('分析')) setProgress(25);
              else if (status.includes('生成')) setProgress(50);
              else if (status.includes('完成')) setProgress(100);
            }
          );
          
          toast.success(`成功生成 ${subtitles.length} 条字幕`);
        } catch (error) {
          console.warn('AI生成失败，使用简单分割模式:', error);
          // Fallback to simple splitting
          setProgress(50);
          subtitles = splitTextToSubtitlesInternal(text.trim(), videoDuration);
          setProgress(100);
          
          toast.success(`使用简单模式生成 ${subtitles.length} 条字幕`);
        }
      } else if (mode === 'generate' && !audioFile) {
        // Use simple text splitting when no audio file
        setProgress(50);
        subtitles = splitTextToSubtitlesInternal(text.trim(), videoDuration);
        setProgress(100);
        
        toast.success(`成功生成 ${subtitles.length} 条字幕`);
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
              <div className="flex gap-2">
                <Button
                  variant={mode === 'correct' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode('correct')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  修正错别字
                </Button>
                <Button
                  variant={mode === 'generate' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode('generate')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  重新生成
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {mode === 'correct' 
                  ? '保持现有时间轴，只修正文字内容（推荐）' 
                  : '使用AI重新生成字幕时间轴，无音频时使用简单分割'
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
                <p>• 生成模式：根据音频节奏重新生成字幕时间轴</p>
                <p>• 智能降级：有音频时使用AI，无音频时自动使用简单分割</p>
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