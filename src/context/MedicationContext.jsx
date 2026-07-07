import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { defaultMedications } from '../data/defaultMedications'

const MedicationContext = createContext()

// Storage keys are versioned (v3): dose entries now carry unit/ward/date so the
// calculator can filter by unit, ward and an audit date range.
const STORAGE_KEYS = {
  medications: 'iv-oral-medications-v3',
  doseEntries: 'iv-oral-dose-entries-v3',
}

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const loadStored = (key, fallback) => {
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return fallback
    }
  }
  return fallback
}

// Inclusive day count between two YYYY-MM-DD strings (>= 1).
const daysBetween = (min, max) => {
  if (!min || !max) return 1
  const a = Date.parse(min)
  const b = Date.parse(max)
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export function MedicationProvider({ children }) {
  // Medication impact database: { id, name, co2PerDose, plasticPerDose }
  const [medications, setMedications] = useState(() =>
    loadStored(STORAGE_KEYS.medications, defaultMedications)
  )

  // Dose entries (one per eligible audit slot):
  // { id, medicationId, doses, unit, ward, dateStr }
  const [doseEntries, setDoseEntries] = useState(() =>
    loadStored(STORAGE_KEYS.doseEntries, [])
  )

  // Calculator state
  const [switchPercentage, setSwitchPercentage] = useState(50)
  const [timePeriod, setTimePeriod] = useState('month')
  const [auditDays, setAuditDays] = useState(30)

  // Filters that scope what the calculator displays.
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [selectedWard, setSelectedWard] = useState('all')
  const [startDate, setStartDate] = useState('') // YYYY-MM-DD, '' = no bound
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(medications))
  }, [medications])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.doseEntries, JSON.stringify(doseEntries))
  }, [doseEntries])

  // ── Derived filter options ──────────────────────────────────────────────
  const availableUnits = useMemo(
    () => [...new Set(doseEntries.map((e) => e.unit).filter(Boolean))].sort(),
    [doseEntries]
  )
  const availableWards = useMemo(
    () => [...new Set(doseEntries.map((e) => e.ward).filter(Boolean))].sort(),
    [doseEntries]
  )
  // Min/max audit date across all loaded entries (for date-picker bounds).
  const dataDateBounds = useMemo(() => {
    const dates = doseEntries.map((e) => e.dateStr).filter(Boolean).sort()
    return dates.length ? { min: dates[0], max: dates[dates.length - 1] } : null
  }, [doseEntries])

  // ── Filtered view of the dose entries ───────────────────────────────────
  const filteredDoseEntries = useMemo(() => {
    return doseEntries.filter((e) => {
      if (selectedUnit !== 'all' && e.unit !== selectedUnit) return false
      if (selectedWard !== 'all' && e.ward !== selectedWard) return false
      // Undated (manually added) entries always pass the date filter.
      if (e.dateStr) {
        if (startDate && e.dateStr < startDate) return false
        if (endDate && e.dateStr > endDate) return false
      }
      return true
    })
  }, [doseEntries, selectedUnit, selectedWard, startDate, endDate])

  // Effective audit length used for week/month/year projection. When dated
  // entries exist, use the active date window (explicit start/end, else the
  // data bounds); otherwise fall back to the manual auditDays field.
  const effectiveAuditDays = useMemo(() => {
    if (!dataDateBounds) return auditDays
    const min = startDate || dataDateBounds.min
    const max = endDate || dataDateBounds.max
    return daysBetween(min, max)
  }, [dataDateBounds, startDate, endDate, auditDays])

  // ── Medication database operations ──────────────────────────────────────
  const addMedication = (medication) => {
    const newMedication = {
      ...medication,
      id: medication.id || slugify(medication.name) || `med-${Date.now()}`,
    }
    setMedications((prev) => [...prev, newMedication])
    return newMedication
  }

  const updateMedication = (id, updates) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ...updates } : med))
    )
  }

  const deleteMedication = (id) => {
    setMedications((prev) => prev.filter((med) => med.id !== id))
    setDoseEntries((prev) => prev.filter((entry) => entry.medicationId !== id))
  }

  // Bulk import medications from CSV: [{ name, co2PerDose, plasticPerDose }].
  const importMedications = (list) => {
    let added = 0
    let updated = 0
    let skipped = 0

    setMedications((prev) => {
      const next = [...prev]
      list.forEach((item) => {
        const name = (item.name || '').trim()
        const co2 = parseFloat(item.co2PerDose)
        const plastic = parseFloat(item.plasticPerDose)
        if (!name || Number.isNaN(co2) || Number.isNaN(plastic)) {
          skipped++
          return
        }
        const idx = next.findIndex(
          (m) => m.name.toLowerCase() === name.toLowerCase()
        )
        if (idx >= 0) {
          next[idx] = { ...next[idx], co2PerDose: co2, plasticPerDose: plastic }
          updated++
        } else {
          next.push({
            id: slugify(name) || `med-${Date.now()}-${added}`,
            name,
            co2PerDose: co2,
            plasticPerDose: plastic,
          })
          added++
        }
      })
      return next
    })

    return { added, updated, skipped }
  }

  // ── Dose entry operations ───────────────────────────────────────────────
  // Manual add (no unit/ward/date). Merges into an existing manual entry.
  const addDoseEntry = (medicationId, doses) => {
    setDoseEntries((prev) => {
      const existing = prev.find(
        (e) => e.medicationId === medicationId && !e.unit && !e.dateStr
      )
      if (existing) {
        return prev.map((e) =>
          e === existing ? { ...e, doses: e.doses + doses } : e
        )
      }
      return [
        ...prev,
        { id: `dose-${Date.now()}`, medicationId, doses, unit: '', ward: '', dateStr: '' },
      ]
    })
  }

  const removeDoseEntry = (id) => {
    setDoseEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const clearDoseEntries = () => {
    setDoseEntries([])
    setSelectedUnit('all')
    setSelectedWard('all')
    setStartDate('')
    setEndDate('')
  }

  // Load an audit file: replaces all dose entries with the eligible (switch=Yes)
  // slots, matched by medication name (case-insensitive) against the impact DB.
  // Report-only: unmatched names are dropped and returned for display.
  const importAuditDoses = (entries) => {
    const next = []
    let matched = 0
    let matchedDoses = 0
    const unmatched = new Set()
    let unmatchedDoses = 0

    entries.forEach((entry, i) => {
      const name = (entry.name || '').trim()
      const doses = entry.doses
      if (!name || !doses) return

      const med = medications.find(
        (m) => m.name.toLowerCase() === name.toLowerCase()
      )
      if (!med) {
        unmatched.add(name)
        unmatchedDoses += doses
        return
      }
      matched++
      matchedDoses += doses
      next.push({
        id: `dose-${Date.now()}-${i}`,
        medicationId: med.id,
        doses,
        unit: entry.unit || '',
        ward: entry.ward || '',
        dateStr: entry.dateStr || '',
      })
    })

    setDoseEntries(next)
    // Reset filters to show everything just loaded.
    setSelectedUnit('all')
    setSelectedWard('all')
    setStartDate('')
    setEndDate('')

    return {
      matched,
      matchedDoses,
      unmatched: [...unmatched],
      unmatchedDoses,
    }
  }

  const value = {
    // Medication database
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    importMedications,
    // Dose entries
    doseEntries,
    filteredDoseEntries,
    addDoseEntry,
    removeDoseEntry,
    clearDoseEntries,
    importAuditDoses,
    // Filters
    selectedUnit,
    setSelectedUnit,
    selectedWard,
    setSelectedWard,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    availableUnits,
    availableWards,
    dataDateBounds,
    // Calculator state
    switchPercentage,
    setSwitchPercentage,
    timePeriod,
    setTimePeriod,
    auditDays,
    setAuditDays,
    effectiveAuditDays,
  }

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  )
}

export function useMedication() {
  const context = useContext(MedicationContext)
  if (!context) {
    throw new Error('useMedication must be used within a MedicationProvider')
  }
  return context
}
