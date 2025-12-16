import ImageUpload from '@/components/ImageUpload';

export default function ImagePipelineDemo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Dream Pixel - Image Processing Pipeline
            </h1>
            <div className="text-sm text-gray-600">
              Phase 3: Optimized Image Processing & Storage
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Features Overview */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🚀 Image Processing Pipeline Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">✅ File Validation</h3>
                <p className="text-sm text-gray-600 mt-1">
                  JPEG, PNG, WebP support • Max 20MB • Dimension validation
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">⚡ Image Processing</h3>
                <p className="text-sm text-gray-600 mt-1">
                  WebP conversion • Auto-resize • EXIF stripping • Perceptual hashing
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">☁️ Cloud Storage</h3>
                <p className="text-sm text-gray-600 mt-1">
                  S3/R2 integration • Signed URLs • CDN optimization
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">🎨 Multiple Sizes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Thumbnail (512px) • Medium (1024px) • Full resolution
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">🔄 Smart Caching</h3>
                <p className="text-sm text-gray-600 mt-1">
                  1 year for generations • 24h for references • LQIP support
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900">💳 Credit System</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Free tier limits • Pro unlimited • Enterprise archival
                </p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-8 bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Performance Targets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{'<5s'}</div>
                <div className="text-sm text-gray-600">Processing Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">30%+</div>
                <div className="text-sm text-gray-600">Size Reduction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">24h</div>
                <div className="text-sm text-gray-600">URL Expiry</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">1 Year</div>
                <div className="text-sm text-gray-600">CDN Cache</div>
              </div>
            </div>
          </div>

          {/* Upload Interface */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                📤 Upload Reference Images
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload images to use as reference for AI generation. Images are automatically optimized and stored securely.
              </p>
            </div>
            <div className="p-6">
              <ImageUpload
                onUploadStart={() => console.log('Upload started')}
                onUploadProgress={(progress) => console.log('Progress:', progress)}
                onUploadComplete={(result) => {
                  console.log('Upload complete:', result);
                  // You can use this data to update your UI or store references
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                  alert(`Upload failed: ${error}`);
                }}
              />
            </div>
          </div>

          {/* API Endpoints Info */}
          <div className="mt-8 bg-white rounded-lg border shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🔗 Available API Endpoints
              </h2>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">POST</span>
                  <span>/api/images/upload-reference</span>
                  <span className="text-gray-500">- Upload reference images</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">POST</span>
                  <span>/api/images/save-generation</span>
                  <span className="text-gray-500">- Save generation results</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">GET</span>
                  <span>/api/images/proxy/[...path]</span>
                  <span className="text-gray-500">- Image proxy with transformations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold">POST</span>
                  <span>/api/jobs/cleanup</span>
                  <span className="text-gray-500">- Cleanup expired images</span>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Setup */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-4">
              ⚙️ Environment Setup Required
            </h2>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>To fully test the pipeline, configure these environment variables:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-yellow-100 px-1 rounded">AWS_ACCESS_KEY_ID</code> - AWS/R2 access key</li>
                <li><code className="bg-yellow-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code> - AWS/R2 secret key</li>
                <li><code className="bg-yellow-100 px-1 rounded">S3_BUCKET_NAME</code> - Storage bucket name</li>
                <li><code className="bg-yellow-100 px-1 rounded">S3_ENDPOINT</code> - R2 endpoint (optional)</li>
                <li><code className="bg-yellow-100 px-1 rounded">CDN_BASE_URL</code> - CDN domain (optional)</li>
              </ul>
              <p className="mt-3">
                <strong>Note:</strong> Without storage configuration, the API will return 501 errors but the validation and processing pipeline will work.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}