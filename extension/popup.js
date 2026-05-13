// Function to initialize the app only when 'marked' is ready
const initializeApp = () => {
    const summarizeBtn = document.getElementById('summarizeBtn');
    
    // Safety check: if the CDN hasn't loaded 'marked' yet, wait and retry
    if (typeof marked === 'undefined') {
        setTimeout(initializeApp, 100); 
        return;
    }

    summarizeBtn.addEventListener('click', async () => {
        const output = document.getElementById('output');
        const status = document.getElementById('status');
        const button = document.getElementById('summarizeBtn');
        
        button.disabled = true;
        output.innerText = ""; 
        status.innerText = "🔍 Checking server status...";

        try {
            // 1. Pre-fetch Health Check: Ensure backend is alive
            const healthCheck = await fetch('http://127.0.0.1:7864/').catch(() => null);
            if (!healthCheck) {
                throw new Error("FastAPI server is not running. Please start main.py.");
            }

            // 2. Page Extraction
            status.innerText = "📄 Extracting page text...";
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.body.innerText
            });

            const pageText = results[0].result;
            if (!pageText || pageText.length < 10) throw new Error("No readable text found.");

            status.innerText = "🤖 Qwen3 is thinking...";

            // 3. Send Request
            const response = await fetch('http://127.0.0.1:7864/summarize_stream_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: pageText.substring(0, 5000) })
            });

            if (!response.ok) throw new Error("Server error: " + response.statusText);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            status.innerText = "✍️ Streaming summary...";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                if (chunk && chunk !== "null") {
                    // Use Marked to parse the markdown into beautiful HTML
                    output.innerHTML = marked.parse(chunk); 
                    output.scrollTop = output.scrollHeight;
                }
            }

            status.innerText = "✅ Summary Complete!";

        } catch (error) {
            console.error(error);
            output.innerHTML = `<span style="color: #ff4d4d; font-weight: bold;">Error: ${error.message}</span>`;
            status.innerText = "❌ Failed.";
        } finally {
            button.disabled = false;
        }
    });
};

// Start the initialization process
initializeApp();