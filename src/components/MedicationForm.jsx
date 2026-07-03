import { useRef, useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Syringe, Upload, AlertCircle } from 'lucide-react'
import { useMedication } from '../context/MedicationContext'
import { parseCsv, toObjects, pick } from '../utils/csv'

export default function MedicationForm() {
  const {
    medications,
    doseEntries,
    addDoseEntry,
    updateDoseEntry,
    removeDoseEntry,
    clearDoseEntries,
    importDoses,
  } = useMedication()

  const [selectedMedication, setSelectedMedication] = useState('')
  const [doseCount, setDoseCount] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedMedication || !doseCount || parseInt(doseCount) <= 0) return

    addDoseEntry(selectedMedication, parseInt(doseCount))
    setSelectedMedication('')
    setDoseCount('')
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const objects = toObjects(parseCsv(String(reader.result)))
      const list = objects.map((row) => ({
        name: pick(row, 'medication', 'drug', 'name'),
        doses: pick(row, 'number doses', 'doses', 'dose', 'count'),
      }))
      const result = importDoses(list)
      setImportResult(result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const startEditing = (entry) => {
    setEditingId(entry.id)
    setEditValue(entry.doses.toString())
  }

  const saveEdit = (id) => {
    const count = parseInt(editValue)
    if (count > 0) {
      updateDoseEntry(id, count)
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Syringe className="w-5 h-5 text-primary-500" />
          Missed-Switch Doses
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          {doseEntries.length > 0 && (
            <button
              onClick={() => {
                clearDoseEntries()
                setImportResult(null)
              }}
              className="p-2 text-red-500 hover:bg-red-100 rounded"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        className="hidden"
      />

      <p className="text-sm text-slate-500 mb-4">
        Upload a CSV with two columns (<code>medication</code>, <code>doses</code>) of
        missed opportunities to switch to oral, or add them manually below.
      </p>

      {importResult && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded text-sm">
            <Check className="w-4 h-4" />
            Imported doses for {importResult.matched} medication
            {importResult.matched === 1 ? '' : 's'}.
          </div>
          {importResult.unmatched.length > 0 && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Not found in the impact database (skipped) - add them on the
                Configuration page:{' '}
                <strong>{[...new Set(importResult.unmatched)].join(', ')}</strong>
              </span>
            </div>
          )}
        </div>
      )}

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
          value={doseCount}
          onChange={(e) => setDoseCount(e.target.value)}
          placeholder="# Doses"
          className="input-field w-full sm:w-32"
        />

        <button
          type="submit"
          disabled={!selectedMedication || !doseCount}
          className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </form>

      {doseEntries.length === 0 ? (
        <p className="text-slate-500 text-center py-4">
          No doses added yet. Upload a CSV or select a medication and enter the
          number of doses above.
        </p>
      ) : (
        <ul className="space-y-2">
          {doseEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-700">
                  {getMedicationName(entry.medicationId)}
                </span>
                {editingId === entry.id ? (
                  <input
                    type="number"
                    min="1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 px-2 py-1 border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                ) : (
                  <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm">
                    {entry.doses} doses
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === entry.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(entry.id)}
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
                      onClick={() => startEditing(entry)}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeDoseEntry(entry.id)}
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
