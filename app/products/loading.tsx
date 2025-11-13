export default function ProductsLoading() {
  return (
    <div className="bg-[#f2f2f4] min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 py-6 px-6">
        {/* Sidebar Skeleton */}
        <aside className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg p-4 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Skeleton */}
        <main className="flex-1">
          <div className="bg-[#292d32] rounded-lg p-6 mb-6">
            <div className="h-8 bg-gray-600 rounded w-48 animate-pulse"></div>
          </div>
          
          <div className="bg-white rounded-lg p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
