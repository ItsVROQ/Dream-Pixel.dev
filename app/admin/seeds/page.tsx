'use client'

import { useEffect, useState } from 'react'

interface Seed {
  id: string
  seedNumber: number
  title: string
  description: string | null
  category: string
  useCount: number
  likeCount: number
  isFeatured: boolean
  isApproved: boolean
  isBanned: boolean
  createdAt: Date
  creator: {
    id: string
    email: string
    name: string | null
    tier: string
  }
}

interface SeedAnalytics {
  mostUsed: Seed[]
  trending: Array<Seed & { recentUsage: number }>
  stats: {
    pendingApproval: number
    bannedCount: number
  }
}

export default function SeedsPage() {
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [analytics, setAnalytics] = useState<SeedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [approvedFilter, setApprovedFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'analytics'>('all')

  useEffect(() => {
    fetchSeeds()
  }, [page, approvedFilter])

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab])

  const fetchSeeds = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (approvedFilter) params.append('approved', approvedFilter)

      const response = await fetch(`/api/admin/seeds?${params}`)
      if (!response.ok) throw new Error('Failed to fetch seeds')
      const data = await response.json()
      setSeeds(data.seeds)
      setTotalPages(data.pagination.totalPages)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/seeds/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const updateSeed = async (seedId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/admin/seeds/${seedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update seed')
      await fetchSeeds()
      if (activeTab === 'analytics') await fetchAnalytics()
      alert('Seed updated successfully')
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const deleteSeed = async (seedId: string) => {
    if (!confirm('Are you sure you want to delete this seed?')) return
    try {
      const response = await fetch(`/api/admin/seeds/${seedId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete seed')
      await fetchSeeds()
      alert('Seed deleted successfully')
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading && seeds.length === 0) {
    return <div className="loading">Loading seeds...</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Seed Management</h2>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Seeds
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="data-table">
          <div className="table-controls">
            <select
              value={approvedFilter}
              onChange={(e) => setApprovedFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Approved</option>
              <option value="false">Pending Approval</option>
            </select>
            <button onClick={fetchSeeds}>Refresh</button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <table>
            <thead>
              <tr>
                <th>Seed #</th>
                <th>Title</th>
                <th>Category</th>
                <th>Creator</th>
                <th>Use Count</th>
                <th>Likes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seeds.map((seed) => (
                <tr key={seed.id}>
                  <td>{seed.seedNumber}</td>
                  <td>{seed.title}</td>
                  <td>{seed.category}</td>
                  <td>{seed.creator.email}</td>
                  <td>{seed.useCount}</td>
                  <td>{seed.likeCount}</td>
                  <td>
                    {seed.isBanned && <span className="badge error">BANNED</span>}
                    {!seed.isBanned && seed.isApproved && <span className="badge success">APPROVED</span>}
                    {!seed.isBanned && !seed.isApproved && <span className="badge warning">PENDING</span>}
                    {seed.isFeatured && <span className="badge info">FEATURED</span>}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!seed.isApproved && !seed.isBanned && (
                        <button
                          className="btn-success"
                          onClick={() => updateSeed(seed.id, { isApproved: true })}
                        >
                          Approve
                        </button>
                      )}
                      <button
                        className="btn-warning"
                        onClick={() => updateSeed(seed.id, { isFeatured: !seed.isFeatured })}
                      >
                        {seed.isFeatured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => updateSeed(seed.id, { isBanned: !seed.isBanned })}
                      >
                        {seed.isBanned ? 'Unban' : 'Ban'}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => deleteSeed(seed.id)}
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
      )}

      {activeTab === 'analytics' && analytics && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Pending Approval</div>
              <div className="kpi-value">{analytics.stats.pendingApproval}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Banned Seeds</div>
              <div className="kpi-value">{analytics.stats.bannedCount}</div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="data-table">
              <h3>Most Used Seeds (All Time)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Seed #</th>
                    <th>Title</th>
                    <th>Use Count</th>
                    <th>Creator</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.mostUsed.map((seed) => (
                    <tr key={seed.id}>
                      <td>{seed.seedNumber}</td>
                      <td>{seed.title}</td>
                      <td>{seed.useCount}</td>
                      <td>{seed.creator.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="data-table">
              <h3>Trending Seeds (Last 7 Days)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Seed #</th>
                    <th>Title</th>
                    <th>Recent Usage</th>
                    <th>Creator</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.trending.map((seed) => (
                    <tr key={seed.id}>
                      <td>{seed.seedNumber}</td>
                      <td>{seed.title}</td>
                      <td>{seed.recentUsage}</td>
                      <td>{seed.creator.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
