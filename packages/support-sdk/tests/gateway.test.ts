import { describe, expect, it, vi } from 'vitest'

import { createSupportGateway } from '../src/gateway/SupportGateway.js'
import { createSessionManager } from '../src/session/SessionManager.js'
import type { AbrCommand, AbrList, SupportApp } from '../src/app.js'

function chain(): AbrList & AbrCommand {
  const self = {
    where: vi.fn(() => self),
    sort: vi.fn(() => self),
    limit: vi.fn(() => self),
    skip: vi.fn(() => self),
    take: vi.fn(() => self),
    get: vi.fn(() => self),
    count: vi.fn(() => self),
    first: vi.fn(() => self),
    select: vi.fn(() => self),
    send: vi.fn(async () => [{ id: '1' }]),
    await: vi.fn(() => self),
    getOpenChats: vi.fn(() => self),
    countOpenChats: vi.fn(() => self),
    getActiveChats: vi.fn(() => self),
    getClosedChats: vi.fn(() => self),
    getQueuedChats: vi.fn(() => self),
    getChatMessages: vi.fn(() => self),
    getUserData: vi.fn(() => self),
    isThereOnline: vi.fn(() => self),
    getAvatar: vi.fn(() => self),
    getFile: vi.fn(() => self),
    getChat: vi.fn(() => self),
    getCategory: vi.fn(() => self),
    getTags: vi.fn(() => self),
    findById: vi.fn(() => self),
    info: vi.fn(() => self),
  }
  return self as unknown as AbrList & AbrCommand
}

function createApp() {
  const lists = {
    department: chain(),
    chat: chain(),
    staff: chain(),
    message: chain(),
    faq: chain(),
    predetermined: chain(),
    support: chain(),
  }
  const entity = {
    reOpen: vi.fn(() => chain()),
    close: vi.fn(() => chain()),
    sendMessage: vi.fn(() => chain()),
    sendFile: vi.fn(() => chain()),
    processing: vi.fn(() => chain()),
    convey: vi.fn(() => chain()),
    update: vi.fn(() => chain()),
    delete: vi.fn(() => chain()),
  }
  const aggregate = Object.assign(
    vi.fn(() => entity),
    {
      lists,
      on: vi.fn(async () => ({ cancel: vi.fn() })),
      open: vi.fn(() => chain()),
      avail: vi.fn(() => chain()),
      unAvail: vi.fn(() => chain()),
      add: vi.fn(() => chain()),
      update: vi.fn(() => chain()),
      seen: vi.fn(() => chain()),
    },
  )
  const app = {
    Support: {
      Chat: aggregate,
      Message: aggregate,
      Department: aggregate,
      FAQ: aggregate,
      Predetermined: aggregate,
    },
    User: { Staff: aggregate },
    Mastering: { File: aggregate },
  } as unknown as SupportApp
  return { app, lists, entity, aggregate }
}

describe('SupportGateway', () => {
  it('wraps Chat / Message / Department / FAQ / Predetermined / User.Staff / Mastering.File', async () => {
    const { app, lists, aggregate, entity } = createApp()
    const session = createSessionManager({
      instanceId: 'gw',
      side: 'user',
      env: { hostname: 'localhost' },
      cookieSource: () => 'user-token=x',
      connect: async () => app,
    })
    await session.set(1)
    const gateway = createSupportGateway({ session, env: { hostname: 'localhost' } })

    await gateway.getDepartmentList()
    expect(lists.department.sort).toHaveBeenCalledWith('name')

    await gateway.openChat({ department: 'd1', title: 'help' })
    expect(aggregate.open).toHaveBeenCalledWith({ department: 'd1', title: 'help' })

    await gateway.sendMessage({ chat: '11111111-1111-1111-1111-111111111111', message: 'hi' })
    expect(entity.sendMessage).toHaveBeenCalledWith({ text: 'hi' })

    await gateway.sendFile({ chatID: '11111111-1111-1111-1111-111111111111', file: { id: 'file_1' } })
    expect(entity.sendFile).toHaveBeenCalledWith({ file: { id: 'file_1' } })

    await gateway.getChatMessages({ chat: 'c1' })
    expect(lists.message.getChatMessages).toHaveBeenCalled()

    await gateway.getSingleFile({ id: 'f1', thumbnail: true })
    expect(lists.support.getFile).toHaveBeenCalledWith('f1', true)

    await gateway.getStaffs()
    expect(lists.staff.select).toHaveBeenCalled()

    await gateway.getStaffInfo()
    expect(lists.staff.info).toHaveBeenCalled()

    await gateway.addDepartment({ name: 'Ops' })
    expect(aggregate.add).toHaveBeenCalledWith({ name: 'Ops' })
    await gateway.updateDepartment('d1', { name: 'Ops desk' })
    expect(entity.update).toHaveBeenCalledWith({ name: 'Ops desk' })
    await gateway.removeDepartment('d1')
    expect(entity.delete).toHaveBeenCalled()

    await gateway.addFaq({ question: 'Q', answer: 'A', department: 'd1' })
    await gateway.getFaqTags()
    expect(lists.faq.getTags).toHaveBeenCalled()

    await gateway.addPredetermined({ title: 'Hi', content: 'Hello', category: 'General' })
    await gateway.getPredeterminedCategory()
    expect(lists.predetermined.getCategory).toHaveBeenCalled()

    await gateway.setAvailable()
    expect(aggregate.avail).toHaveBeenCalled()
    await gateway.setUnavailable('staff_1')
    expect(aggregate.unAvail).toHaveBeenCalledWith({ userID: 'staff_1' })
  })

  it('does not expose a Support.Ticket type or method', async () => {
    const { app } = createApp()
    const session = createSessionManager({
      instanceId: 'gw',
      side: 'staff',
      env: { hostname: 'localhost' },
      cookieSource: () => 'staff-token=x',
      connect: async () => app,
    })
    await session.set(1)
    const gateway = createSupportGateway({ session })
    expect(gateway).not.toHaveProperty('Ticket')
    expect(gateway).not.toHaveProperty('getTicket')
    expect(JSON.stringify(Object.keys(gateway))).not.toMatch(/Ticket/)
  })
})
