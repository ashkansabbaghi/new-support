declare module '@abr/client' {
  export type AbrCookieAttributes = {
    secure?: boolean
    sameSite?: string
    domain?: string
    expires?: Date
  }

  export const Auth: {
    tokenVerified: boolean
    cookieAttributes: AbrCookieAttributes
    cookieName: string
    setTokenVerified(value: boolean): void
    getToken(): string | undefined
    setToken(data: unknown): void
    removeToken(): void
  }

  export default function Abr(url: string, protocol?: string, options?: unknown): Promise<unknown>
}
