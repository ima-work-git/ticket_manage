/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_admin_key: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
