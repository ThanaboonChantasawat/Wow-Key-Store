export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          {/* Back button skeleton */}
          <div className="h-10 w-32 bg-gray-200 rounded mb-6"></div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image skeleton */}
              <div className="aspect-video bg-gray-200 rounded-lg"></div>

              {/* Info skeleton */}
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
                <div className="h-12 bg-gray-200 rounded mt-6"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
