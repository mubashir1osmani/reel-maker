import os
import requests
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from enum import Enum
import asyncio
from openai import OpenAI
import uvicorn

load_dotenv()

# API Keys
openai_api_key = os.getenv("OPENAI_API_KEY")
llama_api_key = os.getenv("LLAMA_NEMOTRON")
runway_api_key = os.getenv("RUNWAY_API_KEY")
lightricks_api_key = os.getenv("LIGHTRICKS_API_KEY")

app = FastAPI()

# CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=llama_api_key,
)

class VideoGeneratorModel(str, Enum):
    """Enum for available video generation models"""
    RUNWAYML = "runwayml"
    LIGHTRICKS = "lightricks"

class VideoRequest(BaseModel):
    """Request model for video generation"""
    prompt: str
    duration: int = 5
    model: VideoGeneratorModel = VideoGeneratorModel.LIGHTRICKS

class VideoResponse(BaseModel):
    """Response model for video generation"""
    status: str
    video_url: Optional[str] = None
    script: Optional[str] = None
    error: Optional[str] = None
    credits: str

async def generate_script(prompt: str, duration: int) -> str:
    """Generate a script using Llama-3-Nemotron"""
    try:
        system_prompt = f"""You are a professional video script writer. Create a concise, engaging script for a {duration}-second video.
Guidelines:
- Keep it under {duration} seconds when read at a normal pace
- Make it visually descriptive and suitable for AI video generation
- Focus on key points that can be visualized
- Use clear, concise language
- Avoid complex transitions or effects
- Keep descriptions simple and direct
- Format: Write a single paragraph with clear visual descriptions
- Maximum 500 characters
Example format:
"A serene mountain landscape at sunset, with golden light reflecting off snow-capped peaks. A lone hiker silhouetted against the dramatic sky, walking along a winding path. The scene transitions to a close-up of the hiker's determined face, then pans out to show the vast wilderness ahead."

Remember: The script will be used to generate an AI video, so focus on visual elements that can be easily interpreted by the AI model.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a script for: {prompt}"}
        ]
        
        completion = client.chat.completions.create(
            model="nvidia/llama-3.3-nemotron-super-49b-v1",
            messages=messages,
            temperature=0.7,
            top_p=0.95,
            max_tokens=500,
            frequency_penalty=0,
            presence_penalty=0
        )

        script = completion.choices[0].message.content.strip()
        
        if len(script) > 500:
            script = script[:497] + "..."
            
        return script

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation error: {str(e)}")

async def generate_video_with_lightricks(prompt: str, duration: int) -> dict:
    """Generate video using Lightricks API"""
    if not lightricks_api_key:
        raise ValueError("Lightricks API key not found")

    headers = {
        "Authorization": f"Bearer {lightricks_api_key}",
        "Content-Type": "application/json"
    }

    clean_prompt = prompt[:500]
    
    data = {
        "prompt": clean_prompt,
        "duration": duration,
        "style": "cinematic",
        "negative_prompt": "Bad quality, blurry, low resolution, disfigured, distorted, ugly, deformed"
    }

    try:
        response = requests.post(
            "https://api.lightricks.com/v1/generations",
            headers=headers,
            json=data
        )
        
        print(f"Lightricks API Response Status: {response.status_code}")
        print(f"Lightricks API Response: {response.text}")
        
        response.raise_for_status()
        result = response.json()
        
        return {
            "status": "completed",
            "video_url": result["video_url"],
            "credits": "Video generated using Lightricks AI Video Generation API"
        }

    except Exception as e:
        error_msg = f"Lightricks API error: {str(e)}"
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

async def generate_runway_video(prompt: str, duration: int) -> dict:
    """Generate video using RunwayML API"""
    if not runway_api_key:
        raise ValueError("RunwayML API key not found")

    num_frames = duration * 24

    headers = {
        "Authorization": f"Bearer {runway_api_key}",
        "Content-Type": "application/json"
    }

    clean_prompt = prompt[:500].replace("[", "").replace("]", "")
    
    data = {
        "model": "gen-2",
        "prompt": clean_prompt,
        "num_frames": num_frames,
        "fps": 24,
        "negative_prompt": "Bad quality, blurry, low resolution, disfigured, distorted, ugly, deformed",
        "guidance_scale": 7.5,
        "num_inference_steps": 50,
        "seed": None
    }

    try:
        response = requests.post(
            "https://api.runwayml.com/v1/generations",
            headers=headers,
            json=data
        )
        
        print(f"RunwayML API Response Status: {response.status_code}")
        print(f"RunwayML API Response: {response.text}")
        
        response.raise_for_status()
        job_data = response.json()
        
        job_id = job_data["id"]
        max_attempts = 30
        attempt = 0
        
        while attempt < max_attempts:
            status_response = requests.get(
                f"https://api.runwayml.com/v1/generations/{job_id}",
                headers=headers
            )
            status_response.raise_for_status()
            status_data = status_response.json()
            
            print(f"RunwayML Status Check: {status_data['status']}")
            
            if status_data["status"] == "completed":
                return {
                    "status": "completed",
                    "video_url": status_data["output"]["video_url"],
                    "credits": "Video generated using RunwayML Gen-2"
                }
            elif status_data["status"] == "failed":
                error_msg = status_data.get("error", "Unknown error")
                print(f"RunwayML Generation Failed: {error_msg}")
                return {
                    "status": "failed",
                    "error": error_msg,
                    "credits": "Video generation failed using RunwayML Gen-2"
                }
            
            await asyncio.sleep(2)
            attempt += 1
        
        return {
            "status": "failed",
            "error": "Generation timed out after 60 seconds",
            "credits": "Video generation timed out using RunwayML Gen-2"
        }

    except Exception as e:
        error_msg = f"RunwayML API error: {str(e)}"
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            error_msg += f"\nResponse: {e.response.text}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/generate/video", response_model=VideoResponse)
async def generate_video_endpoint(request: VideoRequest):
    """Generate a video with script"""
    try:
        # Validate duration
        if request.duration not in [5, 10]:
            raise HTTPException(status_code=400, detail="Duration must be either 5 or 10 seconds")

        # Generate script
        script = await generate_script(request.prompt, request.duration)

        # Generate video based on selected model
        if request.model == VideoGeneratorModel.LIGHTRICKS:
            result = await generate_video_with_lightricks(script, request.duration)
        else:
            result = await generate_runway_video(script, request.duration)
        
        # Add script to response
        result["script"] = script
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

