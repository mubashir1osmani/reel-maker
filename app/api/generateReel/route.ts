import { NextRequest, NextResponse } from 'next/server';

// Define supported video formats
export enum VideoFormat {
  TALKING_HEAD = "Talking Head Avatar",
  STOCK_FOOTAGE = "Stock Footage with Captions",
  ANIMATED_VIDEO = "Animated Video",
  MEME = "Meme with Captions",
  VOICEOVER = "Voiceover Slideshow"
}

// Define the request body interface
interface GenerateReelRequest {
  text: string;
  format: VideoFormat;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as GenerateReelRequest;
    const { text, format } = body;
    
    // Validate the request
    if (!text || !format) {
      return NextResponse.json(
        { error: "Missing required fields: text and format" },
        { status: 400 }
      );
    }
    
    // Route to the appropriate API based on format
    let result;
    switch (format) {
      case VideoFormat.TALKING_HEAD:
        result = await generateTalkingHead(text);
        break;
      case VideoFormat.STOCK_FOOTAGE:
        result = await generateStockFootage(text);
        break;
      case VideoFormat.ANIMATED_VIDEO:
        result = await generateAnimatedVideo(text);
        break;
      case VideoFormat.MEME:
        result = await generateMeme(text);
        break;
      case VideoFormat.VOICEOVER:
        result = await generateVoiceover(text);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported video format" },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating reel:", error);
    return NextResponse.json(
      { error: "Failed to generate reel" },
      { status: 500 }
    );
  }
}

// D-ID API for talking head avatars
async function generateTalkingHead(text: string) {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) {
    throw new Error("D-ID API key not configured");
  }
  
  try {
    const response = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        script: {
          type: "text",
          input: text
        },
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f_us_001/image.jpeg",
        config: {
          fluent: true,
          pad_audio: 0
        }
      })
    });
    
    const data = await response.json();
    
    // Return the ID for polling
    return {
      id: data.id,
      status: "processing",
      format: VideoFormat.TALKING_HEAD
    };
  } catch (error) {
    console.error("D-ID API error:", error);
    throw new Error("Failed to generate talking head avatar");
  }
}

// RunwayML API for stock footage with captions
async function generateStockFootage(text: string) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    throw new Error("RunwayML API key not configured");
  }
  
  try {
    const response = await fetch("https://api.runwayml.com/v1/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gen-2",
        prompt: text,
        num_frames: 120,
        fps: 24,
        negative_prompt: "Bad quality, blurry, low resolution",
        guidance_scale: 7.5,
        num_inference_steps: 50
      })
    });
    
    const data = await response.json();
    
    return {
      id: data.id,
      status: "processing",
      format: VideoFormat.STOCK_FOOTAGE
    };
  } catch (error) {
    console.error("RunwayML API error:", error);
    throw new Error("Failed to generate stock footage");
  }
}

// Pika Labs API for animated videos
async function generateAnimatedVideo(text: string) {
  // Note: Pika Labs API access requires special access
  // This is a placeholder implementation
  const apiKey = process.env.PIKA_API_KEY;
  if (!apiKey) {
    throw new Error("Pika Labs API key not configured");
  }
  
  try {
    // In a real implementation, we would make an API call to Pika Labs
    console.log(`Generating animated video with text: ${text}`);
    
    // Generate a unique ID for status tracking
    const id = generateUniqueId();
    
    // Placeholder response until API access is available
    return {
      id: id,
      status: "processing",
      message: "Animated video generation initiated with prompt: " + text.substring(0, 30) + "...",
      format: VideoFormat.ANIMATED_VIDEO
    };
  } catch (error) {
    console.error("Pika Labs API error:", error);
    throw new Error("Failed to generate animated video");
  }
}

// Canva API for meme generation
async function generateMeme(text: string) {
  const apiKey = process.env.CANVA_API_KEY;
  if (!apiKey) {
    throw new Error("Canva API key not configured");
  }
  
  try {
    // Placeholder implementation - Canva API integration would go here
    // Using the text parameter to create a meme with the provided text
    console.log(`Creating meme with text: ${text}`);
    
    // Generate a unique ID for status checking
    const id = generateUniqueId();
    
    return {
      id: id,
      status: "processing", // Change to processing so status checking works
      imageUrl: "https://placeholder.com/meme-image.jpg",
      message: "Generated meme with text: " + text.substring(0, 30) + "...",
      format: VideoFormat.MEME
    };
  } catch (error) {
    console.error("Canva API error:", error);
    throw new Error("Failed to generate meme");
  }
}

// ElevenLabs API for voiceover generation
async function generateVoiceover(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }
  
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    // In a real implementation, you would save this audio file
    // and combine it with images for a slideshow
    console.log(`Generated voiceover for text: ${text.substring(0, 50)}...`);
    
    // Generate a unique ID that includes a timestamp for status checking
    const id = generateUniqueId();
    
    return {
      id: id,
      status: "processing",
      message: "Voiceover generation initiated for text: " + text.substring(0, 30) + "...",
      format: VideoFormat.VOICEOVER
    };
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    throw new Error("Failed to generate voiceover");
  }
}

// Helper function to generate a unique ID
function generateUniqueId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
  return `${timestamp}-${randomPart}`;
} 