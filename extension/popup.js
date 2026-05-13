document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const button = document.getElementById('summarizeBtn');
    
    button.disabled = true;
    output.innerText = ""; 
    status.innerText = "🔍 Extracting page text...";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });

        const pageText = results[0].result;
        
        if (!pageText || pageText.length < 10) {
            throw new Error("No readable text found on this page.");
        }

        status.innerText = "🤖 Qwen3 is thinking...";

        const response = await fetch('http://127.0.0.1:7864/summarize_stream_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: pageText.substring(0, 5000) })
        });

        if (!response.ok) throw new Error("Server error: " + response.statusText);

        // --- MISSING LINES START HERE ---
        const reader = response.body.getReader(); //
        const decoder = new TextDecoder(); //
        // --- MISSING LINES END HERE ---

        status.innerText = "✍️ Streaming summary...";

        while (true) {
            const { done, value } = await reader.read(); //
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true }); //
            
            if (chunk && chunk !== "null") {
                // We use direct assignment (=) because Qwen-Agent 
                // often sends the full updated text in every chunk
                output.innerText = chunk; 
                output.scrollTop = output.scrollHeight;
            }
        }

        status.innerText = "✅ Summary Complete!";

    } catch (error) {
        console.error(error);
        output.innerHTML = `<span style="color: red;">Error: ${error.message}</span><br><br>Check terminal for Python errors.`;
        status.innerText = "❌ Failed.";
    } finally {
        button.disabled = false;
    }
});