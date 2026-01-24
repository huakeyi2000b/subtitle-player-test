import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type FontFamily = 
  | 'noto-sans-sc' 
  | 'noto-serif-sc' 
  | 'ma-shan-zheng' 
  | 'zcool-kuaile' 
  | 'zcool-xiaowei'
  | 'lxgw-wenkai'
  | 'source-han-sans'
  | 'source-han-serif';

export interface SubtitleStyle {
  fontSize: number;
  fontColor: string;
  fontFamily: FontFamily;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'bottom' | 'top' | 'center';
  fontWeight: 'normal' | 'medium' | 'bold';
  // Text processing
  removePunctuation: boolean; // Remove punctuation marks like periods and commas
  // Text effects
  textStroke: boolean;
  textStrokeWidth: number;
  textStrokeColor: string;
  textShadow: boolean;
  textShadowBlur: number;
  textShadowColor: string;
  textShadowOffsetX: number;
  textShadowOffsetY: number;
  // Bilingual settings
  showOriginal: boolean;
  showTranslation: boolean;
  translationPosition: 'above' | 'below'; // Translation position relative to original
  translationFontSize: number;
  translationFontColor: string;
  translationFontWeight: 'normal' | 'medium' | 'bold';
  translationFontFamily: FontFamily;
  // Translation text effects
  translationTextStroke: boolean;
  translationTextStrokeWidth: number;
  translationTextStrokeColor: string;
  translationTextShadow: boolean;
  translationTextShadowBlur: number;
  translationTextShadowColor: string;
  translationTextShadowOffsetX: number;
  translationTextShadowOffsetY: number;
}

export const fontFamilyOptions: { value: FontFamily; name: string; css: string }[] = [
  { value: 'noto-sans-sc', name: '思源黑体', css: '"Noto Sans SC", sans-serif' },
  { value: 'noto-serif-sc', name: '思源宋体', css: '"Noto Serif SC", serif' },
  { value: 'ma-shan-zheng', name: '马山正楷', css: '"Ma Shan Zheng", cursive' },
  { value: 'zcool-kuaile', name: 'ZCOOL快乐体', css: '"ZCOOL KuaiLe", cursive' },
  { value: 'zcool-xiaowei', name: 'ZCOOL小薇体', css: '"ZCOOL XiaoWei", serif' },
  { value: 'lxgw-wenkai', name: '霞鹜文楷', css: '"LXGW WenKai", cursive' },
  { value: 'source-han-sans', name: '思源黑体Pro', css: '"Source Han Sans SC", sans-serif' },
  { value: 'source-han-serif', name: '思源宋体Pro', css: '"Source Han Serif SC", serif' },
];

export const getFontFamilyCSS = (fontFamily: FontFamily): string => {
  return fontFamilyOptions.find(f => f.value === fontFamily)?.css || fontFamilyOptions[0].css;
};

// Function to remove punctuation from text
export const removePunctuationFromText = (text: string): string => {
  // Remove common punctuation marks (periods, commas, semicolons, colons, etc.)
  // Keep spaces and other characters intact
  return text.replace(/[.,;:!?。，；：！？、]/g, '');
};

export const getTextEffectsCSS = (style: SubtitleStyle, isTranslation: boolean = false): React.CSSProperties => {
  const textStroke = isTranslation ? style.translationTextStroke : style.textStroke;
  const textStrokeWidth = isTranslation ? style.translationTextStrokeWidth : style.textStrokeWidth;
  const textStrokeColor = isTranslation ? style.translationTextStrokeColor : style.textStrokeColor;
  const textShadow = isTranslation ? style.translationTextShadow : style.textShadow;
  const textShadowBlur = isTranslation ? style.translationTextShadowBlur : style.textShadowBlur;
  const textShadowColor = isTranslation ? style.translationTextShadowColor : style.textShadowColor;
  const textShadowOffsetX = isTranslation ? style.translationTextShadowOffsetX : style.textShadowOffsetX;
  const textShadowOffsetY = isTranslation ? style.translationTextShadowOffsetY : style.textShadowOffsetY;

  const effects: any = {};

  if (textStroke) {
    effects.WebkitTextStroke = `${textStrokeWidth}px ${textStrokeColor}`;
  }

  if (textShadow) {
    effects.textShadow = `${textShadowOffsetX}px ${textShadowOffsetY}px ${textShadowBlur}px ${textShadowColor}`;
  }

  return effects;
};

const defaultStyle: SubtitleStyle = {
  fontSize: 20,
  fontColor: '#ffffff',
  fontFamily: 'noto-sans-sc',
  backgroundColor: '#000000',
  backgroundOpacity: 80,
  position: 'bottom',
  fontWeight: 'medium',
  // Text processing defaults
  removePunctuation: false,
  // Text effects defaults
  textStroke: false,
  textStrokeWidth: 1,
  textStrokeColor: '#000000',
  textShadow: true,
  textShadowBlur: 2,
  textShadowColor: '#000000',
  textShadowOffsetX: 1,
  textShadowOffsetY: 1,
  // Bilingual defaults
  showOriginal: true,
  showTranslation: true,
  translationPosition: 'below',
  translationFontSize: 18,
  translationFontColor: '#ffff00',
  translationFontWeight: 'medium',
  translationFontFamily: 'noto-sans-sc',
  // Translation text effects defaults
  translationTextStroke: false,
  translationTextStrokeWidth: 1,
  translationTextStrokeColor: '#000000',
  translationTextShadow: true,
  translationTextShadowBlur: 2,
  translationTextShadowColor: '#000000',
  translationTextShadowOffsetX: 1,
  translationTextShadowOffsetY: 1,
};

const colorPresets = [
  { name: '白色', value: '#ffffff' },
  { name: '黄色', value: '#ffff00' },
  { name: '青色', value: '#00ffff' },
  { name: '绿色', value: '#00ff00' },
  { name: '粉色', value: '#ff69b4' },
  { name: '橙色', value: '#ffa500' },
];

const bgColorPresets = [
  { name: '黑色', value: '#000000' },
  { name: '深蓝', value: '#1a1a2e' },
  { name: '深紫', value: '#2d1b4e' },
  { name: '深绿', value: '#1a2e1a' },
];

interface SubtitleStyleSettingsProps {
  style: SubtitleStyle;
  onStyleChange: (style: SubtitleStyle) => void;
  hasTranslation?: boolean;
}

export function SubtitleStyleSettings({ style, onStyleChange, hasTranslation = false }: SubtitleStyleSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateStyle = (updates: Partial<SubtitleStyle>) => {
    onStyleChange({ ...style, ...updates });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20 hover:text-primary"
          title="字幕样式设置"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-80 w-[calc(100vw-2rem)] bg-card border-border max-h-[70vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl" 
        align="end" 
        alignOffset={-8}
        sideOffset={8}
        style={{ zIndex: 10000 }}
        avoidCollisions={true}
        collisionPadding={20}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">字幕样式设置</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStyleChange(defaultStyle)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              重置默认
            </Button>
          </div>

          {/* Bilingual Display Settings */}
          {hasTranslation && (
            <div className="space-y-3 pb-3 border-b border-border">
              <Label className="text-sm font-medium text-foreground">双语显示</Label>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">显示原文</Label>
                <Switch
                  checked={style.showOriginal}
                  onCheckedChange={(checked) => updateStyle({ showOriginal: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">显示译文</Label>
                <Switch
                  checked={style.showTranslation}
                  onCheckedChange={(checked) => updateStyle({ showTranslation: checked })}
                />
              </div>

              {style.showOriginal && style.showTranslation && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">译文位置</Label>
                  <Select
                    value={style.translationPosition}
                    onValueChange={(v) => updateStyle({ translationPosition: v as 'above' | 'below' })}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      <SelectItem value="above">译文在上</SelectItem>
                      <SelectItem value="below">译文在下</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {style.showTranslation && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">译文字号</Label>
                      <span className="text-sm text-foreground">{style.translationFontSize}px</span>
                    </div>
                    <Slider
                      value={[style.translationFontSize]}
                      min={12}
                      max={32}
                      step={1}
                      onValueChange={(v) => updateStyle({ translationFontSize: v[0] })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">译文字体</Label>
                    <Select
                      value={style.translationFontFamily}
                      onValueChange={(v) => updateStyle({ translationFontFamily: v as FontFamily })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        {fontFamilyOptions.map((font) => (
                          <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.css }}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">译文粗细</Label>
                    <Select
                      value={style.translationFontWeight}
                      onValueChange={(v) => updateStyle({ translationFontWeight: v as SubtitleStyle['translationFontWeight'] })}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="normal">常规</SelectItem>
                        <SelectItem value="medium">中等</SelectItem>
                        <SelectItem value="bold">粗体</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">译文颜色</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorPresets.map((color) => (
                        <button
                          key={`trans-${color.value}`}
                          onClick={() => updateStyle({ translationFontColor: color.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            style.translationFontColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Translation Text Stroke */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">译文边框</Label>
                      <Switch
                        checked={style.translationTextStroke}
                        onCheckedChange={(checked) => updateStyle({ translationTextStroke: checked })}
                      />
                    </div>
                    
                    {style.translationTextStroke && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">边框宽度</Label>
                            <span className="text-xs text-foreground">{style.translationTextStrokeWidth}px</span>
                          </div>
                          <Slider
                            value={[style.translationTextStrokeWidth]}
                            min={1}
                            max={5}
                            step={0.5}
                            onValueChange={(v) => updateStyle({ translationTextStrokeWidth: v[0] })}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">边框颜色</Label>
                          <div className="flex flex-wrap gap-1">
                            {[{ name: '黑色', value: '#000000' }, { name: '白色', value: '#ffffff' }].map((color) => (
                              <button
                                key={`trans-stroke-${color.value}`}
                                onClick={() => updateStyle({ translationTextStrokeColor: color.value })}
                                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                                  style.translationTextStrokeColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Translation Text Shadow */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">译文阴影</Label>
                      <Switch
                        checked={style.translationTextShadow}
                        onCheckedChange={(checked) => updateStyle({ translationTextShadow: checked })}
                      />
                    </div>
                    
                    {style.translationTextShadow && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">模糊半径</Label>
                            <span className="text-xs text-foreground">{style.translationTextShadowBlur}px</span>
                          </div>
                          <Slider
                            value={[style.translationTextShadowBlur]}
                            min={0}
                            max={10}
                            step={1}
                            onValueChange={(v) => updateStyle({ translationTextShadowBlur: v[0] })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">水平</Label>
                            <Slider
                              value={[style.translationTextShadowOffsetX]}
                              min={-5}
                              max={5}
                              step={1}
                              onValueChange={(v) => updateStyle({ translationTextShadowOffsetX: v[0] })}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">垂直</Label>
                            <Slider
                              value={[style.translationTextShadowOffsetY]}
                              min={-5}
                              max={5}
                              step={1}
                              onValueChange={(v) => updateStyle({ translationTextShadowOffsetY: v[0] })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">字体选择</Label>
            <Select
              value={style.fontFamily}
              onValueChange={(v) => updateStyle({ fontFamily: v as FontFamily })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {fontFamilyOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.css }}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">字体大小</Label>
              <span className="text-sm text-foreground">{style.fontSize}px</span>
            </div>
            <Slider
              value={[style.fontSize]}
              min={14}
              max={36}
              step={1}
              onValueChange={(v) => updateStyle({ fontSize: v[0] })}
            />
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">字体粗细</Label>
            <Select
              value={style.fontWeight}
              onValueChange={(v) => updateStyle({ fontWeight: v as SubtitleStyle['fontWeight'] })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="normal">常规</SelectItem>
                <SelectItem value="medium">中等</SelectItem>
                <SelectItem value="bold">粗体</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remove Punctuation */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">移除标点符号</Label>
              <p className="text-xs text-muted-foreground">移除句号、逗号等标点符号</p>
            </div>
            <Switch
              checked={style.removePunctuation}
              onCheckedChange={(checked) => updateStyle({ removePunctuation: checked })}
            />
          </div>

          {/* Font Color */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">字体颜色</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateStyle({ fontColor: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    style.fontColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <input
                type="color"
                value={style.fontColor}
                onChange={(e) => updateStyle({ fontColor: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
                title="自定义颜色"
              />
            </div>
          </div>

          {/* Text Stroke */}
          <div className="space-y-3 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">字体边框</Label>
              <Switch
                checked={style.textStroke}
                onCheckedChange={(checked) => updateStyle({ textStroke: checked })}
              />
            </div>
            
            {style.textStroke && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">边框宽度</Label>
                    <span className="text-xs text-foreground">{style.textStrokeWidth}px</span>
                  </div>
                  <Slider
                    value={[style.textStrokeWidth]}
                    min={1}
                    max={5}
                    step={0.5}
                    onValueChange={(v) => updateStyle({ textStrokeWidth: v[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">边框颜色</Label>
                  <div className="flex flex-wrap gap-1">
                    {[{ name: '黑色', value: '#000000' }, { name: '白色', value: '#ffffff' }, { name: '灰色', value: '#808080' }].map((color) => (
                      <button
                        key={`stroke-${color.value}`}
                        onClick={() => updateStyle({ textStrokeColor: color.value })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          style.textStrokeColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={style.textStrokeColor}
                      onChange={(e) => updateStyle({ textStrokeColor: e.target.value })}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                      title="自定义颜色"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Text Shadow */}
          <div className="space-y-3 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">字体阴影</Label>
              <Switch
                checked={style.textShadow}
                onCheckedChange={(checked) => updateStyle({ textShadow: checked })}
              />
            </div>
            
            {style.textShadow && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">模糊半径</Label>
                    <span className="text-xs text-foreground">{style.textShadowBlur}px</span>
                  </div>
                  <Slider
                    value={[style.textShadowBlur]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(v) => updateStyle({ textShadowBlur: v[0] })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">水平偏移</Label>
                      <span className="text-xs text-foreground">{style.textShadowOffsetX}px</span>
                    </div>
                    <Slider
                      value={[style.textShadowOffsetX]}
                      min={-5}
                      max={5}
                      step={1}
                      onValueChange={(v) => updateStyle({ textShadowOffsetX: v[0] })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">垂直偏移</Label>
                      <span className="text-xs text-foreground">{style.textShadowOffsetY}px</span>
                    </div>
                    <Slider
                      value={[style.textShadowOffsetY]}
                      min={-5}
                      max={5}
                      step={1}
                      onValueChange={(v) => updateStyle({ textShadowOffsetY: v[0] })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">阴影颜色</Label>
                  <div className="flex flex-wrap gap-1">
                    {[{ name: '黑色', value: '#000000' }, { name: '白色', value: '#ffffff' }, { name: '灰色', value: '#808080' }].map((color) => (
                      <button
                        key={`shadow-${color.value}`}
                        onClick={() => updateStyle({ textShadowColor: color.value })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          style.textShadowColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={style.textShadowColor}
                      onChange={(e) => updateStyle({ textShadowColor: e.target.value })}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                      title="自定义颜色"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">背景颜色</Label>
            <div className="flex flex-wrap gap-2">
              {bgColorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateStyle({ backgroundColor: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    style.backgroundColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent"
                title="自定义颜色"
              />
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">背景透明度</Label>
              <span className="text-sm text-foreground">{style.backgroundOpacity}%</span>
            </div>
            <Slider
              value={[style.backgroundOpacity]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => updateStyle({ backgroundOpacity: v[0] })}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">字幕位置</Label>
            <Select
              value={style.position}
              onValueChange={(v) => updateStyle({ position: v as SubtitleStyle['position'] })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="bottom">底部</SelectItem>
                <SelectItem value="center">中间</SelectItem>
                <SelectItem value="top">顶部</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="pt-2 border-t border-border">
            <Label className="text-sm text-muted-foreground mb-2 block">预览效果</Label>
            <div 
              className="relative h-20 bg-muted rounded-lg flex items-end justify-center overflow-hidden"
              style={{
                backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted-foreground) / 0.1) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted-foreground) / 0.1) 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            >
              <div
                className={`absolute left-4 right-4 flex justify-center ${
                  style.position === 'top' ? 'top-2' : style.position === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-2'
                }`}
              >
                <div
                  className="px-3 py-1.5 rounded-md backdrop-blur-sm"
                  style={{
                    backgroundColor: `${style.backgroundColor}${Math.round(style.backgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
                  }}
                >
                  <span
                    style={{
                      color: style.fontColor,
                      fontSize: `${Math.min(style.fontSize, 16)}px`,
                      fontWeight: style.fontWeight === 'bold' ? 700 : style.fontWeight === 'medium' ? 500 : 400,
                    }}
                  >
                    这是字幕预览效果
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { defaultStyle as defaultSubtitleStyle };
