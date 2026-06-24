import { useEffect, useState } from 'react';
import { ipcService } from '@/services/ipcService';
import type { DependencyInfo } from '@/types';

interface DependencyDownloadModalProps {
  dependencyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DependencyDownloadModal({ dependencyId, onClose, onSuccess }: DependencyDownloadModalProps) {
  const [step, setStep] = useState<'permission' | 'downloading' | 'completed' | 'failed'>('permission');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const depConfig: Record<string, {
    name: string;
    url: string;
    repo: string;
    why: string;
  }> = {
    ytdlp: {
      name: 'yt-dlp',
      url: 'https://github.com/yt-dlp/yt-dlp',
      repo: 'https://github.com/yt-dlp/yt-dlp',
      why: 'Required to extract video/audio metadata, search playlists, and fetch high-speed downloads from multiple video and music platforms.'
    },
    ffmpeg: {
      name: 'FFmpeg',
      url: 'https://ffmpeg.org',
      repo: 'https://github.com/GyanD/codexffmpeg',
      why: 'Required to merge high-definition video files with their audio streams, convert audio formats (like MP3), and finalize downloads.'
    }
  };

  const config = depConfig[dependencyId] || {
    name: dependencyId,
    url: '#',
    repo: '#',
    why: 'Required external tool for application functionality.'
  };

  useEffect(() => {
    // Listen to live updates from the main process
    const removeListener = ipcService.onDependencyStatusChange((updatedDep: DependencyInfo) => {
      if (updatedDep.id === dependencyId) {
        setProgress(updatedDep.progress);
        
        if (updatedDep.status === 'downloading') {
          setStatusMessage(`Downloading ${config.name}...`);
        } else if (updatedDep.status === 'installed') {
          setStatusMessage('Verifying package...');
          setTimeout(() => {
            setStatusMessage('Installation complete.');
            setStep('completed');
            onSuccess();
          }, 800);
        } else if (updatedDep.status === 'failed') {
          setErrorMessage(updatedDep.error || 'Failed to install dependency.');
          setStep('failed');
        }
      }
    });

    return () => {
      removeListener();
    };
  }, [dependencyId, config.name, onSuccess]);

  const handleStartDownload = async () => {
    setStep('downloading');
    setStatusMessage(`Downloading ${config.name}...`);
    setProgress(0);
    
    try {
      const result = await ipcService.downloadDependency(dependencyId);
      if (!result.success) {
        setErrorMessage(result.error || 'Download was unsuccessful.');
        setStep('failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during download.');
      setStep('failed');
    }
  };

  const handleOpenLink = (url: string) => {
    ipcService.openExternal(url);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 text-white flex flex-col gap-5 relative overflow-hidden select-none">
        
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Auto Resolve Dependency: {config.name}
          </h3>
          {step !== 'downloading' && step !== 'completed' && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors border-0 bg-transparent cursor-pointer p-1"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
 
        {/* Content steps */}
        {step === 'permission' && (
          <div className="space-y-4">
            <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 text-xs text-indigo-300 leading-relaxed">
              These external dependencies are <strong className="text-indigo-200">free</strong>, <strong className="text-indigo-200">open-source</strong>, and completely <strong className="text-indigo-200">safe to inspect and verify</strong>.
            </div>
 
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Why are they required?</span>
              <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-slate-200">yt-dlp</strong>: Required to extract video/audio metadata, search playlists, and fetch high-speed downloads from multiple video and music platforms.
                </li>
                <li>
                  <strong className="text-slate-200">FFmpeg</strong>: Required to merge high-definition video files with their audio streams, convert audio formats (like MP3), and finalize downloads.
                </li>
              </ul>
            </div>
 
            <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Official Project Links</span>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleOpenLink('https://github.com/yt-dlp/yt-dlp')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold border-0 bg-transparent cursor-pointer p-0 select-text w-fit text-left"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  yt-dlp: https://github.com/yt-dlp/yt-dlp
                </button>
                <button
                  onClick={() => handleOpenLink('https://ffmpeg.org')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold border-0 bg-transparent cursor-pointer p-0 select-text w-fit text-left"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  FFmpeg: https://ffmpeg.org
                </button>
              </div>
            </div>
 
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleStartDownload}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer text-center border-0 shadow-lg shadow-indigo-600/10"
              >
                Accept & Download
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all cursor-pointer text-center bg-transparent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
 
        {(step === 'downloading' || step === 'completed') && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-200">{statusMessage}</span>
              {step === 'downloading' && (
                <span className="text-indigo-400 font-bold">{progress}%</span>
              )}
            </div>
 
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ease-out ${
                  step === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${step === 'completed' ? 100 : progress}%` }}
              ></div>
            </div>
 
            {step === 'completed' && (
              <div className="text-center pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all cursor-pointer border-0"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
 
        {step === 'failed' && (
          <div className="space-y-4 py-2">
            <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 text-sm text-rose-400 leading-relaxed">
              <strong className="block mb-1 font-bold">Installation Failed</strong>
              {errorMessage}
            </div>
 
            <div className="flex gap-3">
              <button
                onClick={handleStartDownload}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer text-center border-0"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all cursor-pointer text-center bg-transparent"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
