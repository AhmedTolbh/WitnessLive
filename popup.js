document.getElementById('launchApp').addEventListener('click', () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 1024,
    height: 768,
  });
  window.close(); // Close the popup after launching the window
});
