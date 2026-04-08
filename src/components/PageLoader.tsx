interface PageLoaderProps {
  /** true: h-screen full-page centering. false (default): centers within content area */
  fullScreen?: boolean;
  message?: string;
}

export default function PageLoader({ fullScreen = false, message = 'Loading...' }: PageLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-white ${
        fullScreen ? 'h-screen' : 'w-full min-h-64 py-16'
      }`}
    >
      <i className="ri-loader-4-line animate-spin text-3xl text-indigo-500" />
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}
