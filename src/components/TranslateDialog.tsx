import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { translateSubtitles, TRANSLATION_LANGUAGES, type TranslatedSubtitle } from '@/lib/translationService';
import type { Subtitle } from '@/lib/subtitleParser';

interface TranslateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: Subtitle[];
  onTranslated: (translatedSubtitles: TranslatedSubtitle[]) => void;
}

export function TranslateDialog({ isOpen, onClose, subtitles, onTranslated }: TranslateDialogProps) {
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleTranslate = async () => {
    if (subtitles.length === 0) {
      toast.error('没有字幕可翻译');
      return;
    }

    setIsTranslating(true);
    setProgress(0);

    try {
      const translated = await translateSubtitles(
        subtitles,
        { 
          targetLanguage, 
          sourceLanguage: sourceLanguage || undefined 
        },
        setProgress
      );
      
      onTranslated(translated);
      toast.success('翻译完成！');
      onClose();
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : '翻译失败，请重试');
    } finally {
      setIsTranslating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Languages className="w-5 h-5 text-primary" />
            翻译字幕
          </DialogTitle>
          <DialogDescription>
            将字幕翻译成其他语言，生成双语字幕
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Language */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">原文语言（可选）</Label>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="自动检测" />
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-card border-border z-[100]">
                <SelectItem value="auto">自动检测</SelectItem>
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">目标语言</Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" className="bg-card border-border z-[100]">
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
            <p>共 {subtitles.length} 条字幕将被翻译</p>
            <p className="mt-1">翻译完成后可在样式设置中选择显示方式</p>
          </div>

          {/* Progress */}
          {isTranslating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">翻译中...</span>
                <span className="text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isTranslating}>
            取消
          </Button>
          <Button 
            onClick={handleTranslate} 
            disabled={isTranslating || subtitles.length === 0}
            className="gap-2"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                翻译中...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                开始翻译
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
