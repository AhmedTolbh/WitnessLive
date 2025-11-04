// This allows the user to click the extension icon to directly launch the session window,
// providing a quicker way to start the application.
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 1024,
    height: 768,
  });
});
