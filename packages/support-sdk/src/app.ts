export type AbrSubscription = {
  cancel?: () => void
}

export type AbrCommand = {
  await: (event: string) => AbrCommand
  send: () => Promise<unknown>
}

export type AbrList = {
  where: (...args: unknown[]) => AbrList
  sort: (value: string) => AbrList
  limit: (n: number) => AbrList
  skip: (n: number) => AbrList
  take: (n: number) => AbrList
  get: () => AbrList
  count: () => AbrList
  first: () => AbrList
  select: (...fields: string[]) => AbrList
  send: () => Promise<unknown>
  getOpenChats: (page: unknown, filter?: unknown) => AbrList
  countOpenChats: (filter?: unknown) => AbrList
  getActiveChats: (page: unknown) => AbrList
  getClosedChats: (page: unknown, filter?: unknown) => AbrList
  getQueuedChats: (page: unknown) => AbrList
  getChatMessages: (payload: unknown) => AbrList
  getUserData: (payload: unknown) => AbrList
  isThereOnline: () => AbrList
  getAvatar: (id: unknown) => AbrList
  getFile: (id: unknown, thumbnail?: boolean) => AbrList
  getChat: (payload: unknown) => AbrList
  getCategory: () => AbrList
  getTags: (counted?: boolean) => AbrList
  findById: (id: unknown) => AbrList
  info: () => AbrList
}

export type AbrEntity = {
  reOpen: () => AbrCommand
  close: () => AbrCommand
  sendMessage: (data: unknown) => AbrCommand
  sendFile: (data: unknown) => AbrCommand
  processing: () => AbrCommand
  convey: (data: unknown) => AbrCommand
  update: (data: unknown) => AbrCommand
  delete: () => AbrCommand
}

export type AbrAggregate = ((id: string) => AbrEntity) & {
  lists: Record<string, AbrList>
  on: (
    name: string,
    fn: (...args: unknown[]) => void,
    options?: unknown,
  ) => Promise<AbrSubscription>
  open: (data: unknown) => AbrCommand
  avail: (data?: unknown) => AbrCommand
  unAvail: (data?: unknown) => AbrCommand
  add: (data: unknown) => AbrCommand
  update: (data: unknown) => AbrCommand
  seen: (data: unknown) => AbrCommand
}

export type AbrBus = {
  subscribe: (eventName: string, callback: (data: unknown) => void) => { cancel?: () => void }
  listen?: (eventName: string, callback: (data: unknown) => void) => void
  unlisten?: (eventName: string) => void
  publish?: (eventName: string, data?: unknown) => void
}

export type AbrSocket = {
  ws?: { close: () => void; readyState?: number }
  reconnectTimeoutId?: ReturnType<typeof setTimeout> | number
  close?: () => void
}

export type SupportApp = {
  Support: {
    Chat: AbrAggregate
    Message: AbrAggregate
    Department: AbrAggregate
    FAQ: AbrAggregate
    Predetermined: AbrAggregate
  }
  User: {
    Staff: AbrAggregate
  }
  Mastering: {
    File: AbrAggregate
  }
  $abr?: {
    bus?: AbrBus
    socket?: AbrSocket
    auth?: {
      cookieName?: string
      cookieAttributes?: { sameSite?: string; domain?: string; secure?: boolean }
      getToken?: () => string | undefined
    }
  }
}
