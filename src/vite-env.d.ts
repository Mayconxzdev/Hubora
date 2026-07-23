/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_REQUIRE_AUTH?: string;
  readonly VITE_ALLOW_PUBLIC_SIGNUP?: string;
  readonly VITE_ALLOW_GUEST_MODE?: string;
  readonly VITE_ENABLE_EMAIL_LOGIN?: string;
  readonly VITE_ENABLE_REMOTE_RADAR?: string;
  readonly VITE_ENABLE_PWA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
