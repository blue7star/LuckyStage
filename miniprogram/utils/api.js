function request(method, path, data) {
  const { apiBase, isDevTools } = getApp().globalData;
  const localSimulator = isDevTools && /^http:\/\/127\.0\.0\.1:\d+$/.test(apiBase);
  const publicHttps = /^https:\/\/[^/]+$/.test(apiBase) && !apiBase.includes('your-domain.example.com');
  if (!localSimulator && !publicHttps) {
    return Promise.reject(new Error('开发者工具请启动本机服务；真机请先在 app.js 中配置公司的公网 HTTPS 地址'));
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBase}/api${path}`, method, data,
      header: { 'content-type': 'application/json' },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else reject(new Error(response.data?.error || `请求失败（${response.statusCode}）`));
      },
      fail(error) { reject(new Error(error.errMsg || '网络连接失败')); }
    });
  });
}

module.exports = { request };
