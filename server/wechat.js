let tokenCache = { token: '', expiresAt: 0 };

export async function getMiniProgramCode(eventId) {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) throw new Error('请先在服务器设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET');
  if (!tokenCache.token || tokenCache.expiresAt < Date.now()) {
    const tokenUrl = new URL('https://api.weixin.qq.com/cgi-bin/token');
    tokenUrl.search = new URLSearchParams({ grant_type: 'client_credential', appid: appId, secret: appSecret }).toString();
    const response = await fetch(tokenUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(`微信接口获取凭证失败：${data.errmsg || response.status}`);
    tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, (data.expires_in || 7200) - 300) * 1000 };
  }
  const codeUrl = new URL('https://api.weixin.qq.com/wxa/getwxacodeunlimit');
  codeUrl.searchParams.set('access_token', tokenCache.token);
  const response = await fetch(codeUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene: eventId, page: 'pages/event/index', width: 430, check_path: false }),
    signal: AbortSignal.timeout(15000)
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const isPng = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (!response.ok || (!isPng && !isJpeg)) {
    let data = {};
    try { data = JSON.parse(bytes.toString('utf8')); } catch { /* 微信也可能返回纯文本错误 */ }
    if (data.errcode === 40001 || data.errcode === 42001) tokenCache = { token: '', expiresAt: 0 };
    throw new Error(`微信小程序码生成失败：${data.errmsg || response.status}`);
  }
  return { bytes, type: isPng ? 'image/png' : 'image/jpeg' };
}
