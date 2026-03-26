interface PageLoaderProps {
  /** true: h-screen full-page centering. false (default): centers within content area */
  fullScreen?: boolean;
}

export default function PageLoader({ fullScreen = false }: PageLoaderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-white ${
        fullScreen ? 'h-screen' : 'w-full min-h-64 py-16'
      }`}
    >
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
