// Default medications with environmental impact data.
// CO2 and plastic figures are PER DOSE of IV administration saved when a dose
// is switched to oral. These are placeholder values - real data should be
// sourced from environmental impact studies specific to your setting, and can
// be replaced in bulk via the CSV upload on the Configuration page.

export const defaultMedications = [
  {
    id: 'furosemide',
    name: 'Furosemide',
    co2PerDose: 0.15, // kg of CO2 saved per dose switched to oral
    plasticPerDose: 22, // grams of plastic saved per dose switched to oral
  },
  {
    id: 'cefazolin',
    name: 'Cefazolin',
    co2PerDose: 0.25, // kg of CO2 saved per dose switched to oral
    plasticPerDose: 35, // grams of plastic saved per dose switched to oral
  },
]
