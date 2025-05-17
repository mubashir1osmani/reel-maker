"use client";

import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">AI Reel Generator</h1>
        <p className="text-xl text-gray-600">
          Create professional-quality reels for social media with AI
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Enter your text description or script</li>
            <li>Choose a video format that suits your needs</li>
            <li>Our AI generates your custom reel</li>
            <li>Download and share on your favorite platforms</li>
          </ol>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Supported Formats</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-700">
            <li>Talking Head Avatars</li>
            <li>Stock Footage with Captions</li>
            <li>Animated Videos</li>
            <li>Memes with Captions</li>
            <li>Voiceover Slideshows</li>
          </ul>
        </div>
      </div>
      
      <div className="text-center">
        <Link 
          href="/generate" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-colors"
        >
          Create Your Reel Now
        </Link>
      </div>
    </div>
  );
}