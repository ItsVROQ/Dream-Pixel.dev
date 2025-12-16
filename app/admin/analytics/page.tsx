'use client'

import { useEffect, useState } from 'react'

interface Cohort {
  cohort_month: string
  total_users: number
  retention: {
    month_1: string
    month_2: string
    month_3: string
  }
}

interface FunnelStep {
  step: string
  count: number
  percentage: number | string
}

interface ChurnData {
  subscriptions: {
    active: number
    canceled: number
    churnRate: string | number
    churnedThisMonth: number
  }
  performance: {
    avgProcessingTimeMs: number
  }
  popularWords: Array<{ word: string; count: number }>
}

export default function AnalyticsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [churnData, setChurnData] = useState<ChurnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [cohortsRes, funnelRes, churnRes] = await Promise.all([
        fetch('/api/admin/analytics/cohorts'),
        fetch('/api/admin/analytics/funnel'),
        fetch('/api/admin/analytics/churn')
      ])

      if (!cohortsRes.ok || !funnelRes.ok || !churnRes.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const cohortsData = await cohortsRes.json()
      const funnelData = await funnelRes.json()
      const churnDataRes = await churnRes.json()

      setCohorts(cohortsData.cohorts)
      setFunnel(funnelData.funnel)
      setChurnData(churnDataRes)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading analytics...</div>
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Analytics</h2>
      </div>

      {churnData && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Active Subscriptions</div>
            <div className="kpi-value">{churnData.subscriptions.active}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Canceled Subscriptions</div>
            <div className="kpi-value">{churnData.subscriptions.canceled}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Churn Rate</div>
            <div className="kpi-value">{churnData.subscriptions.churnRate}%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Avg Processing Time</div>
            <div className="kpi-value">
              {(churnData.performance.avgProcessingTimeMs / 1000).toFixed(2)}s
            </div>
          </div>
        </div>
      )}

      <div className="chart-grid">
        <div className="data-table">
          <h3>Conversion Funnel</h3>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Count</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((step) => (
                <tr key={step.step}>
                  <td>{step.step}</td>
                  <td>{step.count.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '100px', 
                        height: '20px', 
                        background: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${step.percentage}%`, 
                          height: '100%', 
                          background: '#4caf50',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <span>{step.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {churnData && (
          <div className="data-table">
            <h3>Popular Keywords</h3>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px',
              padding: '20px'
            }}>
              {churnData.popularWords.map((word) => (
                <div
                  key={word.word}
                  style={{
                    padding: '8px 16px',
                    background: '#2196f3',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: `${12 + (word.count / churnData.popularWords[0].count) * 8}px`,
                    fontWeight: 600
                  }}
                >
                  {word.word} ({word.count})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="data-table">
        <h3>User Cohort Analysis (Retention by Signup Month)</h3>
        <table>
          <thead>
            <tr>
              <th>Cohort Month</th>
              <th>Total Users</th>
              <th>Month 1 Retention</th>
              <th>Month 2 Retention</th>
              <th>Month 3 Retention</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.cohort_month}>
                <td>{cohort.cohort_month}</td>
                <td>{cohort.total_users}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '100px', 
                      height: '20px', 
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${cohort.retention.month_1}%`, 
                        height: '100%', 
                        background: '#4caf50'
                      }} />
                    </div>
                    <span>{cohort.retention.month_1}%</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '100px', 
                      height: '20px', 
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${cohort.retention.month_2}%`, 
                        height: '100%', 
                        background: '#2196f3'
                      }} />
                    </div>
                    <span>{cohort.retention.month_2}%</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '100px', 
                      height: '20px', 
                      background: '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${cohort.retention.month_3}%`, 
                        height: '100%', 
                        background: '#ff9800'
                      }} />
                    </div>
                    <span>{cohort.retention.month_3}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
