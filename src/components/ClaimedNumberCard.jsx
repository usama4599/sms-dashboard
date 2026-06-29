import { SERVICE_NAME, getCountry } from '../lib/constants'

export default function ClaimedNumberCard({ claimedNumber }) {
  const { number, cost_paid, claimed_at, phone_numbers } = claimedNumber
  const country = getCountry(phone_numbers?.country)

  const formattedDate = new Date(claimed_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(number)
    } catch (err) {
      console.error('Failed to copy number:', err)
    }
  }

  return (
    <div className="card animate-fade-in hover:border-primary/40 transition-colors duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <span className="badge-success">Claimed</span>
      </div>

      <p className="text-lg font-semibold text-white tracking-wide mb-3">
        {number}
      </p>

      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-muted">Service</span>
          <span className="text-white font-medium">{SERVICE_NAME}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Country</span>
          <span className="text-white font-medium">{country.flag} {country.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Status</span>
          <span className="badge-success">Claimed</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-border">
        <span>Claimed {formattedDate}</span>
        <span className="text-warning font-medium">−{cost_paid} credit{cost_paid !== 1 ? 's' : ''}</span>
      </div>

      <button
        onClick={copyToClipboard}
        className="btn-secondary w-full mt-3 !py-2 text-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy Number
      </button>
    </div>
  )
}