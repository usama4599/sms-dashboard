// Single source of truth for the supported service + countries, used by
// both the User Dashboard (claim cards) and Admin Dashboard (add-number form),
// so they can never drift out of sync.

export const SERVICE_NAME = 'Facebook'

export const COUNTRIES = [
  { code: 'US', label: 'USA', flag: '🇺🇸' },
  { code: 'GB', label: 'UK', flag: '🇬🇧' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
]

export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || { code, label: code, flag: '🏳️' }
}