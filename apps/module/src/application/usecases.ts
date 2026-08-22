import type {
  ChatListFilter,
  ConversationQuery,
  Pagination,
  SessionManager,
  SupportGateway,
} from '@nipoto/support-sdk'

import {
  mergeAvailabilityStaff,
  toConversation,
  toConversationList,
  toConversationUser,
  toCount,
  toDepartment,
  toDepartmentList,
  toFaq,
  toFaqList,
  toPredeterminedList,
  toStaffMember,
  toStaffMemberList,
  toStaffProfile,
  toStringList,
  type Conversation,
} from '@/domain'

import { fileResultToObjectUrl, prepareImageForUpload, toSendFilePayload } from './files'
import { StaleSessionError } from './sessionGuard'

export class ClosedConversationError extends Error {
  constructor() {
    super('[support] cannot convey a closed conversation')
    this.name = 'ClosedConversationError'
  }
}

export type UseCaseDeps = {
  gateway: SupportGateway
  session: SessionManager
}

export type ListPage = Pagination & {
  filter?: ChatListFilter
}

export type OpenConversationInput = {
  department: string
  title: string
}

export type SendTextInput = {
  conversationId: string
  text: string
}

export type SendFileInput = {
  conversationId: string
  file: {
    name: string
    type: string
    size: number
    arrayBuffer: () => Promise<ArrayBuffer>
  }
}

export type UploadAvatarFileInput = SendFileInput['file']

export type SupportFileQuery = {
  id: string
  thumbnail?: boolean
}

export type MarkSeenInput = {
  conversationId: string
  messageIds: unknown
}

export type GetMessagesInput = {
  conversationId: string
  startRow?: number
  rowsPerPage?: number
  [key: string]: unknown
}

export type ConveyInput = {
  conversationId: string
  data: unknown
}

export type ConversationUserInput = {
  conversationId: string
  userId: string
}

export type FaqListInput = {
  department?: string
  page?: number
}

export type DepartmentPageInput = {
  page?: number
  rowsPerPage?: number
}

export type DepartmentWriteInput = {
  name: string
  description?: string
  icon?: string
}

export type FaqWriteInput = {
  question: string
  excerpt?: string
  answer: string
  department: string
  tags?: string[]
}

export type PredeterminedWriteInput = {
  category: string
  title: string
  content: string
  id?: string
}

async function loadConversation(
  deps: UseCaseDeps,
  conversationId: string,
): Promise<Conversation | null> {
  return withCurrentSession(deps.session, async () => {
    const fromGet = toConversation(await deps.gateway.getConversation(conversationId))
    if (fromGet) {
      return fromGet
    }
    return toConversation(await deps.gateway.getChat(conversationId))
  })
}

async function withCurrentSession<T>(session: SessionManager, run: () => Promise<T>): Promise<T> {
  if (!session.hasSession()) {
    throw new Error('[support] no active session')
  }
  const generation = session.getGeneration()
  const result = await run()
  if (!session.isCurrentGeneration(generation)) {
    throw new StaleSessionError(generation)
  }
  return result
}

/**
 * Application use cases for Phase 7 (user widget) and later staff surfaces.
 * Presentation must call these — never `$app` or Vuex.
 */
export function createSupportUseCases(deps: UseCaseDeps) {
  const { gateway, session } = deps

  return {
    listOpen(page: ListPage = {}) {
      return withCurrentSession(session, async () =>
        toConversationList(
          await gateway.getOpenChats({
            startRow: page.startRow,
            rowsPerPage: page.rowsPerPage,
            filter: page.filter,
          }),
        ),
      )
    },
    countOpen(filter: ChatListFilter = 'self') {
      return withCurrentSession(session, async () => toCount(await gateway.getCountOpenChats(filter)))
    },
    listQueued(page: Pagination = {}) {
      return withCurrentSession(session, async () =>
        toConversationList(await gateway.getQueuedChats(page)),
      )
    },
    countQueued() {
      return withCurrentSession(session, async () =>
        toCount(await gateway.countConversations({ status: 'queued' })),
      )
    },
    listClosed(page: ListPage = {}) {
      return withCurrentSession(session, async () =>
        toConversationList(
          await gateway.getClosedChats({
            startRow: page.startRow,
            rowsPerPage: page.rowsPerPage,
            filter: page.filter,
          }),
        ),
      )
    },
    countClosed() {
      return withCurrentSession(session, async () =>
        toCount(await gateway.countConversations({ status: 'closed' })),
      )
    },
    listActive(page: Pagination = {}) {
      return withCurrentSession(session, async () =>
        toConversationList(await gateway.getActiveChats(page)),
      )
    },
    countActive() {
      return withCurrentSession(session, async () =>
        toCount(
          await gateway.countConversations({
            status: ['opened', 'reopened', 'queued', 'processing'],
          }),
        ),
      )
    },
    listConversations(query: ConversationQuery = {}) {
      return withCurrentSession(session, async () =>
        toConversationList(await gateway.listConversations(query)),
      )
    },
    countConversations(query: ConversationQuery = {}) {
      return withCurrentSession(session, async () => toCount(await gateway.countConversations(query)))
    },
    getConversation(conversationId: string): Promise<Conversation | null> {
      return loadConversation(deps, conversationId)
    },
    /**
     * Entry URLs may carry a conversation id without a token.
     * Resolve only after SessionManager has a current, authorized generation.
     */
    async resolveConversation(conversationId: string): Promise<Conversation | null> {
      if (!session.hasSession() || !session.isConnected()) {
        return null
      }
      try {
        return await loadConversation(deps, conversationId)
      } catch {
        return null
      }
    },
    openConversation(input: OpenConversationInput) {
      return withCurrentSession(session, () =>
        gateway.openChat({ department: input.department, title: input.title }),
      )
    },
    reopenConversation(conversationId: string) {
      return withCurrentSession(session, () => gateway.reOpenChat({ chat: conversationId }))
    },
    closeConversation(conversationId: string) {
      return withCurrentSession(session, () => gateway.closeChat({ chat: conversationId }))
    },
    processConversation(conversationId: string) {
      return withCurrentSession(session, () => gateway.processChat({ chat: conversationId }))
    },
    async conveyConversation(input: ConveyInput) {
      return withCurrentSession(session, async () => {
        const conversation = await loadConversation(deps, input.conversationId)
        if (conversation?.status === 'closed') {
          throw new ClosedConversationError()
        }
        return gateway.conveyChat({ chatID: input.conversationId, data: input.data })
      })
    },
    sendText(input: SendTextInput) {
      return withCurrentSession(session, () =>
        gateway.sendMessage({ chat: input.conversationId, message: input.text }),
      )
    },
    sendFile(input: SendFileInput) {
      return withCurrentSession(session, async () => {
        const prepared = await prepareImageForUpload(input.file)
        const uploaded = await gateway.uploadFile({
          file: prepared.base64,
          name: prepared.name,
          mimeType: prepared.mimeType,
          size: prepared.size,
        })
        return gateway.sendFile(toSendFilePayload(input.conversationId, uploaded))
      })
    },
    uploadAvatar(file: UploadAvatarFileInput) {
      return withCurrentSession(session, async () => {
        const prepared = await prepareImageForUpload(file, { avatar: true })
        return gateway.uploadAvatar({
          file: prepared.base64,
          name: prepared.name,
          mimeType: prepared.mimeType,
          size: prepared.size,
        })
      })
    },
    getSupportFile(input: SupportFileQuery) {
      return withCurrentSession(session, async () => {
        const raw = await gateway.getSingleFile({
          id: input.id,
          thumbnail: input.thumbnail !== false,
        })
        const url = fileResultToObjectUrl(raw)
        if (url?.startsWith('blob:')) {
          session.registerObjectUrl(url)
        }
        return url
      })
    },
    markSeen(input: MarkSeenInput) {
      return withCurrentSession(session, () =>
        gateway.seenMessage({ chatID: input.conversationId, messagesID: input.messageIds }),
      )
    },
    getMessages(input: GetMessagesInput) {
      const { conversationId, ...rest } = input
      return withCurrentSession(session, () =>
        gateway.getChatMessages({ chatID: conversationId, ...rest }),
      )
    },
    listDepartments() {
      return withCurrentSession(session, () => gateway.getDepartmentList())
    },
    listFaqs(input: FaqListInput = {}) {
      return withCurrentSession(session, () =>
        gateway.getFAQs({ department: input.department, page: input.page }),
      )
    },
    listPredetermined(page: Pagination = {}) {
      return withCurrentSession(session, async () =>
        toPredeterminedList(await gateway.listPredetermined(page)),
      )
    },
    getCurrentStaff() {
      return withCurrentSession(session, async () => toStaffProfile(await gateway.getStaffInfo()))
    },
    getConversationUser(input: ConversationUserInput) {
      return withCurrentSession(session, async () =>
        toConversationUser(
          await gateway.getUserData({ chat: input.conversationId, user: input.userId }),
        ),
      )
    },
    listStaff() {
      return withCurrentSession(session, () => gateway.getStaffList())
    },
    listAvailableStaff() {
      return withCurrentSession(session, () => gateway.getAvailableStaff())
    },
    subscribeAvailability() {
      return withCurrentSession(session, () => gateway.subscribeStaffAvailability())
    },
    unsubscribeAvailability() {
      gateway.unsubscribeStaffAvailability()
    },
    pageDepartments(input: DepartmentPageInput = {}) {
      return withCurrentSession(session, async () =>
        toDepartmentList(
          await gateway.listDepartments({
            page: input.page ?? 0,
            rowsPerPage: input.rowsPerPage ?? 10,
          }),
        ),
      )
    },
    countDepartments() {
      return withCurrentSession(session, async () => toCount(await gateway.countDepartments()))
    },
    getDepartment(id: string) {
      return withCurrentSession(session, async () => toDepartment(await gateway.getDepartmentRecord(id)))
    },
    createDepartment(input: DepartmentWriteInput) {
      return withCurrentSession(session, () => gateway.addDepartment(input))
    },
    updateDepartment(id: string, input: DepartmentWriteInput) {
      return withCurrentSession(session, () => gateway.updateDepartment(id, input))
    },
    deleteDepartment(id: string) {
      return withCurrentSession(session, () => gateway.removeDepartment(id))
    },
    pageFaqs(input: FaqListInput = {}) {
      return withCurrentSession(session, async () =>
        toFaqList(
          await gateway.listFaqs({
            department: input.department ?? null,
            page: input.page ?? 0,
          }),
        ),
      )
    },
    countFaqs(department?: string) {
      return withCurrentSession(session, async () => toCount(await gateway.faqCount(department)))
    },
    getFaq(id: string) {
      return withCurrentSession(session, async () => toFaq(await gateway.getFaq(id)))
    },
    createFaq(input: FaqWriteInput) {
      return withCurrentSession(session, () => gateway.addFaq(input))
    },
    updateFaq(id: string, input: FaqWriteInput) {
      return withCurrentSession(session, () => gateway.updateFaq(id, input))
    },
    deleteFaq(id: string) {
      return withCurrentSession(session, () => gateway.removeFaq(id))
    },
    listFaqTags() {
      return withCurrentSession(session, async () => toStringList(await gateway.getFaqTags(false)))
    },
    countPredetermined() {
      return withCurrentSession(session, async () => toCount(await gateway.countPredetermined()))
    },
    listPredeterminedCategories() {
      return withCurrentSession(session, async () =>
        toStringList(await gateway.getPredeterminedCategory()),
      )
    },
    createPredetermined(input: PredeterminedWriteInput) {
      return withCurrentSession(session, () =>
        gateway.addPredetermined({
          category: input.category,
          title: input.title,
          content: input.content,
        }),
      )
    },
    updatePredetermined(input: PredeterminedWriteInput) {
      return withCurrentSession(session, () =>
        gateway.updatePredetermined({
          ...(input.id ? { id: input.id } : {}),
          category: input.category,
          title: input.title,
          content: input.content,
        }),
      )
    },
    deletePredetermined(id: string) {
      return withCurrentSession(session, () => gateway.removePredetermined(id))
    },
    listUserStaff() {
      return withCurrentSession(session, async () => toStaffMemberList(await gateway.getStaffs()))
    },
    listAvailabilityStaff() {
      return withCurrentSession(session, async () =>
        mergeAvailabilityStaff(
          toStaffMemberList(await gateway.getStaffList()),
          toStaffMemberList(await gateway.getStaffs()),
        ),
      )
    },
    getStaffStatus(id: string) {
      return withCurrentSession(session, async () => toStaffMember(await gateway.getStaffStatus(id)))
    },
    setAvailable() {
      return withCurrentSession(session, () => gateway.setAvailable())
    },
    setUnavailable(userId?: string) {
      return withCurrentSession(session, () => gateway.setUnavailable(userId))
    },
  }
}

export type SupportUseCases = ReturnType<typeof createSupportUseCases>
