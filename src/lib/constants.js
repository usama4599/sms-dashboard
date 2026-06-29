// Single source of truth for supported services, countries, and the
// (service, country) "products" shown as claim cards — used by both the
// User Dashboard and Admin Dashboard so they can never drift out of sync.

export const SERVICE_NAME = 'Facebook' // kept for backward compatibility

export const COUNTRIES = [
  { code: 'US', label: 'USA', flag: '🇺🇸' },
  { code: 'GB', label: 'UK', flag: '🇬🇧' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
]

export const SERVICES = [
  { code: 'facebook', label: 'Facebook' },
  { code: 'usa_virtual', label: 'USA Virtual Numbers' },
]

// One PRODUCT = one claimable (service, country) combination, rendered as
// one card on the User Dashboard and configurable from the Admin Dashboard's
// bulk-add form.
export const PRODUCTS = [
  { service: 'facebook', country: 'US', title: 'Facebook USA', flag: '🇺🇸' },
  { service: 'facebook', country: 'GB', title: 'Facebook UK', flag: '🇬🇧' },
  { service: 'facebook', country: 'CA', title: 'Facebook Canada', flag: '🇨🇦' },
  { service: 'usa_virtual', country: 'US', title: 'USA Virtual Numbers', flag: '🇺🇸' },
]

export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || { code, label: code, flag: '🏳️' }
}

export function getService(code) {
  return SERVICES.find((s) => s.code === code) || { code, label: code }
}

export function getProduct(service, country) {
  return (
    PRODUCTS.find((p) => p.service === service && p.country === country) || {
      service,
      country,
      title: `${getService(service).label} ${getCountry(country).label}`,
      flag: getCountry(country).flag,
    }
  )
}