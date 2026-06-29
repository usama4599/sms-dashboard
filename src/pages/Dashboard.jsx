import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ClaimedNumberCard from '../components/ClaimedNumberCard'
import { SERVICE_NAME, COUNTRIES } from '../lib/constants'

export default function Dashboard() {
  const { profile, credits, refreshProfile } = useAuth()

  const [countryStats, setCountryStats] = useState({}) // { US: { count, price }, GB: {...}, CA: {...} }
  const [claimedNumbers, setClaimedNumbers] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [claimingCode, setClaimingCode] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(async () => {
    setError('')

    const [availableRes, claimedRes] = await Promise.all([
      // "Available" = status = 'available' (this schema's not-claimed flag —
      // there is no separate is_claimed boolean column, status IS that flag).
      supabase
        .from('phone_numbers')
        .select('country, cost, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: true }),
      // RLS already scopes this to only the logged-in user's own rows.
      // No limit — fetches every number this user has ever claimed.
      supabase
        .from('claimed_numbers')
        .select('id, number, cost_paid, claimed_at, phone_numbers(country)')
        .order('claimed_at', { ascending: false }),
    ])

    if (availableRes.error) {
      setError(availableRes.error.message)
    } else {
      const stats = {}
      for (const c of COUNTRIES) stats[c.code] = { count: 0, price: null }

      for (const row of availableRes.data || []) {
        const rawCountry = String(row.country || '').trim().toUpperCase()
        const match = COUNTRIES.find(
          (c) => c.code.toUpperCase() === rawCountry || c.label.toUpperCase() === rawCountry
        )
        if (!match) continue

        stats[match.code].count += 1
        // Rows are ordered oldest-first, matching what claim_phone_number()
        // will actually assign next, so the price shown is always accurate
        // and read live from the database (phone_numbers.cost).
        if (stats[match.code].price === null) {
          stats[match.code].price = row.cost
        }
      }
      setCountryStats(stats)
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

  const handleClaim = async (countryCode) => {
    setError('')
    setSuccessMsg('')
    setClaimingCode(countryCode)

    try {
      const { data, error: rpcError } = await supabase.rpc('claim_phone_number', {
        p_country: countryCode,
      })

      if (rpcError) throw rpcError

      setSuccessMsg(`Successfully claimed ${data.number}!`)
      // Refresh credit balance, available counts, and the user's claimed list
      // immediately — this is what makes "Available" drop instantly (e.g. 5 -> 4)
      // and the new number appear in "My Numbers" without a page reload.
      await Promise.all([refreshProfile(), fetchData()])

      setTimeout(() => setSuccessMsg(''), 3500)
    } catch (err) {
      const message = err.message || 'Failed to claim a number'
      setError(
        message.includes('Insufficient credits')
          ? message
          : message.includes('No numbers available')
          ? 'No numbers are available for that country right now.'
          : message
      )
    } finally {
      setClaimingCode(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Welcome back{profile?.email ? `, ${profile.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-muted text-sm mt-1">
            Claim numbers from any available country below — there's no limit on how many you can own.
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

        {/* ---------------- AVAILABLE NUMBERS (always visible, unlimited claiming) ---------------- */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Available Numbers</h2>

          {loadingData ? (
            <div className="card text-center text-muted text-sm py-10">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {COUNTRIES.map((country) => {
                const stat = countryStats[country.code] || { count: 0, price: null }
                const outOfStock = stat.count === 0
                const canAfford = stat.price !== null && credits >= stat.price
                const isClaiming = claimingCode === country.code

                // Only two reasons a button is ever disabled now: out of
                // stock for that specific country, or not enough credits.
                // There is NO "already own a number" restriction anymore.
                const disabled = outOfStock || !canAfford || isClaiming

                let buttonLabel = 'Claim Number'
                if (isClaiming) buttonLabel = 'Claiming...'
                else if (outOfStock) buttonLabel = 'Out of Stock'
                else if (!canAfford) buttonLabel = 'Insufficient Credits'

                return (
                  <div key={country.code} className="card flex flex-col items-center text-center">
                    <span className="text-4xl mb-2">{country.flag}</span>
                    <h3 className="text-base font-semibold text-white mb-3">{country.label}</h3>

                    <div className="w-full space-y-1.5 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted">Service</span>
                        <span className="text-white font-medium">{SERVICE_NAME}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Available</span>
                        <span className={outOfStock ? 'text-danger font-medium' : 'text-white font-medium'}>
                          {outOfStock ? 'Out of Stock' : `${stat.count} Number${stat.count !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Price</span>
                        <span className="text-white font-medium">
                          {stat.price !== null ? `${stat.price} Credits` : '—'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(country.code)}
                      disabled={disabled}
                      className="btn-primary w-full"
                      title={
                        outOfStock
                          ? 'No numbers available for this country'
                          : !canAfford
                          ? 'Not enough credits'
                          : 'Claim a number'
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

        {/* ---------------- MY NUMBERS (every number this user has ever claimed) ---------------- */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            My Numbers {claimedNumbers.length > 0 ? `(${claimedNumbers.length})` : ''}
          </h2>

          {loadingData ? (
            <div className="card text-center text-muted text-sm py-10">Loading your numbers...</div>
          ) : claimedNumbers.length === 0 ? (
            <div className="card text-center text-muted text-sm py-10">
              You haven't claimed any numbers yet. Claim one from the section above to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {claimedNumbers.map((claim) => (
                <ClaimedNumberCard key={claim.id} claimedNumber={claim} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}