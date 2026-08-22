import type { AbrList, SupportApp } from '../app.js'
import { resolveBackend, type BackendEnvInput } from '../env/resolveBackend.js'
import { mutationAttemptKey } from '../realtime/MutationLedger.js'
import { isAuthFailure, type SessionManager } from '../session/SessionManager.js'
import type {
  ChatIdInput,
  ChatListFilter,
  ChatMessagesInput,
  ConversationQuery,
  ConveyChatInput,
  DepartmentListInput,
  FaqListInput,
  OpenChatInput,
  Pagination,
  PredeterminedListInput,
  SeenMessageInput,
  SendFileInput,
  SendMessageInput,
  UploadAvatarInput,
  UploadFileInput,
} from './types.js'
import { uploadAvatar as postAvatar, uploadFile as postSupportFile } from './upload.js'

export type SupportGatewayOptions = {
  session: SessionManager
  env?: BackendEnvInput
}

function applyConversationQuery(query: AbrList, filter: ConversationQuery = {}): AbrList {
  let next = query
  if (filter.rowsPerPage !== undefined) {
    next = next.limit(filter.rowsPerPage)
  }
  if (filter.startRow !== undefined) {
    next = next.skip(filter.startRow)
  }
  if (filter.sortBy) {
    next = next.sort(filter.sortBy)
  }
  if (filter.title) {
    next = next.where('title', 'LIKE', `%${filter.title}%`)
  }
  if (filter.status) {
    if (filter.status === 'opened') {
      next = next.where('status', 'in', ['opened', 'reopened'])
    } else if (Array.isArray(filter.status)) {
      next = next.where('status', 'in', filter.status)
    } else {
      next = next.where({ status: filter.status })
    }
  }
  if (filter.staff) {
    next = next.where({ staff: filter.staff })
  }
  if (filter.department) {
    next = next.where({ department: filter.department })
  }
  if (filter.updatedAtFrom) {
    next = next.where('updatedAt', '>=', filter.updatedAtFrom)
  }
  if (filter.updatedAtTo) {
    next = next.where('updatedAt', '<=', filter.updatedAtTo)
  }
  return next
}

/**
 * Typed anti-corruption layer over `$app.Support.*` / User.Staff / Mastering.File.
 * No Support.Ticket aggregate and no new REST/Ticket API.
 */
export function createSupportGateway(options: SupportGatewayOptions) {
  const { session } = options

  function app(): SupportApp {
    return session.requireApp()
  }

  async function guarded<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (isAuthFailure(error)) {
        session.notifyAuthRequired('unauthorized')
      }
      throw error
    }
  }

  function restUrl(): string {
    return resolveBackend({
      ...options.env,
      hostname: options.env?.hostname,
    }).restUrl
  }

  return {
    getDepartmentList() {
      return guarded(() => app().Support.Department.lists.department.sort('name').limit(100).get().send())
    },
    getDepartment(id: string) {
      return guarded(() =>
        app().Support.Department.lists.department.where('id', '=', id).limit(100).get().send(),
      )
    },
    listDepartments({ page = 0, id = null, rowsPerPage = 10 }: DepartmentListInput = {}) {
      return guarded(() => {
        let query = app().Support.Department.lists.department
        if (id !== null) {
          query = query.where({ id })
        }
        if (page > 0) {
          query = query.skip(page * rowsPerPage)
        }
        return query.sort('createdAt').take(rowsPerPage).send()
      })
    },
    getDepartmentRecord(id: string) {
      return guarded(() => app().Support.Department.lists.department.where({ id }).first().send())
    },
    countDepartments() {
      return guarded(() => app().Support.Department.lists.department.count().send())
    },
    addDepartment(payload: unknown) {
      return guarded(() => app().Support.Department.add(payload).await('added').send())
    },
    updateDepartment(id: string, data: unknown) {
      return guarded(() => app().Support.Department(id).update(data).await('updated').send())
    },
    removeDepartment(id: string) {
      return guarded(() => app().Support.Department(id).delete().await('deleted').send())
    },

    getChatList() {
      return guarded(() => app().Support.Chat.lists.chat.get().send())
    },
    getChat(id: string) {
      return guarded(() => app().Support.Chat.lists.chat.where('id', '=', id).get().send())
    },
    getConversation(id: string) {
      return guarded(() => app().Support.Chat.lists.chat.getChat(id).send())
    },
    listConversations(filter: ConversationQuery = {}) {
      return guarded(() => applyConversationQuery(app().Support.Chat.lists.chat, filter).get().send())
    },
    countConversations(filter: ConversationQuery = {}) {
      return guarded(() => applyConversationQuery(app().Support.Chat.lists.chat, filter).count().send())
    },
    getCountOpenChats(filter: ChatListFilter = 'self') {
      return guarded(() => app().Support.Chat.lists.chat.countOpenChats(filter).send())
    },
    getActiveChats({ startRow = 1, rowsPerPage = 5 }: Pagination = {}) {
      return guarded(() => app().Support.Chat.lists.chat.getActiveChats({ startRow, rowsPerPage }).send())
    },
    getOpenChats({
      startRow = 1,
      rowsPerPage = 5,
      filter = 'self',
    }: Pagination & { filter?: ChatListFilter } = {}) {
      return guarded(() =>
        app().Support.Chat.lists.chat.getOpenChats({ startRow, rowsPerPage }, filter).send(),
      )
    },
    getChatListManagement({
      isStaff = false,
      startRow = 1,
      rowsPerPage = 5,
      filter = 'self',
    }: Pagination & { isStaff?: boolean; filter?: ChatListFilter } = {}) {
      if (isStaff) {
        return guarded(() =>
          app().Support.Chat.lists.chat.getOpenChats({ startRow, rowsPerPage }, filter).send(),
        )
      }
      return guarded(() =>
        app().Support.Chat.lists.chat.getActiveChats({ startRow, rowsPerPage }).send(),
      )
    },
    getClosedChats({
      startRow = 1,
      rowsPerPage = 5,
      filter = 'self',
    }: Pagination & { filter?: ChatListFilter } = {}) {
      return guarded(() =>
        app().Support.Chat.lists.chat.getClosedChats({ startRow, rowsPerPage }, filter).send(),
      )
    },
    getQueuedChats({ startRow = 1, rowsPerPage = 5 }: Pagination = {}) {
      return guarded(() => app().Support.Chat.lists.chat.getQueuedChats({ startRow, rowsPerPage }).send())
    },
    getChatMessages(payload: ChatMessagesInput) {
      return guarded(() => app().Support.Message.lists.message.getChatMessages(payload).send())
    },
    getStaff(id: string) {
      return guarded(() => app().Support.Chat.lists.staff.where('id', '=', id).get().send())
    },
    getAvailableStaff() {
      return guarded(() => app().Support.Chat.lists.staff.isThereOnline().send())
    },
    getStaffStatus(id: string) {
      return guarded(() => app().Support.Chat.lists.staff.findById(id).send())
    },
    getStaffList() {
      return guarded(() => app().Support.Chat.lists.staff.limit(100).get().send())
    },
    getStaffInfo() {
      return guarded(() => app().User.Staff.lists.staff.info().send())
    },
    getStaffs() {
      return guarded(() =>
        app().User.Staff.lists.staff.select('id', 'departments', 'nickName').limit(200).get().send(),
      )
    },
    getUserData(payload: { chat: string; user: string }) {
      return guarded(() =>
        app().Support.Chat.lists.chat.getUserData({ chat: payload.chat, userID: payload.user }).send(),
      )
    },
    queueCount(before: unknown) {
      return guarded(() =>
        app()
          .Support.Chat.lists.chat.where('openedAt', null)
          .where('closedAt', null)
          .where('queuedAt', '<=', before)
          .count()
          .send(),
      )
    },

    faqCount(department?: string) {
      return guarded(() => {
        if (!department) {
          return app().Support.FAQ.lists.faq.count().send()
        }
        return app().Support.FAQ.lists.faq.where({ department }).count().send()
      })
    },
    getFAQs({ department, page = 0 }: { department?: string; page?: number }) {
      return guarded(() =>
        app().Support.FAQ.lists.faq.where('department', department).skip(page * 10).take(10).send(),
      )
    },
    listFaqs({ department = null, page = 0 }: FaqListInput = {}) {
      return guarded(() => {
        let query = app().Support.FAQ.lists.faq
        if (department !== null) {
          query = query.where({ department })
        }
        if (page > 0) {
          query = query.skip(page * 10)
        }
        return query.sort('createdAt').take(10).send()
      })
    },
    getFaq(id: string) {
      return guarded(() => app().Support.FAQ.lists.faq.where({ id }).first().send())
    },
    addFaq(payload: unknown) {
      return guarded(() => app().Support.FAQ.add(payload).await('added').send())
    },
    updateFaq(id: string, data: unknown) {
      return guarded(() => app().Support.FAQ(id).update(data).await('updated').send())
    },
    removeFaq(id: string) {
      return guarded(() => app().Support.FAQ(id).delete().await('deleted').send())
    },
    getFaqTags(counted = false) {
      return guarded(() => {
        const query = app().Support.FAQ.lists.faq.getTags(counted)
        return counted ? query.sort('createdAt').send() : query.send()
      })
    },

    openChat({ department, title, attemptKey }: OpenChatInput) {
      return session.runMutation(mutationAttemptKey('openChat', attemptKey), () =>
        guarded(() =>
          app().Support.Chat.open({ department, title }).await('opened').await('queued').send(),
        ),
      )
    },
    reOpenChat({ chat, attemptKey }: ChatIdInput) {
      return session.runMutation(mutationAttemptKey('reOpenChat', attemptKey), () =>
        guarded(() => app().Support.Chat(chat).reOpen().await('opened').await('queued').send()),
      )
    },
    closeChat({ chat, attemptKey }: ChatIdInput) {
      return session.runMutation(mutationAttemptKey('closeChat', attemptKey), () =>
        guarded(() => app().Support.Chat(chat).close().await('closed').send()),
      )
    },
    sendMessage({ chat, message, attemptKey }: SendMessageInput) {
      return session.runMutation(mutationAttemptKey('sendMessage', attemptKey), () =>
        guarded(() =>
          app().Support.Chat(chat).sendMessage({ text: message }).await('messageSent').send(),
        ),
      )
    },
    processChat({ chat, attemptKey }: ChatIdInput) {
      return session.runMutation(mutationAttemptKey('processChat', attemptKey), () =>
        guarded(() => app().Support.Chat(chat).processing().await('processing').send()),
      )
    },
    conveyChat({ chatID, data, attemptKey }: ConveyChatInput) {
      return session.runMutation(mutationAttemptKey('conveyChat', attemptKey), () =>
        guarded(() => app().Support.Chat(chatID).convey(data).await('conveyed').send()),
      )
    },
    sendFile(payload: SendFileInput) {
      const { chatID, attemptKey, ...data } = payload
      return session.runMutation(mutationAttemptKey('sendFile', attemptKey), () =>
        guarded(() => app().Support.Chat(chatID).sendFile(data).await('messageSent').send()),
      )
    },
    seenMessage(payload: SeenMessageInput) {
      return guarded(() =>
        app().Support.Message.seen({ chatID: payload.chatID, messagesID: payload.messagesID }).send(),
      )
    },
    setAvailable() {
      return guarded(() => app().Support.Chat.avail().await('availed').send())
    },
    setUnavailable(userID?: string) {
      return guarded(() =>
        userID
          ? app().Support.Chat.unAvail({ userID }).await('unAvailed').send()
          : app().Support.Chat.unAvail().await('unAvailed').send(),
      )
    },

    getPredeterminedAnswers() {
      return guarded(() => app().Support.Predetermined.lists.predetermined.limit(100).get().send())
    },
    listPredetermined({ startRow = 0, rowsPerPage = 10 }: PredeterminedListInput = {}) {
      return guarded(() =>
        app()
          .Support.Predetermined.lists.predetermined.sort('-createdAt')
          .skip(startRow)
          .limit(rowsPerPage)
          .get()
          .send(),
      )
    },
    countPredetermined() {
      return guarded(() => app().Support.Predetermined.lists.predetermined.count().send())
    },
    getPredeterminedCategory() {
      return guarded(() => app().Support.Predetermined.lists.predetermined.getCategory().send())
    },
    addPredetermined(payload: unknown) {
      return guarded(() => app().Support.Predetermined.add(payload).await('added').send())
    },
    updatePredetermined(payload: unknown) {
      return guarded(() => app().Support.Predetermined.update(payload).await('updated').send())
    },
    removePredetermined(id: string) {
      return guarded(() => app().Support.Predetermined(id).delete().await('deleted').send())
    },

    getAvatar(id: string) {
      return guarded(() => app().Support.Chat.lists.staff.getAvatar(id).send())
    },
    getSingleFile(payload: { id: string; thumbnail?: boolean }) {
      return guarded(() =>
        app().Mastering.File.lists.support.getFile(payload.id, !!payload.thumbnail).send(),
      )
    },
    uploadAvatar(input: UploadAvatarInput) {
      return postAvatar(session, restUrl(), input)
    },
    uploadFile(input: UploadFileInput) {
      return postSupportFile(session, restUrl(), input)
    },

    async subscribeStaffAvailability() {
      const key = 'staff-availability'
      return session.subscribe(key, async () => {
        const current = session.getGeneration()
        const availed = await app().Support.Chat.on(
          'availed',
          (data) => {
            if (session.isCurrentGeneration(current)) {
              session.emitDomainEvent('availed', data)
            }
          },
          { minimal: true },
        )
        const unAvailed = await app().Support.Chat.on(
          'unAvailed',
          (data) => {
            if (session.isCurrentGeneration(current)) {
              session.emitDomainEvent('unAvailed', data)
            }
          },
          { minimal: true },
        )
        return {
          cancel() {
            availed.cancel?.()
            unAvailed.cancel?.()
          },
        }
      })
    },
    unsubscribeStaffAvailability() {
      session.unsubscribe('staff-availability')
    },
  }
}

export type SupportGateway = ReturnType<typeof createSupportGateway>
