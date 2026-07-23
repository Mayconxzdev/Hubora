import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { get as getLegacyState } from 'idb-keyval';
import type {
  AuthUser,
  CustomList,
  LibraryStatus,
  MediaItem,
  ProgressState,
  UserMediaEntry,
  UserProfile,
} from '@/types';
import { createEntryId, createWorkFingerprint, parseProviderIdentity } from '@/services/identity';
import { defaultEntryPrivacy } from '@/services/adultPolicy';
import { localRepository } from '@/services/localRepository';
import { cloudService, type RemoteDeletion } from '@/services/cloud';
import { syncService } from '@/services/sync';
import { huboraDb } from '@/lib/db';

const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 7000, 9000, 12000];

export function levelForXp(xp: number): number {
  for (let index = XP_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (xp >= XP_THRESHOLDS[index]) return index + 1;
  }
  return 1;
}

export function createDefaultProfile(authUser: AuthUser): UserProfile {
  return {
    uid: authUser.uid,
    name: authUser.displayName || 'Viajante',
    email: authUser.email,
    avatar: authUser.photoURL,
    xp: 0,
    level: 1,
    preferences: {
      theme: 'dark',
      adultContent: false,
      adultMode: 'off',
      adultVaultEnabled: false,
      adultFilterEnabled: true,
      adultConfirmed: false,
      adultVaultPinMode: 'session',
      adultLibraryPublicByDefault: false,
      spoilerShield: 'off',
      spoilerProtection: { synopsis: true, images: true, reviews: true, comments: true, characters: true, achievements: true, futureSeasons: true },
      adaptiveHome: true,
      language: 'pt-BR',
    },
    stats: {
      totalWatched: 0,
      totalRead: 0,
      timeSpent: 0,
    },
  };
}

function normalizeEntry(item: UserMediaEntry): UserMediaEntry {
  const media = item.media || ({
    id: item.mediaId,
    title: item.title,
    mediaType: item.mediaType,
    source: item.source,
  } as MediaItem);
  const identity = parseProviderIdentity(media);
  const id = item.id?.includes(':') ? item.id : createEntryId(media);
  return {
    ...item,
    id,
    canonicalId: item.canonicalId || id,
    workFingerprint: item.workFingerprint || createWorkFingerprint(media),
    providerIdentities: item.providerIdentities?.length ? item.providerIdentities : [identity],
    source: item.source || identity.provider,
    sourceId: item.sourceId ?? identity.providerId,
    revision: Math.max(1, item.revision || 1),
    progress: item.progress || {},
    tags: item.tags || [],
    priority: item.priority || 'medium',
    isFavorite: Boolean(item.isFavorite),
    isTrackedRelease: Boolean(item.isTrackedRelease),
    releasePreferences: item.releasePreferences || { new_episode: true, new_season: true, new_volume: true, release: true, availability: true, price: true },
    dateAdded: item.dateAdded || Date.now(),
    lastUpdated: item.lastUpdated || Date.now(),
    lastInteractedAt: item.lastInteractedAt || item.lastUpdated || Date.now(),
  };
}

function createEntryFromMedia(media: MediaItem, status: LibraryStatus): UserMediaEntry {
  const now = Date.now();
  const identity = parseProviderIdentity(media);
  const id = createEntryId(media);
  return {
    id,
    canonicalId: id,
    workFingerprint: createWorkFingerprint(media),
    providerIdentities: [identity],
    revision: 1,
    mediaId: media.id,
    sourceId: identity.providerId,
    source: identity.provider,
    mediaType: media.mediaType,
    title: media.title,
    posterUrl: media.posterPath,
    backdropUrl: media.backdropPath,
    media: { ...media, providerIdentities: [identity], workFingerprint: createWorkFingerprint(media) },
    status,
    progress: {},
    priority: 'medium',
    tags: [],
    isFavorite: false,
    isTrackedRelease: false,
    releasePreferences: { new_episode: true, new_season: true, new_volume: true, release: true, availability: true, price: true },
    dateAdded: now,
    lastUpdated: now,
    lastInteractedAt: now,
    ...defaultEntryPrivacy(media),
  };
}

function entryKey(library: Record<string, UserMediaEntry>, id: string | number): string | null {
  const direct = String(id);
  if (library[direct]) return direct;
  const matches = Object.values(library).filter((entry) =>
    String(entry.mediaId) === direct ||
    String(entry.sourceId) === direct ||
    String(entry.media?.id) === direct,
  );
  return matches.length === 1 ? matches[0].id : null;
}

function xpForUpdate(oldItem: UserMediaEntry, updates: Partial<UserMediaEntry>): number {
  let xp = updates.status === 'completed' && oldItem.status !== 'completed' ? 50 : 0;
  const previous = oldItem.progress || {};
  const next = updates.progress || {};
  xp += Math.max(0, (next.currentEpisode || 0) - (previous.currentEpisode || 0)) * 5;
  xp += Math.max(0, (next.currentChapter || 0) - (previous.currentChapter || 0)) * 2;
  xp += Math.max(0, (next.currentIssue || 0) - (previous.currentIssue || 0)) * 3;
  xp += Math.max(0, (next.currentPage || 0) - (previous.currentPage || 0)) * 0.5;
  xp += Math.max(0, (next.hoursPlayed || 0) - (previous.hoursPlayed || 0)) * 4;
  return Math.ceil(xp);
}

function progressValue(progress?: ProgressState): number | undefined {
  if (!progress) return undefined;
  return progress.currentEpisode ?? progress.currentChapter ?? progress.currentIssue ?? progress.currentPage ?? progress.hoursPlayed;
}

function readGuestTheme(): 'dark' | 'light' {
  try {
    const value = globalThis.localStorage?.getItem('hubora_theme');
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function persistGuestTheme(theme: 'dark' | 'light') {
  try {
    globalThis.localStorage?.setItem('hubora_theme', theme);
  } catch {
    // Private browsing and hardened test runtimes may deny Web Storage.
  }
}

interface AppState {
  user: UserProfile | null;
  library: Record<string, UserMediaEntry>;
  customLists: Record<string, CustomList>;
  guestTheme: 'dark' | 'light';
  initialized: boolean;
  syncState: 'local' | 'syncing' | 'synced' | 'error';
  syncPending: number;
  lastSyncedAt?: number;
  initializeLocalData: () => Promise<void>;
  setUser: (user: AuthUser | null) => Promise<void>;
  setLibrary: (library: Record<string, UserMediaEntry>) => Promise<void>;
  replaceCustomLists: (lists: CustomList[]) => Promise<void>;
  mergeRemoteLibrary: (library: Record<string, UserMediaEntry>, deletions?: RemoteDeletion[]) => void;
  mergeRemoteCustomLists: (lists: CustomList[], deletions?: RemoteDeletion[]) => void;
  addToLibrary: (media: MediaItem, status: LibraryStatus) => Promise<void>;
  removeFromLibrary: (mediaId: string | number) => Promise<void>;
  updateLibraryItem: (mediaId: string | number, updates: Partial<UserMediaEntry>) => Promise<void>;
  toggleFavorite: (mediaId: string | number) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  toggleTheme: () => void;
  getLibraryItems: () => UserMediaEntry[];
  getItemStatus: (mediaId: string | number) => LibraryStatus | null;
  createCustomList: (name: string, description?: string) => string;
  deleteCustomList: (listId: string) => void;
  addItemToCustomList: (listId: string, mediaId: string) => void;
  removeItemFromCustomList: (listId: string, mediaId: string) => void;
  gainXP: (amount: number) => void;
  syncNow: () => Promise<void>;
  migrateLegacyLibraryData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      library: {},
      customLists: {},
      guestTheme: readGuestTheme(),
      initialized: false,
      syncState: 'local',
      syncPending: 0,

      initializeLocalData: async () => {
        let entries = await localRepository.getLibrary();
        let lists = await localRepository.getCustomLists();

        if (!entries.length) {
          try {
            const raw = await getLegacyState<string>('hubora-storage');
            const parsed = raw ? JSON.parse(raw) : null;
            const legacyLibrary = parsed?.state?.library || parsed?.library;
            if (legacyLibrary && typeof legacyLibrary === 'object') {
              entries = Object.values(legacyLibrary).map((value) => normalizeEntry(value as UserMediaEntry));
              if (entries.length) await huboraDb.library.bulkPut(entries as unknown as Record<string, unknown>[]);
            }
            const legacyLists = parsed?.state?.customLists || parsed?.customLists;
            if (legacyLists && typeof legacyLists === 'object') {
              lists = Object.values(legacyLists) as CustomList[];
              if (lists.length) await huboraDb.customLists.bulkPut(lists);
            }
          } catch (error) {
            console.warn('Não foi possível migrar o armazenamento legado:', error);
          }
        }

        set({
          library: Object.fromEntries(entries.map((entry) => [entry.id, normalizeEntry(entry)])),
          customLists: Object.fromEntries(lists.map((list) => [list.id, list])),
          initialized: true,
        });
      },

      setUser: async (authUser) => {
        if (!authUser) {
          set({ user: null, syncState: 'local' });
          return;
        }

        const fallback = createDefaultProfile(authUser);
        const local = await localRepository.getProfile(authUser.uid);
        set({ user: local ? { ...fallback, ...local } : fallback });

        try {
          const remote = await cloudService.getUserProfile(authUser.uid);
          const profile = remote ? { ...fallback, ...remote } : (local || fallback);
          set({ user: profile });
          await localRepository.putProfile(profile, !remote);
          await get().syncNow();
        } catch (error) {
          console.warn('Perfil remoto indisponível; mantendo dados locais.', error);
        }
      },

      setLibrary: async (incoming) => {
        const normalized = Object.values(incoming).map(normalizeEntry);
        const next = Object.fromEntries(normalized.map((entry) => [entry.id, entry]));
        const previousIds = Object.keys(get().library);
        set({ library: next });
        await huboraDb.library.clear();
        for (const id of previousIds.filter((id) => !next[id])) await localRepository.deleteLibraryEntry(id);
        for (const entry of normalized) await localRepository.putLibraryEntry(entry);
        await get().syncNow();
      },

      replaceCustomLists: async (lists) => {
        const next = Object.fromEntries(lists.map((list) => [list.id, list]));
        const previousIds = Object.keys(get().customLists);
        set({ customLists: next });
        await huboraDb.customLists.clear();
        for (const id of previousIds.filter((id) => !next[id])) await localRepository.deleteCustomList(id);
        for (const list of lists) await localRepository.putCustomList(list);
        await get().syncNow();
      },

      mergeRemoteLibrary: (remote, deletions = []) => {
        const merged = { ...get().library };
        for (const rawEntry of Object.values(remote)) {
          const entry = normalizeEntry(rawEntry);
          const local = merged[entry.id];
          if (!local || entry.lastUpdated > local.lastUpdated) merged[entry.id] = entry;
        }

        const deletedIds: string[] = [];
        for (const deletion of deletions) {
          const local = merged[deletion.id];
          if (local && deletion.deletedAt >= local.lastUpdated) {
            delete merged[deletion.id];
            deletedIds.push(deletion.id);
          }
        }

        set({ library: merged });
        void localRepository.applyRemoteLibrary(Object.values(merged), deletedIds);
      },

      mergeRemoteCustomLists: (remote, deletions = []) => {
        const merged = { ...get().customLists };
        for (const list of remote) {
          const local = merged[list.id];
          if (!local || (list.updatedAt || 0) > (local.updatedAt || 0)) merged[list.id] = list;
        }

        const deletedIds: string[] = [];
        for (const deletion of deletions) {
          const local = merged[deletion.id];
          if (local && deletion.deletedAt >= (local.updatedAt || local.createdAt)) {
            delete merged[deletion.id];
            deletedIds.push(deletion.id);
          }
        }

        set({ customLists: merged });
        void localRepository.applyRemoteLists(Object.values(merged), deletedIds);
      },

      addToLibrary: async (media, status) => {
        const state = get();
        const entry = createEntryFromMedia(media, status);
        if (state.library[entry.id]) return;
        set({ library: { ...state.library, [entry.id]: entry } });
        await localRepository.putLibraryEntry(entry);
        void get().syncNow();
        get().gainXP(15);
      },

      removeFromLibrary: async (mediaId) => {
        const state = get();
        const key = entryKey(state.library, mediaId);
        if (!key) return;
        const next = { ...state.library };
        delete next[key];
        set({ library: next });
        await localRepository.deleteLibraryEntry(key);
        void get().syncNow();
      },

      updateLibraryItem: async (mediaId, updates) => {
        const state = get();
        const key = entryKey(state.library, mediaId);
        if (!key) return;
        const oldItem = state.library[key];
        const now = Date.now();
        const updatedItem = normalizeEntry({
          ...oldItem,
          ...updates,
          progress: updates.progress ? { ...oldItem.progress, ...updates.progress } : oldItem.progress,
          revision: (oldItem.revision || 1) + 1,
          lastUpdated: now,
          lastInteractedAt: now,
        });
        set({ library: { ...state.library, [key]: updatedItem } });
        const writes: Promise<unknown>[] = [localRepository.putLibraryEntry(updatedItem)];

        if (updates.progress || updates.status || updates.rating !== undefined) {
          writes.push(localRepository.addConsumptionEvent({
            id: crypto.randomUUID(),
            entryId: updatedItem.id,
            kind: updates.status === 'completed' ? 'completed' : updates.rating !== undefined ? 'rating' : updates.status ? 'status' : 'progress',
            occurredAt: now,
            value: updates.rating ?? updates.status ?? progressValue(updates.progress),
          }));
        }
        await Promise.all(writes);
        void get().syncNow();

        const xp = xpForUpdate(oldItem, updates);
        if (xp) get().gainXP(xp);
      },

      toggleFavorite: (mediaId) => {
        const key = entryKey(get().library, mediaId);
        if (!key) return;
        const item = get().library[key];
        get().updateLibraryItem(key, { isFavorite: !item.isFavorite });
      },

      updateUser: (updates) => {
        const current = get().user;
        if (!current) return;
        const updated: UserProfile = {
          ...current,
          ...updates,
          preferences: { ...current.preferences, ...(updates.preferences || {}) },
          stats: { ...current.stats, ...(updates.stats || {}) },
        };
        set({ user: updated });
        void localRepository.putProfile(updated).then(() => get().syncNow());
      },

      toggleTheme: () => {
        const state = get();
        if (state.user) {
          const current = state.user.preferences.theme === 'light' ? 'light' : 'dark';
          get().updateUser({ preferences: { ...state.user.preferences, theme: current === 'dark' ? 'light' : 'dark' } });
        } else {
          const next = state.guestTheme === 'dark' ? 'light' : 'dark';
          persistGuestTheme(next);
          set({ guestTheme: next });
        }
      },

      getLibraryItems: () => Object.values(get().library),
      getItemStatus: (mediaId) => {
        const key = entryKey(get().library, mediaId);
        return key ? get().library[key].status : null;
      },

      createCustomList: (name, description) => {
        const now = Date.now();
        const id = `list-${crypto.randomUUID()}`;
        const list: CustomList = { id, name: name.trim(), description: description?.trim(), items: [], createdAt: now, updatedAt: now };
        set((state) => ({ customLists: { ...state.customLists, [id]: list } }));
        void localRepository.putCustomList(list).then(() => get().syncNow());
        get().gainXP(30);
        return id;
      },

      deleteCustomList: (listId) => {
        const next = { ...get().customLists };
        delete next[listId];
        set({ customLists: next });
        void localRepository.deleteCustomList(listId).then(() => get().syncNow());
      },

      addItemToCustomList: (listId, mediaId) => {
        const list = get().customLists[listId];
        const key = entryKey(get().library, mediaId) || String(mediaId);
        if (!list || list.items.includes(key)) return;
        const updated = { ...list, items: [...list.items, key], updatedAt: Date.now() };
        set((state) => ({ customLists: { ...state.customLists, [listId]: updated } }));
        void localRepository.putCustomList(updated).then(() => get().syncNow());
        get().gainXP(5);
      },

      removeItemFromCustomList: (listId, mediaId) => {
        const list = get().customLists[listId];
        if (!list) return;
        const updated = { ...list, items: list.items.filter((id) => id !== String(mediaId)), updatedAt: Date.now() };
        set((state) => ({ customLists: { ...state.customLists, [listId]: updated } }));
        void localRepository.putCustomList(updated).then(() => get().syncNow());
      },

      gainXP: (_amount) => undefined,

      syncNow: async () => {
        const userId = get().user?.uid;
        const pendingBefore = await localRepository.countOutbox();
        if (!userId || !cloudService.isConfigured || !navigator.onLine) {
          set({ syncState: 'local', syncPending: pendingBefore });
          return;
        }
        set({ syncState: 'syncing', syncPending: pendingBefore });
        const result = await syncService.flush(userId);
        const pendingAfter = await localRepository.countOutbox();
        set({
          syncState: result.failed || pendingAfter ? 'error' : 'synced',
          syncPending: pendingAfter,
          lastSyncedAt: result.failed ? get().lastSyncedAt : Date.now(),
        });
      },

      migrateLegacyLibraryData: () => {
        const normalized = Object.values(get().library).map(normalizeEntry);
        const next = Object.fromEntries(normalized.map((entry) => [entry.id, entry]));
        set({ library: next });
        void huboraDb.library.bulkPut(normalized as unknown as Record<string, unknown>[]);
      },
    }),
    {
      name: 'hubora-preferences',
      version: 3,
      partialize: (state) => ({
        user: state.user,
        guestTheme: state.guestTheme,
      }),
    },
  ),
);
