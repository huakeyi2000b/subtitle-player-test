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
  // Bilingual settings
  showOriginal: boolean;
  showTranslation: boolean;
  translationPosition: 'above' | 'below'; // Translation position relative to original
  translationFontSize: number;
  translationFontColor: string;
  translationFontWeight: 'normal' | 'medium' | 'bold';
  translationFontFamily: FontFamily;
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

const defaultStyle: SubtitleStyle = {
  fontSize: 20,
  fontColor: '#ffffff',
  fontFamily: 'noto-sans-sc',
  backgroundColor: '#000000',
  backgroundOpacity: 80,
  position: 'bottom',
  fontWeight: 'medium',
  // Bilingual defaults
  showOriginal: true,
  showTranslation: true,
  translationPosition: 'below',
  translationFontSize: 18,
  translationFontColor: '#ffff00',
  translationFontWeight: 'medium',
  translationFontFamily: 'noto-sans-sc',
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
      <PopoverContent className="w-80 bg-card border-border z-50 max-h-[80vh] overflow-y-auto" align="end" sideOffset={8}>
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
