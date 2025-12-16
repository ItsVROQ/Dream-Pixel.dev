import Link from 'next/link'

export default function DevelopersPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Dream Pixel Developers</h1>
      <p className="text-lg text-gray-600 mb-8">
        Integrate Dream Pixel's powerful image generation capabilities into your applications.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold mb-2">Getting Started</h3>
          <p className="text-gray-600 mb-4">Learn the basics of authentication and making your first request.</p>
          <Link href="/developers/docs/getting-started" className="text-blue-600 font-medium hover:underline">
            Read Guide &rarr;
          </Link>
        </div>

        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold mb-2">API Reference</h3>
          <p className="text-gray-600 mb-4">Explore endpoints, parameters, and response formats.</p>
          <Link href="/developers/api-reference" className="text-blue-600 font-medium hover:underline">
            View Reference &rarr;
          </Link>
        </div>

        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
          <p className="text-gray-600 mb-4">Manage API keys, view usage logs, and monitor errors.</p>
          <Link href="/developers/dashboard" className="text-blue-600 font-medium hover:underline">
            Go to Dashboard &rarr;
          </Link>
        </div>

        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-xl font-semibold mb-2">Webhooks</h3>
          <p className="text-gray-600 mb-4">Receive real-time updates when generations complete.</p>
          <Link href="/developers/webhooks" className="text-blue-600 font-medium hover:underline">
            Manage Webhooks &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
