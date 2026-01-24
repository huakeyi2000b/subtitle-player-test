import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Monitor, Smartphone, Download, Loader2, AlertCircle, Film, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslatedSubtitle } from '@/lib/translationService';
import type { SubtitleStyle } from '@/components/SubtitleStyleSettings';
import { drawSubtitleOnCanvas, findSubtitleAtTime } from '@/lib/videoExportService';

interface ExportVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File | null;
  videoUrl: string;
  subtitles: TranslatedSubtitle[];
  subtitleStyle: SubtitleStyle;
  duration: number;
}

type ExportFormat = 'horizontal' | 'vertical';
type VideoFormat = 'webm' | 'mp4';
type ExportStage = 'config' | 'rendering' | 'complete' | 'error';

export function ExportVideoDialog({
  isOpen,
  onClose,
  videoFile,
  videoUrl,
  subtitles,
  subtitleStyle,
  duration,
}: ExportVideoDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('horizontal');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('mp4');
  const [muteExport, setMuteExport] = useState(false); // 默认有声音合成
  const [stage, setStage] = useState<ExportStage>('config');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isExportingRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStage('config');
      setProgress(0);
      setStatusMessage('');
      setExportedUrl(null);
      setError(null);
      isExportingRef.current = false;
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exportedUrl) {
        URL.revokeObjectURL(exportedUrl);
      }
    };
  }, [exportedUrl]);

  const getRecorderOptions = useCallback(() => {
    if (videoFormat === 'mp4') {
      // For MP4, try various H.264 options but stay within MP4 container
      const mp4Options = [
        { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2' },
        { mimeType: 'video/mp4;codecs=h264,aac' },
        { mimeType: 'video/mp4' },
      ];
      
      for (const option of mp4Options) {
        if (MediaRecorder.isTypeSupported(option.mimeType)) {
          return {
            ...option,
            videoBitsPerSecond: 8000000,
            audioBitsPerSecond: 128000,
          };
        }
      }
      
      // If no MP4 options work, still return MP4 as fallback
      // This will force the browser to use its best MP4 support
      return {
        mimeType: 'video/mp4',
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 128000,
      };
    }
    
    // For WebM format
    const webmOptions = [
      { mimeType: 'video/webm;codecs=vp9,opus' },
      { mimeType: 'video/webm;codecs=vp8,opus' },
      { mimeType: 'video/webm' },
    ];
    
    for (const option of webmOptions) {
      if (MediaRecorder.isTypeSupported(option.mimeType)) {
        return {
          ...option,
          videoBitsPerSecond: 8000000,
          audioBitsPerSecond: 128000,
        };
      }
    }
    
    // Final fallback
    return {
      mimeType: 'video/webm',
      videoBitsPerSecond: 8000000,
      audioBitsPerSecond: 128000,
    };
  }, [videoFormat]);

  const getOutputDimensions = useCallback(() => {
    if (format === 'vertical') {
      return { width: 1080, height: 1920 };
    }
    return { width: 1920, height: 1080 };
  }, [format]);

  const startExport = async () => {
    if (!videoFile || !videoUrl) {
      toast.error('请先上传视频文件');
      return;
    }

    setStage('rendering');
    setProgress(0);
    setStatusMessage('正在准备导出...');
    isExportingRef.current = true;
    chunksRef.current = [];

    try {
      const { width: outputWidth, height: outputHeight } = getOutputDimensions();

      // Create video element
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      videoRef.current = video;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('视频加载失败'));
      });

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d')!;
      canvasRef.current = canvas;

      // Calculate video positioning (letterbox/pillarbox)
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = outputWidth / outputHeight;
      
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
      
      if (videoAspect > canvasAspect) {
        // Video is wider - letterbox (black bars top/bottom)
        drawWidth = outputWidth;
        drawHeight = outputWidth / videoAspect;
        drawX = 0;
        drawY = (outputHeight - drawHeight) / 2;
      } else {
        // Video is taller - pillarbox (black bars left/right)
        drawHeight = outputHeight;
        drawWidth = outputHeight * videoAspect;
        drawX = (outputWidth - drawWidth) / 2;
        drawY = 0;
      }

      // Setup MediaRecorder with audio
      const canvasStream = canvas.captureStream(30);
      
      // Create audio context and capture audio from video
      let audioContext: AudioContext | null = null;
      let audioSource: MediaElementAudioSourceNode | null = null;
      let audioDestination: MediaStreamAudioDestinationNode | null = null;
      
      try {
        audioContext = new AudioContext();
        audioSource = audioContext.createMediaElementSource(video);
        audioDestination = audioContext.createMediaStreamDestination();
        
        // Always connect audio source to destination for recording
        audioSource.connect(audioDestination);
        
        // Create a gain node to control speaker output
        const gainNode = audioContext.createGain();
        audioSource.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set gain based on user preference (0 = mute, 1 = normal volume)
        gainNode.gain.value = muteExport ? 0 : 1;
        
        // Add audio tracks to canvas stream
        audioDestination.stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
      } catch (e) {
        console.warn('Could not setup audio:', e);
      }

      const recorderOptions = getRecorderOptions();
      
      // Log the format selection for debugging
      console.log('Selected format:', videoFormat);
      console.log('Recorder options:', recorderOptions);
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(canvasStream, recorderOptions);
      } catch (error) {
        // If the preferred format fails, try basic format without codecs
        console.warn('Failed to create MediaRecorder with preferred options:', error);
        const basicOptions = {
          mimeType: videoFormat === 'mp4' ? 'video/mp4' : 'video/webm',
          videoBitsPerSecond: 8000000,
          audioBitsPerSecond: 128000,
        };
        try {
          mediaRecorder = new MediaRecorder(canvasStream, basicOptions);
          console.log('Created MediaRecorder with basic options:', basicOptions);
        } catch (basicError) {
          // Final fallback - let MediaRecorder choose the format
          console.warn('Basic format also failed, using default:', basicError);
          mediaRecorder = new MediaRecorder(canvasStream);
        }
      }
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Cleanup audio context
        if (audioContext) {
          audioContext.close();
        }
        
        if (chunksRef.current.length > 0) {
          // Use user-selected format for blob type to ensure proper file format
          const blobType = videoFormat === 'mp4' ? 'video/mp4' : 'video/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          const url = URL.createObjectURL(blob);
          setExportedUrl(url);
          setStage('complete');
          setStatusMessage('导出完成！');
        }
      };

      // Start recording
      mediaRecorder.start(100);
      setStatusMessage('正在渲染视频...');

      // Play video and render frames
      video.currentTime = 0;
      // Always keep video unmuted for audio capture, but control speaker output via AudioContext
      video.muted = false;
      video.volume = 1;
      await video.play();

      const renderFrame = () => {
        if (!isExportingRef.current || video.ended || video.paused) {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        // Draw video frame
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

        // Draw subtitle
        const currentSubtitle = findSubtitleAtTime(subtitles, video.currentTime);
        if (currentSubtitle) {
          drawSubtitleOnCanvas(ctx, currentSubtitle, subtitleStyle, outputWidth, outputHeight);
        }

        // Update progress
        const currentProgress = Math.min(99, (video.currentTime / duration) * 100);
        setProgress(currentProgress);
        setStatusMessage(`正在渲染: ${Math.round(currentProgress)}%`);

        requestAnimationFrame(renderFrame);
      };

      renderFrame();

      // Handle video end
      video.onended = () => {
        isExportingRef.current = false;
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        setProgress(100);
      };

    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : '导出失败');
      setStage('error');
      isExportingRef.current = false;
    }
  };

  const generateFileName = useCallback((originalName: string, format: ExportFormat, fileExtension: string) => {
    // 移除原文件的扩展名
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    // 取前8个字符，如果是中文字符可能会更少
    const shortName = nameWithoutExt.substring(0, 8);
    // 生成时间戳
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    // 格式描述
    const formatDesc = format === 'horizontal' ? '横屏' : '竖屏';
    
    return `${shortName}_${formatDesc}_字幕版_${timestamp}.${fileExtension}`;
  }, []);

  const handleDownload = () => {
    if (!exportedUrl || !videoFile) return;

    // Always use the user-selected format for file extension
    // This ensures MP4 files have .mp4 extension even if browser encoding differs
    const fileExtension = videoFormat; // 'mp4' or 'webm'
    
    const fileName = generateFileName(videoFile.name, format, fileExtension);
    
    const a = document.createElement('a');
    a.href = exportedUrl;
    a.download = fileName;
    a.click();
    
    toast.success('视频已下载');
  };

  const handleCancel = () => {
    isExportingRef.current = false;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setStage('config');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            导出带字幕视频
          </DialogTitle>
          <DialogDescription>
            将字幕烧录到视频中，支持横屏和竖屏格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {stage === 'config' && (
            <>
              {/* Format Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">视频格式</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as ExportFormat)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="relative">
                    <RadioGroupItem value="horizontal" id="horizontal" className="peer sr-only" />
                    <Label
                      htmlFor="horizontal"
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                    >
                      <Monitor className="w-8 h-8" />
                      <span className="text-sm font-medium">横屏 16:9</span>
                      <span className="text-xs text-muted-foreground">1920 × 1080</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="vertical" id="vertical" className="peer sr-only" />
                    <Label
                      htmlFor="vertical"
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-border bg-card cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                    >
                      <Smartphone className="w-8 h-8" />
                      <span className="text-sm font-medium">竖屏 9:16</span>
                      <span className="text-xs text-muted-foreground">1080 × 1920</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Video Format Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  输出格式
                </Label>
                <Select value={videoFormat} onValueChange={(v) => setVideoFormat(v as VideoFormat)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择视频格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">MP4 (H.264)</span>
                        <span className="text-xs text-muted-foreground">通用兼容性最佳</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="webm">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">WebM (VP9)</span>
                        <span className="text-xs text-muted-foreground">文件更小，质量更高</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audio Export Option */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  {muteExport ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  合成选项
                </Label>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">静音合成</span>
                    <span className="text-xs text-muted-foreground">
                      合成时不播放声音，但导出视频仍包含音轨
                    </span>
                  </div>
                  <Switch
                    checked={muteExport}
                    onCheckedChange={setMuteExport}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p>• 字幕样式将与预览完全一致</p>
                <p>• 双语字幕会按照当前设置导出</p>
                <p>• MP4格式兼容性更好，WebM文件更小</p>
                <p>• 如果MP4不支持，将自动使用WebM格式</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  取消
                </Button>
                <Button onClick={startExport} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  开始导出
                </Button>
              </div>
            </>
          )}

          {stage === 'rendering' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{statusMessage}</p>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                取消导出
              </Button>
            </div>
          )}

          {stage === 'complete' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Download className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-lg font-medium text-foreground">导出完成！</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  关闭
                </Button>
                <Button onClick={handleDownload} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  下载视频
                </Button>
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-lg font-medium text-destructive">导出失败</p>
                <p className="text-sm text-muted-foreground text-center">{error}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  关闭
                </Button>
                <Button onClick={() => setStage('config')} className="flex-1">
                  重试
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
