import Link from 'next/link'

export default function PlaygroundPage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <h1 className="text-3xl font-bold mb-4">API Playground</h1>
      <p className="text-gray-600 mb-8">
        Interact with the Dream Pixel API directly from your browser using our interactive documentation.
      </p>
      <Link 
        href="/developers/api-reference"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
      >
        Open Interactive API Reference
      </Link>
    </div>
  )
}
