import { useState, useEffect } from 'react';
import { Settings, Key, Eye, EyeOff, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_KEY_STORAGE_KEY = 'elevenlabs_api_key';

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = getStoredApiKey();
      setApiKey(storedKey);
      setIsSaved(!!storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsSaved(true);
      toast.success('API Key 已保存');
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setIsSaved(false);
      toast.info('API Key 已清除');
    }
    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setIsSaved(false);
    toast.info('API Key 已清除');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <span className="gradient-text">设置</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            配置应用程序设置和 API 密钥
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ElevenLabs API Key Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                ElevenLabs API Key
              </Label>
              {isSaved && apiKey && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  已配置
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的 ElevenLabs API Key..."
                  className="pr-10 bg-secondary/50 border-border font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                用于 AI 语音识别生成字幕。API Key 将安全存储在本地浏览器中。
              </p>
              
              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                获取 ElevenLabs API Key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {apiKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                清除 API Key
              </Button>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <h4 className="text-sm font-medium text-foreground mb-2">关于 API Key</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• API Key 存储在本地浏览器，不会上传到服务器</li>
              <li>• 使用您自己的 API Key 可以避免配额限制</li>
              <li>• 如果未设置，将使用默认的服务端配置</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
