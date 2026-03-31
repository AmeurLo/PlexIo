export default function Loading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Message pane */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className={`h-10 rounded-2xl bg-gray-200 dark:bg-gray-700 ${i % 2 === 0 ? "w-52" : "w-40"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
