import { useEffect, useRef, useState } from 'react';
import { Clock, Edit3, Plus, Copy, Clipboard, Minus, Undo2, Redo2, ArrowUpDown, FileText } from 'lucide-react';
import { formatTime } from '@/lib/subtitleParser';
import type { Subtitle } from '@/lib/subtitleParser';
import type { TranslatedSubtitle } from '@/lib/translationService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Function to split bilingual text
function splitBilingualText(text: string): { original: string; translated: string } | null {
  // Pattern to detect Chinese/English mixed text
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const englishRegex = /[a-zA-Z]/;

  // If text contains both Chinese and English characters
  if (chineseRegex.test(text) && englishRegex.test(text)) {
    // Try to split by common patterns

    // Pattern 1: Chinese text followed by English (most common)
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

interface SubtitleListProps {
  subtitles: (Subtitle | TranslatedSubtitle)[];
  currentTime: number;
  onSeek: (time: number) => void;
  onEdit: (subtitle: Subtitle | TranslatedSubtitle) => void;
  onInsert?: (afterTime: number) => void;
  onCopy?: (subtitle: Subtitle | TranslatedSubtitle) => void;
  onPaste?: (afterId?: number) => void;
  onDelete?: (id: number) => void;
  selectedSubtitleId?: number | null;
  onSelectSubtitle?: (id: number | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasClipboard?: boolean;
  onTextToSubtitle?: () => void;
}

export function SubtitleList({
  subtitles,
  currentTime,
  onSeek,
  onEdit,
  onInsert,
  onCopy,
  onPaste,
  onDelete,
  selectedSubtitleId,
  onSelectSubtitle,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  hasClipboard = false,
  onTextToSubtitle,
}: SubtitleListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [swapBilingualOrder, setSwapBilingualOrder] = useState(false);

  // Check if any subtitle contains bilingual content
  const hasBilingualContent = subtitles.some(subtitle => {
    const hasTranslatedField = 'translatedText' in subtitle && subtitle.translatedText;
    const hasMixedText = splitBilingualText(subtitle.text) !== null;
    return hasTranslatedField || hasMixedText;
  });

  // Find current active subtitle
  const activeSubtitle = subtitles.find(
    sub => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  // Auto-scroll to active subtitle without stealing focus
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const container = listRef.current;
      const element = activeRef.current;
      
      // Use requestAnimationFrame to ensure smooth scrolling without focus issues
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Only scroll if element is not visible
        if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
          // Calculate scroll position manually to avoid focus stealing
          const containerScrollTop = container.scrollTop;
          const elementOffsetTop = element.offsetTop;
          const containerHeight = container.clientHeight;
          const elementHeight = element.clientHeight;
          
          // Center the element in the container
          const targetScrollTop = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
          
          // Smooth scroll using scrollTo instead of scrollIntoView
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        }
      });
    }
  }, [activeSubtitle?.id]);

  if (subtitles.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="w-12 h-12 opacity-50" />
          <p>暂无字幕</p>
          <p className="text-sm">请上传 SRT 或 VTT 字幕文件</p>
          {onInsert && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInsert(0)}
              className="mt-2 gap-2"
            >
              <Plus className="w-4 h-4" />
              添加第一条字幕
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="glass-card overflow-hidden h-full">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              字幕列表
            </h3>
            <div className="flex items-center gap-1">
              {/* Undo/Redo buttons */}
              {onUndo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onUndo}
                      disabled={!canUndo}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
                </Tooltip>
              )}
              {onRedo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onRedo}
                      disabled={!canRedo}
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
                </Tooltip>
              )}

              {/* Bilingual order swap button */}
              {hasBilingualContent && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSwapBilingualOrder(!swapBilingualOrder)}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>切换双语顺序</TooltipContent>
                </Tooltip>
              )}

              {onTextToSubtitle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onTextToSubtitle}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>文本转字幕</TooltipContent>
                </Tooltip>
              )}

              {onInsert && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        // Insert at the end of the last subtitle or at current time
                        const lastSubtitle = subtitles[subtitles.length - 1];
                        const insertTime = lastSubtitle ? lastSubtitle.endTime + 0.5 : currentTime;
                        onInsert(insertTime);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>添加字幕</TooltipContent>
                </Tooltip>
              )}
              <span className="text-xs text-muted-foreground ml-1">
                {subtitles.length}条
              </span>
            </div>
          </div>
        </div>

        <div ref={listRef} className="max-h-[500px] overflow-y-auto scrollbar-thin">
          {subtitles.map((subtitle, index) => {
            const isActive = activeSubtitle?.id === subtitle.id;
            const isSelected = selectedSubtitleId === subtitle.id;

            return (
              <div
                key={subtitle.id}
                ref={isActive ? activeRef : null}
                onClick={() => {
                  onSeek(subtitle.startTime);
                  onSelectSubtitle?.(subtitle.id);
                }}
                className={cn(
                  "group p-4 border-b border-border/30 cursor-pointer transition-all duration-200",
                  isActive
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : isSelected
                      ? "bg-accent/10 border-l-2 border-l-accent"
                      : "hover:bg-secondary/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isSelected
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                    )}>
                      {subtitle.id}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="space-y-1">
                      {(() => {
                        // Check if subtitle has translatedText field (from translation feature)
                        const hasTranslatedField = 'translatedText' in subtitle && subtitle.translatedText;

                        if (hasTranslatedField) {
                          // Display original and translated text separately
                          const firstText = swapBilingualOrder ? subtitle.translatedText : subtitle.text;
                          const secondText = swapBilingualOrder ? subtitle.text : subtitle.translatedText;

                          return (
                            <>
                              <p className={cn(
                                "text-sm leading-relaxed",
                                swapBilingualOrder ? "text-yellow-500/90" : "",
                                isActive ? "font-medium" : "",
                                !swapBilingualOrder && (isActive ? "text-foreground font-medium" : "text-foreground/80")
                              )}>
                                {firstText}
                              </p>
                              <p className={cn(
                                "text-sm leading-relaxed",
                                swapBilingualOrder ? "" : "text-yellow-500/90",
                                isActive ? "font-medium" : "",
                                swapBilingualOrder && (isActive ? "text-foreground font-medium" : "text-foreground/80")
                              )}>
                                {secondText}
                              </p>
                            </>
                          );
                        } else {
                          // Try to split mixed bilingual text
                          const splitResult = splitBilingualText(subtitle.text);

                          if (splitResult) {
                            const firstText = swapBilingualOrder ? splitResult.translated : splitResult.original;
                            const secondText = swapBilingualOrder ? splitResult.original : splitResult.translated;

                            return (
                              <>
                                <p className={cn(
                                  "text-sm leading-relaxed",
                                  swapBilingualOrder ? "text-yellow-500/90" : "",
                                  isActive ? "font-medium" : "",
                                  !swapBilingualOrder && (isActive ? "text-foreground font-medium" : "text-foreground/80")
                                )}>
                                  {firstText}
                                </p>
                                <p className={cn(
                                  "text-sm leading-relaxed",
                                  swapBilingualOrder ? "" : "text-yellow-500/90",
                                  isActive ? "font-medium" : "",
                                  swapBilingualOrder && (isActive ? "text-foreground font-medium" : "text-foreground/80")
                                )}>
                                  {secondText}
                                </p>
                              </>
                            );
                          } else {
                            // Display as single line if no bilingual pattern detected
                            return (
                              <p className={cn(
                                "text-sm leading-relaxed",
                                isActive ? "text-foreground font-medium" : "text-foreground/80"
                              )}>
                                {subtitle.text}
                              </p>
                            );
                          }
                        }
                      })()}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                          {formatTime(subtitle.startTime)}
                        </span>
                        <span>→</span>
                        <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                          {formatTime(subtitle.endTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(subtitle);
                              }}
                              className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>编辑</TooltipContent>
                        </Tooltip>

                        {onCopy && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopy(subtitle);
                                }}
                                className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>复制</TooltipContent>
                          </Tooltip>
                        )}

                        {onPaste && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPaste(subtitle.id);
                                }}
                                disabled={!hasClipboard}
                                className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Clipboard className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>粘贴到后面</TooltipContent>
                          </Tooltip>
                        )}

                        {onInsert && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInsert(subtitle.endTime + 0.1);
                                }}
                                className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>在后面插入</TooltipContent>
                          </Tooltip>
                        )}

                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(subtitle.id);
                                }}
                                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
