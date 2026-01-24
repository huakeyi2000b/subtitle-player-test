import { useEffect, useRef } from 'react';
import { Clock, Edit3, Plus, Copy, Trash2, Undo2, Redo2 } from 'lucide-react';
import { formatTime } from '@/lib/subtitleParser';
import type { Subtitle } from '@/lib/subtitleParser';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SubtitleListProps {
  subtitles: Subtitle[];
  currentTime: number;
  onSeek: (time: number) => void;
  onEdit: (subtitle: Subtitle) => void;
  onInsert?: (afterTime: number) => void;
  onCopy?: (subtitle: Subtitle) => void;
  onDelete?: (id: number) => void;
  selectedSubtitleId?: number | null;
  onSelectSubtitle?: (id: number | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function SubtitleList({
  subtitles,
  currentTime,
  onSeek,
  onEdit,
  onInsert,
  onCopy,
  onDelete,
  selectedSubtitleId,
  onSelectSubtitle,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: SubtitleListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Find current active subtitle
  const activeSubtitle = subtitles.find(
    sub => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const container = listRef.current;
      const element = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              字幕列表
            </h3>
            <div className="flex items-center gap-2">
              {/* Undo/Redo buttons */}
              {onUndo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onUndo}
                      disabled={!canUndo}
                    >
                      <Undo2 className="w-4 h-4" />
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
                      className="h-7 w-7"
                      onClick={onRedo}
                      disabled={!canRedo}
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
                </Tooltip>
              )}
              
              {onInsert && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        // Insert at the end of the last subtitle or at current time
                        const lastSubtitle = subtitles[subtitles.length - 1];
                        const insertTime = lastSubtitle ? lastSubtitle.endTime + 0.5 : currentTime;
                        onInsert(insertTime);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>添加字幕</TooltipContent>
                </Tooltip>
              )}
              <span className="text-sm text-muted-foreground">
                共 {subtitles.length} 条
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
                    <p className={cn(
                      "text-sm leading-relaxed",
                      isActive ? "text-foreground font-medium" : "text-foreground/80"
                    )}>
                      {subtitle.text}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                        {formatTime(subtitle.startTime)}
                      </span>
                      <span>→</span>
                      <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">
                        {formatTime(subtitle.endTime)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(subtitle);
                          }}
                          className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                        >
                          <Edit3 className="w-4 h-4" />
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
                            className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>复制</TooltipContent>
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
                            className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all duration-200"
                          >
                            <Plus className="w-4 h-4" />
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
                            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>删除</TooltipContent>
                      </Tooltip>
                    )}
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
