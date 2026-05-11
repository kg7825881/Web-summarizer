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
    allow_credentials = True;
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
# We give it a "System Message" to define its personality as an editor
system_prompt = (
    "You are a professional editor. Summarize the user's web content "
    "into a clean, concise 'Editor's Digest'. Use Markdown for bullet points "
    "and bold headings where appropriate."
)
agent = Assistant(llm=llm_cfg, system_message=system_prompt)

@app.post("/summarize_stream_status")
async def summarize(request: Request):
    # Receive the text sent from the Chrome extension
    data = await request.json()
    web_text = data.get("text", "")

    async def stream_generator():
        # Agent.run returns a generator for real-time updates
        messages = [{'role': 'user', 'content': web_text}]
        for response in agent.run(messages):
            # Qwen-Agent yields a list of messages; we take the latest content
            if response:
                content = response[-1][-1]['content']
                yield content

    return StreamingResponse(stream_generator(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 7864
    uvicorn.run(app, host="127.0.0.1", port=7864)