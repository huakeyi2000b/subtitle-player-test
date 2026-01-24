import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { formatTimeShort } from '@/lib/subtitleParser';
import type { Subtitle } from '@/lib/subtitleParser';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, Plus, Copy, Clipboard, Trash2, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimelineProps {
  subtitles: Subtitle[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onSubtitleChange?: (id: number, startTime: number, endTime: number) => void;
  onInsert?: (afterTime: number) => void;
  onCopy?: (subtitle: Subtitle) => void;
  onPaste?: (afterId?: number) => void;
  onDelete?: (id: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasClipboard?: boolean;
  selectedSubtitleId?: number | null;
  onSelectSubtitle?: (id: number | null) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | null;

interface DragState {
  subtitleId: number;
  mode: DragMode;
  initialMouseX: number;
  initialStartTime: number;
  initialEndTime: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.5;

export function Timeline({
  subtitles,
  duration,
  currentTime,
  onSeek,
  onSubtitleChange,
  onInsert,
  onCopy,
  onPaste,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasClipboard,
  selectedSubtitleId,
  onSelectSubtitle,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredSubtitle, setHoveredSubtitle] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; subtitleId?: number; time?: number } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Calculate timeline width based on zoom
  const timelineWidth = useMemo(() => {
    return zoom * 100; // percentage
  }, [zoom]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    if (!duration) return [];
    const markers = [];
    // Adjust interval based on zoom
    let interval: number;
    if (zoom >= 5) {
      interval = duration > 300 ? 10 : duration > 60 ? 5 : 2;
    } else if (zoom >= 2) {
      interval = duration > 300 ? 30 : duration > 60 ? 15 : 5;
    } else {
      interval = duration > 300 ? 60 : duration > 60 ? 30 : 10;
    }
    for (let i = 0; i <= duration; i += interval) {
      markers.push(i);
    }
    return markers;
  }, [duration, zoom]);

  const getTimeFromMouseX = useCallback((clientX: number): number => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = x / rect.width;
    return Math.max(0, Math.min(percentage * duration, duration));
  }, [duration]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    const time = getTimeFromMouseX(e.clientX);
    onSeek(time);
    onSelectSubtitle?.(null);
  }, [dragState, getTimeFromMouseX, onSeek, onSelectSubtitle]);

  const handleContextMenu = useCallback((e: React.MouseEvent, subtitleId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const time = getTimeFromMouseX(e.clientX);
    setContextMenu({ x: e.clientX, y: e.clientY, subtitleId, time });
  }, [getTimeFromMouseX]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    subtitleId: number,
    mode: DragMode
  ) => {
    if (!onSubtitleChange) return;
    e.stopPropagation();
    
    const subtitle = subtitles.find(s => s.id === subtitleId);
    if (!subtitle) return;

    onSelectSubtitle?.(subtitleId);

    setDragState({
      subtitleId,
      mode,
      initialMouseX: e.clientX,
      initialStartTime: subtitle.startTime,
      initialEndTime: subtitle.endTime,
    });
  }, [subtitles, onSubtitleChange, onSelectSubtitle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !containerRef.current || !onSubtitleChange) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.initialMouseX;
    const deltaTime = (deltaX / rect.width) * duration;

    let newStartTime = dragState.initialStartTime;
    let newEndTime = dragState.initialEndTime;
    const minDuration = 0.1;

    switch (dragState.mode) {
      case 'move':
        const shift = deltaTime;
        newStartTime = Math.max(0, dragState.initialStartTime + shift);
        newEndTime = dragState.initialEndTime + shift;
        if (newEndTime > duration) {
          const overflow = newEndTime - duration;
          newStartTime -= overflow;
          newEndTime = duration;
        }
        break;
      case 'resize-start':
        newStartTime = Math.max(0, Math.min(dragState.initialStartTime + deltaTime, dragState.initialEndTime - minDuration));
        break;
      case 'resize-end':
        newEndTime = Math.min(duration, Math.max(dragState.initialEndTime + deltaTime, dragState.initialStartTime + minDuration));
        break;
    }

    onSubtitleChange(dragState.subtitleId, newStartTime, newEndTime);
  }, [dragState, duration, onSubtitleChange]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null);
    }
  }, [dragState]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleSubtitleClick = useCallback((e: React.MouseEvent, subtitleId: number) => {
    e.stopPropagation();
    onSelectSubtitle?.(subtitleId);
    const subtitle = subtitles.find(s => s.id === subtitleId);
    if (subtitle) {
      onSeek(subtitle.startTime);
    }
  }, [subtitles, onSeek, onSelectSubtitle]);

  if (!duration) {
    return (
      <div className="glass-card p-4">
        <div className="h-20 flex items-center justify-center text-muted-foreground">
          加载媒体文件以查看时间轴
        </div>
      </div>
    );
  }

  const playheadPosition = (currentTime / duration) * 100;

  return (
    <TooltipProvider>
      <div className="glass-card p-4">
        {/* Toolbar */}
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">时间轴</h3>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1 ml-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomOut}
                    disabled={zoom <= MIN_ZOOM}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>缩小</TooltipContent>
              </Tooltip>
              
              <span className="text-xs text-muted-foreground w-12 text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleZoomIn}
                    disabled={zoom >= MAX_ZOOM}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>放大</TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
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
            
            <div className="w-px h-5 bg-border mx-1" />
            
            {/* Insert */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onInsert?.(currentTime)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>在当前时间插入字幕</TooltipContent>
            </Tooltip>
            
            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const selected = subtitles.find(s => s.id === selectedSubtitleId);
                    if (selected) onCopy?.(selected);
                  }}
                  disabled={!selectedSubtitleId}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>复制 (Ctrl+C)</TooltipContent>
            </Tooltip>
            
            {/* Paste */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onPaste?.(selectedSubtitleId ?? undefined)}
                  disabled={!hasClipboard}
                >
                  <Clipboard className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>粘贴 (Ctrl+V)</TooltipContent>
            </Tooltip>
            
            {/* Delete */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => selectedSubtitleId && onDelete?.(selectedSubtitleId)}
                  disabled={!selectedSubtitleId}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除 (Delete)</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />
            
            <span className="text-xs text-muted-foreground">
              {formatTimeShort(currentTime)} / {formatTimeShort(duration)}
            </span>
          </div>
        </div>
        
        {/* Timeline with scroll */}
        <ScrollArea ref={scrollAreaRef} className="w-full">
          <div
            ref={containerRef}
            className={cn(
              "relative h-20 bg-secondary/50 rounded-lg overflow-hidden",
              dragState ? "cursor-grabbing" : "cursor-pointer"
            )}
            style={{ width: `${timelineWidth}%`, minWidth: '100%' }}
            onClick={handleClick}
            onContextMenu={(e) => handleContextMenu(e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Time markers */}
            <div className="absolute inset-x-0 top-0 h-5 flex items-end pointer-events-none">
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${(time / duration) * 100}%` }}
                >
                  <span className="text-[10px] text-muted-foreground transform -translate-x-1/2">
                    {formatTimeShort(time)}
                  </span>
                  <div className="w-px h-2 bg-border" />
                </div>
              ))}
            </div>
            
            {/* Subtitle blocks */}
            <div className="absolute inset-x-0 top-7 h-10 px-1">
              {subtitles.map((subtitle) => {
                const left = (subtitle.startTime / duration) * 100;
                const width = ((subtitle.endTime - subtitle.startTime) / duration) * 100;
                const isActive = currentTime >= subtitle.startTime && currentTime <= subtitle.endTime;
                const isDragging = dragState?.subtitleId === subtitle.id;
                const isHovered = hoveredSubtitle === subtitle.id;
                const isSelected = selectedSubtitleId === subtitle.id;
                
                return (
                  <div
                    key={subtitle.id}
                    className={cn(
                      "absolute top-0 h-full rounded transition-all group",
                      isActive 
                        ? "bg-primary shadow-lg shadow-primary/30" 
                        : isSelected
                        ? "bg-accent shadow-lg shadow-accent/30"
                        : "bg-primary/40 hover:bg-primary/60",
                      isDragging && "ring-2 ring-accent z-20",
                      isSelected && !isDragging && "ring-2 ring-accent",
                      isHovered && !isDragging && !isSelected && "ring-1 ring-accent/50"
                    )}
                    style={{ 
                      left: `${left}%`, 
                      width: `${Math.max(width, 0.3)}%` 
                    }}
                    title={subtitle.text}
                    onClick={(e) => handleSubtitleClick(e, subtitle.id)}
                    onContextMenu={(e) => handleContextMenu(e, subtitle.id)}
                    onMouseEnter={() => setHoveredSubtitle(subtitle.id)}
                    onMouseLeave={() => setHoveredSubtitle(null)}
                  >
                    {/* Subtitle text preview */}
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1">
                      <span className="text-[10px] text-white/80 truncate">
                        {zoom >= 2 && subtitle.text.slice(0, 20)}
                      </span>
                    </div>
                    
                    {onSubtitleChange && (
                      <>
                        {/* Left resize handle */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize",
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            "bg-accent/50 hover:bg-accent rounded-l"
                          )}
                          onMouseDown={(e) => handleMouseDown(e, subtitle.id, 'resize-start')}
                        />
                        
                        {/* Move handle (center area) */}
                        <div
                          className="absolute inset-x-2 top-0 bottom-0 cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => handleMouseDown(e, subtitle.id, 'move')}
                        />
                        
                        {/* Right resize handle */}
                        <div
                          className={cn(
                            "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize",
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            "bg-accent/50 hover:bg-accent rounded-r"
                          )}
                          onMouseDown={(e) => handleMouseDown(e, subtitle.id, 'resize-end')}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-lg shadow-accent/50 z-10 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full" />
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.subtitleId ? (
              <>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary flex items-center gap-2"
                  onClick={() => {
                    const sub = subtitles.find(s => s.id === contextMenu.subtitleId);
                    if (sub) onCopy?.(sub);
                    setContextMenu(null);
                  }}
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary flex items-center gap-2"
                  onClick={() => {
                    onPaste?.(contextMenu.subtitleId);
                    setContextMenu(null);
                  }}
                  disabled={!hasClipboard}
                >
                  <Clipboard className="w-4 h-4" />
                  粘贴到后面
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary flex items-center gap-2 text-destructive"
                  onClick={() => {
                    onDelete?.(contextMenu.subtitleId!);
                    setContextMenu(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary flex items-center gap-2"
                  onClick={() => {
                    onInsert?.(contextMenu.time ?? currentTime);
                    setContextMenu(null);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  在此处插入字幕
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-secondary flex items-center gap-2"
                  onClick={() => {
                    onPaste?.();
                    setContextMenu(null);
                  }}
                  disabled={!hasClipboard}
                >
                  <Clipboard className="w-4 h-4" />
                  粘贴
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
