'use client'

import { useEffect, useState } from 'react'

interface Stats {
  kpis: {
    totalUsers: number
    activeSubscriptions: number
    generations: {
      last24h: number
      last7d: number
      last30d: number
    }
    mrr: number
  }
  charts: {
    signups: Array<{ date: string; count: number }>
    generations: Array<{ date: string; count: number }>
  }
  recentActivity: {
    generations: Array<any>
    signups: Array<any>
    subscriptions: Array<any>
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'generations' | 'signups' | 'subscriptions'>('generations')

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  if (!stats) {
    return <div className="error-message">No data available</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Dashboard</h2>
        <button onClick={fetchStats} className="table-controls">
          Refresh
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Users</div>
          <div className="kpi-value">{stats.kpis.totalUsers.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active Subscriptions</div>
          <div className="kpi-value">{stats.kpis.activeSubscriptions.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Generations (24h)</div>
          <div className="kpi-value">{stats.kpis.generations.last24h.toLocaleString()}</div>
          <div className="kpi-change">7d: {stats.kpis.generations.last7d.toLocaleString()}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">MRR</div>
          <div className="kpi-value">${stats.kpis.mrr.toLocaleString()}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>User Signups (Last 30 Days)</h3>
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            {stats.charts.signups.map((item, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: '#2196f3',
                  height: `${(item.count / Math.max(...stats.charts.signups.map(s => s.count))) * 100}%`,
                  minHeight: '2px',
                  borderRadius: '4px 4px 0 0'
                }}
                title={`${item.date}: ${item.count} signups`}
              />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Generations (Last 30 Days)</h3>
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            {stats.charts.generations.map((item, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: '#4caf50',
                  height: `${(item.count / Math.max(...stats.charts.generations.map(g => g.count))) * 100}%`,
                  minHeight: '2px',
                  borderRadius: '4px 4px 0 0'
                }}
                title={`${item.date}: ${item.count} generations`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="activity-feed">
        <h3>Recent Activity</h3>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'generations' ? 'active' : ''}`}
            onClick={() => setActiveTab('generations')}
          >
            Recent Generations
          </button>
          <button
            className={`tab ${activeTab === 'signups' ? 'active' : ''}`}
            onClick={() => setActiveTab('signups')}
          >
            Recent Signups
          </button>
          <button
            className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Recent Subscriptions
          </button>
        </div>

        {activeTab === 'generations' && (
          <div>
            {stats.recentActivity.generations.map((gen) => (
              <div key={gen.id} className="activity-item">
                <div className="activity-info">
                  <strong>{gen.user.email}</strong> generated an image
                  <span className="activity-time">
                    {new Date(gen.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className={`badge ${gen.status === 'SUCCEEDED' ? 'success' : gen.status === 'FAILED' ? 'error' : 'warning'}`}>
                  {gen.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'signups' && (
          <div>
            {stats.recentActivity.signups.map((user) => (
              <div key={user.id} className="activity-item">
                <div className="activity-info">
                  <strong>{user.email}</strong>
                  {user.name && ` (${user.name})`}
                  <span className="activity-time">
                    {new Date(user.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className={`badge ${user.emailVerified ? 'success' : 'warning'}`}>
                  {user.emailVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div>
            {stats.recentActivity.subscriptions.map((sub) => (
              <div key={sub.id} className="activity-item">
                <div className="activity-info">
                  <strong>{sub.user.email}</strong> - {sub.user.tier} tier
                  <span className="activity-time">
                    {sub.currentPeriodStart && new Date(sub.currentPeriodStart).toLocaleString()}
                  </span>
                </div>
                <span className={`badge ${sub.status === 'ACTIVE' ? 'success' : 'info'}`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
