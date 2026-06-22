/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly STARTIX_CALENDAR_ICS_URL?: string;
  readonly PUBLIC_STARTIX_CALENDAR_ICS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
