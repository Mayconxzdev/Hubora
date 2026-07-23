/**
 * Hosts with documented/explicit embedding support used by Hubora itself.
 * User-installed providers are resolved to direct HTTPS media URLs and do not
 * expand this iframe allowlist automatically.
 */
export const STREAM_EMBED_HOSTS = [
  'archive.org',
  'www.youtube.com',
  'www.youtube-nocookie.com',
] as const;

export type StreamEmbedHost = (typeof STREAM_EMBED_HOSTS)[number];
