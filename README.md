# AI Reel Generator

A full-stack application that generates AI-powered reels for social media using various external APIs.

## Features

- Generate various types of video content:
  - Talking Head Avatars (using D-ID API)
  - Stock Footage with Captions (using RunwayML API)
  - Animated Videos (using Pika Labs API)
  - Memes with Captions (using Canva API)
  - Voiceover Slideshows (using ElevenLabs API)

## Tech Stack

Frontend: Next.js 15, React 19, TailwindCSS 4
Backend: Next.js API Routes
APIs: D-ID, RunwayML, Pika Labs, Canva, ElevenLabs

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- API keys for the services you want to use

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-reel-maker.git
   cd ai-reel-maker
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env.local` file in the root directory with your API keys:
   ```
   # OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key_here
   
   # D-ID API Key (for talking head avatars)
   DID_API_KEY=your_did_api_key_here
   
   # RunwayML API Key (for stock footage generation)
   RUNWAY_API_KEY=your_runway_api_key_here
   
   # Pika Labs API Key (for animated videos)
   PIKA_API_KEY=your_pika_api_key_here
   
   # Canva API Key (for meme generation)
   CANVA_API_KEY=your_canva_api_key_here
   
   # ElevenLabs API Key (for voiceover)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   
   # Lightricks API Key (for video generation)
   LIGHTRICKS_API_KEY=your_lightricks_api_key_here
   
   # Llama API Key (for script generation)
   LLAMA_NEMOTRON=your_llama_api_key_here
   ```

5. Start the backend server:
   ```
   cd backend
   uvicorn main:app --reload
   ```

6. In a new terminal, start the frontend development server:
   ```
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### `/api/generateReel`

Generates a reel based on the provided text and format.

**Request:**
```json
{
  "text": "Your text description or script",
  "format": "Talking Head Avatar" | "Stock Footage with Captions" | "Animated Video" | "Meme with Captions" | "Voiceover Slideshow"
}
```

**Response:**
```json
{
  "status": "processing" | "completed" | "failed",
  "id": "generation_id",
  "message": "Status message",
  "videoUrl": "URL to the generated video (if available)",
  "imageUrl": "URL to the generated image (if available)",
  "format": "The format that was generated"
}
```

## Deployment

This project is ready for deployment on Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Configure environment variables in the Vercel dashboard
4. Deploy!

## License

MIT
