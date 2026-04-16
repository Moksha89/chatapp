import { useState, useEffect } from 'react';
import {
  X, Palette, Check, Image, Paintbrush,
  Type, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ThemeConfig {
  chatBubbleColor: string;
  wallpaper: string;
  fontSize: string;
  chatBubbleStyle: string;
}

const BUBBLE_COLORS = [
  '#246BFD', '#6C5CE7', '#00B894', '#FDCB6E', '#E17055',
  '#0984E3', '#6C5CE7', '#00CEC9', '#FF7675', '#636E72',
  '#2D3436', '#74B9FF', '#A29BFE', '#55EFC4', '#FFEAA7',
];

const WALLPAPERS = [
  { id: 'none', label: 'None', preview: 'bg-white' },
  { id: 'gradient-blue', label: 'Ocean', preview: 'bg-gradient-to-br from-blue-100 to-cyan-50' },
  { id: 'gradient-purple', label: 'Lavender', preview: 'bg-gradient-to-br from-purple-100 to-pink-50' },
  { id: 'gradient-green', label: 'Forest', preview: 'bg-gradient-to-br from-green-100 to-emerald-50' },
  { id: 'gradient-sunset', label: 'Sunset', preview: 'bg-gradient-to-br from-orange-100 to-rose-50' },
  { id: 'gradient-dark', label: 'Dark', preview: 'bg-gradient-to-br from-gray-800 to-gray-900' },
  { id: 'pattern-dots', label: 'Dots', preview: 'bg-gray-50' },
  { id: 'pattern-lines', label: 'Lines', preview: 'bg-gray-100' },
];

const FONT_SIZES = [
  { id: 'small', label: 'Small', size: '13px' },
  { id: 'medium', label: 'Medium', size: '15px' },
  { id: 'large', label: 'Large', size: '17px' },
];

const BUBBLE_STYLES = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'bubble', label: 'Bubble' },
];

export function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps) {
  const [config, setConfig] = useState<ThemeConfig>({
    chatBubbleColor: '#246BFD',
    wallpaper: 'none',
    fontSize: 'medium',
    chatBubbleStyle: 'rounded',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('themeSettings');
        if (stored) setConfig(JSON.parse(stored));
      } catch { /* defaults */ }
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<ThemeConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem('themeSettings', JSON.stringify(updated));
    // Apply theme to document
    document.documentElement.style.setProperty('--chat-bubble-color', updated.chatBubbleColor);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Palette className="w-4 h-4 text-[#246BFD]" />
            </div>
            Chat Themes
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="p-4">
            <div className={`rounded-xl p-4 min-h-[120px] relative overflow-hidden ${
              WALLPAPERS.find(w => w.id === config.wallpaper)?.preview || 'bg-white'
            } border border-gray-100`}>
              <div className="space-y-2">
                <div className="flex justify-start">
                  <div className="bg-white/80 backdrop-blur rounded-2xl rounded-tl-sm px-3 py-2 max-w-[70%] shadow-sm">
                    <p className="text-gray-800" style={{ fontSize: FONT_SIZES.find(f => f.id === config.fontSize)?.size }}>Hey! How are you?</p>
                    <p className="text-[10px] text-gray-400 text-right mt-0.5">10:30 AM</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[70%] text-white shadow-sm" style={{ backgroundColor: config.chatBubbleColor }}>
                    <p style={{ fontSize: FONT_SIZES.find(f => f.id === config.fontSize)?.size }}>I'm great, thanks!</p>
                    <p className="text-[10px] text-white/70 text-right mt-0.5">10:31 AM ✓✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat bubble color */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Paintbrush className="h-3 w-3" /> Bubble Color
            </p>
            <div className="flex flex-wrap gap-2">
              {BUBBLE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => updateConfig({ chatBubbleColor: color })}
                  className={`w-9 h-9 rounded-xl transition-all ${
                    config.chatBubbleColor === color ? 'ring-2 ring-offset-2 ring-[#246BFD] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {config.chatBubbleColor === color && (
                    <Check className="w-4 h-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Wallpaper */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Image className="h-3 w-3" /> Wallpaper
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WALLPAPERS.map(w => (
                <button
                  key={w.id}
                  onClick={() => updateConfig({ wallpaper: w.id })}
                  className={`aspect-square rounded-xl ${w.preview} border-2 transition-all flex items-center justify-center ${
                    config.wallpaper === w.id ? 'border-[#246BFD] shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {config.wallpaper === w.id && (
                    <div className="w-5 h-5 rounded-full bg-[#246BFD] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="sr-only">{w.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {WALLPAPERS.map(w => (
                <span key={w.id} className={`text-[9px] px-1.5 py-0.5 rounded ${config.wallpaper === w.id ? 'bg-[#246BFD]/10 text-[#246BFD] font-medium' : 'text-gray-400'}`}>
                  {w.label}
                </span>
              ))}
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Font size */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Type className="h-3 w-3" /> Font Size
            </p>
            <div className="flex gap-2">
              {FONT_SIZES.map(f => (
                <button
                  key={f.id}
                  onClick={() => updateConfig({ fontSize: f.id })}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition ${
                    config.fontSize === f.id
                      ? 'border-[#246BFD] bg-[#246BFD]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900" style={{ fontSize: f.size }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Bubble style */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Bubble Style
            </p>
            <div className="flex gap-2">
              {BUBBLE_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => updateConfig({ chatBubbleStyle: s.id })}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition ${
                    config.chatBubbleStyle === s.id
                      ? 'border-[#246BFD] bg-[#246BFD]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-6 mx-auto mb-1 ${
                    s.id === 'rounded' ? 'rounded-xl' : s.id === 'sharp' ? 'rounded-sm' : 'rounded-full'
                  }`} style={{ backgroundColor: config.chatBubbleColor, opacity: 0.6 }} />
                  <span className="text-xs font-medium text-gray-700">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              updateConfig({ chatBubbleColor: '#246BFD', wallpaper: 'none', fontSize: 'medium', chatBubbleStyle: 'rounded' });
            }}
            className="flex-1 rounded-xl"
          >
            Reset
          </Button>
          <Button onClick={onClose} className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
