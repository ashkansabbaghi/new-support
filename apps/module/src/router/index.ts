import { createRouter, createWebHashHistory } from 'vue-router'

import StaffLayout from '../layouts/StaffLayout.vue'
import UserWidgetLayout from '../layouts/UserWidgetLayout.vue'
import GatewaySmokeView from '../views/GatewaySmokeView.vue'
import KitchenView from '../views/KitchenView.vue'
import AvailabilityAdminView from '../views/staff/AvailabilityAdminView.vue'
import DepartmentAdminView from '../views/staff/DepartmentAdminView.vue'
import FaqAdminView from '../views/staff/FaqAdminView.vue'
import PredeterminedAdminView from '../views/staff/PredeterminedAdminView.vue'
import TicketListView from '../views/staff/TicketListView.vue'
import TicketViewView from '../views/staff/TicketViewView.vue'
import ConversationHistoryView from '../views/widget/ConversationHistoryView.vue'
import ConversationQueueView from '../views/widget/ConversationQueueView.vue'
import ConversationStartView from '../views/widget/ConversationStartView.vue'
import ConversationViewView from '../views/widget/ConversationViewView.vue'
import { ADMIN_PATHS } from './admin'

declare module 'vue-router' {
  interface RouteMeta {
    semanticName?: import('@/domain').SemanticRouteName
    surface?: import('@/domain').ConversationSurface
  }
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: UserWidgetLayout,
      children: [
        {
          path: '',
          redirect: '/conversation/home',
        },
        {
          path: 'conversation/home',
          name: 'conversation-home',
          component: ConversationStartView,
          meta: { semanticName: 'conversation.home', surface: 'chat' },
        },
        {
          path: 'conversation/new',
          name: 'conversation-new',
          component: ConversationStartView,
          meta: { semanticName: 'conversation.new', surface: 'chat' },
        },
        {
          path: 'conversation/view/:conversationId',
          name: 'conversation-view',
          component: ConversationViewView,
          meta: { semanticName: 'conversation.view', surface: 'chat' },
        },
        {
          path: 'conversation/queue',
          name: 'conversation-queue',
          component: ConversationQueueView,
          meta: { semanticName: 'conversation.queue', surface: 'chat' },
        },
        {
          path: 'conversation/history',
          name: 'conversation-history',
          component: ConversationHistoryView,
          meta: { semanticName: 'conversation.history', surface: 'chat' },
        },
      ],
    },
    {
      path: '/ticket',
      component: StaffLayout,
      children: [
        {
          path: 'list',
          name: 'ticket-list',
          component: TicketListView,
          meta: { semanticName: 'ticket.list', surface: 'ticket' },
        },
        {
          path: 'view/:conversationId',
          name: 'ticket-view',
          // Same Conversation as conversation.view — Ticket is not a separate aggregate.
          component: TicketViewView,
          meta: { semanticName: 'ticket.view', surface: 'ticket' },
        },
      ],
    },
    {
      path: ADMIN_PATHS.departments,
      component: StaffLayout,
      children: [
        {
          path: '',
          name: 'admin-departments',
          component: DepartmentAdminView,
        },
      ],
    },
    {
      path: ADMIN_PATHS.faqs,
      component: StaffLayout,
      children: [
        {
          path: '',
          name: 'admin-faqs',
          component: FaqAdminView,
        },
      ],
    },
    {
      path: ADMIN_PATHS.predetermined,
      component: StaffLayout,
      children: [
        {
          path: '',
          name: 'admin-predetermined',
          component: PredeterminedAdminView,
        },
      ],
    },
    {
      path: ADMIN_PATHS.staffs,
      component: StaffLayout,
      children: [
        {
          path: '',
          name: 'admin-staffs',
          component: AvailabilityAdminView,
        },
      ],
    },
    {
      path: '/dev/kitchen',
      name: 'dev-kitchen',
      component: KitchenView,
    },
    {
      path: '/dev/gateway',
      name: 'dev-gateway',
      component: GatewaySmokeView,
    },
  ],
})
