import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => onComplete(), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const bubbleColor =
    phase >= 2 ? '#246BFD' : phase >= 1 ? '#5B9BFD' : '#BBCCDD';
  const bubbleOpacity = phase >= 1 ? 1 : 0.35;
  const bubbleScale = phase === 0 ? 0.8 : phase === 1 ? 0.9 : phase === 2 ? 1 : 0.6;
  const showLogo = phase >= 3;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Chat bubbles animation */}
      <div
        className="transition-all duration-500 ease-in-out"
        style={{
          opacity: showLogo ? 0 : bubbleOpacity,
          transform: `scale(${bubbleScale})`,
        }}
      >
        <div className="flex flex-col gap-3 items-center">
          {/* Left bubble */}
          <div className="flex items-start gap-2">
            <div
              className="rounded-2xl rounded-tl-sm px-5 py-3 transition-colors duration-500 shadow-sm"
              style={{ backgroundColor: bubbleColor }}
            >
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <div className="w-16" />
          </div>
          {/* Right bubble */}
          <div className="flex items-start gap-2">
            <div className="w-16" />
            <div
              className="rounded-2xl rounded-tr-sm px-5 py-3 transition-colors duration-500 shadow-sm"
              style={{ backgroundColor: bubbleColor }}
            >
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '100ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '250ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
          {/* Left bubble 2 */}
          <div className="flex items-start gap-2">
            <div
              className="rounded-2xl rounded-tl-sm px-5 py-3 transition-colors duration-500 shadow-sm"
              style={{ backgroundColor: bubbleColor }}
            >
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '350ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '500ms' }} />
              </div>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Logo phase */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700"
        style={{ opacity: showLogo ? 1 : 0, transform: showLogo ? 'scale(1)' : 'scale(0.8)' }}
      >
        <div className="w-24 h-24 rounded-full bg-[#246BFD] flex items-center justify-center shadow-xl shadow-blue-500/30 mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">Abhi</h1>
        <p className="text-gray-400 text-sm tracking-wide">Stay Connected Stay Chatting</p>
        <p className="text-gray-300 text-xs mt-4">v2.1.0</p>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#246BFD]/5 to-transparent" />
    </div>
  );
}
