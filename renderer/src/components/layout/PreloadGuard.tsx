import React, { useEffect, useState } from 'react'

interface PreloadGuardProps {
  children: React.ReactNode
}

export function PreloadGuard({ children }: PreloadGuardProps) {
  const [isPreloadReady, setIsPreloadReady] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const ready = window.__orbit_preload_ready__ === true && typeof window.orbit !== 'undefined'
    setIsPreloadReady(ready)
    if (!ready) {
      setErrorMessage(window.__orbit_preload_error__ || 'The preload script was not injected or failed during startup.')
    }
  }, [])

  if (!isPreloadReady) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0F0F12] text-[#F2F2F7] p-6 selection:bg-orbit-accent-red/30">
        <div className="max-w-md w-full rounded-2xl border border-[#3A3A44] bg-[#1C1C20] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          {/* Decorative backdrop glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-xl font-bold tracking-tight mb-2 text-white">
            Secure Bridge Initialization Failed
          </h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Orbit was unable to establish a secure communication channel with the main process. This usually happens if the preload script fails to execute.
          </p>

          {/* Error Details */}
          {errorMessage && (
            <div className="w-full text-left rounded-lg bg-black/40 border border-[#3A3A44] p-4 mb-6 font-mono text-xs text-red-400 overflow-x-auto whitespace-pre-wrap max-h-36 scrollbar-thin">
              <span className="font-semibold text-gray-500 select-none">[Error] </span>
              {errorMessage}
            </div>
          )}

          {/* Troubleshooting Advice */}
          <div className="text-xs text-gray-500 leading-relaxed mb-6">
            Try restarting the application. If this issue persists, check the console output or verify your installation files.
          </div>

          {/* Action button */}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-md bg-[#E8002A] hover:bg-[#C5001F] active:scale-[0.98] transition-all text-white font-medium text-sm shadow-lg shadow-red-900/20"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
