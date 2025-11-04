// This script runs before the app loads and injects the API key into the environment
(function() {
  // Get API key from Chrome storage and inject it as a global variable
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      // Make the API key available globally for the app
      window.GEMINI_API_KEY = result.geminiApiKey;
      // Also make it available as process.env for compatibility
      if (!window.process) {
        window.process = { env: {} };
      }
      window.process.env.API_KEY = result.geminiApiKey;
      window.process.env.GEMINI_API_KEY = result.geminiApiKey;
    } else {
      // No API key found, show error
      console.error('No Gemini API key found. Please configure it in the extension options.');
      setTimeout(() => {
        if (confirm('No Gemini API key configured. Would you like to open the settings page?')) {
          chrome.runtime.openOptionsPage();
        }
      }, 500);
    }
  });
})();
