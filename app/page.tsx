"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/nav";
import { toast } from 'sonner';

export default function Home() {
  // General state
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Regular video generation
  const [videoUrl, setVideoUrl] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [responseType, setResponseType] = useState<"video" | "text" | "reel" | null>(null);
  
  // Reel generation state
  const [voiceScript, setVoiceScript] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [reelUrl, setReelUrl] = useState<string | null>(null);
  
  // B-roll upload
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [uploadedVideoUrls, setUploadedVideoUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for reel job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/reel-status/${jobId}`);
        
        if (!res.ok) {
          clearInterval(interval);
          toast.error("Failed to fetch job status")
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

  // Handle regular video generation
  const handleGenerate = async () => {
    if (!topic) {
      toast.error("Please enter a prompt")
      return;
    }

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

  // Handle reel generation
  const handleGenerateReel = async () => {
    if (!topic) {
      toast.error("Please enter a video prompt")
      return;
    }
    
    setLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setReelUrl(null);
    setResponseType("reel");
    
    try {
      const requestBody = { prompt: topic };
  
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
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus(data.status);
    } catch (err) {
      console.error("Request failed:", err);
      setError("Could not connect to the server. Please try again later.");
      setLoading(false);
    }
  };

  // Handle B-roll video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newVideos = Array.from(e.target.files);
      setUploadedVideos(prev => [...prev, ...newVideos]);
      
      // Create URLs for the uploaded videos
      const newVideoUrls = newVideos.map(video => URL.createObjectURL(video));
      setUploadedVideoUrls(prev => [...prev, ...newVideoUrls]);
    }
  };

  // Remove uploaded video
  const removeUploadedVideo = (index: number) => {
    const newVideos = [...uploadedVideos];
    const newVideoUrls = [...uploadedVideoUrls];
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(newVideoUrls[index]);
    
    newVideos.splice(index, 1);
    newVideoUrls.splice(index, 1);
    
    setUploadedVideos(newVideos);
    setUploadedVideoUrls(newVideoUrls);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Render job status message
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
        message = "Generating video...";
        percentage = 30;
        break;
      case 'generating_voiceover':
        message = "Creating voiceover...";
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
    <main className="min-h-screen">
      {/* Hero section */}
      <div className="bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                <span role="img" aria-label="film projector" className="mr-2">🎥</span>
                AI Reel Maker
              </h1>
              <p className="text-lg text-gray-600">Create professional videos and Instagram reels with AI</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="mb-6">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">Video Prompt</label>
                <textarea
                  id="prompt"
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your prompt (e.g., 'Generate a video of mountains' or 'Create an Instagram reel about coffee brewing')"
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
              
              {/* Upload B-roll videos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Upload B-roll Videos (Optional)</label>
                  <span className="text-xs text-gray-500">{uploadedVideos.length} videos uploaded</span>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                
                <div 
                  onClick={triggerFileInput}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition duration-150"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drag and drop video files here, or click to select files
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports MP4, MOV, and other common video formats
                  </p>
                </div>
              </div>
              
              {/* Display uploaded videos */}
              {uploadedVideoUrls.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded B-roll Videos:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {uploadedVideoUrls.map((videoUrl, index) => (
                      <div key={index} className="relative">
                        <video 
                          className="h-32 w-full object-cover rounded-lg border border-gray-300" 
                          src={videoUrl}
                          controls
                        />
                        <button
                          onClick={() => removeUploadedVideo(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          title="Remove video"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleGenerate}
                  className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-lg font-semibold transition duration-150 ease-in-out flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  {loading && !jobId ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Video...
                    </>
                  ) : (
                    "Generate Video"
                  )}
                </button>
                
                <button
                  onClick={handleGenerateReel}
                  className={`bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white px-6 py-4 rounded-lg font-semibold transition duration-150 ease-in-out flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  {loading && responseType === "reel" ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Reel...
                    </>
                  ) : (
                    "Create Instagram Reel"
                  )}
                </button>
              </div>

              {/* Status message for reel generation */}
              {renderStatusMessage()}

              {/* Error messages */}
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

              {/* Display regular video output */}
              {responseType === "video" && videoUrl && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Your Generated Video:</h3>
                  <div className="relative rounded-lg overflow-hidden shadow-md aspect-video">
                    <video 
                      className="w-full h-full object-cover" 
                      controls 
                      autoPlay 
                      loop
                      src={videoUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-sm text-gray-500">Video generated successfully!</p>
                    <a 
                      href={videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                      download
                    >
                      Download Video
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* Display reel output */}
              {reelUrl && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Your Instagram Reel:</h3>
                  <div className="relative rounded-lg overflow-hidden shadow-md aspect-[9/16]">
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

              {/* Display text response */}
              {responseType === "text" && textResponse && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">AI Response:</h3>
                  <div className="bg-gray-50 rounded-lg p-6 shadow-md">
                    <div className="prose prose-indigo max-w-none">
                      <p className="whitespace-pre-wrap text-gray-700">{textResponse}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Powered by advanced AI models • For demonstration purposes only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Powerful Video Generation Features</h2>
            <p className="text-lg text-gray-600">Create professional videos in seconds with our advanced AI tools</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-50 p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Text-to-Video</h3>
              <p className="text-gray-600">Transform your text descriptions into stunning videos with our advanced AI models.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">High Performance</h3>
              <p className="text-gray-600">Generate videos in seconds, not hours. Our system is optimized for speed and quality.</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">HD Quality</h3>
              <p className="text-gray-600">Our videos are generated in high definition, ensuring crisp and professional results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="md:flex md:justify-between">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center">
                <span role="img" aria-label="movie camera" className="text-2xl mr-2">
                  🎬
                </span>
                <span className="font-bold text-xl">AI Reel Maker</span>
              </div>
              <p className="mt-2 text-gray-400 max-w-xs">
                Transforming text descriptions into stunning videos with the power of AI.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                  Product
                </h3>
                <ul className="space-y-2">
                  <li><Link href="#features" className="text-gray-300 hover:text-white">Features</Link></li>
                  <li><Link href="#" className="text-gray-300 hover:text-white">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                  Company
                </h3>
                <ul className="space-y-2">
                  <li><Link href="#about" className="text-gray-300 hover:text-white">About</Link></li>
                  <li><Link href="#" className="text-gray-300 hover:text-white">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                  Legal
                </h3>
                <ul className="space-y-2">
                  <li><Link href="#" className="text-gray-300 hover:text-white">Privacy</Link></li>
                  <li><Link href="#" className="text-gray-300 hover:text-white">Terms</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} AI Reel Maker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}