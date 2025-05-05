export async function getVoiceFromText(text: string) {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });
  
    const buffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString("base64");
  
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  