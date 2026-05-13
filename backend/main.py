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

# Add this above your summarize endpoint
@app.get("/")
async def health_check():
    return {"status": "online", "model": "qwen3:1.7b"}

@app.post("/summarize_stream_status")
async def summarize(request: Request):
    data = await request.json()
    web_text = data.get("text", "")

    async def stream_generator():
        try:
            # We iterate through the agent directly
            for response in agent.run([{'role': 'user', 'content': web_text}]):
                if not response:
                    continue
                
                # Qwen-Agent often sends a complex list. 
                # This logic drills down to find any string content.
                try:
                    # Most common path: response[-1][-1]['content']
                    # We convert to string to ensure it's never 'null'
                    content = str(response[-1][-1].get('content', ''))
                    if content.strip():
                        yield content
                except (IndexError, KeyError, TypeError):
                    # If the structure is different, try the backup path
                    try:
                        content = str(response[-1].get('content', ''))
                        if content.strip():
                            yield content
                    except:
                        continue
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"Error: {str(e)}"

    # This MUST be returned for the extension to receive data
    return StreamingResponse(stream_generator(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 7864
    uvicorn.run(app, host="127.0.0.1", port=7864)