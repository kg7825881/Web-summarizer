document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    
    // 1. Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    status.innerText = "Extracting text...";
    
    // 2. Extract text from the page
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText
    });

    const pageText = results[0].result;
    output.innerText = ""; // Clear the box
    status.innerText = "Qwen is thinking...";

    // 3. Connect to our FastAPI backend
    try {
        const response = await fetch('http://127.0.0.1:7864/summarize_stream_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: pageText.substring(0, 8000) }) // Limit text length
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            output.innerText += chunk; // Append the streaming text
            status.innerText = "Streaming summary...";
        }
        status.innerText = "Done!";
    } catch (error) {
        output.innerText = "Error: Is the FastAPI server running?";
        status.innerText = "Failed.";
    }
});