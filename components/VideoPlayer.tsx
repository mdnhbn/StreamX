
import React, { useEffect, useRef, useState } from 'react';
import { VideoMetadata, VideoSource } from '../types';

interface VideoPlayerProps {
  video: VideoMetadata;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);

  useEffect(() => {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: video.channelTitle,
        album: video.source,
        artwork: [
          { src: video.thumbnail, sizes: '512x512', type: 'image/png' }
        ]
      });

      const playHandler = () => {
         playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
         playerRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
      };

      const pauseHandler = () => {
         playerRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
         playerRef.current?.contentWindow?.postMessage('{"method":"pause"}', '*');
      };

      navigator.mediaSession.setActionHandler('play', playHandler);
      navigator.mediaSession.setActionHandler('pause', pauseHandler);
      navigator.mediaSession.setActionHandler('stop', onClose);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [video, onClose]);

  const togglePiP = () => setIsMinimized(!isMinimized);

  const enableBackgroundPlay = () => {
    setIsBackgroundMode(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Background Audio Ready', { 
        body: `Continuing playback of ${video.title} in background.`,
        icon: video.thumbnail 
      });
    }
    
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'KEEP_ALIVE' });
    }
  };

  const getEmbedUrl = () => {
    // Switched to standard youtube.com to allow logged-in cookies to persist personalization
    const base = video.source === VideoSource.YOUTUBE 
      ? `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=0&modestbranding=1&rel=0&enablejsapi=1`
      : `https://www.dailymotion.com/embed/video/${video.id}?autoplay=1&mute=0&api=postMessage`;
    return base;
  };

  return (
    <div className={`fixed bottom-0 right-0 z-50 p-4 transition-all duration-500 animate-slide-up ${
      isMinimized ? 'w-48 h-48 translate-y-[-80px]' : 'w-full md:w-[550px]'
    }`}>
      <div className={`bg-zinc-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden group h-full flex flex-col ${isBackgroundMode ? 'ring-2 ring-rose-600 shadow-rose-600/20' : ''}`}>
        <div className={`relative bg-black transition-all ${isMinimized ? 'h-full' : 'aspect-video'}`}>
          <iframe
            ref={playerRef}
            src={getEmbedUrl()}
            className={`w-full h-full transition-opacity duration-700 ${isBackgroundMode ? 'opacity-10 grayscale blur-sm' : 'opacity-100'}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
          
          <div className="absolute top-5 right-5 flex gap-3">
            {!isMinimized && (
              <button onClick={togglePiP} className="w-10 h-10 bg-black/50 rounded-full hover:bg-zinc-800 transition-colors backdrop-blur-xl flex items-center justify-center border border-white/10">
                <i data-lucide="minimize-2" className="w-4 h-4 text-white"></i>
              </button>
            )}
            <button onClick={onClose} className="w-10 h-10 bg-black/50 rounded-full hover:bg-rose-600 transition-colors backdrop-blur-xl flex items-center justify-center border border-white/10">
              <i data-lucide="x" className="w-4 h-4 text-white"></i>
            </button>
          </div>

          {isBackgroundMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-6 text-center">
              <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center mb-4 animate-bounce shadow-2xl shadow-rose-600/50">
                <i data-lucide="headphones" className="w-8 h-8"></i>
              </div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white">Background Play Active</h4>
            </div>
          )}
          
          {isMinimized && !isBackgroundMode && (
            <div className="absolute inset-0 cursor-pointer bg-black/10 flex items-center justify-center hover:bg-black/40 transition-colors" onClick={togglePiP}>
              <i data-lucide="maximize-2" className="w-6 h-6 text-white shadow-xl"></i>
            </div>
          )}
        </div>
        
        {!isMinimized && (
          <div className="p-8 bg-zinc-900">
            <div className="flex items-start gap-5 mb-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black truncate text-zinc-100 uppercase tracking-tighter leading-none">{video.title}</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                  {video.channelTitle} • {video.source}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="w-12 h-12 text-zinc-500 hover:text-rose-500 transition-all bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-white/5">
                  <i data-lucide="heart" className="w-5 h-5"></i>
                </button>
                <button className="w-12 h-12 text-zinc-500 hover:text-white transition-all bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-white/5">
                  <i data-lucide="share-2" className="w-5 h-5"></i>
                </button>
              </div>
            </div>

            <button 
              onClick={enableBackgroundPlay}
              disabled={isBackgroundMode}
              className={`w-full py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 ${
                isBackgroundMode 
                ? 'bg-rose-600/10 text-rose-500 border border-rose-500/40 shadow-inner' 
                : 'bg-white text-black hover:bg-zinc-200 shadow-2xl scale-100 active:scale-95'
              }`}
            >
              <i data-lucide={isBackgroundMode ? "check-circle-2" : "headphones"} className="w-5 h-5"></i>
              {isBackgroundMode ? 'Background Enabled' : 'Play in Background'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
