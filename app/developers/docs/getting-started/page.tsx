import Link from 'next/link'

export default function GettingStartedPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold mb-6">Getting Started</h1>
      <p className="mb-4">Welcome to the Dream Pixel API. This guide will help you make your first request.</p>
      
      <h2 className="text-2xl font-semibold mt-8 mb-4">Authentication</h2>
      <p className="mb-4">To access the API, you need an API key. You can generate one in the <Link href="/developers/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>.</p>
      
      <div className="bg-gray-100 p-4 rounded-md font-mono text-sm mb-6">
        Authorization: Bearer sk_live_...
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Making a Request</h2>
      <p className="mb-4">Here is an example request to generate an image:</p>
      
      <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
{`curl -X POST https://api.dreampixel.com/api/v1/generate \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "A futuristic city with flying cars"
  }'`}
      </div>
    </div>
  )
}
