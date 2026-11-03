import { randomBytes } from 'node:crypto';

const keyPattern = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const idPattern = /^[A-Za-z0-9_-]{1,40}$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;

export function newId() { return randomBytes(8).toString('hex'); }

export function defaultEvent() {
  return {
    title: '新活动', date: '', description: '', registrationMode: 'both',
    registrationOpen: true,
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'phone', label: '手机号', type: 'tel', required: true },
      { key: 'department', label: '部门', type: 'text', required: false }
    ],
    uniqueField: 'phone', displayField: 'name',
    rounds: [{ id: newId(), name: '第一轮', allowPreviousWinners: false,
      prizes: [{ id: newId(), name: '一等奖', count: 1 }] }],
    theme: { preset: 'celebrate', primary: '#2563eb', background: '#0b1730', banner: '', backdrop: '', logo: '' }
  };
}

function shortText(value, max, label, optional = false) {
  const text = String(value ?? '').trim();
  if ((!optional && !text) || text.length > max) throw new Error(`${label}需要填写，且不得超过${max}个字符`);
  return text;
}

export function validateEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('活动设置格式不正确');
  const title = shortText(input.title, 100, '活动名称');
  const date = shortText(input.date, 40, '活动时间', true);
  const description = shortText(input.description, 500, '活动说明', true);
  const registrationMode = input.registrationMode;
  if (!['import', 'scan', 'both'].includes(registrationMode)) throw new Error('报名方式无效');
  if (!Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > 12) throw new Error('报名字段数量须为 1 至 12 个');
  const fieldKeys = new Set();
  const fields = input.fields.map((field) => {
    const key = String(field.key ?? '').trim();
    if (!keyPattern.test(key) || fieldKeys.has(key)) throw new Error(`字段标识无效或重复：${key}`);
    fieldKeys.add(key);
    const type = field.type;
    if (!['text', 'tel', 'number'].includes(type)) throw new Error(`字段类型无效：${key}`);
    return { key, label: shortText(field.label, 30, '字段名称'), type, required: !!field.required };
  });
  const uniqueField = String(input.uniqueField ?? '');
  const displayField = String(input.displayField ?? '');
  if (!fieldKeys.has(uniqueField)) throw new Error('去重字段必须是已有字段');
  if (!fieldKeys.has(displayField)) throw new Error('显示字段必须是已有字段');
  const unique = fields.find((field) => field.key === uniqueField);
  if (!unique.required) throw new Error('去重字段必须设为必填');
  if (!Array.isArray(input.rounds) || input.rounds.length < 1 || input.rounds.length > 20) throw new Error('轮次数量须为 1 至 20 轮');
  const roundIds = new Set();
  const rounds = input.rounds.map((round) => {
    const id = String(round.id || newId());
    if (!idPattern.test(id) || roundIds.has(id)) throw new Error('轮次标识无效或重复');
    roundIds.add(id);
    if (!Array.isArray(round.prizes) || round.prizes.length < 1 || round.prizes.length > 20) throw new Error('每轮需设置 1 至 20 个奖项');
    const prizeIds = new Set();
    const prizes = round.prizes.map((prize) => {
      const prizeId = String(prize.id || newId());
      if (!idPattern.test(prizeId) || prizeIds.has(prizeId)) throw new Error('奖项标识无效或重复');
      prizeIds.add(prizeId);
      const count = Number(prize.count);
      if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('奖项人数须为 1 至 500 人');
      return { id: prizeId, name: shortText(prize.name, 40, '奖项名称'), count };
    });
    return { id, name: shortText(round.name, 40, '轮次名称'), allowPreviousWinners: !!round.allowPreviousWinners, prizes };
  });
  const themeInput = input.theme || {};
  const preset = ['celebrate', 'spring', 'formal'].includes(themeInput.preset) ? themeInput.preset : 'celebrate';
  const primary = String(themeInput.primary || '#2563eb');
  const background = String(themeInput.background || '#0b1730');
  if (!colorPattern.test(primary) || !colorPattern.test(background)) throw new Error('主题颜色须为六位十六进制色值');
  const asset = (value) => {
    const path = String(value || '');
    if (path && !/^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(path)) throw new Error('主题图片必须先上传至本系统');
    return path;
  };
  return { title, date, description, registrationMode, registrationOpen: !!input.registrationOpen,
    fields, uniqueField, displayField, rounds,
    theme: { preset, primary, background, banner: asset(themeInput.banner), backdrop: asset(themeInput.backdrop), logo: asset(themeInput.logo) } };
}

export function normalizeValues(config, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('报名信息格式不正确');
  const result = {};
  for (const field of config.fields) {
    const value = String(values[field.key] ?? '').trim();
    if (field.required && !value) throw new Error(`${field.label}不能为空`);
    if (value.length > 120) throw new Error(`${field.label}不能超过120个字符`);
    if (field.type === 'number' && value && !/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`${field.label}必须是数字`);
    result[field.key] = value;
  }
  const dedupeKey = result[config.uniqueField].toLocaleLowerCase('zh-CN');
  if (!dedupeKey) throw new Error('去重字段不能为空');
  return { values: result, dedupeKey };
}
