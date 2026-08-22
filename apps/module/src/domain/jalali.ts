function div(a: number, b: number): number {
  return ~~(a / b)
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b
}

/** Jalali years that start a 33-year leap rule (jalaali-js). */
const JALALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
]

function jalCal(jy: number): { gy: number; march: number } {
  const gy = jy + 621
  let leapJ = -14
  let jp = JALALI_BREAKS[0] ?? -61
  let jump = 0
  for (let index = 1; index < JALALI_BREAKS.length; index += 1) {
    const next = JALALI_BREAKS[index] ?? jp
    jump = next - jp
    if (jy < next) {
      break
    }
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = next
  }
  const n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1
  }
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  return { gy, march: 20 + leapJ - leapG }
}

function gregorianToJdn(gy: number, gm: number, gd: number): number {
  let day =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  day = day - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return day
}

function jalaliToJdn(jy: number, jm: number, jd: number): number {
  const { gy, march } = jalCal(jy)
  return gregorianToJdn(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function jdnToGregorian(jdn: number): [number, number, number] {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return [gy, gm, gd]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Jalali (Persian) calendar → Gregorian YYYY-MM-DD.
 * Ticket list UI is Jalali; list queries stay Gregorian.
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  return jdnToGregorian(jalaliToJdn(jy, jm, jd))
}

export function jalaliToGregorianIso(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd)
  return `${gy}-${pad(gm)}-${pad(gd)}`
}

/** Accepts 1403/05/31 or 1403-05-31. */
export function parseJalaliDateInput(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  const match = value.trim().match(/^(\d{3,4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) {
    return undefined
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || year < 1200 || year > 1600) {
    return undefined
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return undefined
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return undefined
  }
  return jalaliToGregorianIso(year, month, day)
}

export function formatConversationDate(value: string | undefined, locale: string): string {
  if (!value) {
    return ''
  }
  const time = Date.parse(value)
  if (!Number.isFinite(time)) {
    return value
  }
  const calendarLocale = locale.startsWith('fa') ? 'fa-IR-u-ca-persian' : locale
  return new Intl.DateTimeFormat(calendarLocale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(time)
}
