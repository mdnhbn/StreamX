
import { GoogleGenAI, Type } from "@google/genai";
import { VideoMetadata, VideoSource, GroundingSource } from "../types";

/**
 * Delay helper for backoff with jitter
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 500));

/**
 * Formats duration from seconds to MM:SS or HH:MM:SS
 */
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s]
    .map(v => v < 10 ? "0" + v : v)
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

/**
 * Formats views into K, M, B
 */
const formatViews = (views: number): string => {
  if (views >= 1000000000) return (views / 1000000000).toFixed(1) + 'B';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
};

/**
 * Fetches real videos from Dailymotion Public API with CORS fallback
 */
const fetchDailymotion = async (query: string): Promise<VideoMetadata[]> => {
  const url = `https://api.dailymotion.com/videos?fields=id,title,thumbnail_480_url,owner.screenname,views_total,created_time,duration&search=${encodeURIComponent(query)}&limit=15`;
  
  try {
    let response = await fetch(url);
    
    if (!response.ok) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl);
      const proxyData = await proxyResponse.json();
      const data = JSON.parse(proxyData.contents);
      return processDailymotionList(data.list);
    }

    const data = await response.json();
    return processDailymotionList(data.list);
  } catch (error) {
    console.error("Dailymotion Fetch Error:", error);
    return [];
  }
};

const processDailymotionList = (list: any[]): VideoMetadata[] => {
  return (list || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    thumbnail: item.thumbnail_480_url,
    channelTitle: item['owner.screenname'] || 'Dailymotion Creator',
    viewCount: formatViews(item.views_total || 0),
    publishedAt: item.created_time ? new Date(item.created_time * 1000).toLocaleDateString() : 'Recently',
    duration: formatDuration(item.duration || 0),
    source: VideoSource.DAILYMOTION,
    description: ""
  }));
};

/**
 * Wrapper for Gemini API with enhanced Retry logic
 */
const callGeminiWithRetry = async (query: string, retries = 5): Promise<any> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            // Re-initialize for every attempt to ensure clean session state
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Search for 12 currently popular and existing YouTube videos related to: "${query}". Return the data strictly as a JSON array of video objects.`,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: "Valid YouTube Video ID (e.g., jNQXAC9IVRw)" },
                                title: { type: Type.STRING },
                                channelTitle: { type: Type.STRING },
                                viewCount: { type: Type.STRING },
                                publishedAt: { type: Type.STRING },
                                duration: { type: Type.STRING }
                            },
                            required: ["id", "title", "channelTitle", "viewCount", "publishedAt", "duration"]
                        }
                    }
                }
            });
            return response;
        } catch (error: any) {
            lastError = error;
            const errorStatus = error?.status;
            const errorMsg = error?.message || "";
            
            // Handle 429 Resource Exhausted or specific quota messages
            if (errorStatus === "RESOURCE_EXHAUSTED" || errorMsg.includes("429") || errorMsg.includes("quota")) {
                const backoffTime = Math.pow(2, i + 1) * 1000;
                console.warn(`[StreamX] Gemini Rate Limit (429). Attempt ${i + 1}/${retries}. Retrying in ${backoffTime}ms...`);
                await delay(backoffTime);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

/**
 * Fetches YouTube metadata using Gemini 3 Flash with retry handling
 */
const fetchYouTubeWithGemini = async (query: string): Promise<VideoMetadata[]> => {
  try {
    const response = await callGeminiWithRetry(query);
    
    const groundingSources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri
      })).filter((s: GroundingSource) => s.uri) || [];

    const results = JSON.parse(response.text || "[]");
    return results.map((v: any) => ({
      ...v,
      source: VideoSource.YOUTUBE,
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      groundingSources
    }));
  } catch (e: any) {
    console.error("Gemini YouTube Error:", e);
    return [];
  }
};

export const searchVideos = async (query: string, source: VideoSource): Promise<VideoMetadata[]> => {
  if (source === VideoSource.DAILYMOTION) {
    return fetchDailymotion(query);
  } else {
    return fetchYouTubeWithGemini(query);
  }
};

export const getRecommendedVideos = async (): Promise<VideoMetadata[]> => {
  return searchVideos("latest trending viral videos music global 2024", VideoSource.YOUTUBE);
};

export const getPersonalizedFeed = async (source: VideoSource): Promise<VideoMetadata[]> => {
  const query = source === VideoSource.YOUTUBE 
    ? "personalized youtube video recommendations based on popular content"
    : "trending dailymotion videos curated for you";
  return searchVideos(query, source);
};
