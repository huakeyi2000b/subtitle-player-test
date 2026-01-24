import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, ArrowUpDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { formatTimeShort } from '@/lib/subtitleParser';
import type { Subtitle } from '@/lib/subtitleParser';
import type { TranslatedSubtitle } from '@/lib/translationService';
import { SubtitleStyleSettings, defaultSubtitleStyle, getFontFamilyCSS, getTextEffectsCSS, removePunctuationFromText, type SubtitleStyle } from './SubtitleStyleSettings';
import { normalizeSubtitleText } from '@/lib/transcriptionService';

// Function to split bilingual text (same as in SubtitleList)
function splitBilingualText(text: string): { original: string; translated: string } | null {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const englishRegex = /[a-zA-Z]/;
  
  if (chineseRegex.test(text) && englishRegex.test(text)) {
    // Pattern 1: Chinese text followed by English
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

interface MediaPlayerProps {
  src: string;
  type: 'video' | 'audio';
  subtitles: Subtitle[] | TranslatedSubtitle[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  subtitleStyle?: SubtitleStyle;
  onSubtitleStyleChange?: (style: SubtitleStyle) => void;
  hasTranslation?: boolean;
}

export interface MediaPlayerRef {
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
}

export const MediaPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(({
  src,
  type,
  subtitles,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  isPlaying,
  onPlayPause,
  subtitleStyle = defaultSubtitleStyle,
  onSubtitleStyleChange,
  hasTranslation = false,
}, ref) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [swapBilingualOrder, setSwapBilingualOrder] = useState(false);

  // Find current subtitle
  const currentSubtitle = subtitles.find(
    sub => currentTime >= sub.startTime && currentTime <= sub.endTime
  ) as TranslatedSubtitle | undefined;

  // Check if current subtitle has bilingual content
  const hasBilingualContent = currentSubtitle && (
    ('translatedText' in currentSubtitle && currentSubtitle.translatedText) ||
    splitBilingualText(currentSubtitle.text) !== null
  );

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (mediaRef.current) {
        mediaRef.current.currentTime = time;
      }
    },
    play: () => mediaRef.current?.play(),
    pause: () => mediaRef.current?.pause(),
  }));

  useEffect(() => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.play();
      } else {
        mediaRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Prevent fullscreen and other unwanted behaviors
  useEffect(() => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    const preventFullscreen = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // Prevent various fullscreen triggers
    mediaElement.addEventListener('webkitfullscreenchange', preventFullscreen);
    mediaElement.addEventListener('fullscreenchange', preventFullscreen);
    mediaElement.addEventListener('webkitenterfullscreen', preventFullscreen);
    mediaElement.addEventListener('contextmenu', preventContextMenu);
    mediaElement.addEventListener('dblclick', preventFullscreen);

    return () => {
      mediaElement.removeEventListener('webkitfullscreenchange', preventFullscreen);
      mediaElement.removeEventListener('fullscreenchange', preventFullscreen);
      mediaElement.removeEventListener('webkitenterfullscreen', preventFullscreen);
      mediaElement.removeEventListener('contextmenu', preventContextMenu);
      mediaElement.removeEventListener('dblclick', preventFullscreen);
    };
  }, [src]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      onTimeUpdate(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      onDurationChange(mediaRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = value[0];
      onTimeUpdate(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      mediaRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Check if current subtitle has translation
  const hasTranslatedText = currentSubtitle && 'translatedText' in currentSubtitle && currentSubtitle.translatedText;

  const MediaElement = type === 'video' ? 'video' : 'audio';

  // Render subtitle text based on style settings
  const renderSubtitleContent = () => {
    if (!currentSubtitle) return null;

    // Check if subtitle has translatedText field (from translation feature)
    const hasTranslatedField = hasTranslatedText;
    
    if (hasTranslatedField) {
      // Use existing logic for translated subtitles
      let originalText = normalizeSubtitleText(currentSubtitle.text);
      let translatedText = normalizeSubtitleText((currentSubtitle as TranslatedSubtitle).translatedText!);
      
      // Apply punctuation removal if enabled
      if (subtitleStyle.removePunctuation) {
        originalText = removePunctuationFromText(originalText);
        translatedText = removePunctuationFromText(translatedText);
      }

      const showOriginal = subtitleStyle.showOriginal;
      const showTranslation = subtitleStyle.showTranslation;

      if (!showOriginal && !showTranslation) return null;

      const originalStyle: React.CSSProperties = {
        color: subtitleStyle.fontColor,
        fontSize: `${subtitleStyle.fontSize}px`,
        fontWeight: subtitleStyle.fontWeight === 'bold' ? 700 : subtitleStyle.fontWeight === 'medium' ? 500 : 400,
        fontFamily: getFontFamilyCSS(subtitleStyle.fontFamily),
        ...getTextEffectsCSS(subtitleStyle, false),
      };

      const translationStyle: React.CSSProperties = {
        color: subtitleStyle.translationFontColor,
        fontSize: `${subtitleStyle.translationFontSize}px`,
        fontWeight: subtitleStyle.translationFontWeight === 'bold' ? 700 : subtitleStyle.translationFontWeight === 'medium' ? 500 : 400,
        fontFamily: getFontFamilyCSS(subtitleStyle.translationFontFamily),
        ...getTextEffectsCSS(subtitleStyle, true),
      };

      // Determine display order based on swapBilingualOrder
      const shouldSwapOrder = swapBilingualOrder;
      const firstText = shouldSwapOrder ? translatedText : originalText;
      const secondText = shouldSwapOrder ? originalText : translatedText;
      const firstStyle = shouldSwapOrder ? translationStyle : originalStyle;
      const secondStyle = shouldSwapOrder ? originalStyle : translationStyle;

      return (
        <div className="flex flex-col items-center gap-1">
          {showOriginal && showTranslation && (
            <>
              <p className="text-center leading-relaxed" style={firstStyle}>
                {firstText}
              </p>
              <p className="text-center leading-relaxed" style={secondStyle}>
                {secondText}
              </p>
            </>
          )}
          {showOriginal && !showTranslation && (
            <p className="text-center leading-relaxed" style={originalStyle}>
              {originalText}
            </p>
          )}
          {!showOriginal && showTranslation && (
            <p className="text-center leading-relaxed" style={translationStyle}>
              {translatedText}
            </p>
          )}
        </div>
      );
    } else {
      // Try to split mixed bilingual text
      const splitResult = splitBilingualText(currentSubtitle.text);
      
      if (splitResult) {
        // Display as bilingual with split text
        const originalStyle: React.CSSProperties = {
          color: subtitleStyle.fontColor,
          fontSize: `${subtitleStyle.fontSize}px`,
          fontWeight: subtitleStyle.fontWeight === 'bold' ? 700 : subtitleStyle.fontWeight === 'medium' ? 500 : 400,
          fontFamily: getFontFamilyCSS(subtitleStyle.fontFamily),
          ...getTextEffectsCSS(subtitleStyle, false),
        };

        const translationStyle: React.CSSProperties = {
          color: subtitleStyle.translationFontColor,
          fontSize: `${subtitleStyle.translationFontSize}px`,
          fontWeight: subtitleStyle.translationFontWeight === 'bold' ? 700 : subtitleStyle.translationFontWeight === 'medium' ? 500 : 400,
          fontFamily: getFontFamilyCSS(subtitleStyle.translationFontFamily),
          ...getTextEffectsCSS(subtitleStyle, true),
        };

        // Determine display order based on swapBilingualOrder
        const firstText = swapBilingualOrder ? splitResult.translated : splitResult.original;
        const secondText = swapBilingualOrder ? splitResult.original : splitResult.translated;
        const firstStyle = swapBilingualOrder ? translationStyle : originalStyle;
        const secondStyle = swapBilingualOrder ? originalStyle : translationStyle;

        return (
          <div className="flex flex-col items-center gap-1">
            <p className="text-center leading-relaxed" style={firstStyle}>
              {subtitleStyle.removePunctuation ? removePunctuationFromText(normalizeSubtitleText(firstText)) : normalizeSubtitleText(firstText)}
            </p>
            <p className="text-center leading-relaxed" style={secondStyle}>
              {subtitleStyle.removePunctuation ? removePunctuationFromText(normalizeSubtitleText(secondText)) : normalizeSubtitleText(secondText)}
            </p>
          </div>
        );
      } else {
        // Display as single line if no bilingual pattern detected
        let originalText = normalizeSubtitleText(currentSubtitle.text);
        
        // Apply punctuation removal if enabled
        if (subtitleStyle.removePunctuation) {
          originalText = removePunctuationFromText(originalText);
        }
        const originalStyle: React.CSSProperties = {
          color: subtitleStyle.fontColor,
          fontSize: `${subtitleStyle.fontSize}px`,
          fontWeight: subtitleStyle.fontWeight === 'bold' ? 700 : subtitleStyle.fontWeight === 'medium' ? 500 : 400,
          fontFamily: getFontFamilyCSS(subtitleStyle.fontFamily),
          ...getTextEffectsCSS(subtitleStyle, false),
        };

        return (
          <div className="flex flex-col items-center">
            <p className="text-center leading-relaxed" style={originalStyle}>
              {originalText}
            </p>
          </div>
        );
      }
    }
  };

  return (
    <div ref={containerRef} className="glass-card overflow-hidden">
      <div className="relative bg-black/50 aspect-video flex items-center justify-center">
        <MediaElement
          ref={mediaRef as any}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className={type === 'video' ? 'w-full h-full object-contain' : 'hidden'}
          controls={false}
          disablePictureInPicture={true}
          controlsList="nodownload nofullscreen noremoteplayback"
          playsInline={true}
          preload="metadata"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Overlay to prevent direct media interaction */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={onPlayPause}
          onDoubleClick={(e) => e.preventDefault()}
        />
        
        {type === 'audio' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-slow">
              <Volume2 className="w-12 h-12 text-primary-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">音频播放中</p>
          </div>
        )}
        
        {/* Subtitle overlay */}
        {currentSubtitle && (subtitleStyle.showOriginal || (subtitleStyle.showTranslation && hasTranslatedText)) && (
          <div 
            className={`absolute left-0 right-0 flex justify-center px-4 z-20 ${
              subtitleStyle.position === 'top' ? 'top-4' : 
              subtitleStyle.position === 'center' ? 'top-1/2 -translate-y-1/2' : 
              'bottom-4'
            }`}
          >
            <div 
              className="px-6 py-3 backdrop-blur-sm rounded-lg max-w-[80%]"
              style={{
                backgroundColor: `${subtitleStyle.backgroundColor}${Math.round(subtitleStyle.backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
              }}
            >
              {renderSubtitleContent()}
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-4 space-y-4 bg-card/50">
        {/* Progress bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTimeShort(currentTime)}</span>
            <span>{formatTimeShort(duration)}</span>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPlayPause}
              className="hover:bg-primary/20 hover:text-primary"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="hover:bg-primary/20 hover:text-primary"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bilingual order swap button */}
            {hasBilingualContent && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSwapBilingualOrder(!swapBilingualOrder)}
                className="hover:bg-primary/20 hover:text-primary"
                title="切换双语顺序"
              >
                <ArrowUpDown className="w-5 h-5" />
              </Button>
            )}
            
            {onSubtitleStyleChange && (
              <SubtitleStyleSettings
                style={subtitleStyle}
                onStyleChange={onSubtitleStyleChange}
                hasTranslation={hasTranslation}
              />
            )}
            
            {type === 'video' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="hover:bg-primary/20 hover:text-primary"
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MediaPlayer.displayName = 'MediaPlayer';
