import type { MediaAccess } from '@/types';

const SESSION_PREFIX = 'hubora:playback:';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface PlaybackSession {
  source: string;
  title: string;
  kind: 'video' | 'hls' | 'audio' | 'embed';
  provider?: string;
  createdAt: number;
}

function validateSource(value: string): string {
  const url = new URL(value, window.location.origin);
  if (url.username || url.password) throw new Error('A fonte retornou uma URL de reprodução inválida.');
  if (url.protocol !== 'https:' && url.origin !== window.location.origin) {
    throw new Error('O player aceita somente URLs HTTPS ou da própria origem.');
  }
  return url.toString();
}

export function createPlaybackPath(access: MediaAccess, title: string): string {
  if (!access.url || !['video', 'hls', 'audio', 'embed'].includes(access.kind)) {
    throw new Error('Esta fonte não oferece reprodução direta compatível com o Hubora.');
  }

  const source = validateSource(access.url);
  const sessionId = crypto.randomUUID();
  const session: PlaybackSession = {
    source,
    title: title.trim().slice(0, 180) || 'Reprodução',
    kind: access.kind as PlaybackSession['kind'],
    provider: access.provider.slice(0, 100),
    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
  } catch {
    throw new Error('O navegador bloqueou a sessão temporária do player. Permita armazenamento de sessão e tente novamente.');
  }

  return `/player?session=${encodeURIComponent(sessionId)}`;
}

export function readPlaybackSession(sessionId: string | null): PlaybackSession | null {
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${sessionId}`);
    if (!raw) return null;
    const session = JSON.parse(raw) as PlaybackSession;
    if (Date.now() - session.createdAt > MAX_AGE_MS) {
      sessionStorage.removeItem(`${SESSION_PREFIX}${sessionId}`);
      return null;
    }
    if (!['video', 'hls', 'audio', 'embed'].includes(session.kind)) return null;
    session.source = validateSource(session.source);
    return session;
  } catch {
    return null;
  }
}

