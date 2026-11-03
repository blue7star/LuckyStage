const { request } = require('../../utils/api');

Page({
  data: {
    eventId: '', event: null, fields: [], values: {}, bannerUrl: '', logoUrl: '', eventDate: '', heroClass: 'hero-celebrate',
    canRegister: false, agreed: false, loading: true, submitting: false,
    message: '', registered: false
  },
  onLoad(options) {
    const eventId = decodeURIComponent(options.scene || options.id || '');
    if (!/^[a-f0-9]{16}$/.test(eventId)) {
      this.setData({ loading: false, message: '活动二维码无效，请联系组织者' });
      return;
    }
    this.setData({ eventId });
    this.loadEvent();
  },
  onShow() { if (this.data.eventId && this.data.event) this.loadEvent(); },
  async loadEvent() {
    try {
      const event = await request('GET', `/public/events/${this.data.eventId}`);
      const fields = event.fields.map((field) => ({ ...field, value: this.data.values[field.key] || '',
        inputType: field.type === 'tel' ? 'number' : field.type === 'number' ? 'digit' : 'text' }));
      const values = Object.fromEntries(fields.map((field) => [field.key, this.data.values[field.key] || '']));
      const apiBase = getApp().globalData.apiBase;
      const bannerUrl = event.theme.banner ? `${apiBase}${event.theme.banner}` : '';
      const logoUrl = event.theme.logo ? `${apiBase}${event.theme.logo}` : '';
      this.setData({ event, fields, values, bannerUrl, logoUrl, eventDate: event.date.replace('T', ' '),
        heroClass: `hero-${event.theme.preset}`,
        canRegister: event.registrationOpen && ['scan', 'both'].includes(event.registrationMode),
        registered: !!wx.getStorageSync(`registered_${this.data.eventId}`), loading: false, message: '' });
      wx.setNavigationBarTitle({ title: event.title });
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: event.theme.background });
    } catch (error) { this.setData({ loading: false, message: error.message }); }
  },
  onFieldInput(event) {
    const key = event.currentTarget.dataset.key;
    const index = this.data.fields.findIndex((field) => field.key === key);
    this.setData({ [`values.${key}`]: event.detail.value, [`fields[${index}].value`]: event.detail.value });
  },
  onAgreement(event) { this.setData({ agreed: !!event.detail.value.length }); },
  async submit() {
    if (this.data.submitting || !this.data.canRegister) return;
    const missing = this.data.fields.find((field) => field.required && !String(this.data.values[field.key] || '').trim());
    if (missing) { wx.showToast({ title: `请填写${missing.label}`, icon: 'none' }); return; }
    if (!this.data.agreed) { wx.showToast({ title: '请先同意信息使用说明', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      const result = await request('POST', `/public/events/${this.data.eventId}/register`, { values: this.data.values });
      wx.setStorageSync(`registered_${this.data.eventId}`, result.participantId || true);
      this.setData({ registered: true });
      wx.showModal({ title: result.status === 'already_registered' ? '已在参与名单中' : '报名成功',
        content: result.status === 'already_registered' ? '该信息已登记，无需重复报名。' : '您已获得本场活动的抽奖资格。', showCancel: false });
    } catch (error) { wx.showToast({ title: error.message, icon: 'none', duration: 3000 }); }
    finally { this.setData({ submitting: false }); }
  },
  openResults() { wx.navigateTo({ url: `/pages/result/index?id=${this.data.eventId}` }); }
});
