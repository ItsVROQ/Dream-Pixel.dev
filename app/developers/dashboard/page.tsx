'use client'

import { ApiKeyManager } from '@/components/developers/ApiKeyManager'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const mockData = [
  { name: 'Mon', requests: 4000, errors: 240 },
  { name: 'Tue', requests: 3000, errors: 139 },
  { name: 'Wed', requests: 2000, errors: 980 },
  { name: 'Thu', requests: 2780, errors: 390 },
  { name: 'Fri', requests: 1890, errors: 480 },
  { name: 'Sat', requests: 2390, errors: 380 },
  { name: 'Sun', requests: 3490, errors: 430 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Developer Dashboard</h1>
        <p className="text-gray-600">Manage your API keys and monitor usage.</p>
      </div>

      <ApiKeyManager />

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-xl font-semibold mb-6">API Usage (Last 7 Days)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="errors" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
