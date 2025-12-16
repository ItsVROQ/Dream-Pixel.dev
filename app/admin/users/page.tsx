'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  tier: string
  role: string
  status: string
  emailVerified: Date | null
  createdAt: Date
  lastActiveAt: Date | null
  creditsRemaining: number
  _count: {
    generations: number
  }
}

interface UserDetail extends User {
  generations: Array<{
    id: string
    prompt: string
    status: string
    createdAt: Date
  }>
  _count: {
    generations: number
    seeds: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [page, tierFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (search) params.append('search', search)
      if (tierFilter) params.append('tier', tierFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const viewUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      const data = await response.json()
      setSelectedUser(data)
      setShowModal(true)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const updateUser = async (userId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update user')
      await fetchUsers()
      alert('User updated successfully')
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete user')
      await fetchUsers()
      alert('User deleted successfully')
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>User Management</h2>
      </div>

      <div className="data-table">
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="">All Tiers</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <button onClick={fetchUsers}>Search</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Tier</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Generations</th>
              <th>Credits</th>
              <th>Signup Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.name || '-'}</td>
                <td>
                  <span className={`badge ${user.tier === 'ENTERPRISE' ? 'success' : user.tier === 'PRO' ? 'info' : 'warning'}`}>
                    {user.tier}
                  </span>
                </td>
                <td>{user.role}</td>
                <td>
                  <span className={`badge ${user.status === 'ACTIVE' ? 'success' : 'error'}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.emailVerified ? 'success' : 'warning'}`}>
                    {user.emailVerified ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{user._count.generations}</td>
                <td>{user.creditsRemaining}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-primary"
                      onClick={() => viewUserDetails(user.id)}
                    >
                      View
                    </button>
                    <button
                      className="btn-success"
                      onClick={() => updateUser(user.id, { tier: user.tier === 'FREE' ? 'PRO' : 'FREE' })}
                    >
                      Toggle Tier
                    </button>
                    <button
                      className="btn-warning"
                      onClick={() => updateUser(user.id, { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                    >
                      {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>User Details</h3>
            <div>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Name:</strong> {selectedUser.name || 'N/A'}</p>
              <p><strong>Tier:</strong> {selectedUser.tier}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
              <p><strong>Credits:</strong> {selectedUser.creditsRemaining}</p>
              <p><strong>Total Generations:</strong> {selectedUser._count.generations}</p>
              <p><strong>Total Seeds:</strong> {selectedUser._count.seeds}</p>
              <p><strong>Signup Date:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</p>
              {selectedUser.lastActiveAt && (
                <p><strong>Last Active:</strong> {new Date(selectedUser.lastActiveAt).toLocaleString()}</p>
              )}
              
              <h4>Recent Generations</h4>
              <table style={{ marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Prompt</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUser.generations.slice(0, 5).map((gen) => (
                    <tr key={gen.id}>
                      <td>
                        <span className={`badge ${gen.status === 'SUCCEEDED' ? 'success' : gen.status === 'FAILED' ? 'error' : 'warning'}`}>
                          {gen.status}
                        </span>
                      </td>
                      <td>{gen.prompt.substring(0, 50)}...</td>
                      <td>{new Date(gen.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              style={{ marginTop: '20px' }}
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
