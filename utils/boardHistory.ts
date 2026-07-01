import { Player } from '@/shared/types';
import historyTheme from './dummy.json';
import { expandTelemetryLines } from './telemetryLog';

export interface BoardHistoryEntry {
  player: Player | null;
  text: string;
}

type HistoryRule = (typeof historyTheme.rules)[number];

const TRAFFIC_RULE_IDS = new Set(['traffic_fine', 'traffic_jail', 'police_spawn', 'police_leave']);

/** Matches both Unicode forms of the Bengali retroflex "r" in ভাড়া/ভাড়া. */
const RENT = 'ভ(?:াড়া|াড়া)';
const DIYE = 'দ(?:িয়|িয়)েছেন';
const RENT_PAID = new RegExp(`${RENT}\\s+${DIYE}`, 'i');
const RENT_DUE = new RegExp(`${RENT}\\s+৳`, 'i');

function normalizeHistoryLog(log: string): string {
  return log.normalize('NFC').replace(/\u09DC/g, '\u09DC');
}

function findPlayerInLog(log: string, players: Player[]): Player | null {
  const sorted = [...players].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((p) => log.includes(p.name)) || null;
}

function cleanText(text: string): string {
  return text
    .replace(/\n/g, ' ')
    .replace(/\s*\(ডাবল!\)\s*/g, '')
    .replace(/[।.]+$/g, '')
    .trim();
}

function shouldSkipLog(log: string): boolean {
  return historyTheme.skipLogs.some((p) => new RegExp(p, 'i').test(log));
}

function shouldSkipSegment(seg: string): boolean {
  const s = seg.trim();
  if (!s) return true;
  if (historyTheme.skipSegments.some((p) => new RegExp(p, 'i').test(s))) return true;
  return false;
}

function extractTileName(log: string, match: RegExpMatchArray | null, player: Player | null): string {
  const quoted = log.match(/"([^"]+)"/);
  if (quoted) return quoted[1];

  if (match?.[1] && !/^\d/.test(match[1])) {
    let t = cleanText(match[1]);
    if (player && t.startsWith(player.name)) {
      t = cleanText(t.slice(player.name.length));
    }
    if (t && !/কিনেছেন|অধিগ্রহণ/.test(t)) return t;
  }

  const beforeBuy = log.match(/(?:^|\s)(.+?)\s+কিনেছেন\s+৳/);
  if (beforeBuy) {
    let t = cleanText(beforeBuy[1]);
    if (player && t.startsWith(player.name)) {
      t = cleanText(t.slice(player.name.length));
    }
    if (t) return t;
  }

  const beforeAcquire = log.match(/(?:^|\s)(.+?)\s+অধিগ্রহণ করেছেন/);
  if (beforeAcquire) {
    let t = cleanText(beforeAcquire[1]);
    if (player && t.startsWith(player.name)) {
      t = cleanText(t.slice(player.name.length));
    }
    if (t) return t;
  }

  return '';
}

const AMOUNT = '[0-9০-৯,]+';

function extractAmount(log: string, match?: RegExpMatchArray | null): string | null {
  if (match?.[2]) return match[2];
  const m = log.match(new RegExp(`\\(৳(${AMOUNT})\\)|কিনেছেন\\s+৳(${AMOUNT})|\\+\\s*৳(${AMOUNT})|৳(${AMOUNT})`));
  return m ? m[1] || m[2] || m[3] || m[4] : null;
}

function parseSimpleMoney(log: string, players: Player[]): BoardHistoryEntry | null {
  const player = findPlayerInLog(log, players);

  const gain = log.match(new RegExp(`\\+৳(${AMOUNT})\\s*পেয়েছেন`));
  if (gain && !/GO\s*পার|GO-তে/i.test(log)) {
    return { player, text: `${player?.name || ''} ৳${gain[1]} পেয়েছেন` };
  }

  const loss = log.match(new RegExp(`-৳(${AMOUNT})\\s*দ(?:িয়|িয়)েছেন`));
  if (loss && !/\S+-কে\s*৳/.test(log)) {
    return { player, text: `${player?.name || ''} ৳${loss[1]} দিয়েছেন` };
  }

  const birthday = log.match(new RegExp(`প্রত্যেকে আপনাকে ৳(${AMOUNT})`));
  if (birthday) {
    return { player, text: `সবাই ${player?.name || ''}-কে ৳${birthday[1]} দিয়েছেন` };
  }

  const celebration = log.match(new RegExp(`প্রত্যেকে ৳(${AMOUNT})\\s*করে\\s*দ(?:িয়|িয়)েছেন`));
  if (celebration && /খেলোয়াড়কে|খেলোয়াড়কে/.test(log)) {
    return { player, text: `${player?.name || ''} সবাইকে ৳${celebration[1]} দিয়েছেন` };
  }

  return null;
}

function parsePeerPayment(log: string, players: Player[]): BoardHistoryEntry | null {
  const re = new RegExp(
    `([^\\s(,]+)\\s+([^\\s-]+)-কে\\s+৳(${AMOUNT})\\s+দ(?:িয়|িয়)েছেন`,
    'gi'
  );
  const matches = [...log.matchAll(re)];
  if (matches.length === 0) return null;

  if (/চুক্তি সম্পন্ন|trade complete/i.test(log)) {
    const names = new Set<string>();
    for (const m of matches) {
      names.add(cleanText(m[1]));
      names.add(cleanText(m[2]));
    }
    const [a, b] = [...names];
    if (a && b) {
      const payer = players.find((p) => p.name === a) || findPlayerInLog(log, players);
      if (matches.length === 1) {
        return {
          player: payer,
          text: `${cleanText(matches[0][1])} ${cleanText(matches[0][2])}-কে ৳${matches[0][3]} দিয়েছেন`,
        };
      }
      return { player: payer, text: `${a} ও ${b} ট্রেড করেছেন` };
    }
  }

  const m = matches[0];
  const payerName = cleanText(m[1]);
  const receiverName = cleanText(m[2]);
  const payer = players.find((p) => p.name === payerName) || findPlayerInLog(log, players);
  return {
    player: payer,
    text: `${payerName} ${receiverName}-কে ৳${m[3]} দিয়েছেন`,
  };
}

function findTwoPlayers(log: string, players: Player[]): [Player | null, Player | null] {
  const found = players.filter((p) => log.includes(p.name));
  return [found[0] ?? null, found[1] ?? null];
}

function extractTrafficReason(log: string): string {
  const m = log.match(new RegExp(`ট্রাফিক পুলিশের হাতে ধরা!\\s*(.+?)\\s*৳${AMOUNT}\\s*জরিমানা`, 'i'));
  return m ? cleanText(m[1]) : '';
}

function splitLogClauses(log: string): string[] {
  const split = historyTheme.settings.segmentSplit;
  return log.split(new RegExp(`${split.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|।`, 'g'))
    .map((s) => s.trim())
    .filter(Boolean);
}

function isIntermediateClause(clause: string, fullLog: string): boolean {
  if (shouldSkipSegment(clause)) return true;
  if (/লোন বাবদ|🏦/i.test(clause)) return true;
  if (/GO পার/i.test(clause) && RENT_PAID.test(fullLog)) return true;
  // Skip rent-due segments when a paid-rent line exists in the same log.
  if (RENT_DUE.test(clause) && !RENT_PAID.test(clause) && RENT_PAID.test(fullLog)) return true;
  return false;
}

/** Server paidRent template: "{payer} ভাড়া দিয়েছেন ৳{amount} ({owner}-কে)" */
function parsePaidRentLog(log: string, players: Player[]): BoardHistoryEntry | null {
  const re = new RegExp(
    `([\\w\\u0980-\\u09FF]+)\\s+${RENT}\\s+${DIYE}\\s+৳(${AMOUNT})\\s*\\((.+?)-কে\\)[।.]?`,
    'gi'
  );

  let last: RegExpMatchArray | null = null;
  for (const m of log.matchAll(re)) last = m;
  if (!last) return null;

  const payerName = cleanText(last[1]);
  const receiverName = cleanText(last[3]);
  const payer = players.find((p) => p.name === payerName) || findPlayerInLog(log, players);

  return {
    player: payer,
    text: `${payerName} ${receiverName}-কে ৳${last[2]} ভাড়া দিয়েছেন`,
  };
}

function parseRentPaid(clause: string, fullLog: string, players: Player[]): BoardHistoryEntry | null {
  const fromServer = parsePaidRentLog(clause, players);
  if (fromServer) return fromServer;

  let m = clause.match(new RegExp(`^(.+?)\\s+${RENT}\\s+\\S+\\s+৳(${AMOUNT})\\s*\\((.+?)-কে\\)[।.]?`, 'i'));
  if (m) {
    const payerName = cleanText(m[1]);
    const payer = players.find((p) => p.name === payerName) || findPlayerInLog(fullLog, players);
    return {
      player: payer,
      text: `${payerName} ${cleanText(m[3])}-কে ৳${m[2]} ভাড়া দিয়েছেন`,
    };
  }

  const sorted = [...players].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    if (!clause.startsWith(p.name)) continue;
    const rest = clause.slice(p.name.length).trim();
    const rm = rest.match(new RegExp(`^(.+?)-কে(?:\\s+আরও)?\\s+৳(${AMOUNT})\\s+${RENT}\\s+\\S+`, 'i'));
    if (rm) {
      return {
        player: p,
        text: `${p.name} ${cleanText(rm[1])}-কে ৳${rm[2]} ভাড়া দিয়েছেন`,
      };
    }
  }

  return null;
}

function extractRentPayer(log: string): string | null {
  const re = new RegExp(`([\\w\\u0980-\\u09FF]+)\\s+${RENT}\\s+${DIYE}`, 'gi');
  let last: string | null = null;
  for (const m of log.matchAll(re)) last = cleanText(m[1]);
  if (last) return last;

  for (const clause of splitLogClauses(log).reverse()) {
    const payerMatch = clause.match(
      new RegExp(`^(.+?)\\s+.+?-কে\\s+৳${AMOUNT}\\s+${RENT}\\s+${DIYE}`, 'i')
    );
    if (payerMatch) return cleanText(payerMatch[1]);
  }
  return null;
}

function extractRentReceiver(log: string): string | null {
  const m = log.match(new RegExp(`${RENT}\\s+${DIYE}\\s+৳${AMOUNT}\\s*\\((.+?)-কে\\)[।.]?`, 'i'));
  if (m) return cleanText(m[1]);

  const legacy = log.match(new RegExp(`${RENT}\\s+\\S+\\s+৳${AMOUNT}\\s*\\((.+?)-কে\\)`, 'i'));
  return legacy ? cleanText(legacy[1]) : null;
}

function findLastOutcomeClause(log: string): string | null {
  const clauses = splitLogClauses(log);
  for (let i = clauses.length - 1; i >= 0; i--) {
    if (isIntermediateClause(clauses[i], log)) continue;
    return clauses[i];
  }
  return null;
}

function fillTemplate(
  template: string,
  player: Player | null,
  match: RegExpMatchArray | null,
  log: string,
  players: Player[]
): string {
  let out = template;
  const [p1, p2] = findTwoPlayers(log, players);
  const winner = players.find((p) => /জিতেছেন|winner/i.test(log) && log.includes(p.name));

  const rentPayer = extractRentPayer(log);
  const rentReceiver = extractRentReceiver(log);

  const vars: Record<string, string> = {
    player: rentPayer || player?.name || p1?.name || '',
    payer: rentPayer || player?.name || p1?.name || '',
    receiver: rentReceiver || '',
    winner: winner?.name || player?.name || '',
    player1: p1?.name || '',
    player2: p2?.name || '',
    amount: extractAmount(log, match) || '',
    tile: extractTileName(log, match, player),
    reason: extractTrafficReason(log),
  };

  if (match) {
    for (let i = 1; i < match.length; i++) {
      vars[String(i)] = match[i] ? cleanText(match[i]) : '';
    }
  }

  // Rent paid: prefer explicit payer/receiver from log structure
  if (rentReceiver) {
    vars['2'] = rentReceiver;
    vars.receiver = rentReceiver;
  }

  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  }

  return cleanText(out);
}

function applyRule(
  rule: HistoryRule,
  text: string,
  log: string,
  players: Player[],
  defaultPlayer: Player | null
): BoardHistoryEntry | null {
  if (!rule.enabled) return null;

  const match = text.match(new RegExp(rule.match, 'i'));
  if (!match) return null;

  const player = defaultPlayer ?? findPlayerInLog(log, players);
  const rentPayerName = extractRentPayer(log);
  const entryPlayer = rentPayerName
    ? players.find((p) => p.name === rentPayerName) || player
    : player;

  let say = rule.say;
  if ('sayAlt' in rule && rule.sayAlt && (varsHasAmount(log) || match[2])) {
    say = rule.sayAlt;
  }
  if ('sayFallback' in rule && rule.sayFallback) {
    const preview = fillTemplate(say, entryPlayer, match, log, players);
    if (/\{[^}]+\}/.test(preview) || !preview) {
      say = rule.sayFallback;
    }
  }

  const display = fillTemplate(say, entryPlayer, match, log, players);
  if (!display || /\{[^}]+\}/.test(display)) return null;

  return { player: entryPlayer, text: display };
}

function varsHasAmount(log: string): boolean {
  return new RegExp(`\\+\\s*৳${AMOUNT}|\\(৳${AMOUNT}\\)`).test(log);
}

function parseTrafficLog(
  log: string,
  players: Player[],
  defaultPlayer: Player | null
): BoardHistoryEntry | null {
  for (const rule of historyTheme.rules) {
    if (!TRAFFIC_RULE_IDS.has(rule.id)) continue;
    const entry = applyRule(rule, log, log, players, defaultPlayer);
    if (entry) return entry;
  }
  return null;
}

function parseChunk(
  chunk: string,
  fullLog: string,
  players: Player[],
  defaultPlayer: Player | null
): BoardHistoryEntry | null {
  const text = cleanText(chunk);
  if (!text) return null;

  for (const rule of historyTheme.rules) {
    const entry = applyRule(rule, text, fullLog, players, defaultPlayer);
    if (entry) return entry;
  }

  return null;
}

/** Narrative board history — templates from client/utils/dummy.json (Bengali). */
export function parseBoardHistoryLog(log: string, players: Player[]): BoardHistoryEntry | null {
  const normalized = normalizeHistoryLog(log);
  if (!normalized?.trim() || shouldSkipLog(normalized)) return null;

  const player = findPlayerInLog(normalized, players);

  if (/ট্রাফিক পুলিশ/i.test(normalized)) {
    const trafficEntry = parseTrafficLog(normalized, players, player);
    if (trafficEntry) return trafficEntry;
  }

  const paidRent = parsePaidRentLog(normalized, players);
  if (paidRent) return paidRent;

  if (RENT_PAID.test(normalized)) {
    const clauses = splitLogClauses(normalized);
    for (let i = clauses.length - 1; i >= 0; i--) {
      if (!RENT_PAID.test(clauses[i])) continue;
      const rentEntry = parseRentPaid(clauses[i], normalized, players);
      if (rentEntry) return rentEntry;
    }
  }

  const peerPayment = parsePeerPayment(normalized, players);
  if (peerPayment) return peerPayment;

  const simpleMoney = parseSimpleMoney(normalized, players);
  if (simpleMoney) return simpleMoney;

  if (/রোল:|➡️/i.test(normalized)) {
    const rentFromRoll = parsePaidRentLog(normalized, players);
    if (rentFromRoll) return rentFromRoll;

    const lastClause = findLastOutcomeClause(normalized);
    if (lastClause) {
      const rentInClause = parsePaidRentLog(lastClause, players);
      if (rentInClause) return rentInClause;

      const entry = parseChunk(lastClause, normalized, players, player);
      if (entry) return entry;
    }
    return null;
  }

  const chunkEntry = parseChunk(normalized, normalized, players, player);
  if (chunkEntry) return chunkEntry;

  for (const line of expandTelemetryLines(normalized)) {
    const rentLine = parsePaidRentLog(line, players);
    if (rentLine) return rentLine;
    const lineEntry = parseChunk(line, normalized, players, player);
    if (lineEntry) return lineEntry;
  }

  return null;
}

export function parseBoardHistoryLogs(log: string, players: Player[]): BoardHistoryEntry[] {
  const entry = parseBoardHistoryLog(log, players);
  return entry ? [entry] : [];
}

export { historyTheme };
