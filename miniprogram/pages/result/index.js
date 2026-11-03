const { request } = require('../../utils/api');

Page({
  data: { eventId: '', event: null, results: [], logoUrl: '', loading: true, message: '' },
  onLoad(options) {
    const eventId = options.id || '';
    if (!/^[a-f0-9]{16}$/.test(eventId)) { this.setData({ loading: false, message: '活动链接无效' }); return; }
    this.setData({ eventId });
    this.refresh();
  },
  onShow() { if (this.data.eventId && !this.data.loading) this.refresh(); },
  async refresh() {
    try {
      const [event, data] = await Promise.all([
        request('GET', `/public/events/${this.data.eventId}`),
        request('GET', `/public/events/${this.data.eventId}/results`)
      ]);
      const logoUrl = event.theme.logo ? `${getApp().globalData.apiBase}${event.theme.logo}` : '';
      this.setData({ event, results: data.results, logoUrl, loading: false, message: '' });
      wx.setNavigationBarTitle({ title: `${event.title} · 中奖结果` });
    } catch (error) { this.setData({ loading: false, message: error.message }); }
  }
});
