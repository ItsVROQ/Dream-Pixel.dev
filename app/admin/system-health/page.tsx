'use client'

import { useEffect, useState } from 'react'

interface SystemHealth {
  database: {
    status: string
    latency: number
  }
  redis: {
    status: string
    latency: number
  }
  api: {
    uptime: number
    errorRate: string | number
    totalRequests24h: number
    errors24h: number
  }
  storage: {
    totalImages: number
    estimatedSize: string
  }
  errorLogs: Array<{
    id: string
    level: string
    message: string
    stack: string | null
    metadata: Record<string, unknown> | null
    userId: string | null
    endpoint: string | null
    createdAt: Date
  }>
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logLevel, setLogLevel] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchHealth()
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, logLevel])

  const fetchHealth = async () => {
    try {
      const params = new URLSearchParams()
      if (logLevel) params.append('logLevel', logLevel)
      params.append('logLimit', '50')

      const response = await fetch(`/api/admin/system-health?${params}`)
      if (!response.ok) throw new Error('Failed to fetch system health')
      const data = await response.json()
      setHealth(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading system health...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  if (!health) {
    return <div className="error-message">No data available</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>System Health</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {' '}Auto-refresh
          </label>
          <button onClick={fetchHealth}>Refresh Now</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Database</div>
          <div className="kpi-value">
            <span className={`badge ${health.database.status === 'healthy' ? 'success' : 'error'}`}>
              {health.database.status}
            </span>
          </div>
          <div className="kpi-change">Latency: {health.database.latency}ms</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Redis Cache</div>
          <div className="kpi-value">
            <span className={`badge ${health.redis.status === 'healthy' ? 'success' : 'error'}`}>
              {health.redis.status}
            </span>
          </div>
          <div className="kpi-change">Latency: {health.redis.latency}ms</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">API Uptime</div>
          <div className="kpi-value">{health.api.uptime}%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Error Rate (24h)</div>
          <div className="kpi-value">{health.api.errorRate}%</div>
          <div className="kpi-change">
            {health.api.errors24h} errors / {health.api.totalRequests24h} requests
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="kpi-card">
          <div className="kpi-label">Storage</div>
          <div className="kpi-value">{health.storage.totalImages.toLocaleString()}</div>
          <div className="kpi-change">Images stored</div>
          <div className="kpi-change">Estimated size: {health.storage.estimatedSize}</div>
        </div>
      </div>

      <div className="data-table">
        <h3>Error Logs</h3>
        <div className="table-controls">
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
          </select>
          <button onClick={fetchHealth}>Filter</button>
        </div>

        {health.errorLogs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No error logs found
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th>Message</th>
                <th>Endpoint</th>
                <th>User ID</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {health.errorLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge ${
                      log.level === 'ERROR' ? 'error' :
                      log.level === 'WARN' ? 'warning' :
                      'info'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td>{log.message.substring(0, 100)}</td>
                  <td>{log.endpoint || '-'}</td>
                  <td>{log.userId || '-'}</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        alert(`Stack Trace:\n${log.stack || 'No stack trace'}\n\nMetadata:\n${JSON.stringify(log.metadata, null, 2)}`)
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
