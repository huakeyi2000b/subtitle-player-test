import { useCallback } from 'react';
import { Upload, Film, FileText } from 'lucide-react';

interface UploadZoneProps {
  type: 'media' | 'subtitle';
  onFileSelect: (file: File) => void;
  accept: string;
  currentFile?: string;
}

export function UploadZone({ type, onFileSelect, accept, currentFile }: UploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const Icon = type === 'media' ? Film : FileText;
  const title = type === 'media' ? '上传媒体文件' : '上传字幕文件';
  const subtitle = type === 'media' ? 'MP4, MP3, WebM' : 'SRT, VTT, LRC';

  return (
    <label
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="group relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-all duration-300 cursor-pointer hover-glow"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        
        <div className="text-center">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        
        {currentFile && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            {currentFile}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
          <Upload className="w-4 h-4" />
          <span>拖拽或点击上传</span>
        </div>
      </div>
    </label>
  );
}
