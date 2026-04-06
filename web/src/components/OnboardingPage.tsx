import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Video, Lock, Monitor, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Users,
    title: 'Group Chatting',
    description: 'Connect with multiple members in group chats. Share messages, media, and files with your team.',
    color: '#246BFD',
    bgGradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    icon: Video,
    title: 'Video And Voice Calls',
    description: 'Instantly connect via high-quality video and voice calls with anyone, anywhere.',
    color: '#1A56DB',
    bgGradient: 'from-blue-600/20 to-blue-400/20',
  },
  {
    icon: Lock,
    title: 'Message Encryption',
    description: 'Ensure privacy with end-to-end encrypted messages. Your conversations stay between you.',
    color: '#10B981',
    bgGradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    icon: Monitor,
    title: 'Cross-Platform Compatibility',
    description: 'Access your chats on any device seamlessly. Web, Android, and more.',
    color: '#8B5CF6',
    bgGradient: 'from-purple-500/20 to-violet-500/20',
  },
];

const AUTO_ADVANCE_INTERVAL = 5000;

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [autoProgress, setAutoProgress] = useState(0);
  const touchStartX = useRef(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance slides
  useEffect(() => {
    if (!autoAdvance) return;
    setAutoProgress(0);
    const progressInterval = setInterval(() => {
      setAutoProgress(prev => Math.min(prev + 2, 100));
    }, AUTO_ADVANCE_INTERVAL / 50);
    autoAdvanceRef.current = setTimeout(() => {
      if (currentSlide < SLIDES.length - 1) {
        setSlideDirection('left');
        setCurrentSlide(prev => prev + 1);
      } else {
        setAutoAdvance(false);
      }
    }, AUTO_ADVANCE_INTERVAL) as unknown as ReturnType<typeof setInterval>;
    return () => {
      clearTimeout(autoAdvanceRef.current as unknown as ReturnType<typeof setTimeout>);
      clearInterval(progressInterval);
    };
  }, [currentSlide, autoAdvance]);

  const handleNext = useCallback(() => {
    setAutoAdvance(false);
    if (currentSlide < SLIDES.length - 1) {
      setSlideDirection('left');
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  }, [currentSlide, onComplete]);

  const handlePrev = useCallback(() => {
    setAutoAdvance(false);
    if (currentSlide > 0) {
      setSlideDirection('right');
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  // Swipe gesture support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="w-full max-w-md">
        {/* Header with logo and skip */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg abhi-gradient flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#1A1A2E]">Abhi Chat</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-[#246BFD] transition-colors font-medium"
          >
            Skip
          </button>
        </div>

        {/* Slide content with animation */}
        <div className="text-center mb-12 overflow-hidden">
          <div
            key={currentSlide}
            className="animate-fade-in"
            style={{
              animation: `slideIn${slideDirection === 'left' ? 'Left' : 'Right'} 0.3s ease-out`,
            }}
          >
            <div className={`w-36 h-36 rounded-3xl bg-gradient-to-br ${slide.bgGradient} flex items-center justify-center mx-auto mb-8 transition-all duration-500 shadow-lg`}>
              <Icon className="w-16 h-16" style={{ color: slide.color }} />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A2E] mb-4">
              {slide.title}
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
              {slide.description}
            </p>
          </div>
        </div>

        {/* Dots indicator with auto-advance progress */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setAutoAdvance(false); setSlideDirection(i > currentSlide ? 'left' : 'right'); setCurrentSlide(i); }}
              className="relative h-2.5 rounded-full transition-all duration-300 overflow-hidden"
              style={{ width: i === currentSlide ? 32 : 10, backgroundColor: i === currentSlide ? 'transparent' : i < currentSlide ? '#246BFD' : '#D1D5DB' }}
            >
              {i === currentSlide && (
                <>
                  <div className="absolute inset-0 bg-[#246BFD]/30 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-[#246BFD] rounded-full transition-all duration-100"
                    style={{ width: autoAdvance ? `${autoProgress}%` : '100%' }}
                  />
                </>
              )}
            </button>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              currentSlide === 0
                ? 'text-transparent cursor-default'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-6 py-3 bg-[#246BFD] text-white rounded-xl text-sm font-medium hover:bg-[#1a5ad4] transition-all shadow-lg shadow-[#246BFD]/30"
          >
            {isLastSlide ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
