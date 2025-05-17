'use client';

import { useState, useEffect } from 'react';
import { VideoFormat } from '../api/generateReel/route';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

// Define the type for the result
interface ReelResult {
  status: 'processing' | 'completed' | 'failed';
  id?: string;
  message?: string;
  videoUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  format?: VideoFormat;
  error?: string;
}

export default function GeneratePage() {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<VideoFormat>(VideoFormat.TALKING_HEAD);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ReelResult | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Clean up polling interval when component unmounts
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Start polling for status updates
  const startPolling = (id: string, format: VideoFormat) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Set up new polling interval
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/checkStatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, format }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check status');
        }

        setResult(data);

        // Stop polling if the generation is complete or failed
        if (data.status === 'completed' || data.status === 'failed') {
          if (data.status === 'completed') {
            toast.success('Reel generation completed!');
          } else {
            toast.error(`Generation failed: ${data.error || 'Unknown error'}`);
          }
          clearInterval(interval);
          setPollingInterval(null);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        toast.error('Failed to check generation status');
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 5000); // Poll every 5 seconds

    setPollingInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter a text description or script');
      return;
    }
    
    setIsGenerating(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/generateReel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, format }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reel');
      }
      
      setResult(data);
      toast.success('Reel generation initiated!');
      
      // Start polling for status updates if we have an ID and the status is processing
      if (data.id && data.status === 'processing') {
        startPolling(data.id, format);
      }
    } catch (error) {
      console.error('Error generating reel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate reel');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Generate AI Reel</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium mb-2">
            Text Description or Script
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your text description or script here..."
            required
          />
        </div>
        
        <div>
          <label htmlFor="format" className="block text-sm font-medium mb-2">
            Video Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as VideoFormat)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value={VideoFormat.TALKING_HEAD}>Talking Head Avatar</option>
            <option value={VideoFormat.STOCK_FOOTAGE}>Stock Footage with Captions</option>
            <option value={VideoFormat.ANIMATED_VIDEO}>Animated Video</option>
            <option value={VideoFormat.MEME}>Meme with Captions</option>
            <option value={VideoFormat.VOICEOVER}>Voiceover Slideshow</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="small" />
              <span>Generating...</span>
            </div>
          ) : (
            'Generate Reel'
          )}
        </button>
      </form>
      
      {result && (
        <div className="mt-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Result</h2>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                result.status === 'completed' ? 'bg-green-100 text-green-800' :
                result.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {result.status === 'completed' ? 'Completed' :
                 result.status === 'failed' ? 'Failed' : 'Processing'}
              </span>
              {result.status === 'processing' && <LoadingSpinner size="small" />}
            </div>
            
            {result.id && (
              <p><strong>ID:</strong> {result.id}</p>
            )}
            
            {result.message && (
              <p><strong>Message:</strong> {result.message}</p>
            )}
            
            {result.error && (
              <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
            )}
            
            {result.videoUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Video</h3>
                <video 
                  src={result.videoUrl} 
                  controls 
                  className="w-full rounded-md"
                />
              </div>
            )}
            
            {result.imageUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Image</h3>
                <img 
                  src={result.imageUrl} 
                  alt="Generated content" 
                  className="w-full rounded-md"
                />
              </div>
            )}
            
            {result.audioUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Audio</h3>
                <audio 
                  src={result.audioUrl} 
                  controls 
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 