const BASE = '/api/streaming';

export interface ContentItem {
  tmdbId: number;
  type: string;
  title: string;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  rating: number;
  year: string;
  imdbId?: string;
}

export interface Season {
  number: number;
  name: string;
  episodes: number;
  poster: string | null;
}

export interface Episode {
  number: number;
  name: string;
  overview: string;
  still: string | null;
  airDate: string;
  runtime?: number;
}

export interface ContentMeta extends ContentItem {
  genres: string[];
  runtime?: number;
  seasons?: Season[];
  trailer?: string;
  cast?: CastMember[];
  imdbId?: string;
}

export interface Stream {
  name: string;
  title: string;
  url: string;
  behaviorHints?: { bingeGroup?: string };
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  epgId: string;
}

export interface CastMember {
  name: string;
  character: string;
  photo: string | null;
}

function getToken(): string | null {
  return localStorage.getItem('streaming_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ token: string; user: { id: string; username: string; email: string } }> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function verifyToken(
  token: string
): Promise<{ user: any } | null> {
  try {
    const res = await fetch(`${BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getTrending(
  type: 'movie' | 'series',
  page = 1
): Promise<{ results: ContentItem[]; total_pages: number }> {
  return apiFetch(`/browse/trending?type=${type}&page=${page}`);
}

export async function searchContent(
  q: string,
  type?: string
): Promise<{ results: ContentItem[] }> {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  return apiFetch(`/browse/search?${params.toString()}`);
}

export async function getMeta(
  type: string,
  tmdbId: string
): Promise<ContentMeta> {
  return apiFetch(`/browse/meta/${type}/${tmdbId}`);
}

export async function getSeason(
  tmdbId: string,
  season: number
): Promise<{ episodes: Episode[] }> {
  return apiFetch(`/browse/season/${tmdbId}/${season}`);
}

export async function getStreams(
  type: string,
  id: string
): Promise<{ streams: Stream[] }> {
  return apiFetch(`/streams/${type}/${encodeURIComponent(id)}`);
}

export async function getIPTVChannels(
  search?: string,
  group?: string
): Promise<{ channels: Channel[]; groups: string[] }> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (group) params.set('group', group);
  const qs = params.toString();
  return apiFetch(`/iptv/channels${qs ? `?${qs}` : ''}`);
}

export async function getIPTVFavorites(): Promise<{ favorites: string[] }> {
  return apiFetch('/iptv/favorites');
}

export async function saveIPTVFavorites(favorites: string[]): Promise<void> {
  await apiFetch('/iptv/favorites', {
    method: 'PUT',
    body: JSON.stringify({ favorites }),
  });
}

export async function getEPG(channelId?: string): Promise<any> {
  const params = new URLSearchParams();
  if (channelId) params.set('channelId', channelId);
  const qs = params.toString();
  return apiFetch(`/iptv/epg${qs ? `?${qs}` : ''}`);
}
