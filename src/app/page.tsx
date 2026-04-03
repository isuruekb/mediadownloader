"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Loader2, 
  Music, 
  Video, 
  AlertCircle, 
  Download, 
  Clock, 
  Disc3
} from "lucide-react";
import Image from "next/image";

type VideoInfo = {
  title: string;
  duration: string;
  thumbnail: string;
  author: string;
  isPrivate: boolean;
  isAgeRestricted: boolean;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [fetchedUrl, setFetchedUrl] = useState("");

  const formatDuration = (secondsStr: string) => {
    const seconds = parseInt(secondsStr, 10);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFetchInfo = async () => {
    if (!url) return;
    setIsLoading(true);
    setError("");
    setVideoInfo(null);
    setDownloadedBytes(0);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

      setVideoInfo({
        ...data,
        duration: formatDuration(data.duration)
      });
      setFetchedUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadedBytes(0);
    setError("");

    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(url)}&format=${format}`);
      if (!res.ok) throw new Error("File Download failed visually from API");

      const disposition = res.headers.get("content-disposition");
      let filename = `${videoInfo?.title || 'download'}.${format}`;
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Unable to read stream");

      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        setDownloadedBytes(receivedLength);
      }

      const blob = new Blob(chunks);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while downloading the file.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 -translate-y-[20%] shrink-0 w-full flex justify-center pointer-events-none">
         <div className="relative h-[250px] md:h-[400px] w-full max-w-[800px] opacity-40">
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-[80px] opacity-40 rounded-full mix-blend-screen" />
         </div>
      </div>

      <div className="z-10 w-full max-w-3xl mx-auto flex flex-col items-center gap-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 px-2"
        >
          <div className="flex items-center justify-center gap-3 text-white mb-2 md:mb-4">
            <Disc3 className="w-8 h-8 md:w-12 md:h-12 text-pink-500 animate-[spin_5s_linear_infinite]" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent drop-shadow-xl">
              Media Downloader
            </h1>
          </div>
          <p className="text-zinc-400 text-base md:text-xl font-medium max-w-[500px] mx-auto leading-relaxed">
            Download your favorite YouTube, Facebook, TikTok, X & LinkedIn videos in top quality, fast and free.
          </p>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] sm:rounded-3xl p-2 md:p-3 shadow-2xl flex flex-col sm:flex-row items-center group relative overflow-hidden gap-2 sm:gap-0"
        >
          <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 origin-left" />

          <Search className="w-6 h-6 text-zinc-500 ml-4 hidden sm:block shrink-0" />
          <input 
            type="text"
            placeholder="Paste YouTube, FB, TikTok, X or LinkedIn link here..."
            className="w-full sm:flex-1 bg-transparent border-none outline-none text-white px-5 sm:px-5 py-4 placeholder:text-zinc-600 text-base sm:text-lg text-center sm:text-left"
            value={url}
            onChange={(e) => {
               setUrl(e.target.value);
               if (e.target.value.includes('tiktok.com') || e.target.value.includes('linkedin.com')) setFormat('mp4'); // default to mp4
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
          />
          <button 
            onClick={handleFetchInfo}
            disabled={isLoading || !url || isDownloading}
            className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-xl sm:rounded-2xl font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[140px] text-lg active:scale-95 shrink-0"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Convert"}
          </button>
        </motion.div>

        <div className="w-full min-h-[300px]">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex justify-center"
              >
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl flex items-center gap-4 max-w-xl">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="text-sm md:text-base font-medium">{error}</p>
                </div>
              </motion.div>
            )}

            {videoInfo && !error && !isLoading && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
              >
                <div className="w-full md:w-[48%] relative aspect-video md:aspect-auto md:min-h-full shrink-0 bg-black">
                  <Image
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    fill
                    className="object-cover"
                    unoptimized 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                    <Clock className="w-3.5 h-3.5" />
                    {videoInfo.duration}
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-1 gap-8 relative">
                  <div>
                    <h3 className="text-2xl font-bold text-white line-clamp-2 leading-tight">
                      {videoInfo.title}
                    </h3>
                    <p className="text-zinc-500 mt-3 text-base flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-white/50 text-xs font-bold">
                         {videoInfo.author.charAt(0).toUpperCase()}
                       </span>
                      <span className="font-medium">{videoInfo.author}</span>
                      <span className="ml-1 opacity-90 p-1 bg-zinc-800/50 rounded-lg border border-white/5 flex items-center justify-center">
                        {fetchedUrl.includes('youtube.com') || fetchedUrl.includes('youtu.be') ? (
                          <svg className="w-4 h-4 fill-[#FF0000]" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        ) : 
                         fetchedUrl.includes('facebook.com') || fetchedUrl.includes('fb.watch') || fetchedUrl.includes('fb.video') ? (
                          <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                         ) :
                         fetchedUrl.includes('tiktok.com') ? (
                           <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                             <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.13 2.73 1.79 4.3 1.89V9.93c-1.63-.05-3.21-.61-4.48-1.63-.09 2.63-.06 5.25-.09 7.87.03 1.48-.13 3.01-.84 4.32-.87 1.63-2.67 2.68-4.52 2.64-1.89-.04-3.69-1.2-4.54-2.88-.87-1.74-.78-3.95.27-5.59.88-1.39 2.45-2.26 4.1-2.22.42.01.84.07 1.25.17v3.08c-.41-.16-.85-.23-1.29-.21-1 .04-1.95.73-2.32 1.67-.39.99-.14 2.22.58 3.01.78.85 2.11 1.05 3.12.47 1-.57 1.46-1.74 1.43-2.89.03-3.97.01-7.94.02-11.91-.01-.01-.01-.02-.02-.02z"/>
                           </svg>
                         ) : 
                         fetchedUrl.includes('x.com') || fetchedUrl.includes('twitter.com') ? (
                           <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                             <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                           </svg>
                         ) : 
                         fetchedUrl.includes('linkedin.com') ? (
                          <svg className="w-3.5 h-3.5 fill-[#0077B5]" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                         ) : null}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 p-1.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 w-full sm:w-fit backdrop-blur-sm relative z-10 text-center items-center">
                    {!(fetchedUrl.includes('tiktok.com') || fetchedUrl.includes('linkedin.com')) && (
                      <button
                        onClick={() => setFormat('mp3')}
                        disabled={isDownloading}
                        className={`flex items-center justify-center gap-2 px-2 sm:px-6 py-3.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${format === 'mp3' ? 'bg-zinc-800 text-white shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'} disabled:opacity-50 w-full sm:w-auto`}
                      >
                        <Music className="w-4 h-4 shrink-0" /> <span className="truncate">MP3 Audio</span>
                      </button>
                    )}
                    <button
                      onClick={() => setFormat('mp4')}
                      disabled={isDownloading}
                      className={`flex items-center justify-center gap-2 px-2 sm:px-6 py-3.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${format === 'mp4' ? 'bg-zinc-800 text-white shadow-lg scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'} disabled:opacity-50 w-full sm:w-auto ${(fetchedUrl.includes('tiktok.com') || fetchedUrl.includes('linkedin.com')) ? 'col-span-2' : ''}`}
                    >
                      <Video className="w-4 h-4 shrink-0" /> <span className="truncate">MP4 Video</span>
                    </button>
                  </div>

                  <div className="mt-auto pt-4 relative z-10">
                     <button
                       onClick={handleDownload}
                       disabled={isDownloading}
                       className="w-full relative overflow-hidden group flex items-center justify-center gap-3 bg-white text-black font-extrabold text-lg px-6 py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl shadow-white/10 disabled:opacity-90 disabled:active:scale-100"
                     >
                        {!isDownloading ? (
                          <>
                            <span>Download {format.toUpperCase()}</span>
                            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full">
                            <span className="text-black font-bold flex items-center gap-2 z-20">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Downloading... {downloadedBytes > 0 ? `${downloadedMB} MB` : ""}
                            </span>
                            
                            <div className="absolute left-0 bottom-0 h-[4px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full custom-progress-bar" />
                          </div>
                        )}
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <p className="text-zinc-500 text-sm mt-8 text-center max-w-lg mb-8 bg-zinc-900/50 px-6 py-4 rounded-2xl border border-white/5">
          Disclaimer: Please respect copyright laws and only download content you have the right to. We do not store or host any videos.
        </p>
      </div>
      
      {/* Dynamic keyframe for an indeterminate loading bar mirroring the search bar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progressScale {
          0% { transform: scaleX(0); transform-origin: left; }
          45% { transform: scaleX(1); transform-origin: left; }
          50% { transform: scaleX(1); transform-origin: right; }
          95% { transform: scaleX(0); transform-origin: right; }
          100% { transform: scaleX(0); transform-origin: right; }
        }
        .custom-progress-bar {
          animation: progressScale 2.5s infinite ease-in-out;
        }
      `}} />
    </main>
  );
}
