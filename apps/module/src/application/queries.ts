import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'

import type { ChatListFilter, ConversationQuery, Pagination } from '@nipoto/support-sdk'

import { queryKeys } from './queryKeys'
import { supportQueryClient } from './queryClient'
import { peekSupportUseCases } from './runtime'
import { isPresentationReady } from './sessionState'
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
  UploadAvatarFileInput,
} from './usecases'

function sessionReady(): boolean {
  return Boolean(peekSupportUseCases() && isPresentationReady())
}

function enabledWhenReady(extra?: () => boolean) {
  return computed(() => sessionReady() && (extra ? extra() : true))
}

/**
 * TanStack Query options for Phase 7 presentation.
 * Do not put credentials or message bodies in these keys.
 */
export function useOpenConversations(page: MaybeRef<ListPage | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.open(unref(page))),
    queryFn: () => peekSupportUseCases()!.listOpen(unref(page)),
    enabled: enabledWhenReady(),
  })
}

export function useQueuedConversations(page: MaybeRef<Pagination | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.queued(unref(page))),
    queryFn: () => peekSupportUseCases()!.listQueued(unref(page)),
    enabled: enabledWhenReady(),
  })
}

export function useClosedConversations(page: MaybeRef<ListPage | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.closed(unref(page))),
    queryFn: () => peekSupportUseCases()!.listClosed(unref(page)),
    enabled: enabledWhenReady(),
  })
}

export function useActiveConversations(page: MaybeRef<Pagination | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.active(unref(page))),
    queryFn: () => peekSupportUseCases()!.listActive(unref(page)),
    enabled: enabledWhenReady(),
  })
}

export function useConversationList(
  query: MaybeRef<ConversationQuery | undefined> = {},
  extraEnabled?: MaybeRef<boolean>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.list(unref(query))),
    queryFn: () => peekSupportUseCases()!.listConversations(unref(query)),
    enabled: enabledWhenReady(() => extraEnabled === undefined || unref(extraEnabled)),
  })
}

export function useOpenConversationCount(filter: MaybeRef<ChatListFilter | undefined> = 'self') {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.counts.open(unref(filter))),
    queryFn: () => peekSupportUseCases()!.countOpen(unref(filter) ?? 'self'),
    enabled: enabledWhenReady(),
  })
}

export function useConversationCount(
  query: MaybeRef<ConversationQuery | undefined> = {},
  extraEnabled?: MaybeRef<boolean>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.counts.list(unref(query))),
    queryFn: () => peekSupportUseCases()!.countConversations(unref(query)),
    enabled: enabledWhenReady(() => extraEnabled === undefined || unref(extraEnabled)),
  })
}

export function useCurrentStaff() {
  return useQuery({
    queryKey: queryKeys.staff.me(),
    queryFn: () => peekSupportUseCases()!.getCurrentStaff(),
    enabled: enabledWhenReady(),
  })
}

export function useConversationUser(input: MaybeRef<ConversationUserInput | undefined>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.conversationUser.detail(
        unref(input)?.conversationId ?? '',
        unref(input)?.userId ?? '',
      ),
    ),
    queryFn: () => peekSupportUseCases()!.getConversationUser(unref(input)!),
    enabled: enabledWhenReady(() => Boolean(unref(input)?.conversationId && unref(input)?.userId)),
  })
}

export function useConversation(conversationId: MaybeRef<string | undefined>) {
  return useQuery({
    queryKey: computed(() => queryKeys.conversations.detail(unref(conversationId) ?? '')),
    queryFn: () => peekSupportUseCases()!.getConversation(unref(conversationId)!),
    enabled: enabledWhenReady(() => Boolean(unref(conversationId))),
  })
}

export function useConversationMessages(input: MaybeRef<GetMessagesInput | undefined>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.conversations.messages(unref(input)?.conversationId ?? ''),
    ),
    queryFn: () => peekSupportUseCases()!.getMessages(unref(input)!),
    enabled: enabledWhenReady(() => Boolean(unref(input)?.conversationId)),
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: () => peekSupportUseCases()!.listDepartments(),
    enabled: enabledWhenReady(),
  })
}

export function useFaqs(input: MaybeRef<FaqListInput | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.faqs.list(unref(input))),
    queryFn: () => peekSupportUseCases()!.listFaqs(unref(input)),
    enabled: enabledWhenReady(),
  })
}

export function usePredeterminedList(page: MaybeRef<Pagination | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.predetermined.list(unref(page))),
    queryFn: () => peekSupportUseCases()!.listPredetermined(unref(page)),
    enabled: enabledWhenReady(),
  })
}

export function useStaffList() {
  return useQuery({
    queryKey: queryKeys.staff.list(),
    queryFn: () => peekSupportUseCases()!.listStaff(),
    enabled: enabledWhenReady(),
  })
}

export function useAvailableStaff() {
  return useQuery({
    queryKey: queryKeys.staff.available(),
    queryFn: () => peekSupportUseCases()!.listAvailableStaff(),
    enabled: enabledWhenReady(),
  })
}

function invalidateConversation(conversationId: string): void {
  void supportQueryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId),
  })
  void supportQueryClient.invalidateQueries({
    queryKey: queryKeys.conversations.messages(conversationId),
  })
  void supportQueryClient.invalidateQueries({ queryKey: queryKeys.conversations.root })
}

export function useOpenConversationMutation() {
  return useMutation({
    mutationFn: (input: OpenConversationInput) => peekSupportUseCases()!.openConversation(input),
    onSuccess: () => {
      void supportQueryClient.invalidateQueries({ queryKey: queryKeys.conversations.root })
    },
  })
}

export function useSendTextMutation() {
  return useMutation({
    mutationFn: (input: SendTextInput) => peekSupportUseCases()!.sendText(input),
    onSuccess: (_result, input) => {
      invalidateConversation(input.conversationId)
    },
  })
}

export function useSendFileMutation() {
  return useMutation({
    mutationFn: (input: SendFileInput) => peekSupportUseCases()!.sendFile(input),
    onSuccess: (_result, input) => {
      invalidateConversation(input.conversationId)
    },
  })
}

export function useUploadAvatarMutation() {
  return useMutation({
    mutationFn: (file: UploadAvatarFileInput) => peekSupportUseCases()!.uploadAvatar(file),
  })
}

export function useSupportFile(input: MaybeRef<SupportFileQuery | undefined>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.files.support(unref(input)?.id ?? '', unref(input)?.thumbnail !== false),
    ),
    queryFn: () => peekSupportUseCases()!.getSupportFile(unref(input)!),
    enabled: enabledWhenReady(() => Boolean(unref(input)?.id)),
  })
}

export function useCloseConversationMutation() {
  return useMutation({
    mutationFn: (conversationId: string) => peekSupportUseCases()!.closeConversation(conversationId),
    onSuccess: (_result, conversationId) => {
      invalidateConversation(conversationId)
    },
  })
}

export function useReopenConversationMutation() {
  return useMutation({
    mutationFn: (conversationId: string) =>
      peekSupportUseCases()!.reopenConversation(conversationId),
    onSuccess: (_result, conversationId) => {
      invalidateConversation(conversationId)
    },
  })
}

export function useProcessConversationMutation() {
  return useMutation({
    mutationFn: (conversationId: string) =>
      peekSupportUseCases()!.processConversation(conversationId),
    onSuccess: (_result, conversationId) => {
      invalidateConversation(conversationId)
    },
  })
}

export function useConveyConversationMutation() {
  return useMutation({
    mutationFn: (input: ConveyInput) => peekSupportUseCases()!.conveyConversation(input),
    onSuccess: (_result, input) => {
      invalidateConversation(input.conversationId)
    },
  })
}

export function useMarkSeenMutation() {
  return useMutation({
    mutationFn: (input: MarkSeenInput) => peekSupportUseCases()!.markSeen(input),
    onSuccess: (_result, input) => {
      void supportQueryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(input.conversationId),
      })
    },
  })
}

export function useAdminDepartments(input: MaybeRef<DepartmentPageInput | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.departments.page(unref(input))),
    queryFn: () => peekSupportUseCases()!.pageDepartments(unref(input)),
    enabled: enabledWhenReady(),
  })
}

export function useDepartmentCount() {
  return useQuery({
    queryKey: queryKeys.departments.count(),
    queryFn: () => peekSupportUseCases()!.countDepartments(),
    enabled: enabledWhenReady(),
  })
}

export function useAdminFaqs(input: MaybeRef<FaqListInput | undefined> = {}) {
  return useQuery({
    queryKey: computed(() => queryKeys.faqs.page(unref(input))),
    queryFn: () => peekSupportUseCases()!.pageFaqs(unref(input)),
    enabled: enabledWhenReady(),
  })
}

export function useFaqCount(department: MaybeRef<string | undefined> = undefined) {
  return useQuery({
    queryKey: computed(() => queryKeys.faqs.count(unref(department))),
    queryFn: () => peekSupportUseCases()!.countFaqs(unref(department)),
    enabled: enabledWhenReady(),
  })
}

export function useFaqTags() {
  return useQuery({
    queryKey: queryKeys.faqs.tags(),
    queryFn: () => peekSupportUseCases()!.listFaqTags(),
    enabled: enabledWhenReady(),
  })
}

export function usePredeterminedCount() {
  return useQuery({
    queryKey: queryKeys.predetermined.count(),
    queryFn: () => peekSupportUseCases()!.countPredetermined(),
    enabled: enabledWhenReady(),
  })
}

export function usePredeterminedCategories() {
  return useQuery({
    queryKey: queryKeys.predetermined.categories(),
    queryFn: () => peekSupportUseCases()!.listPredeterminedCategories(),
    enabled: enabledWhenReady(),
  })
}

export function useAvailabilityStaff() {
  return useQuery({
    queryKey: queryKeys.staff.availability(),
    queryFn: () => peekSupportUseCases()!.listAvailabilityStaff(),
    enabled: enabledWhenReady(),
  })
}

function invalidateDepartments(): void {
  void supportQueryClient.invalidateQueries({ queryKey: queryKeys.departments.list() })
}

function invalidateFaqs(): void {
  void supportQueryClient.invalidateQueries({ queryKey: ['faqs'] })
}

function invalidatePredetermined(): void {
  void supportQueryClient.invalidateQueries({ queryKey: ['predetermined'] })
}

function invalidateStaffPresence(): void {
  void supportQueryClient.invalidateQueries({ queryKey: queryKeys.staff.list() })
}

export function useCreateDepartmentMutation() {
  return useMutation({
    mutationFn: (input: DepartmentWriteInput) => peekSupportUseCases()!.createDepartment(input),
    onSuccess: invalidateDepartments,
  })
}

export function useUpdateDepartmentMutation() {
  return useMutation({
    mutationFn: (input: { id: string } & DepartmentWriteInput) =>
      peekSupportUseCases()!.updateDepartment(input.id, {
        name: input.name,
        description: input.description,
        icon: input.icon,
      }),
    onSuccess: invalidateDepartments,
  })
}

export function useDeleteDepartmentMutation() {
  return useMutation({
    mutationFn: (id: string) => peekSupportUseCases()!.deleteDepartment(id),
    onSuccess: invalidateDepartments,
  })
}

export function useCreateFaqMutation() {
  return useMutation({
    mutationFn: (input: FaqWriteInput) => peekSupportUseCases()!.createFaq(input),
    onSuccess: invalidateFaqs,
  })
}

export function useUpdateFaqMutation() {
  return useMutation({
    mutationFn: (input: { id: string } & FaqWriteInput) =>
      peekSupportUseCases()!.updateFaq(input.id, {
        question: input.question,
        excerpt: input.excerpt,
        answer: input.answer,
        department: input.department,
        tags: input.tags,
      }),
    onSuccess: invalidateFaqs,
  })
}

export function useDeleteFaqMutation() {
  return useMutation({
    mutationFn: (id: string) => peekSupportUseCases()!.deleteFaq(id),
    onSuccess: invalidateFaqs,
  })
}

export function useCreatePredeterminedMutation() {
  return useMutation({
    mutationFn: (input: PredeterminedWriteInput) =>
      peekSupportUseCases()!.createPredetermined(input),
    onSuccess: invalidatePredetermined,
  })
}

export function useUpdatePredeterminedMutation() {
  return useMutation({
    mutationFn: (input: PredeterminedWriteInput) =>
      peekSupportUseCases()!.updatePredetermined(input),
    onSuccess: invalidatePredetermined,
  })
}

export function useDeletePredeterminedMutation() {
  return useMutation({
    mutationFn: (id: string) => peekSupportUseCases()!.deletePredetermined(id),
    onSuccess: invalidatePredetermined,
  })
}

export function useSetAvailableMutation() {
  return useMutation({
    mutationFn: () => peekSupportUseCases()!.setAvailable(),
    onSuccess: invalidateStaffPresence,
  })
}

export function useSetUnavailableMutation() {
  return useMutation({
    mutationFn: (userId?: string) => peekSupportUseCases()!.setUnavailable(userId),
    onSuccess: invalidateStaffPresence,
  })
}
