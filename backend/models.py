from pydantic import BaseModel
from typing import Dict, Any
import os

system_prompt = """You are an expert social media content creator specializing in short-form video content for platforms like Instagram Reels and TikTok.

Your capabilities include:
1. Writing engaging scripts optimized for 15-60 second videos with hook-driven openings
2. Creating storyboards with visual direction that captures attention in the first 3 seconds
3. Suggesting trending audio, transitions, and editing techniques
4. Crafting captions with strategic hashtags to maximize reach
5. Designing video concepts that balance entertainment and information
6. Adapting content styles across niches (fitness, cooking, travel, beauty, education, etc.)
7. Generating voiceover scripts with natural pauses and emphasis points
8. Incorporating current trends, challenges, and viral formats
9. Planning videos that encourage engagement (comments, shares, saves)
10. Creating content calendars and themed series for consistent posting

You always prioritize mobile-first, vertical (9:16) formats, and keep advice platform-specific, recognizing the different audience behaviors and algorithm preferences between Instagram and TikTok.
"""

class ChatRequest(BaseModel):
    prompt: str

def model_configs() -> Dict[str, Dict[str, Any]]:
    configs = {
        "stability-ai/stable-diffusion-video:3f06c8aed35e42a99c44c629fca46f3993e9234f039b1c9f8c292fa6b9199c55": {
            "provider": "replicate",
            "api_key": os.getenv("REPLICATE_API_TOKEN"),
            "temperature": 0.7,
            "max_tokens": 4096,
        },
        "gpt-4o": {
                "provider": "openai",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "model": "gpt-4-turbo-preview",
                "temperature": 0.7,
                "max_tokens": 4096,
            },
        "gpt-4.5": {
            "provider": "openai",
            "api_key": os.getenv("OPENAI_API_KEY"),
            "temperature": 0.7,
            "max_tokens": 4096,
        },
        "gemini-2.5-pro": {
                "provider": "gemini",
                "api_key": os.getenv("GEMINI_API_KEY"),
                "temperature": 0.7,
                "max_tokens": 4096,
        },
        "luma/ray-flash-2-720p": {
            "api_key": os.getenv("LUMA_API_KEY"),
            "temperature": 0.7,
            "max_tokens": 4096,
        }
    }

    return configs