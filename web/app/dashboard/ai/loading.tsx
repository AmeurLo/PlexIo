export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
      </div>
      {/* AI chat interface skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 min-h-[400px]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className={`space-y-2 ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`}>
              <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-4 w-4/5 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Input skeleton */}
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}
