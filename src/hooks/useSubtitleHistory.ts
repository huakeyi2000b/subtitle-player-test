import { useState, useCallback } from 'react';
import type { TranslatedSubtitle } from '@/lib/translationService';

interface HistoryState {
  past: TranslatedSubtitle[][];
  present: TranslatedSubtitle[];
  future: TranslatedSubtitle[][];
}

export function useSubtitleHistory(initialSubtitles: TranslatedSubtitle[] = []) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialSubtitles,
    future: [],
  });
  const [clipboard, setClipboard] = useState<TranslatedSubtitle | null>(null);

  const setSubtitles = useCallback((subtitles: TranslatedSubtitle[] | ((prev: TranslatedSubtitle[]) => TranslatedSubtitle[])) => {
    setHistory(prev => {
      const newPresent = typeof subtitles === 'function' ? subtitles(prev.present) : subtitles;
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const setSubtitlesWithoutHistory = useCallback((subtitles: TranslatedSubtitle[] | ((prev: TranslatedSubtitle[]) => TranslatedSubtitle[])) => {
    setHistory(prev => ({
      ...prev,
      present: typeof subtitles === 'function' ? subtitles(prev.present) : subtitles,
    }));
  }, []);

  const resetHistory = useCallback((subtitles: TranslatedSubtitle[]) => {
    setHistory({
      past: [],
      present: subtitles,
      future: [],
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const next = newFuture.shift()!;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Clipboard operations
  const copySubtitle = useCallback((subtitle: TranslatedSubtitle) => {
    setClipboard({ ...subtitle });
  }, []);

  const pasteSubtitle = useCallback((afterId?: number) => {
    if (!clipboard) return;
    
    setHistory(prev => {
      const newId = Math.max(...prev.present.map(s => s.id), 0) + 1;
      const newSubtitle: TranslatedSubtitle = {
        ...clipboard,
        id: newId,
        startTime: clipboard.startTime + 1,
        endTime: clipboard.endTime + 1,
      };
      
      let newSubtitles: TranslatedSubtitle[];
      if (afterId !== undefined) {
        const index = prev.present.findIndex(s => s.id === afterId);
        if (index >= 0) {
          newSubtitles = [
            ...prev.present.slice(0, index + 1),
            newSubtitle,
            ...prev.present.slice(index + 1),
          ];
        } else {
          newSubtitles = [...prev.present, newSubtitle];
        }
      } else {
        newSubtitles = [...prev.present, newSubtitle];
      }
      
      // Re-index
      newSubtitles = newSubtitles
        .sort((a, b) => a.startTime - b.startTime)
        .map((s, i) => ({ ...s, id: i + 1 }));
      
      return {
        past: [...prev.past, prev.present],
        present: newSubtitles,
        future: [],
      };
    });
  }, [clipboard]);

  const insertSubtitle = useCallback((afterTime: number, duration: number = 2) => {
    setHistory(prev => {
      const newId = Math.max(...prev.present.map(s => s.id), 0) + 1;
      const newSubtitle: TranslatedSubtitle = {
        id: newId,
        text: '新字幕',
        startTime: afterTime,
        endTime: afterTime + duration,
      };
      
      const newSubtitles = [...prev.present, newSubtitle]
        .sort((a, b) => a.startTime - b.startTime)
        .map((s, i) => ({ ...s, id: i + 1 }));
      
      return {
        past: [...prev.past, prev.present],
        present: newSubtitles,
        future: [],
      };
    });
  }, []);

  const deleteSubtitle = useCallback((id: number) => {
    setHistory(prev => {
      const newSubtitles = prev.present
        .filter(s => s.id !== id)
        .map((s, i) => ({ ...s, id: i + 1 }));
      
      return {
        past: [...prev.past, prev.present],
        present: newSubtitles,
        future: [],
      };
    });
  }, []);

  return {
    subtitles: history.present,
    setSubtitles,
    setSubtitlesWithoutHistory,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clipboard,
    copySubtitle,
    pasteSubtitle,
    insertSubtitle,
    deleteSubtitle,
  };
}
