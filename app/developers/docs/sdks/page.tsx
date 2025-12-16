export default function SdksPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold mb-6">SDKs & Libraries</h1>
      <p className="mb-4">We are working on official SDKs to make integrating with Dream Pixel even easier.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-6 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>
        <div className="p-6 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">Python</h3>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>
        <div className="p-6 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">Ruby</h3>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
