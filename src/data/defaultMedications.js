// Default medications with environmental impact data
// CO2 and plastic savings are per 2 days of treatment
// These are placeholder values - real data should be sourced from environmental impact studies

export const defaultMedications = [
  {
    id: 'furosemide',
    name: 'Furosemide',
    co2PerTwoDays: 0.8,    // kg of CO2 saved per 2 days
    plasticPerTwoDays: 45, // grams of plastic saved per 2 days
  },
  {
    id: 'cefazolin',
    name: 'Cefazolin',
    co2PerTwoDays: 1.2,    // kg of CO2 saved per 2 days
    plasticPerTwoDays: 65, // grams of plastic saved per 2 days
  },
]
