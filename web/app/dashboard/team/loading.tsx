export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
      {/* Team member rows */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-44 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
