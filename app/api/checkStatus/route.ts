import { NextRequest, NextResponse } from 'next/server';
import { VideoFormat } from '../generateReel/route';

interface CheckStatusRequest {
  id: string;
  format: VideoFormat;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json() as CheckStatusRequest;
    const { id, format } = body;
    
    // Validate the request
    if (!id || !format) {
      return NextResponse.json(
        { error: "Missing required fields: id and format" },
        { status: 400 }
      );
    }
    
    // Check status based on the format
    let result;
    switch (format) {
      case VideoFormat.TALKING_HEAD:
        result = await checkTalkingHeadStatus(id);
        break;
      case VideoFormat.STOCK_FOOTAGE:
        result = await checkStockFootageStatus(id);
        break;
      case VideoFormat.ANIMATED_VIDEO:
        result = await checkAnimatedVideoStatus(id);
        break;
      case VideoFormat.MEME:
        result = await checkMemeStatus(id);
        break;
      case VideoFormat.VOICEOVER:
        result = await checkVoiceoverStatus(id);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported video format" },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

// Check D-ID API status
async function checkTalkingHeadStatus(id: string) {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) {
    throw new Error("D-ID API key not configured");
  }
  
  try {
    const response = await fetch(`https://api.d-id.com/talks/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    
    const data = await response.json();
    
    if (data.status === "done") {
      return {
        status: "completed",
        videoUrl: data.result_url,
        message: "Talking head generation completed"
      };
    } else if (data.status === "error") {
      return {
        status: "failed",
        error: data.error || "Unknown error",
        message: "Talking head generation failed"
      };
    } else {
      return {
        status: "processing",
        message: "Talking head generation in progress"
      };
    }
  } catch (error) {
    console.error("D-ID API status check error:", error);
    throw new Error("Failed to check talking head status");
  }
}

// Check RunwayML API status
async function checkStockFootageStatus(id: string) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    throw new Error("RunwayML API key not configured");
  }
  
  try {
    const response = await fetch(`https://api.runwayml.com/v1/generations/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    
    const data = await response.json();
    
    if (data.status === "completed") {
      return {
        status: "completed",
        videoUrl: data.output.video_url,
        message: "Stock footage generation completed"
      };
    } else if (data.status === "failed") {
      return {
        status: "failed",
        error: data.error || "Unknown error",
        message: "Stock footage generation failed"
      };
    } else {
      return {
        status: "processing",
        message: "Stock footage generation in progress"
      };
    }
  } catch (error) {
    console.error("RunwayML API status check error:", error);
    throw new Error("Failed to check stock footage status");
  }
}

// Check Pika Labs API status (placeholder)
async function checkAnimatedVideoStatus(id: string) {
  // Placeholder implementation - would need actual Pika Labs API access
  console.log(`Checking status for animated video with ID: ${id}`);
  
  // For demonstration, simulate a status based on time passed
  // This approach at least gives consistent behavior for the same ID
  const timestamp = parseInt(id.split('-')[0] || '0', 10);
  const secondsElapsed = (Date.now() - timestamp) / 1000;
  
  // Complete after 20 seconds, fail after 30 seconds if not completed
  let simulatedStatus;
  if (secondsElapsed < 20) {
    simulatedStatus = "processing";
  } else if (secondsElapsed < 30) {
    simulatedStatus = "completed";
  } else {
    simulatedStatus = "failed";
  }
  
  if (simulatedStatus === "completed") {
    return {
      status: "completed",
      videoUrl: "https://placeholder.com/video.mp4",
      message: "Animated video generation completed"
    };
  } else if (simulatedStatus === "failed") {
    return {
      status: "failed",
      error: "Generation failed",
      message: "Animated video generation failed"
    };
  } else {
    return {
      status: "processing",
      message: "Animated video generation in progress"
    };
  }
}

// Check Canva API status for meme generation
async function checkMemeStatus(id: string) {
  const apiKey = process.env.CANVA_API_KEY;
  if (!apiKey) {
    throw new Error("Canva API key not configured");
  }
  
  try {
    // In a real implementation, you would call the Canva API to check the status
    // For now, we'll simulate a status check using the ID
    
    // Use the ID to determine status (for demo purposes)
    // In a real implementation, you would make an API call to Canva
    const lastChar = id.slice(-1);
    const charCode = lastChar.charCodeAt(0);
    
    // Simulate different statuses based on the ID
    if (charCode % 3 === 0) {
      return {
        status: "processing",
        message: "Meme generation in progress",
        id: id
      };
    } else if (charCode % 3 === 1) {
      return {
        status: "completed",
        imageUrl: "https://placeholder.com/meme-image.jpg",
        message: "Meme generation completed",
        id: id
      };
    } else {
      return {
        status: "failed",
        error: "Failed to generate meme",
        message: "Meme generation failed",
        id: id
      };
    }
  } catch (error) {
    console.error("Canva API status check error:", error);
    throw new Error("Failed to check meme status");
  }
}

// Check ElevenLabs API status for voiceover generation
async function checkVoiceoverStatus(id: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }
  
  try {
    // In a real implementation, you would call the ElevenLabs API to check the status
    // For example: GET https://api.elevenlabs.io/v1/history/{history_item_id}
    
    // For this demo, we'll simulate a status check using the ID
    const timestamp = parseInt(id.substring(0, 8), 16);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - timestamp;
    
    // Simulate processing for 10 seconds, then complete
    if (timeDiff < 10) {
      return {
        status: "processing",
        message: "Voiceover generation in progress",
        id: id
      };
    } else if (timeDiff < 30) {
      // Completed status with audio URL
      return {
        status: "completed",
        audioUrl: `https://placeholder.com/audio-${id}.mp3`,
        message: "Voiceover generation completed",
        id: id
      };
    } else {
      // Randomly fail some older requests
      const shouldFail = Math.random() > 0.7;
      if (shouldFail) {
        return {
          status: "failed",
          error: "Failed to generate voiceover",
          message: "Voiceover generation failed",
          id: id
        };
      } else {
        return {
          status: "completed",
          audioUrl: `https://placeholder.com/audio-${id}.mp3`,
          message: "Voiceover generation completed",
          id: id
        };
      }
    }
  } catch (error) {
    console.error("ElevenLabs API status check error:", error);
    throw new Error("Failed to check voiceover status");
  }
} 