
import React, { useEffect, useRef, useState } from 'react';
import { ADSTERRA_LINK, MONEYTAG_LINK, ADVERTICA_LINK } from '../adConfig';

interface AdBannerProps {
  type: 'bottom' | 'social' | 'sidebar';
  isPremium?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({ type, isPremium }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  const getLink = () => {
    if (type === 'social') return ADSTERRA_LINK;
    if (type === 'bottom') return ADVERTICA_LINK;
    return MONEYTAG_LINK;
  };

  const isConfigured = getLink() && getLink().trim() !== "";

  useEffect(() => {
    if (!containerRef.current || !isConfigured || isPremium || !isVisible) return;

    const injectAd = () => {
      const configUrl = getLink();
      if (configUrl && containerRef.current) {
        containerRef.current.innerHTML = '';
        
        // Use script injection for real ad rendering
        const script = document.createElement('script');
        script.src = configUrl;
        script.async = true;
        
        // Specific hack for common ad containers to ensure visibility
        containerRef.current.style.minHeight = type === 'bottom' ? '60px' : '100px';
        containerRef.current.appendChild(script);
      }
    };

    injectAd();
  }, [type, isConfigured, isPremium, isVisible]);

  if (isPremium || !isVisible) return null;

  return (
    <div className={`relative overflow-hidden transition-all duration-500 bg-zinc-950/90 backdrop-blur-md border-white/5 ${
      type === 'bottom' ? 'h-24 w-full border-t border-b' : 
      type === 'social' ? 'fixed bottom-24 right-4 z-[60] w-72 h-40 rounded-3xl shadow-2xl border' : 
      'w-full h-36 border rounded-2xl'
    }`}>
      {/* Dismiss Button */}
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 z-[70] w-8 h-8 bg-black/60 hover:bg-rose-600 rounded-full flex items-center justify-center text-[12px] transition-colors border border-white/10"
      >
        <i className="fas fa-times"></i>
      </button>

      <div ref={containerRef} className="flex items-center justify-center h-full w-full pointer-events-auto">
        {!isConfigured && (
          <div className="text-[9px] uppercase tracking-[0.4em] text-zinc-800 flex flex-col items-center select-none p-4 text-center font-black">
             <i className="fas fa-rectangle-ad mb-2 text-zinc-900 text-xl"></i>
             MONETIZATION SLOT
          </div>
        )}
      </div>
    </div>
  );
};
