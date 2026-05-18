/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_PROJECT_ROOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
