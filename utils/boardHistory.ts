import { Player } from '../../shared/types';
import historyTheme from './dummy.json';

export interface BoardHistoryEntry {
  player: Player | null;
  text: string;
}

type HistoryRule = (typeof historyTheme.rules)[number];

const TRAFFIC_RULE_IDS = new Set(['traffic_fine', 'traffic_jail', 'police_spawn', 'police_leave']);

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

function extractAmount(log: string, match?: RegExpMatchArray | null): string | null {
  if (match?.[2]) return match[2];
  const m = log.match(/\(৳([\d,]+)\)|কিনেছেন\s+৳([\d,]+)|\+\s*৳([\d,]+)|৳([\d,]+)/);
  return m ? m[1] || m[2] || m[3] || m[4] : null;
}

function findTwoPlayers(log: string, players: Player[]): [Player | null, Player | null] {
  const found = players.filter((p) => log.includes(p.name));
  return [found[0] ?? null, found[1] ?? null];
}

function extractTrafficReason(log: string): string {
  const m = log.match(/ট্রাফিক পুলিশের হাতে ধরা!\s*(.+?)\s*৳[\d,]+\s*জরিমানা/i);
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
  if (/GO পার|লোন বাবদ|🏦/i.test(clause)) return true;
  if (/-এ ভাড়া ৳/i.test(clause) && /ভাড়া দিয়েছেন/i.test(fullLog)) return true;
  return false;
}

function findLastOutcomeClause(log: string): string | null {
  const clauses = splitLogClauses(log);
  for (let i = clauses.length - 1; i >= 0; i--) {
    if (isIntermediateClause(clauses[i], log)) continue;
    return clauses[i];
  }
  return null;
}

function parseRentPaid(clause: string, fullLog: string, players: Player[]): BoardHistoryEntry | null {
  let m = clause.match(/(.+?)\s+ভাড়া দিয়েছেন\s+৳([\d,]+)\s*\(([^)]+)-কে\)/i);
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
    const rm = rest.match(/^(.+?)-কে\s+৳([\d,]+)\s+ভাড়া দিয়েছেন/i);
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
  const m = log.match(/^(.+?)\s+ভাড়া দিয়েছেন/i);
  if (m) return cleanText(m[1]);

  for (const clause of splitLogClauses(log).reverse()) {
    const payerMatch = clause.match(/^(.+?)\s+.+?-কে\s+৳[\d,]+\s+ভাড়া দিয়েছেন/i);
    if (payerMatch) return cleanText(payerMatch[1]);
  }
  return null;
}

function extractRentReceiver(log: string): string | null {
  const m = log.match(/ভাড়া দিয়েছেন\s+৳[\d,]+\s*\(([^)]+)-কে\)/i);
  return m ? cleanText(m[1]) : null;
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
  return /\+\s*৳[\d,]+|\(৳[\d,]+\)/.test(log);
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
  if (!log?.trim() || shouldSkipLog(log)) return null;

  const player = findPlayerInLog(log, players);

  if (/ট্রাফিক পুলিশ/i.test(log)) {
    const trafficEntry = parseTrafficLog(log, players, player);
    if (trafficEntry) return trafficEntry;
  }

  // Compound roll logs: only show the last meaningful outcome (e.g. rent paid, not GO/loan/rent-due)
  if (/রোল:|➡️/i.test(log)) {
    if (/ভাড়া দিয়েছেন/i.test(log)) {
      const clauses = splitLogClauses(log);
      for (let i = clauses.length - 1; i >= 0; i--) {
        if (!/ভাড়া দিয়েছেন/i.test(clauses[i])) continue;
        const rentEntry = parseRentPaid(clauses[i], log, players);
        if (rentEntry) return rentEntry;
      }
    }

    const lastClause = findLastOutcomeClause(log);
    if (lastClause) {
      const entry = parseChunk(lastClause, log, players, player);
      if (entry) return entry;
    }
    return null;
  }

  if (/ভাড়া দিয়েছেন/i.test(log)) {
    const rentEntry = parseRentPaid(log, log, players);
    if (rentEntry) return rentEntry;
  }

  return parseChunk(log, log, players, player);
}

export function parseBoardHistoryLogs(log: string, players: Player[]): BoardHistoryEntry[] {
  const entry = parseBoardHistoryLog(log, players);
  return entry ? [entry] : [];
}

export { historyTheme };
