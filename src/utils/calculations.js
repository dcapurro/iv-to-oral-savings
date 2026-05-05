// Calculate daily savings from per-2-day values
export const getDailySavings = (perTwoDays) => perTwoDays / 2

// Time period multipliers (converting daily to period)
export const timePeriodMultipliers = {
  week: 7,
  month: 30,
  year: 365,
}

// Calculate total savings for a list of patient medications
export const calculateTotalSavings = (
  patientMedications,
  medications,
  switchPercentage,
  timePeriod
) => {
  const multiplier = timePeriodMultipliers[timePeriod]
  const switchRatio = switchPercentage / 100

  let totalCO2 = 0
  let totalPlastic = 0

  patientMedications.forEach((pm) => {
    const medication = medications.find((m) => m.id === pm.medicationId)
    if (medication) {
      const dailyCO2 = getDailySavings(medication.co2PerTwoDays)
      const dailyPlastic = getDailySavings(medication.plasticPerTwoDays)

      totalCO2 += dailyCO2 * pm.patientCount * switchRatio * multiplier
      totalPlastic += dailyPlastic * pm.patientCount * switchRatio * multiplier
    }
  })

  return {
    co2: Math.round(totalCO2 * 100) / 100,
    plastic: Math.round(totalPlastic * 100) / 100,
  }
}

// Generate chart data for visualization
export const generateChartData = (
  patientMedications,
  medications,
  switchPercentage,
  timePeriod
) => {
  const multiplier = timePeriodMultipliers[timePeriod]
  const switchRatio = switchPercentage / 100

  return patientMedications.map((pm) => {
    const medication = medications.find((m) => m.id === pm.medicationId)
    if (!medication) return null

    const dailyCO2 = getDailySavings(medication.co2PerTwoDays)
    const dailyPlastic = getDailySavings(medication.plasticPerTwoDays)

    return {
      name: medication.name,
      co2: Math.round(dailyCO2 * pm.patientCount * switchRatio * multiplier * 100) / 100,
      plastic: Math.round(dailyPlastic * pm.patientCount * switchRatio * multiplier * 100) / 100,
      patients: pm.patientCount,
    }
  }).filter(Boolean)
}
