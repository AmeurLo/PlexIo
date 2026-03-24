// Simple skeleton shimmer card for loading states
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3" />
      <div className="h-7 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2" />
      <div className="h-3 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
    </div>
  );
}

export function SkeletonRow({ cols = 3 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
      </div>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <div key={i} className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const widths = ["w-3/4", "w-full", "w-5/6", "w-2/3", "w-4/5"];
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-100 dark:bg-gray-800 rounded ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
