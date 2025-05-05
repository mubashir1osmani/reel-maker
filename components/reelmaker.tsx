"use client";

import { useState, useEffect } from "react";
import Navbar from "./nav";
import {toast} from 'sonner';

export default function ReelMaker() {
  const [videoPrompt, setVideoPrompt] = useState("");
  const [voiceScript, setVoiceScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState(null);
  const [reelUrl, setReelUrl] = useState<string | null>(null);

  // Poll for job status if we have a job ID
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/reel-status/${jobId}`);
        
        if (!res.ok) {
          clearInterval(interval);
          toast.error("Failed to fetch job status");
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        setJobStatus(data.status);
        
        // If job is completed, stop polling and set download URL
        if (data.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          setReelUrl(`http://localhost:8000/download-reel/${jobId}`);
        }
        
        // If job failed, stop polling and show error
        if (data.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          setError(data.error || "Reel generation failed");
        }
      } catch (err) {
        console.error("Error polling job status:", err);
        clearInterval(interval);
        setLoading(false);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobId]);

  const handleGenerateReel = async () => {
    if (!videoPrompt) {
      toast.error("Please enter a video prompt");
      return;
    }
    
    setLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setReelUrl(null);
    
    try {
      const requestBody = { prompt: videoPrompt };
      
      const res = await fetch("http://localhost:8000/generate-reel", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.detail || res.statusText || "An unknown error occurred";
        console.error("API Error:", errorMessage);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus(data.status);
    } catch (err) {
      console.error("Request failed:", err);
      setLoading(false);
    }
  };

  const renderStatusMessage = () => {
    if (!jobStatus) return null;
    
    let message = "";
    let percentage = 0;
    
    switch (jobStatus) {
      case 'queued':
        message = "Waiting in queue...";
        percentage = 10;
        break;
      case 'generating_video':
        message = "Generating video with RunwayML...";
        percentage = 30;
        break;
      case 'generating_voiceover':
        message = "Creating voiceover with ElevenLabs...";
        percentage = 60;
        break;
      case 'processing_ffmpeg':
        message = "Adding subtitles and finalizing...";
        percentage = 85;
        break;
      case 'completed':
        message = "Reel generation completed!";
        percentage = 100;
        break;
      case 'failed':
        message = "Reel generation failed";
        percentage = 100;
        break;
      default:
        message = `Status: ${jobStatus}`;
        percentage = 50;
    }
    
    return (
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{message}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${jobStatus === 'failed' ? 'bg-red-600' : 'bg-indigo-600'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              <span role="img" aria-label="camera" className="mr-2">📱</span>
              Instagram Reel Maker
            </h1>
            <p className="text-lg text-gray-600">Create professional Instagram reels with AI</p>
            <div className="mt-4">
              <a href="/instagram-reels/editor" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Need to edit an existing video? Use our Timeline Editor →
              </a>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="mb-6">
              <label htmlFor="video-prompt" className="block text-sm font-medium text-gray-700 mb-2">Video Prompt</label>
              <textarea
                id="video-prompt"
                rows={3}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the video you want to generate (e.g., 'A serene mountain lake with reflections of snow-capped peaks')"
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="voice-script" className="block text-sm font-medium text-gray-700 mb-2">
                Voice Script (Optional)
              </label>
              <textarea
                id="voice-script"
                rows={3}
                value={voiceScript}
                onChange={(e) => setVoiceScript(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Text to be spoken in the voiceover (if left empty, a default script will be generated)"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={handleGenerateReel}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-lg font-semibold transition duration-150 ease-in-out flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Reel...
                </>
              ) : (
                "Generate Instagram Reel"
              )}
            </button>

            {renderStatusMessage()}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {reelUrl && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Instagram Reel:</h3>
                <div className="relative rounded-lg overflow-hidden shadow-md aspect-video">
                  <video 
                    className="w-full h-full object-cover" 
                    controls 
                    autoPlay 
                    loop
                    src={reelUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">Reel generated successfully!</p>
                  <a 
                    href={reelUrl} 
                    download
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    Download Reel
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Powered by RunwayML, ElevenLabs, and FFmpeg • For demonstration purposes only</p>
          </div>
        </div>
      </div>
    </div>
  );
}