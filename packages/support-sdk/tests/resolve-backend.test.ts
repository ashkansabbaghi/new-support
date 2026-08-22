import { describe, expect, it } from 'vitest'

import { resolveBackend, resolveLoginUrl, siblingHost } from '../src/index.js'

describe('resolveBackend allowlist', () => {
  it('defaults localhost to b1-back.nipoto.pro', () => {
    const resolved = resolveBackend({ hostname: 'localhost' })
    expect(resolved.host).toBe('b1-back.nipoto.pro')
    expect(resolved.wsUrl).toBe('wss://b1-back.nipoto.pro')
    expect(resolved.source).toBe('default')
  })

  it('accepts allowlisted ABR_URL on localhost', () => {
    const resolved = resolveBackend({
      hostname: 'localhost',
      abrUrl: 'https://b5-back.nipoto.pro',
      abrWsUrl: 'wss://b5-back.nipoto.pro',
    })
    expect(resolved.host).toBe('b5-back.nipoto.pro')
    expect(resolved.wsUrl).toBe('wss://b5-back.nipoto.pro')
    expect(resolved.source).toBe('env')
  })

  it('rejects an arbitrary backend URL', () => {
    expect(() =>
      resolveBackend({ hostname: 'localhost', abrUrl: 'https://evil.example.com' }),
    ).toThrow(/not allowlisted/)
  })

  it('derives numbered sibling hosts on deploy', () => {
    expect(resolveBackend({ hostname: 'b5-app.nipoto.pro' }).host).toBe('b5-back.nipoto.pro')
    expect(resolveBackend({ hostname: 's4-staff.nipoto.pro' }).host).toBe('s4-back.nipoto.pro')
  })

  it('derives stage2 and production siblings', () => {
    expect(resolveBackend({ hostname: 'app-stage2.nipoto.pro' }).host).toBe('back-stage2.nipoto.pro')
    expect(resolveBackend({ hostname: 'app.nipoto.com' }).host).toBe('back.nipoto.com')
    expect(resolveBackend({ hostname: 'm.nipoto.org' }).host).toBe('b.nipoto.org')
  })

  it('rejects an unknown named environment', () => {
    expect(() => resolveBackend({ hostname: 'app-unknown.nipoto.pro' })).toThrow(/allowlisted env id/)
  })
})

describe('login redirects', () => {
  it('uses local user / staff login hosts', () => {
    expect(resolveLoginUrl('user', 'localhost')).toBe('http://localhost:8081/login')
    expect(resolveLoginUrl('staff', 'localhost')).toBe('http://localhost:8082/loginOtp-management')
  })

  it('uses deployed app / staff siblings', () => {
    expect(resolveLoginUrl('user', 'app.nipoto.com')).toBe('https://app.nipoto.com/login')
    expect(resolveLoginUrl('user', 'b5-app.nipoto.pro')).toBe('https://b5-app.nipoto.pro/login')
    expect(resolveLoginUrl('staff', 'b5-staff.nipoto.pro')).toBe(
      'https://b5-staff.nipoto.pro/loginOtp-management',
    )
    expect(siblingHost('staff', 'app-stage2.nipoto.pro')).toBe('staff-stage2.nipoto.pro')
  })
})
