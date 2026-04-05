import { Wrench } from 'lucide-react';

export function MaintenancePage({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#246BFD]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-10 h-10 text-[#246BFD]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Under Maintenance</h1>
        <p className="text-gray-500 mb-6">
          {message || 'We are currently performing maintenance. Please try again later.'}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          We will be back soon
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2.5 bg-[#246BFD] text-white rounded-xl text-sm font-medium hover:bg-[#1A56DB] transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
