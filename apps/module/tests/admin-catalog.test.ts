import { describe, expect, it } from 'vitest'

import {
  createFixtureUseCases,
  queryKeysForDomainEvent,
  resetFixtureState,
  setFixtureStaffRoles,
} from '../src/application'
import {
  canManageAvailability,
  canManageDepartments,
  canManageFaqs,
  canManagePredetermined,
  SEMANTIC_ROUTE_NAMES,
  toDepartmentList,
  toFaqList,
} from '../src/domain'
import { isAdminInternalPath } from '../src/router/admin'

describe('admin presentation gates', () => {
  it('matches the staff route matrix without inventing roles', () => {
    expect(canManageDepartments(['technicalManager'])).toBe(true)
    expect(canManageFaqs(['supportManager'])).toBe(true)
    expect(canManageDepartments(['supporter'])).toBe(false)
    expect(canManagePredetermined(['supporter'])).toBe(true)
    expect(canManagePredetermined(['technicalManager'])).toBe(false)
    expect(canManageAvailability(['supportManager'])).toBe(true)
    expect(canManageAvailability(['technicalManager'])).toBe(false)
  })
})

describe('admin catalog fixtures reuse widget aggregates', () => {
  it('lets a manager CRUD department / FAQ / predetermined that the widget still reads', async () => {
    resetFixtureState()
    const usecases = createFixtureUseCases()

    const createdDept = (await usecases.createDepartment({
      name: 'Compliance',
      description: 'KYC questions',
    })) as { id: string }
    expect(toDepartmentList(await usecases.listDepartments()).some((item) => item.name === 'Compliance')).toBe(
      true,
    )

    await usecases.createFaq({
      question: 'What documents do you need?',
      excerpt: 'A national ID is enough for most checks.',
      answer: 'Upload a national ID photo. We review it the same day.',
      department: createdDept.id,
      tags: ['kyc'],
    })
    const widgetFaqs = toFaqList(await usecases.listFaqs({ department: createdDept.id }))
    expect(widgetFaqs).toHaveLength(1)
    expect(widgetFaqs[0]?.question).toContain('documents')
    expect(await usecases.listFaqTags()).toContain('kyc')
    expect(await usecases.countFaqs(createdDept.id)).toBe(1)

    await usecases.createPredetermined({
      category: 'Compliance',
      title: 'Ask for ID',
      content: 'Please send a photo of your national ID.',
    })
    const canned = await usecases.listPredetermined()
    expect(canned.some((item) => item.category === 'Compliance')).toBe(true)
    expect(await usecases.listPredeterminedCategories()).toContain('Compliance')

    await usecases.updateDepartment(createdDept.id, { name: 'Compliance desk' })
    expect(toDepartmentList(await usecases.listDepartments()).some((item) => item.name === 'Compliance desk')).toBe(
      true,
    )
  })

  it('lets supportManager toggle availability without a presence service', async () => {
    resetFixtureState()
    setFixtureStaffRoles(['supportManager'])
    const usecases = createFixtureUseCases()
    const me = await usecases.getCurrentStaff()
    expect(canManageAvailability(me?.roles)).toBe(true)

    await usecases.setUnavailable()
    expect((await usecases.listAvailabilityStaff()).find((item) => item.id === me?.id)?.available).toBe(false)
    await usecases.setAvailable()
    expect((await usecases.listAvailableStaff()) as { count: number }).toMatchObject({ count: 1 })
    await usecases.setUnavailable('fix_staff_1')
    const after = await usecases.listAvailabilityStaff()
    expect(after.find((item) => item.id === 'fix_staff_1')?.available).toBe(false)
  })
})

describe('admin routes stay module-internal', () => {
  it('does not add host protocol names', () => {
    expect(SEMANTIC_ROUTE_NAMES).toEqual([
      'conversation.home',
      'conversation.new',
      'conversation.view',
      'conversation.queue',
      'conversation.history',
      'ticket.list',
      'ticket.view',
    ])
    expect(isAdminInternalPath('#/departments')).toBe(true)
    expect(isAdminInternalPath('/faqs')).toBe(true)
    expect(isAdminInternalPath('/predetermined-answer')).toBe(true)
    expect(isAdminInternalPath('/staffs-list')).toBe(true)
    expect(isAdminInternalPath('/ticket/list')).toBe(false)
  })
})

describe('availability events refresh staff lists', () => {
  it('invalidates Chat staff list keys on availed / unAvailed', () => {
    const keys = queryKeysForDomainEvent({
      source: 'aggregate',
      name: 'availed',
      generation: 1,
      data: { id: 'st_1' },
    })
    expect(keys).toContainEqual(['staff'])
    expect(keys).toContainEqual(['staff', 'available'])
  })
})
