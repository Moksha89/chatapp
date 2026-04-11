import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Droplets,
  Type,
  X,
  Send,
  Undo2,
  Palette,
} from 'lucide-react';

interface MediaEditorProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onSend: (editedFile: File, caption?: string) => void;
}

type FilterPreset = 'none' | 'grayscale' | 'sepia' | 'warm' | 'cool' | 'vintage' | 'dramatic';

interface EditState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  filter: FilterPreset;
  caption: string;
}

const FILTER_PRESETS: Record<FilterPreset, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%)',
  warm: 'sepia(30%) saturate(140%) hue-rotate(-10deg)',
  cool: 'saturate(80%) hue-rotate(20deg) brightness(105%)',
  vintage: 'sepia(40%) contrast(90%) brightness(90%) saturate(80%)',
  dramatic: 'contrast(150%) saturate(120%) brightness(90%)',
};

const defaultState: EditState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation: 0,
  flipH: false,
  flipV: false,
  filter: 'none',
  caption: '',
};

export function MediaEditor({ file, open, onClose, onSend }: MediaEditorProps) {
  const [editState, setEditState] = useState<EditState>({ ...defaultState });
  const [activeTab, setActiveTab] = useState<'adjust' | 'filter' | 'text'>('adjust');
  const [history, setHistory] = useState<EditState[]>([{ ...defaultState }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  // Create preview URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset state when file changes
  useEffect(() => {
    setEditState({ ...defaultState });
    setHistory([{ ...defaultState }]);
    setHistoryIndex(0);
  }, [file]);

  // Load image for canvas rendering
  useEffect(() => {
    if (!isImage) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = previewUrl;
  }, [previewUrl, isImage]);

  const pushHistory = useCallback((newState: EditState) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const update = useCallback((partial: Partial<EditState>) => {
    setEditState(prev => {
      const next = { ...prev, ...partial };
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setEditState(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const getCssFilter = useCallback(() => {
    const parts: string[] = [];
    if (editState.brightness !== 100) parts.push(`brightness(${editState.brightness}%)`);
    if (editState.contrast !== 100) parts.push(`contrast(${editState.contrast}%)`);
    if (editState.saturation !== 100) parts.push(`saturate(${editState.saturation}%)`);
    const preset = FILTER_PRESETS[editState.filter];
    if (preset) parts.push(preset);
    return parts.join(' ') || 'none';
  }, [editState]);

  const getTransform = useCallback(() => {
    const parts: string[] = [];
    if (editState.rotation) parts.push(`rotate(${editState.rotation}deg)`);
    if (editState.flipH) parts.push('scaleX(-1)');
    if (editState.flipV) parts.push('scaleY(-1)');
    return parts.join(' ') || 'none';
  }, [editState]);

  // Export edited image to File
  const exportEditedImage = useCallback(async (): Promise<File> => {
    if (!isImage || !imgRef.current) return file;

    const img = imgRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const isRotated90 = editState.rotation === 90 || editState.rotation === 270;
    canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;

    ctx.save();
    ctx.filter = getCssFilter() === 'none' ? '' : getCssFilter();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((editState.rotation * Math.PI) / 180);
    ctx.scale(editState.flipH ? -1 : 1, editState.flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Add caption overlay if present
    if (editState.caption.trim()) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      const textHeight = 60;
      ctx.fillRect(0, canvas.height - textHeight, canvas.width, textHeight);
      ctx.fillStyle = 'white';
      ctx.font = `${Math.max(16, canvas.width / 30)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(editState.caption, canvas.width / 2, canvas.height - textHeight / 2, canvas.width - 40);
      ctx.restore();
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            resolve(file);
          }
        },
        file.type,
        0.92
      );
    });
  }, [isImage, editState, getCssFilter, file]);

  const handleSend = useCallback(async () => {
    const editedFile = await exportEditedImage();
    onSend(editedFile, editState.caption.trim() || undefined);
  }, [exportEditedImage, onSend, editState.caption]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-gray-900">
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-gray-700">
            <X className="h-5 w-5" />
          </Button>
          <span className="text-white font-medium text-sm">Edit Media</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} className="text-white hover:bg-gray-700">
              <Undo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center bg-black min-h-[400px] max-h-[500px] overflow-hidden p-4">
          {isImage && (
            <img
              src={previewUrl}
              alt="Edit preview"
              className="max-w-full max-h-[480px] object-contain transition-all duration-200"
              style={{
                filter: getCssFilter(),
                transform: getTransform(),
              }}
            />
          )}
          {isVideo && (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-[480px] object-contain transition-all duration-200"
              style={{
                filter: getCssFilter(),
                transform: getTransform(),
              }}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          {(['adjust', 'filter', 'text'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'adjust' && <Sun className="h-4 w-4 inline mr-1" />}
              {tab === 'filter' && <Palette className="h-4 w-4 inline mr-1" />}
              {tab === 'text' && <Type className="h-4 w-4 inline mr-1" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-800 space-y-4">
          {activeTab === 'adjust' && (
            <>
              {/* Quick actions */}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700"
                  onClick={() => update({ rotation: (editState.rotation + 90) % 360 })}>
                  <RotateCw className="h-4 w-4 mr-1" /> Rotate
                </Button>
                <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700"
                  onClick={() => update({ flipH: !editState.flipH })}>
                  <FlipHorizontal className="h-4 w-4 mr-1" /> Flip H
                </Button>
                <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700"
                  onClick={() => update({ flipV: !editState.flipV })}>
                  <FlipVertical className="h-4 w-4 mr-1" /> Flip V
                </Button>
              </div>

              {/* Sliders */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Sun className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 w-20">Brightness</span>
                  <Slider
                    value={[editState.brightness]}
                    min={30}
                    max={200}
                    step={1}
                    onValueChange={([v]) => update({ brightness: v })}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-400 w-8">{editState.brightness}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Contrast className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 w-20">Contrast</span>
                  <Slider
                    value={[editState.contrast]}
                    min={30}
                    max={200}
                    step={1}
                    onValueChange={([v]) => update({ contrast: v })}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-400 w-8">{editState.contrast}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 w-20">Saturation</span>
                  <Slider
                    value={[editState.saturation]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) => update({ saturation: v })}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-400 w-8">{editState.saturation}%</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'filter' && (
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => update({ filter: preset })}
                  className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                    editState.filter === preset ? 'border-green-400' : 'border-transparent hover:border-gray-500'
                  }`}
                >
                  {isImage && previewUrl && (
                    <img
                      src={previewUrl}
                      alt={preset}
                      className="w-full h-16 object-cover"
                      style={{ filter: FILTER_PRESETS[preset] || 'none' }}
                    />
                  )}
                  {isVideo && (
                    <div className="w-full h-16 bg-gray-700 flex items-center justify-center"
                      style={{ filter: FILTER_PRESETS[preset] || 'none' }}>
                      <span className="text-xs text-gray-300">Video</span>
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-white text-center py-0.5 capitalize">
                    {preset}
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Caption / Text Overlay</label>
              <textarea
                value={editState.caption}
                onChange={(e) => setEditState(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Add a caption to your media..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-green-400"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 text-right">{editState.caption.length}/200</p>
            </div>
          )}
        </div>

        {/* Send button */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 bg-gray-800 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
