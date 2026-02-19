import { useState, useEffect, useRef, useCallback } from 'react';

export type SubtitleEffect = 'none' | 'typing' | 'scroll' | 'karaoke';

interface UseSubtitleEffectOptions {
  text: string;
  effect: SubtitleEffect;
  effectSpeed: number;
  subtitleStartTime: number;
  currentTime: number;
  subtitleDuration: number;
}

interface SubtitleEffectResult {
  displayText: string;
  scrollOffset: number; // 0-100 percentage for scroll effect
  karaokeProgress: number; // 0-1 progress for karaoke effect
  isAnimating: boolean;
}

// Calculate typing effect - characters appear one by one
export function calculateTypingEffect(
  text: string,
  elapsedTime: number, // time since subtitle started (seconds)
  effectSpeed: number, // 1-10
  totalDuration: number
): { displayText: string; isComplete: boolean } {
  if (!text) return { displayText: '', isComplete: true };

  // Speed determines how much of the subtitle duration is used for typing
  // Speed 10 = very fast (use 20% of duration), Speed 1 = slow (use 80% of duration)
  const typingDurationRatio = 0.9 - (effectSpeed / 10) * 0.7; // 0.2 to 0.9
  const typingDuration = totalDuration * typingDurationRatio;

  if (elapsedTime >= typingDuration) {
    return { displayText: text, isComplete: true };
  }

  const progress = Math.min(1, elapsedTime / typingDuration);
  const charCount = Math.floor(text.length * progress);
  
  return { 
    displayText: text.substring(0, charCount), 
    isComplete: false 
  };
}

// Calculate scroll effect - text scrolls from right to center
export function calculateScrollEffect(
  elapsedTime: number, // time since subtitle started (seconds)
  effectSpeed: number, // 1-10
  totalDuration: number
): { scrollOffset: number; isComplete: boolean } {
  // Speed determines how quickly the scroll completes
  // Speed 10 = very fast (use 10% of duration), Speed 1 = slow (use 50% of duration)
  const scrollDurationRatio = 0.55 - (effectSpeed / 10) * 0.45; // 0.1 to 0.55
  const scrollDuration = totalDuration * scrollDurationRatio;

  if (elapsedTime >= scrollDuration) {
    return { scrollOffset: 0, isComplete: true };
  }

  // scrollOffset: 100 = fully right (off screen), 0 = centered
  const progress = Math.min(1, elapsedTime / scrollDuration);
  // Use ease-out curve for smoother animation
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  const scrollOffset = 100 * (1 - easedProgress);

  return { scrollOffset, isComplete: false };
}

// Calculate karaoke effect - text highlights progressively from left to right
export function calculateKaraokeEffect(
  elapsedTime: number, // time since subtitle started (seconds)
  effectSpeed: number, // 1-10
  totalDuration: number
): { progress: number; isComplete: boolean } {
  // Karaoke effect uses the full duration of the subtitle
  // Speed affects how smooth the transition is, but always completes by the end
  if (elapsedTime >= totalDuration) {
    return { progress: 1, isComplete: true };
  }

  const progress = Math.min(1, elapsedTime / totalDuration);
  
  return { 
    progress, 
    isComplete: false 
  };
}

export function useSubtitleEffect({
  text,
  effect,
  effectSpeed,
  subtitleStartTime,
  currentTime,
  subtitleDuration,
}: UseSubtitleEffectOptions): SubtitleEffectResult {
  const elapsedTime = Math.max(0, currentTime - subtitleStartTime);

  if (effect === 'none' || !text) {
    return {
      displayText: text,
      scrollOffset: 0,
      karaokeProgress: 0,
      isAnimating: false,
    };
  }

  if (effect === 'typing') {
    const { displayText, isComplete } = calculateTypingEffect(
      text,
      elapsedTime,
      effectSpeed,
      subtitleDuration
    );
    return {
      displayText,
      scrollOffset: 0,
      karaokeProgress: 0,
      isAnimating: !isComplete,
    };
  }

  if (effect === 'scroll') {
    const { scrollOffset, isComplete } = calculateScrollEffect(
      elapsedTime,
      effectSpeed,
      subtitleDuration
    );
    return {
      displayText: text,
      scrollOffset,
      karaokeProgress: 0,
      isAnimating: !isComplete,
    };
  }

  if (effect === 'karaoke') {
    const { progress, isComplete } = calculateKaraokeEffect(
      elapsedTime,
      effectSpeed,
      subtitleDuration
    );
    return {
      displayText: text,
      scrollOffset: 0,
      karaokeProgress: progress,
      isAnimating: !isComplete,
    };
  }

  return {
    displayText: text,
    scrollOffset: 0,
    karaokeProgress: 0,
    isAnimating: false,
  };
}

// For Canvas rendering (video export)
export function getAnimatedTextForCanvas(
  text: string,
  effect: SubtitleEffect,
  effectSpeed: number,
  elapsedTime: number,
  subtitleDuration: number
): { displayText: string; scrollOffset: number; karaokeProgress: number } {
  if (effect === 'none' || !text) {
    return { displayText: text, scrollOffset: 0, karaokeProgress: 0 };
  }

  if (effect === 'typing') {
    const { displayText } = calculateTypingEffect(text, elapsedTime, effectSpeed, subtitleDuration);
    return { displayText, scrollOffset: 0, karaokeProgress: 0 };
  }

  if (effect === 'scroll') {
    const { scrollOffset } = calculateScrollEffect(elapsedTime, effectSpeed, subtitleDuration);
    return { displayText: text, scrollOffset, karaokeProgress: 0 };
  }

  if (effect === 'karaoke') {
    const { progress } = calculateKaraokeEffect(elapsedTime, effectSpeed, subtitleDuration);
    return { displayText: text, scrollOffset: 0, karaokeProgress: progress };
  }

  return { displayText: text, scrollOffset: 0, karaokeProgress: 0 };
}