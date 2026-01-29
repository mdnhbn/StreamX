
export enum VideoSource {
  YOUTUBE = 'YouTube',
  DAILYMOTION = 'Dailymotion'
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
  source: VideoSource;
  description?: string;
  groundingSources?: GroundingSource[];
}

export interface UserSession {
  isYouTubeLoggedIn: boolean;
  isDailymotionLoggedIn: boolean;
  username?: string;
}

export interface AppState {
  currentVideo: VideoMetadata | null;
  isPlaying: boolean;
  searchQuery: string;
  results: VideoMetadata[];
  isLoading: boolean;
  activeSource: VideoSource;
  isPremium: boolean;
  user: UserSession;
}
