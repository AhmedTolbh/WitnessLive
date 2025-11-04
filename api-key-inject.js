// This script runs before the app loads and injects the API key into the environment
(function() {
  // Wait for DOM to be ready before manipulating elements
  function initializeApp() {
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
        
        // Hide the API key setup screen if it exists
        const setupScreen = document.getElementById('api-key-setup');
        if (setupScreen) {
          setupScreen.style.display = 'none';
        }
        const mainApp = document.getElementById('root');
        if (mainApp) {
          mainApp.style.display = 'block';
        }
      } else {
        // No API key found, show setup screen
        console.log('No Gemini API key found. Showing setup screen.');
        const mainApp = document.getElementById('root');
        if (mainApp) {
          mainApp.style.display = 'none';
        }
        const setupScreen = document.getElementById('api-key-setup');
        if (setupScreen) {
          setupScreen.style.display = 'flex';
        }
      }
    });
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // DOM is already ready
    initializeApp();
  }
  
  // Function to save API key from the setup screen
  window.saveApiKeyFromSetup = function() {
    const apiKeyInput = document.getElementById('setup-api-key');
    const errorMsg = document.getElementById('setup-error');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      errorMsg.textContent = 'Please enter your Gemini API key';
      errorMsg.style.display = 'block';
      return;
    }
    
    // Save to Chrome storage
    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      // Inject the API key immediately
      window.GEMINI_API_KEY = apiKey;
      if (!window.process) {
        window.process = { env: {} };
      }
      window.process.env.API_KEY = apiKey;
      window.process.env.GEMINI_API_KEY = apiKey;
      
      // Hide setup screen and show main app
      document.getElementById('api-key-setup').style.display = 'none';
      document.getElementById('root').style.display = 'block';
      
      // Reload the page to initialize the app with the API key
      window.location.reload();
    });
  };
})();
