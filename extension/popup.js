document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const button = document.getElementById('summarizeBtn');
    
    // 1. UI Feedback
    button.disabled = true; // Prevent double-clicking
    output.innerText = ""; 
    status.innerText = "🔍 Extracting page text...";

    try {
        // 2. Get the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 3. Extract text using the Scripting API
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });

        const pageText = results[0].result;
        
        if (!pageText || pageText.length < 10) {
            throw new Error("No readable text found on this page.");
        }

        status.innerText = "🤖 Qwen3 is thinking...";

        // 4. Send to our Local FastAPI Server
        const response = await fetch('http://127.0.0.1:7864/summarize_stream_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: pageText.substring(0, 12000) }) // Limit to ~12k chars
        });

        if (!response.ok) throw new Error("Server error: " + response.statusText);

        // 5. Handle the Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        status.innerText = "✍️ Streaming summary...";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            output.innerText += chunk; // This is the real-time "typing" effect
            
            // Auto-scroll to bottom as text grows
            output.scrollTop = output.scrollHeight;
        }

        status.innerText = "✅ Summary Complete!";

    } catch (error) {
        console.error(error);
        output.innerHTML = `<span style="color: red;">Error: ${error.message}</span><br><br>Make sure your FastAPI server is running!`;
        status.innerText = "❌ Failed.";
    } finally {
        button.disabled = false;
    }
});