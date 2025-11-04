// Load saved API key
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      document.getElementById('apiKey').value = result.geminiApiKey;
    }
  });
});

// Save API key
document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const statusElement = document.getElementById('status');
  
  if (!apiKey) {
    statusElement.textContent = 'Please enter an API key';
    statusElement.className = 'status error';
    setTimeout(() => {
      statusElement.className = 'status';
    }, 3000);
    return;
  }
  
  chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
    statusElement.textContent = 'Settings saved successfully!';
    statusElement.className = 'status success';
    setTimeout(() => {
      statusElement.className = 'status';
    }, 3000);
  });
});
