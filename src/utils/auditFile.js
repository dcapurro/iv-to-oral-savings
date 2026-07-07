// Parser for the wide-format ward IV-medication audit export (REDCap style).
//
// Each CSV row is ONE patient audit and carries up to 10 parallel medication
// slots. For slot i the three linked columns are:
//   "medication i"  /  "number doses i"  /  "switch i"   (note: switch has no
//   space in the header, e.g. "switch1").
//
// We keep a slot only when switch == "Yes" (an eligible IV->oral opportunity),
// the medication name is non-empty, and the dose count parses to > 0. Each kept
// slot becomes one long record carrying the row's Record ID, audit date, unit
// and ward so the calculator can filter/aggregate by any of those dimensions.

import { parseCsv, toObjects } from './csv.js'

const SLOTS = 10

// Normalize a header for matching: lowercase + strip all whitespace, so
// "number doses 1" -> "numberdoses1" and "switch1" -> "switch1".
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')

// Build a lookup from normalized-header -> original key for one row object.
const normKeyMap = (row) => {
  const map = {}
  for (const key of Object.keys(row)) map[norm(key)] = key
  return map
}

// Read a value from a row by trying several normalized header candidates.
const readBy = (row, keyMap, ...candidates) => {
  for (const cand of candidates) {
    const key = keyMap[norm(cand)]
    if (key !== undefined) return row[key]
  }
  return ''
}

// Pull the calendar date (YYYY-MM-DD) out of an audit timestamp such as
// "2026-04-21 08:00". Returns '' if it can't be parsed.
export const toDateStr = (raw) => {
  const s = (raw || '').trim()
  if (!s) return ''
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  // dd-mm-yyyy or dd/mm/yyyy fallback
  const dmy = s.match(/(\d{2})[-/](\d{2})[-/](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return ''
}

export function parseAuditFile(text) {
  const rows = toObjects(parseCsv(text))

  const entries = []
  let eligibleSlots = 0
  let droppedZeroDose = 0
  const units = new Set()
  const wards = new Set()

  rows.forEach((row) => {
    const keyMap = normKeyMap(row)
    const recordId = readBy(row, keyMap, 'record id', 'recordid').trim()
    const dateRaw = readBy(row, keyMap, 'date and time of audit', 'dateandtimeofaudit').trim()
    const dateStr = toDateStr(dateRaw)
    const unit = readBy(row, keyMap, 'unit').trim()
    // Normalize ward to uppercase so e.g. "5se" and "5SE" collapse to one.
    const ward = readBy(row, keyMap, 'ward').trim().toUpperCase()

    for (let i = 1; i <= SLOTS; i++) {
      const switchVal = readBy(row, keyMap, `switch${i}`, `switch ${i}`).trim().toLowerCase()
      if (switchVal !== 'yes') continue
      eligibleSlots++

      const name = readBy(row, keyMap, `medication ${i}`, `medication${i}`).trim()
      if (!name) continue

      const doses = parseInt(readBy(row, keyMap, `number doses ${i}`, `numberdoses${i}`), 10)
      if (Number.isNaN(doses) || doses <= 0) {
        droppedZeroDose++
        continue
      }

      if (unit) units.add(unit)
      if (ward) wards.add(ward)

      entries.push({ recordId, dateStr, unit: unit || '', ward: ward || '', name, doses })
    }
  })

  const dateList = entries.map((e) => e.dateStr).filter(Boolean).sort()

  return {
    entries,
    eligibleSlots, // total switch=Yes slots seen
    droppedZeroDose, // Yes slots skipped for 0/blank doses
    units: [...units].sort(),
    wards: [...wards].sort(),
    dateBounds: dateList.length
      ? { min: dateList[0], max: dateList[dateList.length - 1] }
      : null,
  }
}
