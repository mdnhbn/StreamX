
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VideoMetadata, VideoSource, UserSession } from './types';
import { searchVideos, getRecommendedVideos, getPersonalizedFeed } from './services/geminiService';
import { VideoPlayer } from './components/VideoPlayer';
import { AdBanner } from './components/AdBanner';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<VideoSource>(VideoSource.YOUTUBE);
  const [results, setResults] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Login & User Session State
  const [user, setUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem('streamx_user');
    return saved ? JSON.parse(saved) : { isYouTubeLoggedIn: false, isDailymotionLoggedIn: false };
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Premium State with LocalStorage Persistence
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('streamx_premium') === 'true';
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  useEffect(() => {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  });

  const performSearch = useCallback(async (searchQuery: string, searchSource: VideoSource) => {
    setResults([]);
    setErrorMsg(null);
    setIsLoading(true);
    const trimmedQuery = searchQuery.trim();
    try {
      let data: VideoMetadata[] = [];
      if (searchQuery === 'My Feed') {
        data = await getPersonalizedFeed(searchSource);
      } else if (!trimmedQuery || searchQuery === 'Trending') {
        data = await getRecommendedVideos();
      } else {
        data = await searchVideos(trimmedQuery, searchSource);
      }
      
      if (data.length === 0 && searchSource === VideoSource.YOUTUBE) {
          setErrorMsg("Search limit reached. Please try again or switch to Dailymotion.");
      }
      
      setResults(data);
    } catch (err: any) {
      console.error("StreamX Search error:", err);
      if (err.message?.includes("429")) {
          setErrorMsg("Server busy. Please wait a moment.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, source);
  };

  useEffect(() => {
    performSearch(activeCategory === 'My Feed' ? 'My Feed' : (query || activeCategory), source);
  }, [source, activeCategory]);

  const handlePurchasePremium = () => {
    setIsPremium(true);
    localStorage.setItem('streamx_premium', 'true');
    setShowPremiumModal(false);
    showToast('Premium Activated • Ads Removed');
  };

  const showToast = (msg: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest z-[200] shadow-2xl animate-slide-up';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const openAuthBrowser = async (url: string, platform: 'YouTube' | 'Dailymotion') => {
    try {
      // For web preview, we use window.open. In a native Capacitor build,
      // Capacitor's Browser plugin would be used to ensure cookie sharing.
      const win = window.open(url, '_blank', 'width=500,height=600');
      if (win) {
        showToast(`Authenticating with ${platform}...`);
        const checkClosed = setInterval(() => {
          if (win.closed) {
            clearInterval(checkClosed);
            const newUser = platform === 'YouTube' 
              ? { ...user, isYouTubeLoggedIn: true } 
              : { ...user, isDailymotionLoggedIn: true };
            setUser(newUser);
            localStorage.setItem('streamx_user', JSON.stringify(newUser));
            showToast(`${platform} linked successfully`);
            setActiveCategory('My Feed'); // Switch to feed after login
          }
        }, 1000);
      }
    } catch (e) {
      console.error("Auth failed", e);
    }
  };

  const categories = [
    ...(user.isYouTubeLoggedIn || user.isDailymotionLoggedIn ? ['My Feed'] : []),
    'Trending', 'Music', 'Gaming', 'Live', 'News', 'Shorts', 'Learning'
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white select-none">
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-3xl border-b border-white/5 px-4 py-4 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4 mr-auto cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-600/40 group-active:scale-90 transition-all">
              <i data-lucide="play" className="w-6 h-6 text-white fill-white"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter uppercase leading-none">Stream<span className="text-rose-600">X</span></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 mt-1">Next-Gen Player</span>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xl group">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search on ${source}...`}
              className="w-full bg-zinc-900/60 border border-white/10 rounded-3xl py-4 px-8 pl-14 focus:outline-none focus:ring-4 focus:ring-rose-600/20 focus:border-rose-600/50 transition-all text-sm placeholder:text-zinc-700 font-medium"
            />
            <i data-lucide="search" className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-rose-600 transition-colors"></i>
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white text-[9px] font-black tracking-widest px-6 py-2.5 rounded-2xl hover:bg-rose-700 active:scale-95 transition-all shadow-xl">
              GO
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5">
              {[VideoSource.YOUTUBE, VideoSource.DAILYMOTION].map(s => (
                <button 
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`px-6 py-2.5 rounded-xl text-[9px] font-black tracking-[0.2em] transition-all uppercase ${source === s ? 'bg-zinc-800 text-white shadow-2xl' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowLoginModal(true)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${user.isYouTubeLoggedIn || user.isDailymotionLoggedIn ? 'bg-rose-600/20 text-rose-500 border-rose-500/30' : 'bg-zinc-900 text-zinc-600 border-white/5 hover:text-white'}`}
            >
              <i data-lucide="user" className={`w-5 h-5 ${(user.isYouTubeLoggedIn || user.isDailymotionLoggedIn) ? 'fill-rose-500' : ''}`}></i>
            </button>

            <button 
              onClick={() => isPremium ? setIsPremium(false) : setShowPremiumModal(true)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isPremium ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 shadow-lg shadow-yellow-500/10' : 'bg-zinc-900 text-zinc-600 border-white/5 hover:text-white'}`}
            >
              <i data-lucide={isPremium ? "crown" : "star"} className={`w-5 h-5 ${isPremium ? 'fill-yellow-500' : ''}`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10">
        <div className="flex gap-3 overflow-x-auto pb-10 no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => { setActiveCategory(cat); setQuery(''); }}
              className={`whitespace-nowrap px-8 py-3.5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border ${activeCategory === cat ? 'bg-rose-600 border-rose-600 text-white shadow-2xl shadow-rose-600/30' : 'bg-zinc-900/40 border-white/5 text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {errorMsg && (
            <div className="mb-10 p-4 bg-rose-600/10 border border-rose-600/20 rounded-2xl flex items-center gap-4 text-rose-500 animate-slide-up">
                <i data-lucide="alert-circle" className="w-5 h-5"></i>
                <span className="text-xs font-black uppercase tracking-widest">{errorMsg}</span>
                <button onClick={() => performSearch(query || activeCategory, source)} className="ml-auto bg-rose-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">RETRY</button>
            </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-zinc-900/80 rounded-[2.5rem] mb-6 shadow-inner"></div>
                <div className="h-5 bg-zinc-900/80 rounded-full w-3/4 mb-4"></div>
                <div className="h-3 bg-zinc-900/80 rounded-full w-1/2 opacity-50"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {results.map((video) => (
              <div key={`${video.source}-${video.id}`} className="group cursor-pointer" onClick={() => setCurrentVideo(video)}>
                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden mb-6 bg-zinc-900 shadow-2xl group-hover:shadow-rose-600/20 transition-all duration-700 border border-white/5">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[2000ms] ease-out opacity-70 group-hover:opacity-100" loading="lazy" />
                  <div className="absolute bottom-5 right-5 bg-black/80 px-3 py-1.5 rounded-xl text-[10px] font-black text-white backdrop-blur-xl border border-white/10 shadow-2xl">
                    {video.duration}
                  </div>
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[8px]">
                    <div className="w-20 h-20 bg-rose-600 text-white rounded-[2rem] flex items-center justify-center scale-50 group-hover:scale-100 transition-all duration-700 shadow-2xl shadow-rose-600/50">
                      <i data-lucide="play" className="w-8 h-8 fill-white ml-1"></i>
                    </div>
                  </div>
                </div>
                <div className="flex gap-5 px-3">
                  <div className="w-12 h-12 rounded-[1.2rem] bg-zinc-900 flex-shrink-0 flex items-center justify-center text-zinc-800 overflow-hidden border border-white/5 shadow-inner">
                    <img src={`https://picsum.photos/seed/${video.channelTitle}/120/120`} alt="Channel" className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-zinc-100 leading-tight line-clamp-2 mb-2 group-hover:text-rose-500 transition-colors uppercase tracking-tight">
                      {video.title}
                    </h3>
                    <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.1em] truncate">
                      {video.channelTitle} • {video.viewCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {!isPremium && <AdBanner type="bottom" isPremium={isPremium} />}
      {!isPremium && <AdBanner type="social" isPremium={isPremium} />}
      
      {currentVideo && <VideoPlayer video={currentVideo} onClose={() => setCurrentVideo(null)} />}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setShowLoginModal(false)}></div>
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[3rem] p-12 text-center animate-slide-up shadow-2xl overflow-hidden">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 leading-none">Linked Accounts</h2>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => openAuthBrowser('https://accounts.google.com/signin', 'YouTube')}
                className={`w-full py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${user.isYouTubeLoggedIn ? 'bg-red-600/20 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                <i className="fab fa-youtube text-lg"></i>
                {user.isYouTubeLoggedIn ? 'YouTube Logged In' : 'Login to YouTube'}
              </button>
              
              <button 
                onClick={() => openAuthBrowser('https://www.dailymotion.com/signin', 'Dailymotion')}
                className={`w-full py-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${user.isDailymotionLoggedIn ? 'bg-blue-600/20 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                <i className="fab fa-dailymotion text-lg"></i>
                {user.isDailymotionLoggedIn ? 'Dailymotion Logged In' : 'Login to Dailymotion'}
              </button>

              <button 
                onClick={() => {
                  setUser({ isYouTubeLoggedIn: false, isDailymotionLoggedIn: false });
                  localStorage.removeItem('streamx_user');
                  setShowLoginModal(false);
                  showToast('Sessions Cleared');
                }}
                className="mt-4 text-[9px] text-zinc-700 font-bold uppercase tracking-widest hover:text-rose-500 transition-colors"
              >
                Logout from All
              </button>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setShowPremiumModal(false)}></div>
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[4rem] p-12 text-center animate-slide-up shadow-2xl overflow-hidden">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-12">
              <i data-lucide="crown" className="w-10 h-10 fill-black"></i>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-none">StreamX Pro</h2>
            <div className="flex flex-col gap-4 mt-8">
              <button onClick={handlePurchasePremium} className="w-full py-6 bg-white text-black rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-3">
                Upgrade Now - $4.99
              </button>
              <button onClick={() => setShowPremiumModal(false)} className="w-full py-6 bg-zinc-800 text-zinc-600 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:text-white">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#030303] border-t border-white/5 py-24 px-10 text-center mt-32">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.6em] text-zinc-700 font-black mb-10">StreamX Pro • Verified Secure</p>
          <div className="flex justify-center gap-14 text-2xl text-zinc-900 mb-12">
             <i className="fab fa-youtube"></i>
             <i className="fab fa-dailymotion"></i>
             <i className="fas fa-user-shield"></i>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
