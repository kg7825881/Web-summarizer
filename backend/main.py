import json
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from qwen_agent.agents import Assistant

app = FastAPI()

# 1. CORS Setup: Allows your Chrome Extension (browser) to talk to this script
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Qwen-Agent Configuration
llm_cfg = {
    'model': 'qwen3:1.7b',
    'model_server': 'http://localhost:11434/v1', # Standard Ollama port
    'api_key': 'EMPTY',
}

# 3. Initialize the Assistant
system_prompt = (
    "You are a professional editor. Summarize the user's web content "
    "into a clean, concise 'Editor's Digest'. Use Markdown for bullet points "
    "and bold headings where appropriate. Directly output the summary."
)
agent = Assistant(llm=llm_cfg, system_message=system_prompt)

@app.post("/summarize_stream_status")
async def summarize(request: Request):
    # Receive the text sent from the Chrome extension
    data = await request.json()
    web_text = data.get("text", "")

    async def stream_generator():
        try:
            # agent.run is the generator for real-time updates
            for response in agent.run([{'role': 'user', 'content': web_text}]):
                if isinstance(response, list) and len(response) > 0:
                    last_msg = response[-1]
                    
                    # Qwen-Agent structure check
                    if isinstance(last_msg, list) and len(last_msg) > 0:
                        content = last_msg[-1].get('content', '')
                        
                        # CRITICAL: Only yield if content is a valid string
                        # This prevents the "null" text in your UI
                        if content is not None:
                            yield str(content)
        except Exception as e:
            print(f"Error during streaming: {e}")
            yield f"Error: {str(e)}"

    # --- THE FIX: We must RETURN the StreamingResponse ---
    return StreamingResponse(stream_generator(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 7864
    uvicorn.run(app, host="127.0.0.1", port=7864)