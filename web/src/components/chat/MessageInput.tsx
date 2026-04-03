import { useRef } from 'react';
import { Button } from '../ui/button';
import {
  Send,
  Paperclip,
  Mic,
  Image,
  Video,
  Camera,
  FileText,
  BarChart3,
  MapPin,
  User,
  Smile,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

interface MessageInputProps {
  inputValue: string;
  viewOnceMode: boolean;
  showAttachMenu: boolean;
  recordingState: 'idle' | 'recording';
  recordingTime: number;
  isVideoNote: boolean;
  isUploading: boolean;
  uploadProgress: number;
  replyingTo: { id: string; senderId: string; content?: string } | null;
  userId: string;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onToggleAttachMenu: () => void;
  onToggleViewOnce: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  onStartAudioRecording: () => void;
  onStartVideoNoteRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onClearReply: () => void;
  onShowPollCreator: () => void;
  onShowLocationPicker: () => void;
  onShowContactPicker: () => void;
  onShowGifPicker: () => void;
}

function formatRecordingTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MessageInput({
  inputValue,
  viewOnceMode,
  showAttachMenu,
  recordingState,
  recordingTime,
  isVideoNote,
  isUploading,
  uploadProgress,
  replyingTo,
  userId,
  videoPreviewRef,
  onInputChange,
  onKeyDown,
  onSend,
  onToggleAttachMenu,
  onToggleViewOnce,
  onFileSelect,
  onStartAudioRecording,
  onStartVideoNoteRecording,
  onStopRecording,
  onCancelRecording,
  onClearReply,
  onShowPollCreator,
  onShowLocationPicker,
  onShowContactPicker,
  onShowGifPicker,
}: MessageInputProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Upload Progress */}
      {isUploading && (
        <div className="px-4 py-2 bg-white border-t">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Recording UI */}
      {recordingState === 'recording' && (
        <div className="px-4 py-3 bg-white border-t flex items-center gap-4">
          {isVideoNote && (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-black">
              <video
                ref={videoPreviewRef as React.RefObject<HTMLVideoElement>}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-medium">{formatRecordingTime(recordingTime)}</span>
            <span className="text-gray-500 text-sm">
              {isVideoNote ? 'Recording video note...' : 'Recording voice message...'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelRecording}
            className="text-gray-500 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            onClick={onStopRecording}
            className="bg-green-500 hover:bg-green-600 rounded-full"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t flex items-center gap-3">
          <div className="border-l-4 border-green-500 pl-2 flex-1 min-w-0">
            <p className="text-xs font-medium text-green-700">
              {replyingTo.senderId === userId ? 'You' : 'Them'}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClearReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      {recordingState === 'idle' && (
        <div className="px-4 py-3 bg-[#f0f2f5]">
          <div className="flex items-end gap-2">
            {/* Attach Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleAttachMenu}
                className="text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 min-w-[160px] z-10">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Image className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <Video className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Video</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Document</span>
                  </button>
                  <button
                    onClick={() => {
                      onToggleAttachMenu();
                      onStartVideoNoteRecording();
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Video Note</span>
                  </button>
                  <button
                    onClick={() => { onToggleAttachMenu(); onShowPollCreator(); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Poll</span>
                  </button>
                  <button
                    onClick={() => { onToggleAttachMenu(); onShowLocationPicker(); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Location</span>
                  </button>
                  <button
                    onClick={() => { onToggleAttachMenu(); onShowContactPicker(); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Contact</span>
                  </button>
                  <button
                    onClick={onShowGifPicker}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                      <Smile className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">GIF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => onFileSelect(e, 'video')}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => onFileSelect(e, 'file')}
            />

            {/* View Once Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleViewOnce}
              className={`rounded-full ${viewOnceMode ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
              title={viewOnceMode ? 'View once: ON' : 'View once: OFF'}
            >
              {viewOnceMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                placeholder={viewOnceMode ? 'View once mode - media will disappear after viewing' : 'Type a message'}
                className="w-full px-4 py-2.5 bg-white rounded-3xl border-0 focus:ring-2 focus:ring-green-500/20 resize-none text-sm"
                value={inputValue}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                rows={1}
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
            </div>

            {/* Send or Mic Button */}
            {inputValue.trim() ? (
              <Button
                onClick={onSend}
                className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={onStartAudioRecording}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full h-10 w-10"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close attach menu */}
      {showAttachMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={onToggleAttachMenu}
        />
      )}
    </>
  );
}
