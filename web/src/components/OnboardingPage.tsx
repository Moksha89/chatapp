import { useState } from 'react';
import { Users, Video, Lock, Monitor, ChevronRight, ChevronLeft } from 'lucide-react';

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

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Skip button */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="text-center mb-12">
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.bgGradient} flex items-center justify-center mx-auto mb-8 transition-all duration-500`}>
            <Icon className="w-16 h-16" style={{ color: slide.color }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 transition-all duration-300">
            {slide.title}
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm mx-auto transition-all duration-300">
            {slide.description}
          </p>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-8 bg-[#246BFD]' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
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
    </div>
  );
}
