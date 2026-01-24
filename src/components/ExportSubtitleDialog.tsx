import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslatedSubtitle } from '@/lib/translationService';
import { exportBilingualSRT, exportBilingualVTT } from '@/lib/videoExportService';

interface ExportSubtitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: TranslatedSubtitle[];
  hasTranslation: boolean;
}

type ExportFormat = 'srt' | 'vtt';
type TranslationPosition = 'above' | 'below';

export function ExportSubtitleDialog({
  isOpen,
  onClose,
  subtitles,
  hasTranslation,
}: ExportSubtitleDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('srt');
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [includeTranslation, setIncludeTranslation] = useState(hasTranslation);
  const [translationPosition, setTranslationPosition] = useState<TranslationPosition>('below');

  const handleExport = () => {
    if (!includeOriginal && !includeTranslation) {
      toast.error('请至少选择一种字幕类型');
      return;
    }

    const options = {
      includeOriginal,
      includeTranslation,
      translationPosition,
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'srt') {
      content = exportBilingualSRT(subtitles, options);
      filename = 'subtitles.srt';
      mimeType = 'text/plain';
    } else {
      content = exportBilingualVTT(subtitles, options);
      filename = 'subtitles.vtt';
      mimeType = 'text/vtt';
    }

    // Generate filename suffix
    const suffixes: string[] = [];
    if (includeOriginal && includeTranslation) {
      suffixes.push('bilingual');
    } else if (includeTranslation) {
      suffixes.push('translated');
    }
    if (suffixes.length > 0) {
      filename = `subtitles_${suffixes.join('_')}.${format}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('字幕已导出');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            导出字幕文件
          </DialogTitle>
          <DialogDescription>
            选择导出格式和内容选项
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">文件格式</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="srt" id="srt" className="peer sr-only" />
                <Label
                  htmlFor="srt"
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <span className="text-lg font-bold">.SRT</span>
                  <span className="text-xs text-muted-foreground">SubRip 格式</span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="vtt" id="vtt" className="peer sr-only" />
                <Label
                  htmlFor="vtt"
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <span className="text-lg font-bold">.VTT</span>
                  <span className="text-xs text-muted-foreground">WebVTT 格式</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Content Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">导出内容</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <Label className="text-sm text-foreground">包含原文字幕</Label>
                <Switch
                  checked={includeOriginal}
                  onCheckedChange={setIncludeOriginal}
                />
              </div>
              
              {hasTranslation && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label className="text-sm text-foreground">包含译文字幕</Label>
                  <Switch
                    checked={includeTranslation}
                    onCheckedChange={setIncludeTranslation}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Translation Position */}
          {hasTranslation && includeOriginal && includeTranslation && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">双语排列顺序</Label>
              <RadioGroup
                value={translationPosition}
                onValueChange={(v) => setTranslationPosition(v as TranslationPosition)}
                className="grid grid-cols-2 gap-4"
              >
                <div className="relative">
                  <RadioGroupItem value="above" id="trans-above" className="peer sr-only" />
                  <Label
                    htmlFor="trans-above"
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                  >
                    <span className="text-xs text-muted-foreground">译文</span>
                    <span className="text-xs text-muted-foreground">原文</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="below" id="trans-below" className="peer sr-only" />
                  <Label
                    htmlFor="trans-below"
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                  >
                    <span className="text-xs text-muted-foreground">原文</span>
                    <span className="text-xs text-muted-foreground">译文</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <Label className="text-xs text-muted-foreground mb-2 block">预览</Label>
            <div className="font-mono text-xs space-y-1">
              <p className="text-muted-foreground">1</p>
              <p className="text-muted-foreground">00:00:01,000 --&gt; 00:00:04,000</p>
              {translationPosition === 'above' && includeTranslation && (
                <p className="text-yellow-500">This is translated text</p>
              )}
              {includeOriginal && (
                <p className="text-foreground">这是原文字幕示例</p>
              )}
              {translationPosition === 'below' && includeTranslation && (
                <p className="text-yellow-500">This is translated text</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button onClick={handleExport} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              导出字幕
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
