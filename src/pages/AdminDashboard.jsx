import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'
import UserRow from '../components/UserRow'
import PhoneNumberRow from '../components/PhoneNumberRow'
import { SERVICE_NAME, COUNTRIES } from '../lib/constants'

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

  const [newNumber, setNewNumber] = useState('')
  const [newCountry, setNewCountry] = useState(COUNTRIES[0].code)
  const [newCost, setNewCost] = useState('1')
  const [addingNumber, setAddingNumber] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const fetchAll = useCallback(async () => {
    setError('')

    const [usersRes, numbersRes, claimedRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, role, credits, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('phone_numbers')
        .select('id, number, country, cost, status, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('claimed_numbers')
        .select('id, number, cost_paid, claimed_at, user_id, users(email)')
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

  const handleAddNumber = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')

    const trimmedNumber = newNumber.trim()
    const parsedCost = parseInt(newCost, 10)

    if (!trimmedNumber) {
      setAddError('Phone number is required')
      return
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setAddError('Cost must be a positive number')
      return
    }

    setAddingNumber(true)
    try {
      const { error: insertError } = await supabase
        .from('phone_numbers')
        .insert({
          number: trimmedNumber,
          country: newCountry,
          cost: parsedCost,
          status: 'available',
        })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('This phone number already exists')
        }
        throw insertError
      }

      setAddSuccess(`Number ${trimmedNumber} added successfully`)
      setNewNumber('')
      setNewCost('1')
      await fetchAll()

      setTimeout(() => setAddSuccess(''), 3000)
    } catch (err) {
      setAddError(err.message || 'Failed to add number')
    } finally {
      setAddingNumber(false)
    }
  }

  const handleNumberDeleted = (deletedId) => {
    setPhoneNumbers((prev) => prev.filter((n) => n.id !== deletedId))
  }

  const totalCreditsInCirculation = users.reduce((sum, u) => sum + (u.credits || 0), 0)
  const availableCount = phoneNumbers.filter((n) => n.status === 'available').length
  const claimedCount = phoneNumbers.filter((n) => n.status === 'claimed').length

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
                <div className="card mb-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Add New Number</h2>

                  {addError && (
                    <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                      {addError}
                    </div>
                  )}
                  {addSuccess && (
                    <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-3 mb-4">
                      {addSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddNumber} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="input-label">Phone Number</label>
                      <input
                        type="text"
                        value={newNumber}
                        onChange={(e) => setNewNumber(e.target.value)}
                        placeholder="+1 555 123 4567"
                        disabled={addingNumber}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label">Country</label>
                      <select
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        disabled={addingNumber}
                        className="input-field"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="input-label">Cost (credits)</label>
                      <input
                        type="number"
                        min="1"
                        value={newCost}
                        onChange={(e) => setNewCost(e.target.value)}
                        disabled={addingNumber}
                        className="input-field"
                        required
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="input-label">Service</label>
                      <input
                        type="text"
                        value={SERVICE_NAME}
                        disabled
                        className="input-field bg-surface-light text-muted cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <button type="submit" disabled={addingNumber} className="btn-primary">
                        {addingNumber ? 'Adding...' : 'Add Number'}
                      </button>
                    </div>
                  </form>
                </div>

                <h2 className="text-lg font-semibold text-white mb-4">
                  All Numbers ({phoneNumbers.length})
                </h2>
                {phoneNumbers.length === 0 ? (
                  <div className="card text-center text-muted text-sm py-10">
                    No numbers added yet. Use the form above to add one.
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
                          <th>Claimed By</th>
                          <th>Cost Paid</th>
                          <th>Claimed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claimedNumbers.map((c) => (
                          <tr key={c.id}>
                            <td className="font-medium text-white tracking-wide">{c.number}</td>
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
                        ))}
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