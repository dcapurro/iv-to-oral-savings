import { Calendar } from 'lucide-react'
import { useMedication } from '../context/MedicationContext'

const periods = [
  { id: 'week', label: 'Week', days: 7 },
  { id: 'month', label: 'Month', days: 30 },
  { id: 'year', label: 'Year', days: 365 },
]

export default function TimePeriodSelector() {
  const { timePeriod, setTimePeriod } = useMedication()

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary-500" />
        Time Period
      </h2>

      <div className="flex gap-2">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setTimePeriod(period.id)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              timePeriod === period.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="text-center">
              <div>{period.label}</div>
              <div className={`text-xs mt-1 ${
                timePeriod === period.id ? 'text-primary-100' : 'text-slate-400'
              }`}>
                {period.days} days
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
