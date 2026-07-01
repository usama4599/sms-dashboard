import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getService, getCountry } from '../lib/constants'

export default function ClaimedNumberCard({ claimedNumber, onDeleted }) {
  const { id, number, cost_paid, claimed_at, phone_numbers } = claimedNumber
  const service = getService(phone_numbers?.service)
  const country = getCountry(phone_numbers?.country)

  // Split on "|" exactly once.
  // phoneNumber = everything before the first "|"
  // smsLink     = everything after  the first "|" (may be null)
  const pipeIndex = number ? number.indexOf('|') : -1
  const phoneNumber = pipeIndex !== -1 ? number.slice(0, pipeIndex) : number
  const smsLink     = pipeIndex !== -1 ? number.slice(pipeIndex + 1) : null

  // Local toast: { message, type: 'success' | 'error' }
  const [toast, setToast]       = useState(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ── Copy Number ────────────────────────────────────────────────────────────
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber)
      showToast('Phone number copied!')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  // ── Open Link ──────────────────────────────────────────────────────────────
  const openSmsLink = () => {
    if (smsLink) {
      window.open(smsLink, '_blank', 'noopener,noreferrer')
    }
  }

  // ── Copy Both ──────────────────────────────────────────────────────────────
  // Copies the complete raw value exactly as stored in the database,
  // e.g.  2204998129|https://sms222.us?token=xxxxxxxx
  const copyBoth = async () => {
    try {
      await navigator.clipboard.writeText(number)
      showToast('Copied!')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  // Sets phone_numbers.status = 'deleted_by_user' (never goes back to
  // 'available'), deletes the claimed_numbers row, and notifies the parent
  // so the card is removed from the dashboard list immediately.
  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this claimed number?'
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const { error } = await supabase.rpc('user_delete_claimed_number', {
        p_claimed_number_id: id,
      })
      if (error) throw error

      showToast('Number deleted successfully.')
      // Give the toast a moment to show before the card unmounts.
      setTimeout(() => onDeleted?.(id), 1000)
    } catch (err) {
      showToast(err.message || 'Failed to delete number', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formattedDate = new Date(claimed_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="card animate-fade-in hover:border-primary/40 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <span className="badge-success">Claimed</span>
      </div>

      {/* Phone number only — URL is never displayed */}
      <p className="text-lg font-semibold text-white tracking-wide mb-3">
        {phoneNumber}
      </p>

      {/* Details */}
      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-muted">Service</span>
          <span className="text-white font-medium">{service.label}</span>
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

      {/* Cost / date footer */}
      <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-border mb-3">
        <span>Claimed {formattedDate}</span>
        <span className="text-warning font-medium">
          −{cost_paid} credit{cost_paid !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── ROW 1: Copy Number + Open Link ─────────────────────────────────── */}
      <div className="flex gap-2 mb-2">
        <button onClick={copyNumber} className="btn-secondary flex-1 !py-2 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Number
        </button>

        {smsLink && (
          <button onClick={openSmsLink} className="btn-primary flex-1 !py-2 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Link
          </button>
        )}
      </div>

      {/* ── ROW 2: Copy Both + Delete ───────────────────────────────────────── */}
      <div className="flex gap-2">
        <button onClick={copyBoth} className="btn-secondary flex-1 !py-2 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Copy Both
        </button>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-danger flex-1 !py-2 text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {/* ── Local toast (success or error) ─────────────────────────────────── */}
      {toast && (
        <div
          className={`mt-3 text-xs rounded-lg px-3 py-2 text-center animate-fade-in ${
            toast.type === 'error'
              ? 'bg-danger/10 border border-danger/30 text-danger'
              : 'bg-success/10 border border-success/30 text-success'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}