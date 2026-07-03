import { createContext, useContext, useState, useEffect } from 'react'
import { defaultMedications } from '../data/defaultMedications'

const MedicationContext = createContext()

// Storage keys are versioned (v2) because the data model changed from a
// per-2-day / patient-count basis to a per-dose basis.
const STORAGE_KEYS = {
  medications: 'iv-oral-medications-v2',
  doseEntries: 'iv-oral-dose-entries-v2',
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

export function MedicationProvider({ children }) {
  // Medication impact database: { id, name, co2PerDose, plasticPerDose }
  const [medications, setMedications] = useState(() =>
    loadStored(STORAGE_KEYS.medications, defaultMedications)
  )

  // Dose entries: { id, medicationId, doses } - doses that were missed
  // opportunities to switch from IV to oral.
  const [doseEntries, setDoseEntries] = useState(() =>
    loadStored(STORAGE_KEYS.doseEntries, [])
  )

  // Calculator state
  const [switchPercentage, setSwitchPercentage] = useState(50)
  const [timePeriod, setTimePeriod] = useState('month')
  const [auditDays, setAuditDays] = useState(30)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(medications))
  }, [medications])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.doseEntries, JSON.stringify(doseEntries))
  }, [doseEntries])

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
  // Upserts by name (case-insensitive). Returns a summary.
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
  // Add doses for a medication, merging into an existing entry if present.
  const addDoseEntry = (medicationId, doses) => {
    setDoseEntries((prev) => {
      const existing = prev.find((e) => e.medicationId === medicationId)
      if (existing) {
        return prev.map((e) =>
          e.medicationId === medicationId ? { ...e, doses: e.doses + doses } : e
        )
      }
      return [...prev, { id: `dose-${Date.now()}`, medicationId, doses }]
    })
  }

  const updateDoseEntry = (id, doses) => {
    setDoseEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, doses } : e))
    )
  }

  const removeDoseEntry = (id) => {
    setDoseEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const clearDoseEntries = () => setDoseEntries([])

  // Bulk import doses from CSV: [{ name, doses }]. Matches by medication name
  // (case-insensitive) against the database. Returns matched count and the
  // list of names that could not be matched.
  const importDoses = (list) => {
    let matched = 0
    const unmatched = []

    setDoseEntries((prevEntries) => {
      const next = [...prevEntries]
      list.forEach((item) => {
        const name = (item.name || '').trim()
        const doses = parseInt(item.doses, 10)
        if (!name || Number.isNaN(doses) || doses <= 0) return

        const med = medications.find(
          (m) => m.name.toLowerCase() === name.toLowerCase()
        )
        if (!med) {
          unmatched.push(name)
          return
        }
        matched++
        const existing = next.find((e) => e.medicationId === med.id)
        if (existing) {
          existing.doses += doses
        } else {
          next.push({
            id: `dose-${Date.now()}-${matched}`,
            medicationId: med.id,
            doses,
          })
        }
      })
      return next
    })

    return { matched, unmatched }
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
    addDoseEntry,
    updateDoseEntry,
    removeDoseEntry,
    clearDoseEntries,
    importDoses,
    // Calculator state
    switchPercentage,
    setSwitchPercentage,
    timePeriod,
    setTimePeriod,
    auditDays,
    setAuditDays,
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
