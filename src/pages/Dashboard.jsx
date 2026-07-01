import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ClaimedNumberCard from '../components/ClaimedNumberCard'
import { PRODUCTS } from '../lib/constants'

function productKey(service, country) {
  return `${service}:${country}`
}

export default function Dashboard() {
  const { profile, credits, refreshProfile } = useAuth()

  const [productStats, setProductStats] = useState({})
  const [quantities, setQuantities] = useState({})
  const [claimedNumbers, setClaimedNumbers] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [claimingKey, setClaimingKey] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(async () => {
    setError('')

    const [availableRes, claimedRes] = await Promise.all([
      supabase
        .from('phone_numbers')
        .select('service, country, cost, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: true }),
      // RLS scopes this to the logged-in user's own rows only.
      // Rows deleted via user_delete_claimed_number() are removed from this
      // table entirely, so they never appear here.
      supabase
        .from('claimed_numbers')
        .select('id, number, cost_paid, claimed_at, phone_numbers(service, country)')
        .order('claimed_at', { ascending: false }),
    ])

    if (availableRes.error) {
      setError(availableRes.error.message)
    } else {
      const stats = {}
      for (const p of PRODUCTS) stats[productKey(p.service, p.country)] = { count: 0, price: null }

      for (const row of availableRes.data || []) {
        const key = productKey(row.service, row.country)
        if (!stats[key]) continue

        stats[key].count += 1
        if (stats[key].price === null) {
          stats[key].price = row.cost
        }
      }
      setProductStats(stats)
    }

    if (claimedRes.error) {
      setError((prev) => prev || claimedRes.error.message)
    } else {
      setClaimedNumbers(claimedRes.data || [])
    }

    setLoadingData(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getQuantity = (key) => {
    const raw = quantities[key]
    const parsed = parseInt(raw, 10)
    return raw === undefined ? 1 : isNaN(parsed) ? '' : parsed
  }

  const setQuantity = (key, value) => {
    setQuantities((prev) => ({ ...prev, [key]: value }))
  }

  const handleClaim = async (product) => {
    const key = productKey(product.service, product.country)
    const quantity = getQuantity(key)

    setError('')
    setSuccessMsg('')

    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity (1 or more).')
      return
    }

    setClaimingKey(key)
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_phone_numbers_bulk', {
        p_service: product.service,
        p_country: product.country,
        p_quantity: quantity,
      })

      if (rpcError) throw rpcError

      setSuccessMsg(
        `Successfully claimed ${data.claimed_count} number${data.claimed_count !== 1 ? 's' : ''} for ${data.total_cost} credit${data.total_cost !== 1 ? 's' : ''}.`
      )
      setQuantity(key, '1')

      await Promise.all([refreshProfile(), fetchData()])

      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      const message = err.message || 'Failed to claim numbers'
      if (message.includes('Insufficient credits')) {
        setError('Insufficient Credits')
      } else if (message.includes('Only') && message.includes('currently available')) {
        setError(message)
      } else if (message.includes('No numbers are available')) {
        setError('No numbers are available for this selection right now.')
      } else {
        setError(message)
      }
    } finally {
      setClaimingKey(null)
    }
  }

  // Removes a card from local state the moment the user confirms deletion
  // inside ClaimedNumberCard. No full re-fetch needed — the RPC already
  // deleted the claimed_numbers row and marked the phone_number retired.
  const handleNumberDeleted = (deletedId) => {
    setClaimedNumbers((prev) => prev.filter((c) => c.id !== deletedId))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Welcome back{profile?.email ? `, ${profile.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-muted text-sm mt-1">
            Claim numbers from any available category — no limit on how many you can own.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="stat-card">
            <span className="text-muted text-sm">Credit Balance</span>
            <span className="text-3xl font-bold text-white">{credits}</span>
          </div>
          <div className="stat-card">
            <span className="text-muted text-sm">Your Claimed Numbers</span>
            <span className="text-3xl font-bold text-white">{claimedNumbers.length}</span>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-3 mb-6">
            {successMsg}
          </div>
        )}

        {/* ---------------- AVAILABLE NUMBERS (always visible) ---------------- */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Available Numbers</h2>

          {loadingData ? (
            <div className="card text-center text-muted text-sm py-10">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRODUCTS.map((product) => {
                const key = productKey(product.service, product.country)
                const stat = productStats[key] || { count: 0, price: null }
                const outOfStock = stat.count === 0
                const quantity = getQuantity(key)
                const totalCost =
                  stat.price !== null && typeof quantity === 'number'
                    ? stat.price * quantity
                    : null
                const canAfford = totalCost !== null && credits >= totalCost
                const isClaiming = claimingKey === key
                const disabled = outOfStock || isClaiming || !quantity || quantity <= 0 || !canAfford

                let buttonLabel = 'Claim Number'
                if (isClaiming) buttonLabel = 'Claiming...'
                else if (outOfStock) buttonLabel = 'Out of Stock'
                else if (totalCost !== null && !canAfford) buttonLabel = 'Insufficient Credits'

                return (
                  <div key={key} className="card flex flex-col items-center text-center">
                    <span className="text-4xl mb-2">{product.flag}</span>
                    <h3 className="text-base font-semibold text-white mb-3">{product.title}</h3>

                    <div className="w-full space-y-1.5 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted">Available</span>
                        <span className={outOfStock ? 'text-danger font-medium' : 'text-white font-medium'}>
                          {outOfStock
                            ? 'Out of Stock'
                            : `${stat.count} Number${stat.count !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Price</span>
                        <span className="text-white font-medium">
                          {stat.price !== null ? `${stat.price} Credits` : '—'}
                        </span>
                      </div>
                      {totalCost !== null && quantity > 0 && (
                        <div className="flex justify-between pt-1 border-t border-border">
                          <span className="text-muted">Total</span>
                          <span className="text-white font-semibold">{totalCost} Credits</span>
                        </div>
                      )}
                    </div>

                    <label className="input-label w-full text-left">Claim Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantities[key] ?? '1'}
                      onChange={(e) => setQuantity(key, e.target.value)}
                      disabled={outOfStock || isClaiming}
                      className="input-field text-center mb-3"
                    />

                    <button
                      onClick={() => handleClaim(product)}
                      disabled={disabled}
                      className="btn-primary w-full"
                      title={
                        outOfStock
                          ? 'No numbers available'
                          : !canAfford
                          ? 'Not enough credits'
                          : 'Claim numbers'
                      }
                    >
                      {buttonLabel}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ---------------- MY NUMBERS ---------------------------------------- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            My Numbers {claimedNumbers.length > 0 ? `(${claimedNumbers.length})` : ''}
          </h2>

          {loadingData ? (
            <div className="card text-center text-muted text-sm py-10">
              Loading your numbers...
            </div>
          ) : claimedNumbers.length === 0 ? (
            <div className="card text-center text-muted text-sm py-10">
              You haven't claimed any numbers yet. Claim some from the section above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {claimedNumbers.map((claim) => (
                <ClaimedNumberCard
                  key={claim.id}
                  claimedNumber={claim}
                  onDeleted={handleNumberDeleted}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}