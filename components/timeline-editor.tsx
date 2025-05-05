"use client";

import React, { useState, useRef, useEffect } from "react";

interface TimelineEditorProps {
  videoSrc: string;
  onSave: (editedVideo: { 
    trimStart: number; 
    trimEnd: number; 
    audioTrack: File | null;
    audioVolume: number;
    videoVolume: number;
  }) => void;
}

export default function TimelineEditor({ videoSrc, onSave }: TimelineEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(duration);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioTrack, setAudioTrack] = useState<File | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(100);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load video metadata and set initial values
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoSrc]);

  // Update current time while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop video between trim points
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      } else if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [trimStart, trimEnd]);

  // Handle audio file upload and preview
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioTrack(file);
      
      // Create audio preview URL
      const url = URL.createObjectURL(file);
      setAudioPreview(url);
      
      // Clean up previous URL to avoid memory leaks
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  };

  // Sync audio with video
  useEffect(() => {
    if (!audioRef.current || !videoRef.current) return;
    
    if (isPlaying) {
      audioRef.current.currentTime = videoRef.current.currentTime - trimStart;
      audioRef.current.play().catch(err => console.error("Audio play error:", err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, trimStart]);

  // Apply volume settings
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume / 100;
    }
    if (audioRef.current) {
      audioRef.current.volume = audioVolume / 100;
    }
  }, [videoVolume, audioVolume]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      // Ensure we're at trim start when we begin
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play().catch(err => console.error("Video play error:", err));
    }
    
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    onSave({
      trimStart,
      trimEnd,
      audioTrack,
      audioVolume,
      videoVolume
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Timeline Editor</h2>
      
      {/* Video preview */}
      <div className="relative rounded-lg overflow-hidden shadow-md aspect-video mb-6">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover" 
          src={videoSrc}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          Your browser does not support the video tag.
        </video>
        
        {audioPreview && (
          <audio 
            ref={audioRef} 
            src={audioPreview}
            loop
            style={{ display: 'none' }}
          />
        )}
      </div>
      
      {/* Playback controls */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={togglePlayPause}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      
      {/* Current time display */}
      <div className="text-center mb-4">
        <span className="text-gray-700 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      
      {/* Timeline slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timeline Position
        </label>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const newTime = parseFloat(e.target.value);
            setCurrentTime(newTime);
            if (videoRef.current) {
              videoRef.current.currentTime = newTime;
            }
          }}
          className="w-full accent-indigo-600"
        />
      </div>
      
      {/* Trim controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trim Start: {formatTime(trimStart)}
          </label>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={trimStart}
            onChange={(e) => {
              const newStart = parseFloat(e.target.value);
              if (newStart < trimEnd - 0.5) {
                setTrimStart(newStart);
                if (videoRef.current && videoRef.current.currentTime < newStart) {
                  videoRef.current.currentTime = newStart;
                }
              }
            }}
            className="w-full accent-indigo-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trim End: {formatTime(trimEnd)}
          </label>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={trimEnd}
            onChange={(e) => {
              const newEnd = parseFloat(e.target.value);
              if (newEnd > trimStart + 0.5) {
                setTrimEnd(newEnd);
                if (videoRef.current && videoRef.current.currentTime > newEnd) {
                  videoRef.current.currentTime = trimStart;
                }
              }
            }}
            className="w-full accent-indigo-600"
          />
        </div>
      </div>
      
      {/* Music upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Music
        </label>
        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
        {audioTrack && (
          <p className="mt-1 text-sm text-gray-500">
            Selected: {audioTrack.name}
          </p>
        )}
      </div>
      
      {/* Volume controls */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Video Volume: {videoVolume}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={videoVolume}
            onChange={(e) => setVideoVolume(parseInt(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Music Volume: {audioVolume}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={audioVolume}
            onChange={(e) => setAudioVolume(parseInt(e.target.value))}
            className="w-full accent-indigo-600"
            disabled={!audioTrack}
          />
        </div>
      </div>
      
      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-150 ease-in-out"
      >
        Save Edits
      </button>
    </div>
  );
}