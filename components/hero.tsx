"use client";

import { useState } from "react";
import Navbar from "./nav";

export default function Hero() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"video" | "text" | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              <span role="img" aria-label="film projector" className="mr-2">🎥</span>
              AI Reel Maker
            </h1>
            <p className="text-lg text-gray-600">Create videos or get detailed text responses from your prompts</p>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="mb-6">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">Your Prompt</label>
              <textarea
                id="prompt"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your prompt (e.g., 'Generate a video of mountains' or 'What is artificial intelligence?')"
                disabled={loading}
              />
            </div>
            
            <button
              onClick={handleGenerate}
              className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-lg font-semibold transition duration-150 ease-in-out flex items-center justify-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  >
                    View in full screen
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

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
  );
}
