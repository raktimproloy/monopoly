import { GameState } from '../../shared/types';

export interface TelemetryBalance {
  id: string;
  name: string;
  balance: number;
  avatar: string;
}

export interface TelemetryEntry {
  id: string;
  text: string;
  lines: string[];
  timestamp: number;
  balances: TelemetryBalance[];
  turnPlayerId?: string;
  dice?: [number, number];
  turnStatus?: string;
}

export function expandTelemetryLines(log: string): string[] {
  const cleaned = log.trim();
  if (!cleaned) return [];

  const segments = cleaned.split(/➡️/).map((s) => s.trim()).filter(Boolean);
  const lines: string[] = [];

  segments.forEach((seg, index) => {
    const prefix = index > 0 ? '➡️ ' : '';
    const subParts = seg.split(/(?<=।)\s*/).map((s) => s.trim()).filter(Boolean);
    if (subParts.length <= 1) {
      lines.push(prefix + seg);
      return;
    }
    subParts.forEach((part, subIdx) => {
      lines.push(subIdx === 0 ? prefix + part : part);
    });
  });

  return lines;
}

export function balancesFromState(state: GameState | null): TelemetryBalance[] {
  if (!state?.players) return [];
  return Object.values(state.players)
    .filter((p) => !p.isBankrupt)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      balance: p.balance,
      avatar: p.avatar,
    }));
}

export function createTelemetryEntry(log: string, state: GameState | null): TelemetryEntry {
  const text = log.trim();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    lines: expandTelemetryLines(text),
    timestamp: Date.now(),
    balances: balancesFromState(state),
    turnPlayerId: state?.currentTurnPlayerId,
    dice: state?.dice ? [state.dice[0], state.dice[1]] : undefined,
    turnStatus: state?.turnStatus,
  };
}

export function getTelemetryLineColor(line: string): string {
  const l = line.toLowerCase();
  if (
    /কিনেছেন|অধিগ্রহণ|ছাড়িয়েছেন|বানিয়েছেন|unmortgage|bought|\[acquire\]|\[upgrade\]/i.test(line)
  ) {
    return 'text-cyber-blue';
  }
  if (/রোল:|rolled|dice|\[nav\]|ছক্কা/i.test(line)) {
    return 'text-slate-200';
  }
  if (
    /ভাড়া|কর|জরিমানা|বিক্রি|ভেঙ|liquidat|paid rent|tax|\[transfer\]|\[downgrade\]|\[liquidate\]/i.test(line)
  ) {
    return 'text-red-400';
  }
  if (/জেল|jail|নিলাম|auction|ট্রাফিক|পুলিশ|\[alert\]/i.test(line)) {
    return 'text-amber-400';
  }
  if (/চুক্তি|trade|\[trade\]|বদল/i.test(line)) {
    return 'text-emerald-400';
  }
  if (/গুপ্তধন|ভাগ্য|chest|chance|card/i.test(line)) {
    return 'text-violet-400';
  }
  if (/দেউলিয়া|bankrupt|জিতেছেন|winner|game over/i.test(line)) {
    return 'text-rose-400';
  }
  if (/go পার|বোনাস|লোন বাবদ|🏦/i.test(line)) {
    return 'text-cyan-400';
  }
  return 'text-slate-400';
}
