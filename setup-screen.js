// Setup screen event handlers - separated from api-key-inject.js to avoid CSP issues
(function() {
  function initSetupHandlers() {
    const saveButton = document.getElementById('setup-save-button');
    const apiKeyInput = document.getElementById('setup-api-key');
    
    if (saveButton) {
      // Handle click on save button
      saveButton.addEventListener('click', () => {
        window.saveApiKeyFromSetup();
      });
    }
    
    if (apiKeyInput) {
      // Handle Enter key press
      apiKeyInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          window.saveApiKeyFromSetup();
        }
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSetupHandlers);
  } else {
    initSetupHandlers();
  }
})();
