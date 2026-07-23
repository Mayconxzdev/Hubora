import type { AdultContentMode, MediaItem, UserMediaEntry, UserProfile } from '@/types';

export function getAdultMode(profile: UserProfile | null | undefined): AdultContentMode {
  if (!profile) return 'off';
  const birthYear = profile.preferences.birthYear;
  const isAdultConfirmed = Boolean(profile.preferences.adultConfirmed && birthYear && new Date().getFullYear() - birthYear >= 18);
  if (!isAdultConfirmed) return 'off';
  if (profile.preferences.adultMode) return profile.preferences.adultMode;
  return profile.preferences.adultContent ? 'mature' : 'off';
}

export function classifyAdult(item: MediaItem): 'safe' | 'mature' | 'explicit' {
  if (item.explicitContent) return 'explicit';
  if (item.isAdult) return 'explicit';
  if ((item.ageRating || 0) >= 18) return 'mature';
  const descriptors = (item.contentDescriptors || []).join(' ').toLowerCase();
  if (/porn|hentai|explicit|adult only|conteúdo sexual explícito/.test(descriptors)) return 'explicit';
  if (/nudity|nudez|sex|violence|violência extrema|drugs|drogas/.test(descriptors)) return 'mature';
  return 'safe';
}

export function canDisplayMedia(item: MediaItem, profile: UserProfile | null | undefined, vaultUnlocked = false): boolean {
  const mode = getAdultMode(profile);
  const classification = classifyAdult(item);
  if (classification === 'safe') return true;
  if (classification === 'mature') return mode === 'mature' || mode === 'vault';
  return mode === 'vault' && Boolean(profile?.preferences.adultVaultEnabled) && vaultUnlocked;
}

export function filterMediaForProfile(items: MediaItem[], profile: UserProfile | null | undefined, vaultUnlocked = false): MediaItem[] {
  return items.filter((item) => canDisplayMedia(item, profile, vaultUnlocked));
}

/**
 * Provider-level adult flags are broader than Hubora's mature classification.
 * Keep provider queries safe unless an adult has deliberately enabled and
 * unlocked the Vault and explicitly disabled the safe-search protection.
 */
export function canQueryExplicitProviderContent(
  profile: UserProfile | null | undefined,
  vaultUnlocked: boolean,
): boolean {
  if (!profile || profile.preferences.adultFilterEnabled !== false) return false;
  return getAdultMode(profile) === 'vault'
    && Boolean(profile.preferences.adultVaultEnabled)
    && vaultUnlocked;
}

export function defaultEntryPrivacy(item: MediaItem): Pick<UserMediaEntry, 'visibility' | 'adultPrivate'> {
  const adult = classifyAdult(item) !== 'safe';
  return {
    visibility: 'private',
    adultPrivate: adult,
  };
}
