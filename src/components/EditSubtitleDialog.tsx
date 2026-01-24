import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Subtitle } from '@/lib/subtitleParser';

interface EditSubtitleDialogProps {
  subtitle: Subtitle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subtitle: Subtitle) => void;
}

function secondsToTimeInput(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function timeInputToSeconds(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2}):(\d{2})\.?(\d{0,3})?$/);
  if (!match) return 0;
  const [, h, m, s, ms = '0'] = match;
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms.padEnd(3, '0')) / 1000;
}

export function EditSubtitleDialog({ subtitle, isOpen, onClose, onSave }: EditSubtitleDialogProps) {
  const [text, setText] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (subtitle) {
      setText(subtitle.text);
      setStartTime(secondsToTimeInput(subtitle.startTime));
      setEndTime(secondsToTimeInput(subtitle.endTime));
    }
  }, [subtitle]);

  const handleSave = () => {
    if (subtitle) {
      onSave({
        ...subtitle,
        text,
        startTime: timeInputToSeconds(startTime),
        endTime: timeInputToSeconds(endTime),
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="gradient-text">编辑字幕</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="text">字幕内容</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border"
              placeholder="输入字幕文本..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">开始时间</Label>
              <Input
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono bg-secondary/50 border-border"
                placeholder="00:00:00.000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">结束时间</Label>
              <Input
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono bg-secondary/50 border-border"
                placeholder="00:00:00.000"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
