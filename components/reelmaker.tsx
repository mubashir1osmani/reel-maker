"use client";

import { useState } from "react";
import Navbar from "./nav";
import {toast} from 'sonner';
import Image from "next/image";

export default function ReelMaker() {
  const [videoPrompt, setVideoPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reelUrl, setReelUrl] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("fal_ai");
  const [generationType, setGenerationType] = useState<"video" | "image">("video");
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5);
  const [imageResult, setImageResult] = useState<{status: string, response?: Record<string, unknown>, image_url?: string} | null>(null);

  const handleGenerateReel = async () => {
    if (!videoPrompt) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setLoading(true);
    setError(null);
    setReelUrl(null);
    setScript(null);
    setImageResult(null);
    
    try {
      if (generationType === "image") {
        // Handle image generation
        const res = await fetch("/api/image", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: videoPrompt }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          const errorMessage = errorData.error || res.statusText || "An unknown error occurred";
          console.error("Image API Error:", errorMessage);
          toast.error(errorMessage);
          setError(errorMessage);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setImageResult(data);
        toast.success("Image generated successfully!");
        
      } else {
        // Handle video generation (existing logic)
        const requestBody = { 
          prompt: videoPrompt,
          duration: videoDuration,
          model: selectedModel
        };
        
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errorData = await res.json();
          const errorMessage = errorData.error || res.statusText || "An unknown error occurred";
          console.error("API Error:", errorMessage);
          toast.error(errorMessage);
          setError(errorMessage);
          setLoading(false);
          return;
        }

        const data = await res.json();
        
        if (data.status === 'completed' && data.video_url) {
          setReelUrl(data.video_url);
          setScript(data.script);
          toast.success("Video generated successfully!");
        } else if (data.status === 'failed') {
          const errorMsg = data.error || "Video generation failed";
          setError(errorMsg);
          toast.error(errorMsg);
        } else {
          setError("Unexpected response from server");
          toast.error("Unexpected response from server");
        }
      }
      
    } catch (err) {
      console.error("Request failed:", err);
      const errorMsg = `Failed to generate ${generationType}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              <span role="img" aria-label="magic" className="mr-2">✨</span>
              AI Content Generator
            </h1>
            <p className="text-lg text-gray-600">Create stunning images and animated videos with AI in seconds</p>
            <div className="mt-4">
              <a href="/instagram-reels/editor" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Need to edit an existing video? Use our Timeline Editor →
              </a>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="mb-6">
              <label htmlFor="generation-type" className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
              <select
                id="generation-type"
                value={generationType}
                onChange={(e) => setGenerationType(e.target.value as "video" | "image")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="video">Video Generation</option>
                <option value="image">Image Generation</option>
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="video-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                {generationType === "video" ? "Video Prompt" : "Image Prompt"}
              </label>
              <textarea
                id="video-prompt"
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={generationType === "video" 
                  ? "Describe the animated video you want to generate (e.g., 'A serene mountain lake with reflections of snow-capped peaks', 'A futuristic city with flying cars')"
                  : "Describe the image you want to generate (e.g., 'A beautiful sunset over mountains', 'A futuristic cityscape at night')"
                }
                disabled={loading}
              />
              {generationType === "video" && (
                <p className="text-xs text-gray-500 mt-1">
                  You can select the video duration (5 or 10 seconds) and AI model below.
                </p>
              )}
            </div>

            {generationType === "video" && (
              <div className="mb-6">
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="fal_ai">LumaAI (Dream Machine)</option>
                  <option value="replicate">Replicate (Google Veo-2)</option>
                  <option value="runwayml">RunwayML (Stable Video Diffusion)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Currently using mock responses for development. Add API keys to .env.local for production.
                </p>
              </div>
            )}
            
            {generationType === "video" && (
              <div className="mb-6">
                <label htmlFor="duration-select" className="block text-sm font-medium text-gray-700 mb-2">Video Duration</label>
                <select
                  id="duration-select"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(Number(e.target.value) as 5 | 10)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Longer videos may take more time to generate.
                </p>
              </div>
            )}
            
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
                  Generating {generationType}...
                </>
              ) : (
                `Generate ${generationType === "video" ? "Animated Video" : "AI Image"}`
              )}
            </button>

            {script && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Generated Script:</h4>
                <p className="text-blue-800 text-sm">{script}</p>
              </div>
            )}

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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Animated Video:</h3>
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
                  <p className="text-sm text-gray-500">Video generated successfully! ({videoDuration} seconds)</p>
                  <a 
                    href={reelUrl} 
                    download
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    Download Video
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {imageResult && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Generated Image:</h3>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h4 className="mt-4 text-lg font-medium text-gray-900">Image Generation Response</h4>
                    <p className="mt-2 text-sm text-gray-500">Status: {imageResult.status}</p>
                    
                    {imageResult.response && (
                      <div className="mt-4 max-w-md mx-auto">
                        <div className="bg-white p-4 rounded-lg border text-left text-sm">
                          <h5 className="font-medium text-gray-900 mb-2">API Response:</h5>
                          <pre className="whitespace-pre-wrap text-gray-700 text-xs overflow-auto max-h-48">
                            {JSON.stringify(imageResult.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {imageResult.image_url && (
                      <div className="mt-4">
                        <Image
                          width={600}
                          height={400}
                          loading="lazy" 
                          src={imageResult.image_url} 
                          alt="Generated image"
                          className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">Image API response received!</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(imageResult, null, 2))}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    Copy Response
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Powered by AI • Create stunning images and animated videos in seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
}