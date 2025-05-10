import os
import io
import base64
import requests
import json
import subprocess
import tempfile
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from litellm import completion
import uvicorn
from models import ChatRequest
from models import model_configs
import replicate
from openai import OpenAI
import time
import uuid
from enum import Enum

load_dotenv()
all_model_configs = model_configs()

# API Keys
openai_api_key = os.getenv("OPENAI_API_KEY")
llama_api_key = os.getenv("LLAMA_NEMOTRON")
gemini_api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
replicate_api_key = os.getenv("REPLICATE_API_TOKEN")
runway_api_key = os.getenv("RUNWAY_API_KEY")
elevenlabs_api_key = os.getenv("ELEVEN_API_KEY")

if not replicate_api_key:
    raise ValueError("REPLICATE_API_TOKEN not found in .env file")

os.environ["REPLICATE_API_TOKEN"] = replicate_api_key

app = FastAPI()

# CORS (Cross-Origin Resource Sharing) - Allows frontend to make requests to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = llama_api_key,
)

class ReelRequest(BaseModel):
    prompt: str
    voice_script: str = None  # Optional script for voiceover

class VideoGeneratorModel(str, Enum):
    """Enum for available video generation models"""
    CUSTOM = "custom"
    RUNWAYML = "runwayml"
    REPLICATE = "replicate"

class CustomVideoRequest(BaseModel):
    """Request model for custom video generation"""
    prompt: str
    negative_prompt: Optional[str] = "Bad quality, blurry, low resolution, disfigured"
    width: int = 512
    height: int = 512
    num_frames: int = 24
    fps: int = 8
    model: VideoGeneratorModel = VideoGeneratorModel.CUSTOM

class EditVideoRequest(BaseModel):
    """Request for video editing with timeline controls"""
    video_id: str  # Job ID or uploaded file ID
    start_time: float = 0.0  # Start trim point in seconds
    end_time: Optional[float] = None  # End trim point in seconds (None = end of video)
    add_music: bool = False
    music_file_id: Optional[str] = None  # ID of uploaded music file
    music_volume: float = 1.0  # Volume level for music (0.0-1.0)
    output_format: str = "mp4"  # Output format

class VideoMetadata(BaseModel):
    """Response model for video metadata"""
    id: str
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    created_at: float
    file_size: int

# Storage for uploaded files
uploaded_files = {}

# Global variables to track job status
reel_jobs = {}

def generate_srt_from_text(text, duration=10):
    """Generate a basic SRT file content from text"""
    # Simple SRT format, one subtitle for the entire duration
    return f"1\n00:00:00,000 --> 00:00:{duration:02d},000\n{text}"

def text_to_speech(text, voice_id="EXAVITQu4vr4xnSDxMaL"):
    """Generate speech from text using ElevenLabs API"""
    if not elevenlabs_api_key:
        raise ValueError("ElevenLabs API key not found")
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "xi-api-key": elevenlabs_api_key,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.8
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"Error generating speech: {e}")
        raise

@app.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for editing"""
    try:
        # Generate a unique ID for the uploaded file
        file_id = f"upload_{uuid.uuid4().hex}"
        
        # Create temporary directory if it doesn't exist
        upload_dir = "./uploaded_videos"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Get video metadata using FFmpeg
        metadata = get_video_metadata(file_path)
        
        # Store file information
        uploaded_files[file_id] = {
            "id": file_id,
            "filename": file.filename,
            "path": file_path,
            "content_type": file.content_type,
            "created_at": time.time(),
            "metadata": metadata
        }
        
        return {
            "id": file_id,
            "filename": file.filename,
            "metadata": metadata
        }
    
    except Exception as e:
        print(f"Error uploading video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/music")
async def upload_music(file: UploadFile = File(...)):
    """Upload a music/audio file for video editing"""
    try:
        # Generate a unique ID for the uploaded file
        file_id = f"music_{uuid.uuid4().hex}"
        
        # Create temporary directory if it doesn't exist
        upload_dir = "./uploaded_audio"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Get audio metadata
        metadata = get_audio_metadata(file_path)
        
        # Store file information
        uploaded_files[file_id] = {
            "id": file_id,
            "filename": file.filename,
            "path": file_path,
            "content_type": file.content_type,
            "created_at": time.time(),
            "metadata": metadata
        }
        
        return {
            "id": file_id,
            "filename": file.filename,
            "metadata": metadata
        }
    
    except Exception as e:
        print(f"Error uploading audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_video_metadata(file_path):
    """Extract metadata from a video file using FFmpeg"""
    try:
        # Run FFprobe to get video information
        cmd = [
            "ffprobe", 
            "-v", "error", 
            "-select_streams", "v:0", 
            "-show_entries", "stream=width,height,r_frame_rate,duration", 
            "-show_entries", "format=duration,size", 
            "-of", "json", 
            file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        
        # Extract the relevant information
        stream_info = info.get("streams", [{}])[0]
        format_info = info.get("format", {})
        
        # Parse frame rate (comes as a fraction like "30000/1001")
        fps_fraction = stream_info.get("r_frame_rate", "30/1")
        fps_parts = fps_fraction.split("/")
        if len(fps_parts) == 2:
            fps = float(fps_parts[0]) / float(fps_parts[1])
        else:
            fps = float(fps_parts[0])
        
        # Get duration from stream or format (prefer stream)
        duration = stream_info.get("duration")
        if duration is None:
            duration = format_info.get("duration")
        
        duration = float(duration) if duration is not None else 0.0
        
        return {
            "width": int(stream_info.get("width", 0)),
            "height": int(stream_info.get("height", 0)),
            "duration": duration,
            "fps": fps,
            "file_size": int(format_info.get("size", 0))
        }
    
    except Exception as e:
        print(f"Error getting video metadata: {e}")
        return {
            "width": 0,
            "height": 0,
            "duration": 0.0,
            "fps": 30.0,
            "file_size": 0
        }

def get_audio_metadata(file_path):
    """Extract metadata from an audio file using FFmpeg"""
    try:
        # Run FFprobe to get audio information
        cmd = [
            "ffprobe", 
            "-v", "error", 
            "-select_streams", "a:0", 
            "-show_entries", "stream=duration,sample_rate", 
            "-show_entries", "format=duration,size", 
            "-of", "json", 
            file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        
        # Extract the relevant information
        stream_info = info.get("streams", [{}])[0]
        format_info = info.get("format", {})
        
        # Get duration from stream or format (prefer stream)
        duration = stream_info.get("duration")
        if duration is None:
            duration = format_info.get("duration")
        
        duration = float(duration) if duration is not None else 0.0
        
        return {
            "duration": duration,
            "sample_rate": int(stream_info.get("sample_rate", 44100)),
            "file_size": int(format_info.get("size", 0))
        }
    
    except Exception as e:
        print(f"Error getting audio metadata: {e}")
        return {
            "duration": 0.0,
            "sample_rate": 44100,
            "file_size": 0
        }

@app.post("/edit/video")
async def edit_video(request: EditVideoRequest, background_tasks: BackgroundTasks):
    """Edit a video with timeline controls (trim, add music, etc.)"""
    try:
        # Generate a unique job ID for this editing task
        job_id = f"edit_{int(time.time())}"
        
        # Create a job entry
        reel_jobs[job_id] = {
            'status': 'queued',
            'video_id': request.video_id,
            'edit_params': request.dict(),
            'created_at': time.time()
        }
        
        # Process the video editing in the background
        background_tasks.add_task(process_video_edit, job_id, request)
        
        return {"job_id": job_id, "status": "queued"}
    
    except Exception as e:
        print(f"Error in edit_video endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def process_video_edit(job_id: str, request: EditVideoRequest):
    """Process a video editing job with timeline controls"""
    try:
        reel_jobs[job_id]['status'] = 'processing'
        
        # Get the source video
        source_path = None
        
        # Check if it's a generated video (in reel_jobs)
        if request.video_id in reel_jobs and 'output_path' in reel_jobs[request.video_id]:
            source_path = reel_jobs[request.video_id]['output_path']
        
        # Or if it's an uploaded video
        elif request.video_id in uploaded_files:
            source_path = uploaded_files[request.video_id]['path']
        
        if not source_path or not os.path.exists(source_path):
            raise ValueError(f"Source video not found: {request.video_id}")
        
        # Get metadata for the source video
        metadata = get_video_metadata(source_path)
        
        # Prepare output path
        output_dir = "./edited_videos"
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{job_id}.{request.output_format}")
        
        # Build FFmpeg command for editing
        ffmpeg_cmd = ["ffmpeg", "-i", source_path]
        
        # Add trim settings if specified
        filter_complex = []
        video_filters = []
        audio_filters = []
        
        # Handle trim
        if request.start_time > 0 or request.end_time is not None:
            trim_option = ""
            
            # Apply start time trim
            if request.start_time > 0:
                trim_option += f"start={request.start_time}"
            
            # Apply end time trim
            if request.end_time is not None:
                if trim_option:
                    trim_option += ":"
                trim_option += f"end={request.end_time}"
            
            if trim_option:
                video_filters.append(f"trim={trim_option},setpts=PTS-STARTPTS")
                audio_filters.append(f"atrim={trim_option},asetpts=PTS-STARTPTS")
        
        # Add music if requested
        if request.add_music and request.music_file_id:
            if request.music_file_id in uploaded_files:
                music_path = uploaded_files[request.music_file_id]['path']
                
                # Add music input
                ffmpeg_cmd.extend(["-i", music_path])
                
                # Create a complex filter for mixing audio
                # [0:a] is original audio, [1:a] is music
                volume = min(1.0, max(0.0, request.music_volume))
                
                # Apply filters to main audio and music
                if audio_filters:
                    filter_complex.append(f"[0:a]{','.join(audio_filters)}[a1]")
                    filter_complex.append(f"[1:a]volume={volume}[a2]")
                    filter_complex.append(f"[a1][a2]amix=inputs=2:duration=shortest[aout]")
                else:
                    filter_complex.append(f"[0:a][1:a]amix=inputs=2:duration=shortest[aout]")
                
                # Map the output audio
                ffmpeg_cmd.extend(["-map", "0:v", "-map", "[aout]"])
            else:
                raise ValueError(f"Music file not found: {request.music_file_id}")
        else:
            # Apply audio filters if any
            if audio_filters:
                filter_complex.append(f"[0:a]{','.join(audio_filters)}[aout]")
                ffmpeg_cmd.extend(["-map", "0:v", "-map", "[aout]"])
        
        # Apply video filters if any
        if video_filters and not filter_complex:
            ffmpeg_cmd.extend(["-vf", ",".join(video_filters)])
        elif video_filters:
            filter_complex.insert(0, f"[0:v]{','.join(video_filters)}[vout]")
            ffmpeg_cmd.extend(["-map", "[vout]"])
        
        # Add the filter complex if necessary
        if filter_complex:
            ffmpeg_cmd.extend(["-filter_complex", ";".join(filter_complex)])
        
        # Set output format options
        ffmpeg_cmd.extend([
            "-c:v", "libx264", 
            "-preset", "medium",
            "-c:a", "aac",
            "-b:a", "128k",
            "-y",
            output_path
        ])
        
        print(f"Running FFmpeg command: {' '.join(ffmpeg_cmd)}")
        subprocess.run(ffmpeg_cmd, check=True)
        
        # Update job status
        reel_jobs[job_id]['status'] = 'completed'
        reel_jobs[job_id]['output_path'] = output_path
        reel_jobs[job_id]['metadata'] = get_video_metadata(output_path)
        
    except Exception as e:
        print(f"Error processing video edit job {job_id}: {e}")
        reel_jobs[job_id]['status'] = 'failed'
        reel_jobs[job_id]['error'] = str(e)

@app.get("/video/metadata/{video_id}")
async def get_video_metadata_endpoint(video_id: str):
    """Get metadata for a video (either generated or uploaded)"""
    # Check if it's a generated video (in reel_jobs)
    if video_id in reel_jobs and 'output_path' in reel_jobs[video_id]:
        path = reel_jobs[video_id]['output_path']
        metadata = get_video_metadata(path)
        
        return {
            "id": video_id,
            "filename": os.path.basename(path),
            **metadata,
            "created_at": reel_jobs[video_id].get('created_at', time.time())
        }
    
    # Or if it's an uploaded video
    elif video_id in uploaded_files:
        file_info = uploaded_files[video_id]
        
        return {
            "id": video_id,
            "filename": file_info['filename'],
            **file_info['metadata'],
            "created_at": file_info['created_at']
        }
    
    raise HTTPException(status_code=404, detail=f"Video not found: {video_id}")

@app.get("/list/videos")
async def list_videos():
    """List all available videos (both generated and uploaded)"""
    videos = []
    
    # Add generated videos from reel jobs
    for job_id, job_info in reel_jobs.items():
        if 'output_path' in job_info and job_info.get('status') == 'completed':
            try:
                metadata = get_video_metadata(job_info['output_path'])
                videos.append({
                    "id": job_id,
                    "filename": os.path.basename(job_info['output_path']),
                    "type": "generated",
                    "created_at": job_info.get('created_at', 0),
                    "metadata": metadata
                })
            except:
                # Skip videos with errors
                pass
    
    # Add uploaded videos
    for file_id, file_info in uploaded_files.items():
        if file_info.get('content_type', '').startswith('video/'):
            videos.append({
                "id": file_id,
                "filename": file_info['filename'],
                "type": "uploaded",
                "created_at": file_info.get('created_at', 0),
                "metadata": file_info.get('metadata', {})
            })
    
    # Sort by creation time (newest first)
    videos.sort(key=lambda x: x['created_at'], reverse=True)
    
    return {"videos": videos}

@app.get("/reel-status/{job_id}")
async def reel_status_endpoint(job_id: str):
    """Get the status of a reel generation job"""
    if job_id not in reel_jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return reel_jobs[job_id]

@app.get("/download-reel/{job_id}")
async def download_reel_endpoint(job_id: str):
    """Download a completed reel"""
    if job_id not in reel_jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    job = reel_jobs[job_id]
    
    if job['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"Job {job_id} is not completed yet. Current status: {job['status']}")
    
    if 'output_path' not in job:
        raise HTTPException(status_code=500, detail=f"Output path not found for job {job_id}")
    
    return FileResponse(path=job['output_path'], filename=f"reel_{job_id}.mp4", media_type="video/mp4")

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        prompt_lower = request.prompt.strip().lower()
        is_video_request = any(keyword in prompt_lower for keyword in
                              ["video", "generate video", "create video", "animation",
                               "animate", "show me", "visualize", "render", "movie"])
        
        if is_video_request:
            # Use RunwayML for video generation to maintain consistency
            print(f"Generating video with RunwayML in chat endpoint: {request.prompt}")
            
            try:
                # Use the same RunwayML implementation as the reel generator
                video_url = generate_video_with_runway(request.prompt.strip())
                return {"video_url": video_url}
            except Exception as e:
                print(f"Error in RunwayML video generation: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        else:
            # Import the enhanced system prompt from models
            from models import system_prompt

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.prompt}
            ]
            
            completion = client.chat.completions.create(
                model="nvidia/llama-3.3-nemotron-super-49b-v1",
                messages=messages,
                temperature=0.6,
                top_p=0.95,
                max_tokens=4096,
                frequency_penalty=0,
                presence_penalty=0,
                stream=True
            )

            full_response = ""
            for chunk in completion:
                if chunk.choices[0].delta.content is not None:
                    content_piece = chunk.choices[0].delta.content
                    full_response += content_piece
            
            return {"text_response": full_response}
    except Exception as e:
        print(f"Error in chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

