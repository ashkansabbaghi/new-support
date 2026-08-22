/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ABR_URL?: string
  readonly ABR_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
