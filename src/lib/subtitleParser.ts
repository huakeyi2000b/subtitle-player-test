export interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

// Parse SRT time format (00:00:00,000) to seconds
function parseSrtTime(timeString: string): number {
  const [time, ms] = timeString.trim().split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

// Parse VTT time format (00:00:00.000) to seconds
function parseVttTime(timeString: string): number {
  const parts = timeString.trim().split(':');
  let hours = 0, minutes = 0, seconds = 0;
  
  if (parts.length === 3) {
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0]);
    seconds = parseFloat(parts[1]);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseSRT(content: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = content.trim().split(/\n\n+/);
  
  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length < 2) continue;
    
    // Find the timing line (contains -->)
    let timingLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingLineIndex = i;
        break;
      }
    }
    
    if (timingLineIndex === -1) continue;
    
    const id = timingLineIndex > 0 ? parseInt(lines[0]) || subtitles.length + 1 : subtitles.length + 1;
    const timingLine = lines[timingLineIndex];
    const [startStr, endStr] = timingLine.split('-->');
    
    if (!startStr || !endStr) continue;
    
    const startTime = parseSrtTime(startStr);
    const endTime = parseSrtTime(endStr);
    const text = lines.slice(timingLineIndex + 1).join('\n');
    
    if (!isNaN(startTime) && !isNaN(endTime) && text) {
      subtitles.push({ id, startTime, endTime, text });
    }
  }
  
  return subtitles;
}

export function parseVTT(content: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  // Remove WEBVTT header and any metadata
  const lines = content.split('\n');
  const startIndex = lines.findIndex(line => line.includes('WEBVTT')) + 1;
  const cleanContent = lines.slice(startIndex).join('\n');
  
  const blocks = cleanContent.trim().split(/\n\n+/);
  let id = 1;
  
  for (const block of blocks) {
    const blockLines = block.split('\n').filter(line => line.trim());
    if (blockLines.length < 2) continue;
    
    // Find the timing line
    let timingLineIndex = -1;
    for (let i = 0; i < blockLines.length; i++) {
      if (blockLines[i].includes('-->')) {
        timingLineIndex = i;
        break;
      }
    }
    
    if (timingLineIndex === -1) continue;
    
    const timingLine = blockLines[timingLineIndex];
    const [startStr, endStr] = timingLine.split('-->');
    
    if (!startStr || !endStr) continue;
    
    const startTime = parseVttTime(startStr);
    const endTime = parseVttTime(endStr.split(' ')[0]); // Remove position metadata
    const text = blockLines.slice(timingLineIndex + 1).join('\n');
    
    if (!isNaN(startTime) && !isNaN(endTime) && text) {
      subtitles.push({ id: id++, startTime, endTime, text });
    }
  }
  
  return subtitles;
}

export function parseSubtitleFile(content: string, filename: string): Subtitle[] {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (extension === 'vtt') {
    return parseVTT(content);
  }
  
  return parseSRT(content);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
