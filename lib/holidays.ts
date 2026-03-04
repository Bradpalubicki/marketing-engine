/**
 * US Public Holiday detection — no external dependencies.
 * Supports fixed and floating holidays through 2100.
 */

/** Returns the nth occurrence of a weekday in a given month/year. dayOfWeek: 0=Sun…6=Sat */
function nthWeekday(year: number, month: number, dayOfWeek: number, n: number): Date {
  const first = new Date(year, month - 1, 1)
  const firstDay = first.getDay()
  let dayOffset = dayOfWeek - firstDay
  if (dayOffset < 0) dayOffset += 7
  const firstOccurrence = 1 + dayOffset
  return new Date(year, month - 1, firstOccurrence + (n - 1) * 7)
}

/** Returns the last occurrence of a weekday in a given month/year. dayOfWeek: 0=Sun…6=Sat */
function lastWeekday(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month, 0) // last day of month
  const diff = (lastDay.getDay() - dayOfWeek + 7) % 7
  return new Date(year, month - 1, lastDay.getDate() - diff)
}

interface Holiday {
  name: string
  date: Date
}

function getHolidaysForYear(year: number): Holiday[] {
  return [
    // Fixed holidays
    { name: "New Year's Day", date: new Date(year, 0, 1) },
    { name: 'Independence Day', date: new Date(year, 6, 4) },
    { name: "Veterans Day", date: new Date(year, 10, 11) },
    { name: 'Christmas Day', date: new Date(year, 11, 25) },

    // Floating holidays
    // MLK Day — 3rd Monday of January
    { name: 'Martin Luther King Jr. Day', date: nthWeekday(year, 1, 1, 3) },
    // Presidents Day — 3rd Monday of February
    { name: "Presidents' Day", date: nthWeekday(year, 2, 1, 3) },
    // Memorial Day — last Monday of May
    { name: 'Memorial Day', date: lastWeekday(year, 5, 1) },
    // Labor Day — 1st Monday of September
    { name: 'Labor Day', date: nthWeekday(year, 9, 1, 1) },
    // Columbus Day — 2nd Monday of October
    { name: 'Columbus Day', date: nthWeekday(year, 10, 1, 2) },
    // Thanksgiving — 4th Thursday of November
    { name: 'Thanksgiving Day', date: nthWeekday(year, 11, 4, 4) },
  ]
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isHoliday(date: Date): boolean {
  const holidays = getHolidaysForYear(date.getFullYear())
  return holidays.some((h) => isSameDay(h.date, date))
}

export function getHolidayName(date: Date): string | null {
  const holidays = getHolidaysForYear(date.getFullYear())
  const match = holidays.find((h) => isSameDay(h.date, date))
  return match?.name ?? null
}
