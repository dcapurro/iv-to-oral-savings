import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Users } from 'lucide-react'
import { useMedication } from '../context/MedicationContext'

export default function MedicationForm() {
  const {
    medications,
    patientMedications,
    addPatientMedication,
    updatePatientMedication,
    removePatientMedication,
  } = useMedication()

  const [selectedMedication, setSelectedMedication] = useState('')
  const [patientCount, setPatientCount] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedMedication || !patientCount || parseInt(patientCount) <= 0) return

    addPatientMedication(selectedMedication, parseInt(patientCount))
    setSelectedMedication('')
    setPatientCount('')
  }

  const startEditing = (pm) => {
    setEditingId(pm.id)
    setEditValue(pm.patientCount.toString())
  }

  const saveEdit = (id) => {
    const count = parseInt(editValue)
    if (count > 0) {
      updatePatientMedication(id, count)
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const getMedicationName = (medicationId) => {
    const med = medications.find((m) => m.id === medicationId)
    return med ? med.name : 'Unknown'
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary-500" />
        Patient Medications
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedMedication}
          onChange={(e) => setSelectedMedication(e.target.value)}
          className="input-field flex-1"
        >
          <option value="">Select medication...</option>
          {medications.map((med) => (
            <option key={med.id} value={med.id}>
              {med.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          value={patientCount}
          onChange={(e) => setPatientCount(e.target.value)}
          placeholder="# Patients"
          className="input-field w-full sm:w-32"
        />

        <button
          type="submit"
          disabled={!selectedMedication || !patientCount}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </form>

      {patientMedications.length === 0 ? (
        <p className="text-slate-500 text-center py-4">
          No medications added yet. Select a medication and enter patient count above.
        </p>
      ) : (
        <ul className="space-y-2">
          {patientMedications.map((pm) => (
            <li
              key={pm.id}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-700">
                  {getMedicationName(pm.medicationId)}
                </span>
                {editingId === pm.id ? (
                  <input
                    type="number"
                    min="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 px-2 py-1 border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                ) : (
                  <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm">
                    {pm.patientCount} patients
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === pm.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(pm.id)}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(pm)}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removePatientMedication(pm.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
