document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const output = document.getElementById('output');
  const status = document.getElementById('status');
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  status.innerText = "Reading page...";
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });

  const pageText = results[0].result;
  let fullMarkdown = ""; // Store the growing summary
  output.innerHTML = "<em>Analyzing with Qwen3...</em>";

  try {
    const response = await fetch('http://127.0.0.1:7864/summarize_stream_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pageText.substring(0, 10000) }) 
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fullMarkdown += decoder.decode(value, { stream: true });
      
      // Convert Markdown to beautiful HTML on the fly
      output.innerHTML = marked.parse(fullMarkdown);
      status.innerText = "Writing...";
    }
    status.innerText = "Summary Complete.";
  } catch (err) {
    output.innerText = "Error: Backend unreachable. Ensure python main.py is running.";
    status.innerText = "Failed.";
  }
});