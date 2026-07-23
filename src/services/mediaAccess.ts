import type { MediaAccess, MediaItem } from '@/types';

const APP_LINK_SCHEME = /^(steam:|com\.epicgames\.launcher:|goggalaxy:|xbox:)/i;
const LOCAL_FILE_SCHEME = /^(shortcut:|file:|[a-zA-Z]:\\)/i;
const YOUTUBE_ID = /^[\w-]{6,20}$/;

export type AccessDestination =
  | { kind: 'internal'; path: string }
  | { kind: 'external'; url: string }
  | { kind: 'blocked'; reason: string };

export function isUsableAccess(access: MediaAccess): boolean {
  if (access.health === 'offline') return false;
  if (access.embedId && access.provider.toLowerCase().includes('youtube')) {
    return YOUTUBE_ID.test(access.embedId);
  }
  if (!access.url) return false;
  if (APP_LINK_SCHEME.test(access.url)) return access.kind === 'official-link';
  if (LOCAL_FILE_SCHEME.test(access.url)) return false;

  try {
    const url = new URL(access.url);
    return url.protocol === 'https:';
  } catch {
    return access.url.startsWith('/');
  }
}

export function verifiedAccessFor(item: MediaItem): MediaAccess[] {
  const access = [...(item.access || [])];

  if (
    ['book', 'novel', 'comic'].includes(item.mediaType)
    && item.googleVolumeId
    && item.embeddable
    && !access.some((entry) => entry.kind === 'book-preview')
  ) {
    access.unshift({
      id: `google-${item.googleVolumeId}`,
      label: item.publicDomain ? 'Ler obra disponível' : 'Abrir prévia',
      kind: 'book-preview',
      embedId: item.googleVolumeId,
      url: item.providerUrl,
      provider: 'Google Books',
      free: Boolean(item.publicDomain),
      health: 'available',
      legalNote: item.publicDomain
        ? 'Acesso indicado pela fonte de metadados como domínio público.'
        : 'Prévia disponibilizada pelo Google Books.',
    });
  }

  return access.filter(isUsableAccess);
}

export function accessDestination(access: MediaAccess, item: MediaItem): AccessDestination {
  const title = encodeURIComponent(item.title);
  const official = encodeURIComponent(access.url || item.providerUrl || '');
  const readable = ['book', 'novel', 'comic', 'manga'].includes(item.mediaType);

  if (!isUsableAccess(access)) {
    return { kind: 'blocked', reason: 'A fonte não está disponível ou não possui um endereço HTTPS verificável.' };
  }

  if (access.kind === 'book-preview' && access.embedId) {
    return {
      kind: 'internal',
      path: `/reader?kind=google-books&volumeId=${encodeURIComponent(access.embedId)}&title=${title}&official=${official}`,
    };
  }

  if (access.embedId && access.provider.toLowerCase().includes('youtube')) {
    return {
      kind: 'internal',
      path: `/player?youtube=${encodeURIComponent(access.embedId)}&title=${title}&official=${official}`,
    };
  }

  if (access.kind === 'embed' && access.url) {
    return {
      kind: 'internal',
      path: readable
        ? `/reader?kind=html&url=${encodeURIComponent(access.url)}&title=${title}&official=${official}`
        : `/player?kind=embed&embed=${encodeURIComponent(access.url)}&title=${title}&official=${official}`,
    };
  }

  if (['epub', 'pdf', 'html'].includes(access.kind) && access.url) {
    return {
      kind: 'internal',
      path: `/reader?kind=${access.kind}&url=${encodeURIComponent(access.url)}&title=${title}&official=${official}`,
    };
  }

  if (['video', 'hls', 'dash', 'audio'].includes(access.kind) && access.url) {
    return {
      kind: 'internal',
      path: `/player?kind=${access.kind}&url=${encodeURIComponent(access.url)}&title=${title}&official=${official}`,
    };
  }

  if (access.url && APP_LINK_SCHEME.test(access.url)) {
    return { kind: 'external', url: access.url };
  }

  if (access.url && LOCAL_FILE_SCHEME.test(access.url)) {
    return {
      kind: 'blocked',
      reason: 'Caminhos locais não podem ser abertos com segurança pelo navegador.',
    };
  }

  if (access.url) return { kind: 'external', url: access.url };
  return { kind: 'blocked', reason: 'A fonte não informou um endereço utilizável.' };
}
