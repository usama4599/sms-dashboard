import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserRow({ user, onCreditsUpdated }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAdjust = async (sign) => {
    setError('')
    setSuccess('')

    const parsed = parseInt(amount, 10)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid positive number')
      return
    }

    const signedAmount = sign === 'add' ? parsed : -parsed

    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('admin_adjust_credits', {
        p_user_id: user.id,
        p_amount: signedAmount,
        p_description: sign === 'add'
          ? `Admin added ${parsed} credits`
          : `Admin removed ${parsed} credits`,
      })

      if (rpcError) throw rpcError

      setSuccess(sign === 'add' ? `+${parsed} added` : `-${parsed} removed`)
      setAmount('')
      onCreditsUpdated?.()

      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Failed to adjust credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr>
      <td>
        <div>
          <p className="font-medium text-white">{user.email}</p>
          <p className="text-xs text-muted">{user.id.slice(0, 8)}...</p>
        </div>
      </td>
      <td>
        <span className={user.role === 'admin' ? 'badge-primary' : 'badge-muted'}>
          {user.role}
        </span>
      </td>
      <td>
        <span className="font-semibold text-white">{user.credits}</span>
      </td>
      <td>
        <span className="text-muted text-xs">
          {new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            disabled={loading}
            className="input-field !py-1.5 !px-2.5 w-24 text-sm"
          />
          <button onClick={() => handleAdjust('add')} disabled={loading} className="btn-success !px-2.5 !py-1.5 text-xs" title="Add credits">
            + Add
          </button>
          <button onClick={() => handleAdjust('remove')} disabled={loading} className="btn-danger !px-2.5 !py-1.5 text-xs" title="Remove credits">
            − Remove
          </button>
        </div>
        {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
        {success && <p className="text-success text-xs mt-1.5">{success}</p>}
      </td>
    </tr>
  )
}