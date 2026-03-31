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
      {/* Insurance policy cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded mb-2" />
          <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}
