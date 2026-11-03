let isDevTools = false;
try {
  isDevTools = wx.getSystemInfoSync().platform === 'devtools';
} catch { /* Keep the public configuration on unknown platforms. */ }

App({
  globalData: {
    isDevTools,
    // The simulator talks to the Node server on this computer.
    // Replace the public URL before previewing on a phone or publishing.
    apiBase: isDevTools ? 'http://127.0.0.1:3000' : 'https://your-domain.example.com'
  }
});
