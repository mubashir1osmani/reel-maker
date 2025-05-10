"use client";

import { useState, useRef } from "react";
import Navbar from "./nav";

export default function Hero() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"video" | "text" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const handleGenerate = async () => {
    setLoading(true);
    setVideoUrl(""); // Clear previous video
    setTextResponse(""); // Clear previous text response
    setResponseType(null);
    setError(null);
    
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: topic }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.detail || res.statusText || "An unknown error occurred";
        console.error("API Error:", errorMessage);
        setError(`Error: ${errorMessage}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      
      // Check if the response contains a text_response field (direct text response)
      if (data.text_response) {
        setTextResponse(data.text_response);
        setResponseType("text");
      } else if (data.video_url) {
        // It's a video URL
        setVideoUrl(data.video_url);
        setResponseType("video");
      }
    } catch (err) {
      console.error("Request failed:", err);
      setError(`Error: Could not connect to the server. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setVideoVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value / 100;
    }
  };

  // Handle playback speed change
  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setPlaybackSpeed(value);
    if (videoRef.current) {
      videoRef.current.playbackRate = value;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-3">
            <span role="img" aria-label="film projector" className="mr-2">🎥</span>
            AI Reel Maker
          </h1>
          <p className="text-lg text-gray-300">Create videos or get detailed text responses from your prompts</p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-5">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-12 rounded-full text-xl uppercase tracking-wider"
            >
              LATEEEEE
            </button>
          </div>
          
          <h2 className="text-2xl font-bold mb-4 px-4">Insert footage / prompt</h2>
          
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Left Column - Prompt and Response */}
            <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col lg:w-1/2 h-full border border-gray-700">
              <div className="bg-gray-900 p-4">
                <h3 className="text-gray-300 font-medium">Enter Prompt</h3>
              </div>

              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-700">
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-28 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your prompt here..."
                    disabled={loading}
                  />
                  
                  <button
                    onClick={handleGenerate}
                    className={`w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {responseType === "video" ? "Generating Video..." : "Processing..."}
                      </>
                    ) : (
                      "Generate Response"
                    )}
                  </button>
                </div>
                
                {error && (
                  <div className="m-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded-lg">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </p>
                  </div>
                )}
                
                <div className="p-4 flex-grow overflow-auto">
                  <h4 className="text-gray-300 font-medium mb-2">Response</h4>
                  <div className="bg-gray-700 rounded-lg p-4 h-full overflow-auto">
                    {responseType === "text" && textResponse ? (
                      <div className="text-gray-200 whitespace-pre-wrap">
                        {textResponse}
                      </div>
                    ) : (
                      <div className="text-gray-400 flex items-center justify-center h-full">
                        <p>Response will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Video Editor */}
            <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg flex flex-col lg:w-1/2 h-full border border-gray-700">
              <div className="bg-gray-900 p-4">
                <h3 className="text-gray-300 font-medium">Video Editor</h3>
              </div>

              <div className="p-4 flex-grow flex flex-col">
                <div className="flex-grow flex items-center justify-center bg-gray-700 rounded-lg overflow-hidden mb-4">
                  {responseType === "video" && videoUrl ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="relative rounded-lg overflow-hidden shadow-md flex-grow">
                        <video 
                          ref={videoRef}
                          className="w-full h-full object-contain" 
                          controls 
                          autoPlay 
                          loop
                          src={videoUrl}
                          style={{ maxHeight: "100%" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 p-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p>Generate a video from the prompt to see it here</p>
                    </div>
                  )}
                </div>
                
                {/* Video Editor Controls */}
                <div className={`bg-gray-700 rounded-lg p-4 ${responseType === "video" ? "" : "opacity-50"}`}>
                  <h4 className="text-gray-300 font-medium mb-3">Edit Controls</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Volume</label>
                      <div className="flex items-center">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={videoVolume}
                          onChange={handleVolumeChange}
                          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          disabled={!videoUrl}
                        />
                        <span className="ml-2 text-gray-400 w-8 text-right">{videoVolume}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Playback Speed</label>
                      <select 
                        className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg block w-full p-2.5"
                        value={playbackSpeed}
                        onChange={handlePlaybackSpeedChange}
                        disabled={!videoUrl}
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-between">
                      <button 
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-gray-300 rounded-lg disabled:opacity-50"
                        disabled={!videoUrl}
                      >
                        Trim Video
                      </button>
                      
                      <button 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                        disabled={!videoUrl}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Powered by advanced AI models • For demonstration purposes only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
