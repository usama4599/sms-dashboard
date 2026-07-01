import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getService, getCountry } from '../lib/constants'

export default function PhoneNumberRow({ phoneNumber, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }

    setError('')
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('phone_numbers')
        .delete()
        .eq('id', phoneNumber.id)

      if (deleteError) throw deleteError

      onDeleted?.(phoneNumber.id)
    } catch (err) {
      setError(err.message || 'Failed to delete number')
      setDeleting(false)
      setConfirming(false)
    }
  }

  const isClaimed      = phoneNumber.status === 'claimed'
  const isDeletedByUser = phoneNumber.status === 'deleted_by_user'
  const country        = getCountry(phoneNumber.country)
  const service        = getService(phoneNumber.service)

  // Format the deletion timestamp if present.
  const deletedAtFormatted = phoneNumber.deleted_at
    ? new Date(phoneNumber.deleted_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <tr>
      <td>
        <span className="font-medium text-white tracking-wide">
          {phoneNumber.number}
        </span>
      </td>
      <td>
        <span className="badge-primary">{service.label}</span>
      </td>
      <td>
        <span className="badge-muted">{country.flag} {country.label}</span>
      </td>
      <td>
        <span className="font-semibold text-white">{phoneNumber.cost}</span>
        <span className="text-muted text-xs ml-1">
          credit{phoneNumber.cost !== 1 ? 's' : ''}
        </span>
      </td>
      <td>
        {isDeletedByUser ? (
          <div className="space-y-0.5">
            {/* "Deleted by User" badge */}
            <span className="badge bg-warning/10 text-warning border border-warning/20">
              Deleted by User
            </span>
            {/* Who deleted it */}
            {phoneNumber.deleted_by_user_id && (
              <p className="text-xs text-muted">
                ID: {phoneNumber.deleted_by_user_id.slice(0, 8)}…
              </p>
            )}
            {/* When they deleted it */}
            {deletedAtFormatted && (
              <p className="text-xs text-muted">{deletedAtFormatted}</p>
            )}
          </div>
        ) : isClaimed ? (
          <span className="badge-danger">Claimed</span>
        ) : (
          <span className="badge-success">Available</span>
        )}
      </td>
      <td>
        <span className="text-muted text-xs">
          {new Date(phoneNumber.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </td>
      <td>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={
            confirming
              ? 'btn-danger !bg-danger !text-white'
              : 'btn-danger !px-2.5 !py-1.5 text-xs'
          }
          title={
            isClaimed
              ? 'This number is currently claimed by a user'
              : isDeletedByUser
              ? 'This number was deleted by a user'
              : 'Delete this number'
          }
        >
          {deleting
            ? 'Deleting...'
            : confirming
            ? 'Click again to confirm'
            : 'Delete'}
        </button>
        {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
      </td>
    </tr>
  )
}