import { createContext, useContext, useState, useEffect } from 'react'
import { defaultMedications } from '../data/defaultMedications'

const MedicationContext = createContext()

const STORAGE_KEYS = {
  medications: 'iv-oral-medications',
  patientMedications: 'iv-oral-patient-medications',
}

export function MedicationProvider({ children }) {
  // Load medications from localStorage or use defaults
  const [medications, setMedications] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.medications)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return defaultMedications
      }
    }
    return defaultMedications
  })

  // Patient medications (selected medications with patient counts)
  const [patientMedications, setPatientMedications] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.patientMedications)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  })

  // Calculator state
  const [switchPercentage, setSwitchPercentage] = useState(50)
  const [timePeriod, setTimePeriod] = useState('month')

  // Persist medications to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(medications))
  }, [medications])

  // Persist patient medications to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.patientMedications, JSON.stringify(patientMedications))
  }, [patientMedications])

  // Medication CRUD operations
  const addMedication = (medication) => {
    const newMedication = {
      ...medication,
      id: medication.id || `med-${Date.now()}`,
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
    // Also remove from patient medications if present
    setPatientMedications((prev) => prev.filter((pm) => pm.medicationId !== id))
  }

  // Patient medication operations
  const addPatientMedication = (medicationId, patientCount) => {
    const existing = patientMedications.find((pm) => pm.medicationId === medicationId)
    if (existing) {
      setPatientMedications((prev) =>
        prev.map((pm) =>
          pm.medicationId === medicationId
            ? { ...pm, patientCount: pm.patientCount + patientCount }
            : pm
        )
      )
    } else {
      setPatientMedications((prev) => [
        ...prev,
        { id: `pm-${Date.now()}`, medicationId, patientCount },
      ])
    }
  }

  const updatePatientMedication = (id, patientCount) => {
    setPatientMedications((prev) =>
      prev.map((pm) => (pm.id === id ? { ...pm, patientCount } : pm))
    )
  }

  const removePatientMedication = (id) => {
    setPatientMedications((prev) => prev.filter((pm) => pm.id !== id))
  }

  const clearPatientMedications = () => {
    setPatientMedications([])
  }

  const value = {
    // Medication database
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    // Patient medications
    patientMedications,
    addPatientMedication,
    updatePatientMedication,
    removePatientMedication,
    clearPatientMedications,
    // Calculator state
    switchPercentage,
    setSwitchPercentage,
    timePeriod,
    setTimePeriod,
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
