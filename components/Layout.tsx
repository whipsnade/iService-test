import React from 'react';
import { Home, ClipboardList, Settings, Mic, Headphones } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onVoiceClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onVoiceClick }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      {/* Floating Bottom Navigation */}
      <div className="absolute bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 p-2 flex justify-between items-center z-50">
        
        <button 
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home size={22} />
        </button>

        <button 
          onClick={() => onTabChange('orders')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'orders' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ClipboardList size={22} />
        </button>

        {/* Center Action Button (Voice) */}
        <button 
          onClick={onVoiceClick}
          className="flex items-center justify-center w-14 h-14 -mt-6 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-300 transform transition-transform hover:scale-110 active:scale-95 group"
        >
          <Mic size={24} className="group-active:scale-90 transition-transform" />
        </button>

        <button 
          onClick={() => onTabChange('support')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'support' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Headphones size={22} />
        </button>

        <button 
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all ${activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings size={22} />
        </button>
      </div>
    </div>
  );
};