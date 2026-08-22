import { ref } from 'vue'

import type { ConversationQuery } from '@nipoto/support-sdk'

import {
  mergeAvailabilityStaff,
  toConversation,
  toDepartmentList,
  toFaq,
  toFaqList,
  toStaffMemberList,
  type Conversation,
  type Department,
  type PredeterminedAnswer,
  type StaffProfile,
} from '@/domain'

import { ClosedConversationError } from './usecases'
import type {
  ConversationUserInput,
  ConveyInput,
  DepartmentPageInput,
  DepartmentWriteInput,
  FaqListInput,
  FaqWriteInput,
  GetMessagesInput,
  ListPage,
  MarkSeenInput,
  OpenConversationInput,
  PredeterminedWriteInput,
  SendFileInput,
  SendTextInput,
  SupportFileQuery,
  SupportUseCases,
  UploadAvatarFileInput,
} from './usecases'

const FIXTURE_USER_ID = 'fix_user_1'
const FIXTURE_STAFF_ID = 'fix_staff_1'
const FIXTURE_STAFF_OTHER_ID = 'fix_staff_2'

type FixtureMessage = {
  id: string
  conversationId: string
  from: string
  text: string
  type: string | null
  sentAt: string
  views: boolean
  file?: string
}

type FixtureFaq = {
  id: string
  question: string
  excerpt: string
  answer: string
  department: string
  tags: string[]
}

type FixtureStaffRow = {
  id: string
  nickName: string
  available: boolean
  departments?: string[]
}

type FixtureState = {
  conversations: Conversation[]
  messages: Record<string, FixtureMessage[]>
  nextOpen: number
  departments: Department[]
  faqs: FixtureFaq[]
  predetermined: PredeterminedAnswer[]
  predeterminedCategories: string[]
  faqTags: string[]
  staff: FixtureStaffRow[]
  nextDepartment: number
  nextFaq: number
  nextPredetermined: number
}

function iso(offsetHours = 0): string {
  return new Date(Date.now() + offsetHours * 3600_000).toISOString()
}

function seed(): FixtureState {
  const opened: Conversation = {
    id: 'fix_open_1',
    title: 'Cannot sign in to my account',
    status: 'opened',
    departmentId: 'fix_dept_account',
    departmentName: 'Account',
    staffId: FIXTURE_STAFF_ID,
    staffName: 'Nila',
    userId: FIXTURE_USER_ID,
    userName: 'Demo user',
    chatID: '1001',
    createdAt: iso(-6),
    openedAt: iso(-6),
    updatedAt: iso(-1),
  }
  const queued: Conversation = {
    id: 'fix_queued_1',
    title: 'Withdrawal is pending',
    status: 'queued',
    departmentId: 'fix_dept_finance',
    departmentName: 'Finance',
    userId: FIXTURE_USER_ID,
    userName: 'Demo user',
    chatID: '1002',
    createdAt: iso(-2),
    queuedAt: iso(-2),
    updatedAt: iso(-2),
  }
  const closed: Conversation = {
    id: 'fix_closed_1',
    title: 'How to enable 2FA',
    status: 'closed',
    departmentId: 'fix_dept_account',
    departmentName: 'Account',
    staffId: FIXTURE_STAFF_ID,
    staffName: 'Nila',
    userId: FIXTURE_USER_ID,
    userName: 'Demo user',
    chatID: '1003',
    createdAt: iso(-48),
    openedAt: iso(-48),
    closedAt: iso(-24),
    updatedAt: iso(-24),
  }

  return {
    nextOpen: 2,
    nextDepartment: 4,
    nextFaq: 3,
    nextPredetermined: 3,
    departments: [
      { id: 'fix_dept_account', name: 'Account', description: 'Account and sign-in issues' },
      { id: 'fix_dept_finance', name: 'Finance', description: 'Withdrawals and deposits' },
      { id: 'fix_dept_tech', name: 'Technical', description: 'Product and app issues' },
    ],
    faqs: [
      {
        id: 'fix_faq_1',
        question: 'I forgot my password',
        excerpt: 'Use the reset link on the sign-in page.',
        answer: 'Open the sign-in page and choose Forgot password. We email a reset link.',
        department: 'fix_dept_account',
        tags: ['password'],
      },
      {
        id: 'fix_faq_2',
        question: 'How long do withdrawals take?',
        excerpt: 'Most withdrawals finish within one business day.',
        answer: 'Withdrawals are reviewed automatically. If extra checks are needed we email you.',
        department: 'fix_dept_finance',
        tags: ['withdraw'],
      },
    ],
    predetermined: [
      {
        id: 'fix_pre_1',
        title: 'Ask for screenshots',
        content: 'Please send a screenshot of the error page.',
        category: 'General',
      },
      {
        id: 'fix_pre_2',
        title: 'Reset password steps',
        content: 'Open the sign-in page and choose Forgot password.',
        category: 'Account',
      },
    ],
    predeterminedCategories: ['General', 'Account', 'Finance'],
    faqTags: ['password', 'withdraw'],
    staff: [
      {
        id: FIXTURE_STAFF_ID,
        nickName: 'Nila',
        available: true,
        departments: ['fix_dept_account'],
      },
      {
        id: FIXTURE_STAFF_OTHER_ID,
        nickName: 'Omid',
        available: false,
        departments: ['fix_dept_finance'],
      },
    ],
    conversations: [opened, queued, closed],
    messages: {
      [opened.id]: [
        {
          id: 'fix_msg_1',
          conversationId: opened.id,
          from: FIXTURE_USER_ID,
          text: 'I cannot sign in after the last update.',
          type: null,
          sentAt: iso(-5),
          views: true,
        },
        {
          id: 'fix_msg_2',
          conversationId: opened.id,
          from: FIXTURE_STAFF_ID,
          text: 'Thanks — we are looking at your account now.',
          type: null,
          sentAt: iso(-4),
          views: false,
        },
      ],
      [queued.id]: [],
      [closed.id]: [
        {
          id: 'fix_msg_closed_1',
          conversationId: closed.id,
          from: FIXTURE_USER_ID,
          text: 'How do I turn on two-factor authentication?',
          type: null,
          sentAt: iso(-40),
          views: true,
        },
        {
          id: 'fix_msg_closed_2',
          conversationId: closed.id,
          from: FIXTURE_STAFF_ID,
          text: 'Open Settings → Security → Enable 2FA.',
          type: null,
          sentAt: iso(-36),
          views: true,
        },
      ],
    },
  }
}

let fixtureStaffRoles: string[] = ['supporter', 'supportManager']

let state = seed()
const fixtureEnabled = ref(false)

export function isFixtureMode(): boolean {
  return fixtureEnabled.value
}

export function useFixtureMode() {
  return fixtureEnabled
}

export function resetFixtureState(): void {
  state = seed()
  fixtureStaffRoles = ['supporter', 'supportManager']
}

export function setFixtureStaffRoles(roles: string[]): void {
  fixtureStaffRoles = [...roles]
}

export function setFixtureMode(enabled: boolean): void {
  fixtureEnabled.value = enabled
}

function pageSlice<T>(items: T[], startRow = 0, rowsPerPage = 20): T[] {
  const start = Math.max(0, startRow)
  return items.slice(start, start + rowsPerPage)
}

function requireConversation(id: string): Conversation {
  const found = state.conversations.find((item) => item.id === id)
  if (!found) {
    throw new Error('[support] fixture conversation not found')
  }
  return found
}

function matchesTicketQuery(item: Conversation, query: ConversationQuery): boolean {
  if (query.title && !item.title?.toLowerCase().includes(query.title.toLowerCase())) {
    return false
  }
  if (query.status) {
    const statuses = Array.isArray(query.status)
      ? query.status
      : query.status === 'opened'
        ? ['opened', 'reopened']
        : [query.status]
    const current = item.status ?? ''
    const aliases = [current, current.replace('-', ' ')]
    if (!statuses.some((status) => aliases.includes(status))) {
      return false
    }
  }
  if (query.staff && item.staffId !== query.staff) {
    return false
  }
  if (query.department && item.departmentId !== query.department) {
    return false
  }
  if (query.updatedAtFrom && item.updatedAt && item.updatedAt < query.updatedAtFrom) {
    return false
  }
  if (query.updatedAtTo && item.updatedAt && item.updatedAt > query.updatedAtTo) {
    return false
  }
  return true
}

function sortConversations(items: Conversation[], sortBy?: string): Conversation[] {
  if (!sortBy) {
    return items
  }
  const descending = sortBy.startsWith('-')
  const field = descending ? sortBy.slice(1) : sortBy
  const key = field === 'createdAt' ? 'createdAt' : 'updatedAt'
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left[key] ?? '') || 0
    const rightTime = Date.parse(right[key] ?? '') || 0
    return descending ? rightTime - leftTime : leftTime - rightTime
  })
}

/**
 * Recorded user-widget data used when the gateway is not connected.
 * Presentation still goes through SupportUseCases — never $app.
 */
export function createFixtureUseCases(): SupportUseCases {
  return {
    listOpen(page: ListPage = {}) {
      return Promise.resolve(
        pageSlice(
          state.conversations.filter((item) => item.status === 'opened' || item.status === 'reopened'),
          page.startRow,
          page.rowsPerPage,
        ),
      )
    },
    countOpen() {
      return Promise.resolve(
        state.conversations.filter((item) => item.status === 'opened' || item.status === 'reopened').length,
      )
    },
    listQueued(page = {}) {
      return Promise.resolve(
        pageSlice(
          state.conversations.filter((item) => item.status === 'queued' || item.status === 'requeued'),
          page.startRow,
          page.rowsPerPage,
        ),
      )
    },
    countQueued() {
      return Promise.resolve(
        state.conversations.filter((item) => item.status === 'queued' || item.status === 'requeued').length,
      )
    },
    listClosed(page: ListPage = {}) {
      return Promise.resolve(
        pageSlice(
          state.conversations.filter((item) => item.status === 'closed'),
          page.startRow,
          page.rowsPerPage,
        ),
      )
    },
    countClosed() {
      return Promise.resolve(state.conversations.filter((item) => item.status === 'closed').length)
    },
    listActive(page = {}) {
      return Promise.resolve(
        pageSlice(
          state.conversations.filter((item) => item.status !== 'closed'),
          page.startRow,
          page.rowsPerPage,
        ),
      )
    },
    countActive() {
      return Promise.resolve(state.conversations.filter((item) => item.status !== 'closed').length)
    },
    listConversations(query: ConversationQuery = {}) {
      const filtered = sortConversations(
        state.conversations.filter((item) => matchesTicketQuery(item, query)),
        query.sortBy,
      )
      return Promise.resolve(pageSlice(filtered, query.startRow, query.rowsPerPage))
    },
    countConversations(query: ConversationQuery = {}) {
      return Promise.resolve(state.conversations.filter((item) => matchesTicketQuery(item, query)).length)
    },
    getConversation(conversationId: string) {
      return Promise.resolve(state.conversations.find((item) => item.id === conversationId) ?? null)
    },
    resolveConversation(conversationId: string) {
      return Promise.resolve(state.conversations.find((item) => item.id === conversationId) ?? null)
    },
    openConversation(input: OpenConversationInput) {
      const department = state.departments.find((item) => item.id === input.department)
      const online = true
      const id = `fix_new_${state.nextOpen}`
      state.nextOpen += 1
      const conversation: Conversation = {
        id,
        title: input.title,
        departmentId: input.department,
        departmentName: department?.name,
        userId: FIXTURE_USER_ID,
        updatedAt: iso(),
        status: online ? 'opened' : 'queued',
        ...(online ? { openedAt: iso(), staffId: FIXTURE_STAFF_ID, staffName: 'Nila' } : { queuedAt: iso() }),
      }
      state.conversations = [conversation, ...state.conversations]
      state.messages[id] = []
      return Promise.resolve(conversation)
    },
    reopenConversation(conversationId: string) {
      const conversation = requireConversation(conversationId)
      conversation.status = 'reopened'
      conversation.openedAt = iso()
      conversation.closedAt = undefined
      conversation.updatedAt = iso()
      return Promise.resolve(conversation)
    },
    closeConversation(conversationId: string) {
      const conversation = requireConversation(conversationId)
      conversation.status = 'closed'
      conversation.closedAt = iso()
      conversation.updatedAt = iso()
      return Promise.resolve(conversation)
    },
    processConversation(conversationId: string) {
      const conversation = requireConversation(conversationId)
      conversation.status = 'processing'
      conversation.updatedAt = iso()
      return Promise.resolve(conversation)
    },
    conveyConversation(input: ConveyInput) {
      const conversation = requireConversation(input.conversationId)
      if (conversation.status === 'closed') {
        return Promise.reject(new ClosedConversationError())
      }
      const data =
        input.data && typeof input.data === 'object' && !Array.isArray(input.data)
          ? (input.data as Record<string, unknown>)
          : {}
      if (typeof data.staff === 'string' && data.staff) {
        conversation.staffId = data.staff
        conversation.staffName = data.staff === FIXTURE_STAFF_OTHER_ID ? 'Omid' : conversation.staffName
      }
      if (typeof data.department === 'string' && data.department) {
        conversation.departmentId = data.department
        conversation.departmentName = state.departments.find((item) => item.id === data.department)?.name
      }
      conversation.status = 'conveyed'
      conversation.updatedAt = iso()
      return Promise.resolve(conversation)
    },
    sendText(input: SendTextInput) {
      const conversation = requireConversation(input.conversationId)
      const message: FixtureMessage = {
        id: `fix_msg_${Date.now()}`,
        conversationId: input.conversationId,
        from: FIXTURE_USER_ID,
        text: input.text,
        type: null,
        sentAt: iso(),
        views: false,
      }
      state.messages[input.conversationId] = [...(state.messages[input.conversationId] ?? []), message]
      conversation.status = conversation.status === 'queued' ? 'queued' : 'user-replied'
      conversation.updatedAt = iso()
      return Promise.resolve(message)
    },
    sendFile(input: SendFileInput) {
      const conversation = requireConversation(input.conversationId)
      const id = `fix_file_${Date.now()}`
      const message: FixtureMessage = {
        id: `fix_msg_${Date.now()}`,
        conversationId: input.conversationId,
        from: FIXTURE_USER_ID,
        text: '',
        type: 'file',
        sentAt: iso(),
        views: false,
        file: id,
      }
      state.messages[input.conversationId] = [...(state.messages[input.conversationId] ?? []), message]
      conversation.status = conversation.status === 'queued' ? 'queued' : 'user-replied'
      conversation.updatedAt = iso()
      return Promise.resolve(message)
    },
    uploadAvatar(file: UploadAvatarFileInput) {
      void file
      return Promise.resolve({ id: 'fix_avatar_1' })
    },
    getSupportFile(input: SupportFileQuery) {
      void input
      return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
    },
    markSeen(input: MarkSeenInput) {
      const ids = Array.isArray(input.messageIds) ? input.messageIds.map(String) : []
      const messages = state.messages[input.conversationId] ?? []
      for (const message of messages) {
        if (ids.includes(message.id)) {
          message.views = true
        }
      }
      return Promise.resolve({ ok: true })
    },
    getMessages(input: GetMessagesInput) {
      return Promise.resolve([...(state.messages[input.conversationId] ?? [])].reverse())
    },
    listDepartments() {
      return Promise.resolve(state.departments)
    },
    listFaqs(input: FaqListInput = {}) {
      const filtered = input.department
        ? state.faqs.filter((item) => item.department === input.department)
        : state.faqs
      return Promise.resolve(filtered)
    },
    listPredetermined() {
      return Promise.resolve(state.predetermined)
    },
    getCurrentStaff() {
      const profile: StaffProfile = {
        id: FIXTURE_STAFF_ID,
        name: 'Nila',
        roles: [...fixtureStaffRoles],
      }
      return Promise.resolve(profile)
    },
    getConversationUser(input: ConversationUserInput) {
      return Promise.resolve({
        id: input.userId || FIXTURE_USER_ID,
        name: 'Demo user',
        mobile: '09120000000',
      })
    },
    listStaff() {
      return Promise.resolve(state.staff)
    },
    listAvailableStaff() {
      const sample = state.staff.filter((item) => item.available)
      return Promise.resolve({
        count: sample.length,
        sample,
      })
    },
    subscribeAvailability() {
      return Promise.resolve('fixture-availability')
    },
    unsubscribeAvailability() {
      // no-op
    },
    pageDepartments(input: DepartmentPageInput = {}) {
      return Promise.resolve(
        toDepartmentList(pageSlice(state.departments, (input.page ?? 0) * (input.rowsPerPage ?? 10), input.rowsPerPage ?? 10)),
      )
    },
    countDepartments() {
      return Promise.resolve(state.departments.length)
    },
    getDepartment(id: string) {
      return Promise.resolve(state.departments.find((item) => item.id === id) ?? null)
    },
    createDepartment(input: DepartmentWriteInput) {
      const department: Department = {
        id: `fix_dept_${state.nextDepartment}`,
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
      }
      state.nextDepartment += 1
      state.departments = [...state.departments, department]
      return Promise.resolve(department)
    },
    updateDepartment(id: string, input: DepartmentWriteInput) {
      const department = state.departments.find((item) => item.id === id)
      if (!department) {
        return Promise.reject(new Error('[support] fixture department not found'))
      }
      department.name = input.name
      department.description = input.description
      department.icon = input.icon
      return Promise.resolve(department)
    },
    deleteDepartment(id: string) {
      state.departments = state.departments.filter((item) => item.id !== id)
      return Promise.resolve({ ok: true })
    },
    pageFaqs(input: FaqListInput = {}) {
      const filtered = input.department
        ? state.faqs.filter((item) => item.department === input.department)
        : state.faqs
      return Promise.resolve(toFaqList(pageSlice(filtered, (input.page ?? 0) * 10, 10)))
    },
    countFaqs(department?: string) {
      return Promise.resolve(
        department
          ? state.faqs.filter((item) => item.department === department).length
          : state.faqs.length,
      )
    },
    getFaq(id: string) {
      return Promise.resolve(toFaq(state.faqs.find((item) => item.id === id) ?? null))
    },
    createFaq(input: FaqWriteInput) {
      const faq: FixtureFaq = {
        id: `fix_faq_${state.nextFaq}`,
        question: input.question,
        excerpt: input.excerpt ?? '',
        answer: input.answer,
        department: input.department,
        tags: input.tags ?? [],
      }
      state.nextFaq += 1
      state.faqs = [...state.faqs, faq]
      for (const tag of faq.tags) {
        if (!state.faqTags.includes(tag)) {
          state.faqTags.push(tag)
        }
      }
      return Promise.resolve(faq)
    },
    updateFaq(id: string, input: FaqWriteInput) {
      const faq = state.faqs.find((item) => item.id === id)
      if (!faq) {
        return Promise.reject(new Error('[support] fixture faq not found'))
      }
      faq.question = input.question
      faq.excerpt = input.excerpt ?? ''
      faq.answer = input.answer
      faq.department = input.department
      faq.tags = input.tags ?? []
      for (const tag of faq.tags) {
        if (!state.faqTags.includes(tag)) {
          state.faqTags.push(tag)
        }
      }
      return Promise.resolve(faq)
    },
    deleteFaq(id: string) {
      state.faqs = state.faqs.filter((item) => item.id !== id)
      return Promise.resolve({ ok: true })
    },
    listFaqTags() {
      return Promise.resolve([...state.faqTags])
    },
    countPredetermined() {
      return Promise.resolve(state.predetermined.length)
    },
    listPredeterminedCategories() {
      return Promise.resolve([...state.predeterminedCategories])
    },
    createPredetermined(input: PredeterminedWriteInput) {
      const answer: PredeterminedAnswer = {
        id: `fix_pre_${state.nextPredetermined}`,
        title: input.title,
        content: input.content,
        category: input.category,
      }
      state.nextPredetermined += 1
      state.predetermined = [answer, ...state.predetermined]
      if (input.category && !state.predeterminedCategories.includes(input.category)) {
        state.predeterminedCategories.push(input.category)
      }
      return Promise.resolve(answer)
    },
    updatePredetermined(input: PredeterminedWriteInput) {
      const answer = state.predetermined.find((item) => item.id === input.id)
      if (!answer) {
        return Promise.reject(new Error('[support] fixture predetermined not found'))
      }
      answer.title = input.title
      answer.content = input.content
      answer.category = input.category
      if (input.category && !state.predeterminedCategories.includes(input.category)) {
        state.predeterminedCategories.push(input.category)
      }
      return Promise.resolve(answer)
    },
    deletePredetermined(id: string) {
      state.predetermined = state.predetermined.filter((item) => item.id !== id)
      return Promise.resolve({ ok: true })
    },
    listUserStaff() {
      return Promise.resolve(toStaffMemberList(state.staff))
    },
    listAvailabilityStaff() {
      return Promise.resolve(mergeAvailabilityStaff(toStaffMemberList(state.staff), toStaffMemberList(state.staff)))
    },
    getStaffStatus(id: string) {
      const row = state.staff.find((item) => item.id === id) ?? null
      return Promise.resolve(row ? toStaffMemberList([row])[0] ?? null : null)
    },
    setAvailable() {
      const me = state.staff.find((item) => item.id === FIXTURE_STAFF_ID)
      if (me) {
        me.available = true
      }
      return Promise.resolve({ available: true })
    },
    setUnavailable(userId?: string) {
      const target = state.staff.find((item) => item.id === (userId ?? FIXTURE_STAFF_ID))
      if (target) {
        target.available = false
      }
      return Promise.resolve({ available: false })
    },
  }
}

export const FIXTURE_IDS = {
  user: FIXTURE_USER_ID,
  staff: FIXTURE_STAFF_ID,
  staffOther: FIXTURE_STAFF_OTHER_ID,
  opened: 'fix_open_1',
  queued: 'fix_queued_1',
  closed: 'fix_closed_1',
} as const

export function peekFixtureConversation(id: string): Conversation | null {
  return toConversation(state.conversations.find((item) => item.id === id) ?? null)
}
