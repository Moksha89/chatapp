'use client';

import { MessageCircle, Phone, Video, Shield, Download, Globe, Zap, Lock, Users, ArrowRight, Smartphone } from 'lucide-react';

interface LandingPageProps {
  onOpenWebApp: () => void;
}

export default function LandingPage({ onOpenWebApp }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header / Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Abhi Chat</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/uploads/abhi-chat.apk"
              className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:border-primary hover:text-primary transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download APK
            </a>
            <button
              onClick={onOpenWebApp}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              Open Web App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-primary rounded-full text-sm font-medium mb-6">
                <Shield className="w-3.5 h-3.5" />
                End-to-end encrypted
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Stay Connected,<br />
                <span className="text-primary">Stay Chatting</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Fast, secure messaging and crystal-clear voice & video calls. 
                Available on Android and Web — your conversations, everywhere.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/uploads/abhi-chat.apk"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  <Smartphone className="w-5 h-5" />
                  Download for Android
                </a>
                <button
                  onClick={onOpenWebApp}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                >
                  Open Web App
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Available for Android 8.0+ and all modern browsers
              </p>
            </div>

            {/* Hero Visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                {/* Phone Mockup */}
                <div className="w-72 h-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 transform rotate-2">
                  <div className="bg-primary rounded-2xl p-4 mb-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Abhi Chat</p>
                        <p className="text-blue-100 text-xs">Online</p>
                      </div>
                    </div>
                  </div>
                  {/* Chat bubbles mockup */}
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-48">
                        <p className="text-sm text-gray-800">Hey! How are you?</p>
                        <p className="text-xs text-gray-400 mt-1">10:30 AM</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-48">
                        <p className="text-sm text-white">I&apos;m great! Let&apos;s catch up</p>
                        <p className="text-xs text-blue-200 mt-1">10:31 AM</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-48">
                        <p className="text-sm text-gray-800">Sure! Video call?</p>
                        <p className="text-xs text-gray-400 mt-1">10:32 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-2 -left-4 w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to stay connected
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Abhi Chat brings you secure messaging, high-quality calls, and a seamless experience across all your devices.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <MessageCircle className="w-6 h-6" />,
                title: 'Real-Time Messaging',
                description: 'Send and receive messages instantly with delivery and read receipts. No delays, no refreshing.',
                color: 'bg-blue-50 text-primary',
              },
              {
                icon: <Phone className="w-6 h-6" />,
                title: 'Voice Calls',
                description: 'Crystal-clear voice calls powered by WebRTC. Connect with anyone, anywhere in the world.',
                color: 'bg-green-50 text-green-600',
              },
              {
                icon: <Video className="w-6 h-6" />,
                title: 'Video Calls',
                description: 'Face-to-face conversations with high-quality video. See the people who matter most.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: <Lock className="w-6 h-6" />,
                title: 'End-to-End Encryption',
                description: 'Your messages and calls are protected. Only you and the person you communicate with can read them.',
                color: 'bg-red-50 text-red-600',
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Lightning Fast',
                description: 'Built for speed with Socket.IO real-time delivery. Messages appear the instant they are sent.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Cross-Platform',
                description: 'Use Abhi Chat on your Android phone and any web browser. Your chats sync seamlessly.',
                color: 'bg-indigo-50 text-indigo-600',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-primary to-primary-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get Abhi Chat on your phone
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Download the Android app for the best mobile messaging experience. 
            Push notifications, background calls, and offline message queuing built in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/uploads/abhi-chat.apk"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-colors font-medium text-lg shadow-lg"
            >
              <Download className="w-5 h-5" />
              Download APK
              <span className="text-xs text-gray-500 font-normal">(Android)</span>
            </a>
          </div>
          <p className="text-blue-200 text-sm mt-4">
            Version 2.0 &middot; Android 8.0+ required &middot; ~60 MB
          </p>
        </div>
      </section>

      {/* Web App Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Use Abhi Chat on the web
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            No downloads needed. Open the web app in your browser and start chatting right away.
            All features available — messaging, voice calls, video calls.
          </p>
          <button
            onClick={onOpenWebApp}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium text-lg shadow-lg"
          >
            <Globe className="w-5 h-5" />
            Open Web App
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Tech Stack / Trust Section */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-sm text-gray-400 mb-6">Built with modern technology</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-gray-400">
            {['NestJS', 'Next.js', 'PostgreSQL', 'Redis', 'Socket.IO', 'LiveKit', 'Kotlin', 'WebRTC'].map((tech) => (
              <span key={tech} className="text-sm font-medium">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">Abhi Chat</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/uploads/abhi-chat.apk" className="hover:text-white transition-colors">Download APK</a>
              <button onClick={onOpenWebApp} className="hover:text-white transition-colors">Web App</button>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Abhi Chat. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
