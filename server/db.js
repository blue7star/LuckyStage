import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { defaultEvent, newId, normalizePreset, normalizeValues, validateEvent } from './config.js';

export function createStore(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'lottery.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, config_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      dedupe_key TEXT NOT NULL, values_json TEXT NOT NULL, source TEXT NOT NULL,
      created_at TEXT NOT NULL, UNIQUE(event_id, dedupe_key)
    );
    CREATE INDEX IF NOT EXISTS participants_event ON participants(event_id);
    CREATE TABLE IF NOT EXISTS draw_results (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      round_id TEXT NOT NULL, prize_id TEXT NOT NULL, winners_json TEXT NOT NULL,
      drawn_at TEXT NOT NULL, PRIMARY KEY(event_id, round_id, prize_id)
    );`);

  const eventRow = db.prepare('SELECT * FROM events WHERE id=?');
  const participantCount = db.prepare('SELECT COUNT(*) AS count FROM participants WHERE event_id=?');
  const drawRows = db.prepare('SELECT * FROM draw_results WHERE event_id=? ORDER BY drawn_at, rowid');

  const listeners = new Map();
  function subscribe(eventId, handler) {
    const set = listeners.get(eventId) || new Set();
    set.add(handler);
    listeners.set(eventId, set);
    return () => {
      set.delete(handler);
      if (!set.size) listeners.delete(eventId);
    };
  }

  function emit(eventId, type, payload) {
    listeners.get(eventId)?.forEach((handler) => { try { handler(type, payload); } catch {} });
  }

  function getEvent(id) {
    const row = eventRow.get(id);
    if (!row) return null;
    const config = JSON.parse(row.config_json);
    if (config.theme) config.theme.preset = normalizePreset(config.theme.preset);
    return { id: row.id, ...config, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  function listEvents() {
    return db.prepare(`SELECT e.id, e.config_json, e.created_at, e.updated_at,
      (SELECT COUNT(*) FROM participants p WHERE p.event_id=e.id) AS participant_count
      FROM events e ORDER BY e.created_at DESC`).all().map((row) => {
      const config = JSON.parse(row.config_json);
      return { id: row.id, title: config.title, date: config.date, participantCount: row.participant_count,
        createdAt: row.created_at, updatedAt: row.updated_at };
    });
  }

  function createEvent(input = defaultEvent()) {
    const config = validateEvent(input);
    const id = newId();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO events(id,config_json,created_at,updated_at) VALUES(?,?,?,?)')
      .run(id, JSON.stringify(config), now, now);
    return getEvent(id);
  }

  function updateEvent(id, input) {
    const previous = getEvent(id);
    if (!previous) return null;
    const next = validateEvent(input);
    if (participantCount.get(id).count > 0) {
      if (next.uniqueField !== previous.uniqueField ||
        JSON.stringify(next.fields) !== JSON.stringify(previous.fields)) {
        throw new Error('已有参与者，报名字段和去重字段不可更改');
      }
    }
    if (drawRows.all(id).length > 0 && JSON.stringify(next.rounds) !== JSON.stringify(previous.rounds)) {
      throw new Error('抽奖已开始，轮次和奖项规则不可更改');
    }
    db.prepare('UPDATE events SET config_json=?, updated_at=? WHERE id=?')
      .run(JSON.stringify(next), new Date().toISOString(), id);
    const updated = getEvent(id);
    emit(id, 'config', publicEvent(id));
    return updated;
  }

  function insertParticipants(id, rows, source) {
    const event = getEvent(id);
    if (!event) return null;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 5000) throw new Error('一次导入须包含 1 至 5000 行');
    if (!['import', 'scan'].includes(source)) throw new Error('登记来源无效');
    const existing = db.prepare('SELECT id FROM participants WHERE event_id=? AND dedupe_key=?');
    const insert = db.prepare('INSERT INTO participants(id,event_id,dedupe_key,values_json,source,created_at) VALUES(?,?,?,?,?,?)');
    const report = { inserted: 0, duplicates: 0, invalid: 0, errors: [] };
    db.exec('BEGIN IMMEDIATE');
    try {
      rows.forEach((row, index) => {
        let normalized;
        try { normalized = normalizeValues(event, row); }
        catch (error) {
          report.invalid++;
          if (report.errors.length < 30) report.errors.push({ row: index + 2, message: error.message });
          return;
        }
        if (existing.get(id, normalized.dedupeKey)) { report.duplicates++; return; }
        insert.run(newId(), id, normalized.dedupeKey, JSON.stringify(normalized.values), source, new Date().toISOString());
        report.inserted++;
      });
      db.exec('COMMIT');
      return report;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  function register(id, values) {
    const event = getEvent(id);
    if (!event) return null;
    if (!event.registrationOpen || !['scan', 'both'].includes(event.registrationMode)) throw new Error('本活动暂未开放扫码报名');
    const normalized = normalizeValues(event, values);
    const existing = db.prepare('SELECT id FROM participants WHERE event_id=? AND dedupe_key=?').get(id, normalized.dedupeKey);
    if (existing) return { status: 'already_registered', participantId: existing.id };
    const participantId = newId();
    try {
      db.prepare('INSERT INTO participants(id,event_id,dedupe_key,values_json,source,created_at) VALUES(?,?,?,?,?,?)')
        .run(participantId, id, normalized.dedupeKey, JSON.stringify(normalized.values), 'scan', new Date().toISOString());
      return { status: 'registered', participantId };
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        const found = db.prepare('SELECT id FROM participants WHERE event_id=? AND dedupe_key=?').get(id, normalized.dedupeKey);
        return { status: 'already_registered', participantId: found?.id };
      }
      throw error;
    }
  }

  function listParticipants(id, limit = 500) {
    if (!getEvent(id)) return null;
    return db.prepare('SELECT id,values_json,source,created_at FROM participants WHERE event_id=? ORDER BY created_at DESC LIMIT ?')
      .all(id, limit).map((row) => ({ id: row.id, values: JSON.parse(row.values_json), source: row.source, createdAt: row.created_at }));
  }

  function listResults(id) {
    const event = getEvent(id);
    if (!event) return null;
    const people = new Map(db.prepare('SELECT id,values_json FROM participants WHERE event_id=?').all(id)
      .map((row) => [row.id, JSON.parse(row.values_json)]));
    return drawRows.all(id).map((row) => {
      const round = event.rounds.find((item) => item.id === row.round_id);
      const prize = round?.prizes.find((item) => item.id === row.prize_id);
      return { roundId: row.round_id, roundName: round?.name || '已删除轮次',
        prizeId: row.prize_id, prizeName: prize?.name || '已删除奖项', drawnAt: row.drawn_at,
        winners: JSON.parse(row.winners_json).map((personId) => {
          const values = people.get(personId) || {};
          const winner = { id: personId, display: String(values[event.displayField] || '参与者') };
          const department = String(values.department || '').trim();
          if (department) winner.department = department;
          return winner;
        }) };
    });
  }

  function drawPrize(id, roundId, prizeId) {
    const event = getEvent(id);
    if (!event) return null;
    const roundIndex = event.rounds.findIndex((item) => item.id === roundId);
    const round = event.rounds[roundIndex];
    const prize = round?.prizes.find((item) => item.id === prizeId);
    if (!prize) throw new Error('轮次或奖项不存在');
    db.exec('BEGIN IMMEDIATE');
    try {
      const prior = db.prepare('SELECT winners_json FROM draw_results WHERE event_id=? AND round_id=? AND prize_id=?').get(id, roundId, prizeId);
      if (prior) { db.exec('COMMIT'); return listResults(id).find((item) => item.roundId === roundId && item.prizeId === prizeId); }
      const completed = new Set(drawRows.all(id).map((item) => `${item.round_id}:${item.prize_id}`));
      for (const earlier of event.rounds.slice(0, roundIndex)) {
        if (earlier.prizes.some((item) => !completed.has(`${earlier.id}:${item.id}`))) {
          throw new Error('请先完成前一轮的全部奖项');
        }
      }
      const excluded = new Set();
      for (const result of drawRows.all(id)) {
        const resultRoundIndex = event.rounds.findIndex((item) => item.id === result.round_id);
        if (resultRoundIndex === roundIndex || (!round.allowPreviousWinners && resultRoundIndex < roundIndex)) {
          JSON.parse(result.winners_json).forEach((personId) => excluded.add(personId));
        }
      }
      const eligible = db.prepare('SELECT id FROM participants WHERE event_id=?').all(id)
        .map((row) => row.id).filter((personId) => !excluded.has(personId));
      if (eligible.length < prize.count) throw new Error(`符合资格人数只有${eligible.length}人，少于奖项人数${prize.count}人`);
      for (let index = 0; index < prize.count; index++) {
        const other = index + randomInt(eligible.length - index);
        [eligible[index], eligible[other]] = [eligible[other], eligible[index]];
      }
      const winners = eligible.slice(0, prize.count);
      db.prepare('INSERT INTO draw_results(event_id,round_id,prize_id,winners_json,drawn_at) VALUES(?,?,?,?,?)')
        .run(id, roundId, prizeId, JSON.stringify(winners), new Date().toISOString());
      db.exec('COMMIT');
      const result = listResults(id).find((item) => item.roundId === roundId && item.prizeId === prizeId);
      emit(id, 'drawn', result);
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  function publicEvent(id) {
    const event = getEvent(id);
    if (!event) return null;
    const { title, date, description, registrationMode, registrationOpen, fields, theme, rounds } = event;
    return { id, title, date, description, registrationMode, registrationOpen, fields, theme,
      rounds: rounds.map(({ id, name, prizes }) => ({ id, name, prizes })),
      participantCount: participantCount.get(id).count };
  }

  function participantPool(id) {
    const event = getEvent(id);
    if (!event) return null;
    return db.prepare('SELECT values_json FROM participants WHERE event_id=?').all(id).map((row) => {
      const values = JSON.parse(row.values_json);
      const person = { display: String(values[event.displayField] || '参与者') };
      const department = String(values.department || '').trim();
      if (department) person.department = department;
      return person;
    });
  }

  return { getEvent, listEvents, createEvent, updateEvent, insertParticipants, register,
    listParticipants, listResults, drawPrize, publicEvent, participantPool, subscribe };
}
