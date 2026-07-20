import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { HuboraNotification, MediaItem, MediaType, ReleasePreferences } from '@/types';

function providerIdentity(item: MediaItem): { provider: string; providerId: string } {
  const identity = item.providerIdentities?.[0];
  if (identity) return { provider: identity.provider, providerId: String(identity.providerId) };
  const [provider, ...rest] = String(item.id).split('-');
  return { provider: item.source || provider || 'hubora', providerId: String(item.sourceId || rest.join('-') || item.id) };
}


export const DEFAULT_RELEASE_PREFERENCES: ReleasePreferences = {
  new_episode: true,
  new_season: true,
  new_volume: true,
  release: true,
  availability: true,
  price: true,
};

export function preferencesForMedia(mediaType: MediaType): Array<{ key: keyof ReleasePreferences; label: string }> {
  if (mediaType === 'tv' || mediaType === 'anime') return [
    { key: 'new_episode', label: 'Novo episódio' },
    { key: 'new_season', label: 'Nova temporada' },
    { key: 'availability', label: 'Entrada em serviço' },
  ];
  if (mediaType === 'manga' || mediaType === 'comic') return [
    { key: 'new_volume', label: mediaType === 'manga' ? 'Novo capítulo ou volume' : 'Nova edição ou volume' },
    { key: 'availability', label: 'Nova disponibilidade' },
  ];
  if (mediaType === 'game') return [
    { key: 'release', label: 'Lançamento ou atualização' },
    { key: 'price', label: 'Promoção quando disponível' },
  ];
  if (mediaType === 'book') return [
    { key: 'new_volume', label: 'Nova edição' },
    { key: 'availability', label: 'Prévia ou leitura disponível' },
  ];
  return [
    { key: 'release', label: 'Lançamento' },
    { key: 'availability', label: 'Entrada em serviço' },
  ];
}

export const notificationService = {
  configured: isSupabaseConfigured,

  syncSubscription: async (input: { userId: string; entryId: string; item: MediaItem; enabled: boolean; preferences?: ReleasePreferences }) => {
    if (!supabase) return;
    if (!input.enabled) {
      const { error } = await supabase.from('release_subscriptions').delete().eq('user_id', input.userId).eq('entry_id', input.entryId);
      if (error) throw error;
      return;
    }
    const identity = providerIdentity(input.item);
    const { error } = await supabase.from('release_subscriptions').upsert({
      user_id: input.userId,
      entry_id: input.entryId,
      provider: identity.provider,
      provider_id: identity.providerId,
      media_type: input.item.mediaType,
      title: input.item.title,
      preferences: input.preferences || DEFAULT_RELEASE_PREFERENCES,
      next_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  list: async (limit = 30): Promise<HuboraNotification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      entryId: row.entry_id || undefined,
      kind: row.kind,
      title: row.title,
      body: row.body,
      url: row.url || undefined,
      payload: row.payload || {},
      createdAt: Date.parse(row.created_at),
      readAt: row.read_at ? Date.parse(row.read_at) : undefined,
    }));
  },

  markRead: async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  subscribe: (userId: string, refresh: () => void) => {
    if (!supabase) return () => undefined;
    const client = supabase;
    const channel = client.channel(`notifications:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, refresh).subscribe();
    return () => { void client.removeChannel(channel); };
  },
};

export function releaseKindFor(mediaType: MediaType): string {
  if (mediaType === 'tv' || mediaType === 'anime') return 'novos episódios ou temporadas';
  if (mediaType === 'manga' || mediaType === 'comic') return 'novos capítulos ou volumes';
  if (mediaType === 'game') return 'lançamento, atualização ou promoção';
  if (mediaType === 'book') return 'novas edições ou disponibilidade';
  return 'lançamento ou disponibilidade';
}
