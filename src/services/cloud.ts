/** Supabase/Postgres gateway for optional cross-device synchronization. */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ConsumptionEvent, CustomList, UserMediaEntry, UserProfile } from '@/types';

export interface RemoteDeletion {
  id: string;
  deletedAt: number;
}

export interface RemoteSnapshot<T> {
  items: T[];
  deletions: RemoteDeletion[];
}

function timestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = value ? Date.parse(String(value)) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export const cloudService = {
  isConfigured: isSupabaseConfigured,

  clearUserData: async (userId: string) => {
    if (!supabase) return;
    const operations = [
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('release_subscriptions').delete().eq('user_id', userId),
      supabase.from('consumption_events').delete().eq('user_id', userId),
      supabase.from('custom_lists').delete().eq('user_id', userId),
      supabase.from('library_entries').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('id', userId),
    ];
    const results = await Promise.all(operations);
    const failed = results.find((result) => result.error)?.error;
    if (failed) throw failed;
  },

  updateUserProfile: async (userId: string, data: Partial<UserProfile>) => {
    if (!supabase) return;
    const current = await cloudService.getUserProfile(userId);
    const payload = current ? { ...current, ...data } : data;
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      payload,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('payload')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.payload as UserProfile | undefined) || null;
  },

  addToLibrary: async (userId: string, item: UserMediaEntry) => {
    if (!supabase) return;
    const { error } = await supabase.from('library_entries').upsert({
      user_id: userId,
      entry_id: item.id,
      payload: item,
      updated_at: new Date(item.lastUpdated).toISOString(),
      deleted_at: null,
    });
    if (error) throw error;
  },

  updateUserMediaEntry: async (userId: string, _mediaId: string, item: Partial<UserMediaEntry>) => {
    if (!item.id) throw new Error('A sincronização exige o ID canônico da entrada.');
    await cloudService.addToLibrary(userId, item as UserMediaEntry);
  },

  removeFromLibrary: async (userId: string, entryId: string) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('library_entries')
      .update({ deleted_at: now, updated_at: now })
      .eq('user_id', userId)
      .eq('entry_id', entryId);
    if (error) throw error;
  },

  getLibrarySnapshot: async (userId: string): Promise<RemoteSnapshot<UserMediaEntry>> => {
    if (!supabase) return { items: [], deletions: [] };
    const { data, error } = await supabase
      .from('library_entries')
      .select('entry_id,payload,updated_at,deleted_at')
      .eq('user_id', userId);
    if (error) throw error;

    const items: UserMediaEntry[] = [];
    const deletions: RemoteDeletion[] = [];
    for (const row of data || []) {
      if (row.deleted_at) {
        deletions.push({ id: row.entry_id, deletedAt: timestamp(row.deleted_at) });
        continue;
      }
      const entry = row.payload as UserMediaEntry;
      entry.lastUpdated = Math.max(entry.lastUpdated || 0, timestamp(row.updated_at));
      items.push(entry);
    }
    return { items, deletions };
  },

  getLibrary: async (userId: string): Promise<Record<string, UserMediaEntry>> => {
    const snapshot = await cloudService.getLibrarySnapshot(userId);
    return Object.fromEntries(snapshot.items.map((entry) => [entry.id, entry]));
  },

  subscribeToLibrary: (userId: string, callback: (snapshot: RemoteSnapshot<UserMediaEntry>) => void) => {
    if (!supabase) return () => undefined;
    let active = true;
    const refresh = async () => {
      try {
        const snapshot = await cloudService.getLibrarySnapshot(userId);
        if (active) callback(snapshot);
      } catch (error) {
        console.warn('Falha ao atualizar biblioteca remota:', error);
      }
    };
    void refresh();
    const client = supabase;
    const channel = client
      .channel(`library:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'library_entries', filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  },

  upsertCustomList: async (userId: string, list: CustomList) => {
    if (!supabase) return;
    const { error } = await supabase.from('custom_lists').upsert({
      user_id: userId,
      list_id: list.id,
      payload: list,
      updated_at: new Date(list.updatedAt || Date.now()).toISOString(),
      deleted_at: null,
    });
    if (error) throw error;
  },

  removeCustomList: async (userId: string, listId: string) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('custom_lists')
      .update({ deleted_at: now, updated_at: now })
      .eq('user_id', userId)
      .eq('list_id', listId);
    if (error) throw error;
  },

  getCustomListsSnapshot: async (userId: string): Promise<RemoteSnapshot<CustomList>> => {
    if (!supabase) return { items: [], deletions: [] };
    const { data, error } = await supabase.from('custom_lists')
      .select('list_id,payload,updated_at,deleted_at')
      .eq('user_id', userId);
    if (error) throw error;
    const items: CustomList[] = [];
    const deletions: RemoteDeletion[] = [];
    for (const row of data || []) {
      if (row.deleted_at) deletions.push({ id: row.list_id, deletedAt: timestamp(row.deleted_at) });
      else items.push({ ...(row.payload as CustomList), updatedAt: timestamp(row.updated_at) });
    }
    return { items, deletions };
  },

  subscribeToCustomLists: (userId: string, callback: (snapshot: RemoteSnapshot<CustomList>) => void) => {
    if (!supabase) return () => undefined;
    let active = true;
    const refresh = async () => {
      try {
        const snapshot = await cloudService.getCustomListsSnapshot(userId);
        if (active) callback(snapshot);
      } catch (error) {
        console.warn('Falha ao atualizar listas remotas:', error);
      }
    };
    void refresh();
    const client = supabase;
    const channel = client.channel(`lists:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'custom_lists', filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  },

  upsertConsumptionEvent: async (userId: string, event: ConsumptionEvent) => {
    if (!supabase) return;
    const { error } = await supabase.from('consumption_events').upsert({
      user_id: userId,
      event_id: event.id,
      entry_id: event.entryId,
      payload: event,
      occurred_at: new Date(event.occurredAt).toISOString(),
    });
    if (error) throw error;
  },

  getConsumptionEvents: async (userId: string, limitCount = 1000): Promise<ConsumptionEvent[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('consumption_events')
      .select('payload')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return (data || []).map((row) => row.payload as ConsumptionEvent);
  },

  subscribeToConsumptionEvents: (userId: string, callback: (events: ConsumptionEvent[]) => void) => {
    if (!supabase) return () => undefined;
    let active = true;
    const refresh = async () => {
      try {
        const events = await cloudService.getConsumptionEvents(userId);
        if (active) callback(events);
      } catch (error) {
        console.warn('Falha ao atualizar o diário remoto:', error);
      }
    };
    void refresh();
    const client = supabase;
    const channel = client.channel(`events:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'consumption_events', filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  },

};
