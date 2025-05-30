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
from models import system_prompt
import replicate
import fal_client
from litellm import completion
import requests
import time
from lumaai import LumaAI

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
llama_api_key = os.getenv("LLAMA_NEMOTRON")
runway_api_key = os.getenv("RUNWAY_API_KEY")
fal_api_key = os.getenv("FAL_KEY")
replicate_api_key = os.getenv("REPLICATE_API_TOKEN")

if fal_api_key:
    fal_client.api_key = fal_api_key

app = FastAPI()

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
    RUNWAYML = "runwayml"
    FAL_AI = "fal_ai"
    REPLICATE = "replicate"

class VideoRequest(BaseModel):
    prompt: str
    duration: int = 5
    model: VideoGeneratorModel = VideoGeneratorModel.FAL_AI

class VideoResponse(BaseModel):
    status: str
    video_url: Optional[str] = None
    script: Optional[str] = None
    error: Optional[str] = None
    credits: str

class ImageRequest(BaseModel):
    messages: list

class ImageResponse(BaseModel):
    status: str
    image_url: Optional[str] = None
    error: Optional[str] = None
    response: Optional[dict] = None


async def generate_script(prompt: str, duration: int) -> str:
    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{prompt}"}
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

async def generate_luma_video(prompt: str, duration: int) -> dict:
    """Generate video using LumaAI API"""
    try:
        client = LumaAI()

        print(f"Creating Luma generation with prompt: {prompt}")
        generation = client.generations.create(
            prompt=prompt,
        )
        
        print(f"Luma generation created with ID: {generation.id}")
        
        completed = False
        max_attempts = 60
        attempt = 0
        
        while not completed and attempt < max_attempts:
            generation = client.generations.get(id=generation.id)
            print(f"Luma generation status: {generation.state}")
            
            if generation.state == "completed":
                completed = True
                video_url = generation.assets.video
                
                return {
                    "status": "completed",
                    "video_url": video_url,
                    "credits": "Video generated using LumaAI"
                }
            elif generation.state == "failed":
                error_msg = f"Generation failed: {generation.failure_reason}"
                print(error_msg)
                return {
                    "status": "failed",
                    "error": error_msg,
                    "credits": "Video generation failed using LumaAI"
                }
            
            print("Waiting for Luma video generation...")
            await asyncio.sleep(3)
            attempt += 1
        
        if not completed:
            return {
                "status": "failed",
                "error": "Generation timed out after 3 minutes",
                "credits": "Video generation timed out using LumaAI"
            }
            
    except Exception as e:
        error_msg = f"LumaAI error: {str(e)}"
        print(error_msg)
        return {
            "status": "failed",
            "error": error_msg,
            "credits": "Video generation failed using LumaAI"
        }





async def generate_video_with_fal_ai(prompt: str, duration: int) -> dict:
    try:
        # Submit request to Fal AI LTX Video
        handler = fal_client.submit(
            "fal-ai/ltx-video",
            arguments={
                "prompt": prompt,
                "num_frames": duration * 24,  # Convert seconds to frames (24fps)
                "width": 512,
                "height": 512,
                "num_inference_steps": 20,
                "guidance_scale": 3.0,
                "enable_safety_checker": True
            }
        )
        
        result = handler.get()
        
        if result and "video" in result and "url" in result["video"]:
            return {
                "status": "completed",
                "video_url": result["video"]["url"],
                "credits": "Video generated using Fal AI LTX Video API"
            }
        else:
            raise Exception("Invalid response format from Fal AI")

    except Exception as e:
        error_msg = f"Fal AI error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

async def generate_replicate_video(prompt: str, duration: int) -> dict:
    """Generate video using Replicate API"""
    if not replicate_api_key:
        raise ValueError("Replicate API key not found")
        
    try:
        print(f"Running Replicate with prompt: {prompt}")
        output = replicate.run(
            "google/veo-2",
            input={
                "prompt": prompt,
                "video_length": f"{duration}s",
                "sizing_strategy": "maintain_aspect_ratio",
                "frames_per_second": 24
            }
        )
        
        print(f"Replicate output: {output}")
        
        if output and isinstance(output, list) and len(output) > 0:
            return {
                "status": "completed",
                "video_url": output[0],
                "credits": "Video generated using Replicate Stable Video Diffusion"
            }
        else:
            raise Exception(f"Invalid response format from Replicate: {output}")
            
    except Exception as e:
        error_msg = f"Replicate API error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

async def generate_runway_video(prompt: str, duration: int) -> dict:
    """Generate video using RunwayML via Replicate as a fallback"""
    if not replicate_api_key:
        raise ValueError("Replicate API key not found")
        
    try:
        print(f"Running RunwayML (via Replicate) with prompt: {prompt}")
        # Use a different Replicate model for RunwayML option
        output = replicate.run(
            "stability-ai/stable-video-diffusion",
            input={
                "prompt": prompt,
                "video_length": duration,
                "sizing_strategy": "maintain_aspect_ratio",
                "frames_per_second": 24
            }
        )
        
        print(f"RunwayML output: {output}")
        
        if output and isinstance(output, list) and len(output) > 0:
            return {
                "status": "completed",
                "video_url": output[0],
                "credits": "Video generated using RunwayML (via Replicate)"
            }
        else:
            raise Exception(f"Invalid response format from RunwayML: {output}")
            
    except Exception as e:
        error_msg = f"RunwayML API error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/generate/video", response_model=VideoResponse)
async def generate_video_endpoint(request: VideoRequest):
    try:
        if request.duration not in [5, 10]:
            raise HTTPException(status_code=400, detail="Duration must be either 5 or 10 seconds")

        script = await generate_script(request.prompt, request.duration)

        if request.model == VideoGeneratorModel.FAL_AI:
            result = await generate_luma_video(script, request.duration)  # Using LumaAI instead of Fal AI
        elif request.model == VideoGeneratorModel.REPLICATE:
            result = await generate_replicate_video(script, request.duration)
        elif request.model == VideoGeneratorModel.RUNWAYML:
            result = await generate_runway_video(script, request.duration)  # Using the actual RunwayML function
        else:
            raise HTTPException(status_code=400, detail="Unsupported video generation model")
        
        result["script"] = script
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

