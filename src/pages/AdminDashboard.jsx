import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'
import UserRow from '../components/UserRow'
import PhoneNumberRow from '../components/PhoneNumberRow'
import { SERVICES, COUNTRIES, getService, getCountry } from '../lib/constants'

const TABS = [
  { id: 'users', label: 'All Users' },
  { id: 'numbers', label: 'Manage Numbers' },
  { id: 'claimed', label: 'Claimed Numbers' },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')

  const [users, setUsers] = useState([])
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [claimedNumbers, setClaimedNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Bulk add form state
  const [bulkService, setBulkService] = useState(SERVICES[0].code)
  const [bulkCountry, setBulkCountry] = useState(COUNTRIES[0].code)
  const [bulkCost, setBulkCost] = useState('1')
  const [bulkNumbersText, setBulkNumbersText] = useState('')
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkResult, setBulkResult] = useState(null) // { inserted, duplicates }

  // USA Virtual Numbers only has one country (US) — lock it automatically.
  useEffect(() => {
    if (bulkService === 'usa_virtual') {
      setBulkCountry('US')
    }
  }, [bulkService])

  const fetchAll = useCallback(async () => {
    setError('')

    const [usersRes, numbersRes, claimedRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, role, credits, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('phone_numbers')
        .select('id, number, country, service, cost, status, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('claimed_numbers')
        .select('id, number, cost_paid, claimed_at, user_id, users(email), phone_numbers(service, country)')
        .order('claimed_at', { ascending: false }),
    ])

    if (usersRes.error) setError(usersRes.error.message)
    else setUsers(usersRes.data || [])

    if (numbersRes.error) setError((prev) => prev || numbersRes.error.message)
    else setPhoneNumbers(numbersRes.data || [])

    if (claimedRes.error) setError((prev) => prev || claimedRes.error.message)
    else setClaimedNumbers(claimedRes.data || [])

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleBulkAdd = async (e) => {
    e.preventDefault()
    setBulkError('')
    setBulkResult(null)

    const lines = bulkNumbersText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const parsedCost = parseInt(bulkCost, 10)

    if (lines.length === 0) {
      setBulkError('Please paste at least one phone number (one per line).')
      return
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setBulkError('Cost must be a positive number')
      return
    }

    setBulkAdding(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_bulk_add_numbers', {
        p_numbers: lines,
        p_service: bulkService,
        p_country: bulkCountry,
        p_cost: parsedCost,
      })

      if (rpcError) throw rpcError

      setBulkResult({ inserted: data.inserted, duplicates: data.duplicates })
      setBulkNumbersText('')
      // No page refresh — just re-fetch the table data in place.
      await fetchAll()
    } catch (err) {
      setBulkError(err.message || 'Failed to add numbers')
    } finally {
      setBulkAdding(false)
    }
  }

  const handleNumberDeleted = (deletedId) => {
    setPhoneNumbers((prev) => prev.filter((n) => n.id !== deletedId))
  }

  const totalCreditsInCirculation = users.reduce((sum, u) => sum + (u.credits || 0), 0)
  const availableCount = phoneNumbers.filter((n) => n.status === 'available').length
  const claimedCount = phoneNumbers.filter((n) => n.status === 'claimed').length

  // Per-service breakdown for the Manage Numbers tab.
  const serviceStats = SERVICES.map((s) => ({
    ...s,
    available: phoneNumbers.filter((n) => n.service === s.code && n.status === 'available').length,
    claimed: phoneNumbers.filter((n) => n.service === s.code && n.status === 'claimed').length,
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Manage users, credits, and the phone number pool.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <span className="text-muted text-sm">Total Users</span>
            <span className="text-3xl font-bold text-white">{users.length}</span>
          </div>
          <div className="stat-card">
            <span className="text-muted text-sm">Credits in Circulation</span>
            <span className="text-3xl font-bold text-white">{totalCreditsInCirculation}</span>
          </div>
          <div className="stat-card">
            <span className="text-muted text-sm">Available Numbers</span>
            <span className="text-3xl font-bold text-success">{availableCount}</span>
          </div>
          <div className="stat-card">
            <span className="text-muted text-sm">Claimed Numbers</span>
            <span className="text-3xl font-bold text-primary-light">{claimedCount}</span>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-2 border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${
                activeTab === tab.id
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card text-center text-muted text-sm py-10">Loading admin data...</div>
        ) : (
          <>
            {activeTab === 'users' && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4">
                  All Users ({users.length})
                </h2>
                {users.length === 0 ? (
                  <div className="card text-center text-muted text-sm py-10">No users found.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="app-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Credits</th>
                          <th>Joined</th>
                          <th>Adjust Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <UserRow key={u.id} user={u} onCreditsUpdated={fetchAll} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'numbers' && (
              <section>
                {/* Per-service quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {serviceStats.map((s) => (
                    <div key={s.code} className="card">
                      <h3 className="text-sm font-semibold text-white mb-2">{s.label}</h3>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted">
                          Available: <span className="text-success font-semibold">{s.available}</span>
                        </span>
                        <span className="text-muted">
                          Claimed: <span className="text-primary-light font-semibold">{s.claimed}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk Add Numbers */}
                <div className="card mb-6">
                  <h2 className="text-lg font-semibold text-white mb-1">Bulk Add Numbers</h2>
                  <p className="text-muted text-sm mb-4">
                    Paste one phone number per line. Blank lines and duplicates are skipped automatically.
                  </p>

                  {bulkError && (
                    <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                      {bulkError}
                    </div>
                  )}
                  {bulkResult && (
                    <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-3 mb-4 space-y-0.5">
                      <p>Successfully Added: {bulkResult.inserted}</p>
                      <p>Duplicates Skipped: {bulkResult.duplicates}</p>
                    </div>
                  )}

                  <form onSubmit={handleBulkAdd} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="input-label">Service</label>
                        <select
                          value={bulkService}
                          onChange={(e) => setBulkService(e.target.value)}
                          disabled={bulkAdding}
                          className="input-field"
                        >
                          {SERVICES.map((s) => (
                            <option key={s.code} value={s.code}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="input-label">Country</label>
                        {bulkService === 'usa_virtual' ? (
                          <input
                            type="text"
                            value="🇺🇸 USA"
                            disabled
                            className="input-field bg-surface-light text-muted cursor-not-allowed"
                          />
                        ) : (
                          <select
                            value={bulkCountry}
                            onChange={(e) => setBulkCountry(e.target.value)}
                            disabled={bulkAdding}
                            className="input-field"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="input-label">Price (credits per number)</label>
                        <input
                          type="number"
                          min="1"
                          value={bulkCost}
                          onChange={(e) => setBulkCost(e.target.value)}
                          disabled={bulkAdding}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="input-label">Phone Numbers (one per line)</label>
                      <textarea
                        value={bulkNumbersText}
                        onChange={(e) => setBulkNumbersText(e.target.value)}
                        placeholder={'+12025550111\n+12025550112\n+12025550113'}
                        disabled={bulkAdding}
                        rows={8}
                        className="input-field font-mono resize-y"
                        required
                      />
                    </div>

                    <button type="submit" disabled={bulkAdding} className="btn-primary">
                      {bulkAdding ? 'Adding...' : 'Add Numbers'}
                    </button>
                  </form>
                </div>

                {/* Numbers table */}
                <h2 className="text-lg font-semibold text-white mb-4">
                  All Numbers ({phoneNumbers.length})
                </h2>
                {phoneNumbers.length === 0 ? (
                  <div className="card text-center text-muted text-sm py-10">
                    No numbers added yet. Use the form above to add some.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="app-table">
                      <thead>
                        <tr>
                          <th>Number</th>
                          <th>Service</th>
                          <th>Country</th>
                          <th>Cost</th>
                          <th>Status</th>
                          <th>Added</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phoneNumbers.map((n) => (
                          <PhoneNumberRow key={n.id} phoneNumber={n} onDeleted={handleNumberDeleted} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'claimed' && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4">
                  All Claimed Numbers ({claimedNumbers.length})
                </h2>
                {claimedNumbers.length === 0 ? (
                  <div className="card text-center text-muted text-sm py-10">
                    No numbers have been claimed yet.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="app-table">
                      <thead>
                        <tr>
                          <th>Number</th>
                          <th>Service</th>
                          <th>Country</th>
                          <th>Claimed By</th>
                          <th>Cost Paid</th>
                          <th>Claimed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claimedNumbers.map((c) => {
                          const service = getService(c.phone_numbers?.service)
                          const country = getCountry(c.phone_numbers?.country)
                          return (
                            <tr key={c.id}>
                              <td className="font-medium text-white tracking-wide">{c.number}</td>
                              <td><span className="badge-primary">{service.label}</span></td>
                              <td><span className="badge-muted">{country.flag} {country.label}</span></td>
                              <td className="text-muted">{c.users?.email ?? 'Unknown'}</td>
                              <td>
                                <span className="font-semibold text-white">{c.cost_paid}</span>
                                <span className="text-muted text-xs ml-1">
                                  credit{c.cost_paid !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="text-muted text-xs">
                                {new Date(c.claimed_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}