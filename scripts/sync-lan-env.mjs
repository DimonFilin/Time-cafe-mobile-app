#!/usr/bin/env node
/**
 * Reads Windows ipconfig, picks LAN IPv4 for phone/Expo (Wi‑Fi with gateway preferred),
 * updates mobile-app/.env and .env.example (ports 3000 / 4000 / 9000 unchanged).
 *
 * Usage: node scripts/sync-lan-env.mjs
 *        npm run sync-lan-env
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ENV_TARGETS = [path.join(ROOT, '.env'), path.join(ROOT, '.env.example')];

const URL_VARS = [
  { key: 'EXPO_PUBLIC_SHARED_API_URL', port: 3000 },
  { key: 'EXPO_PUBLIC_CAFE_API_URL', port: 4000 },
  { key: 'EXPO_PUBLIC_BACKEND_FILE_SYSTEM_URL', port: 9000 },
];

const VIRTUAL_ADAPTER_RE =
  /vethernet|wsl|hyper-v|virtualbox|vmware|loopback|tunnel|bluetooth/i;
const PREFERRED_ADAPTER_RE = /wireless|wi-fi|беспроводн|wlan/i;

function runIpconfig() {
  if (process.platform !== 'win32') {
    console.error('sync-lan-env: only Windows (ipconfig) is supported for now.');
    process.exit(1);
  }
  return execSync('chcp 65001 >nul & ipconfig', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
}

/** @returns {{ name: string, disconnected: boolean, ipv4: string[], gateway: string | null }[]} */
function parseIpconfig(text) {
  const adapters = [];
  let current = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.endsWith(':') && !trimmed.includes('::') && trimmed.length > 3) {
      const isAdapterHeader =
        /adapter/i.test(trimmed) ||
        /^[A-Za-zА-Яа-я]/.test(trimmed);
      if (isAdapterHeader && !/^Windows IP Configuration/i.test(trimmed)) {
        if (current) adapters.push(current);
        current = {
          name: trimmed.replace(/:$/, ''),
          disconnected: false,
          ipv4: [],
          gateway: null,
        };
        continue;
      }
    }

    if (!current) continue;

    if (/Media disconnected/i.test(line)) current.disconnected = true;

    const ipMatch = line.match(/IPv4[^:]*:\s*([\d.]+)/i);
    if (ipMatch?.[1]) current.ipv4.push(ipMatch[1]);

    const gwMatch = line.match(/Default Gateway[^:]*:\s*([\d.]+)/i);
    if (gwMatch?.[1]) current.gateway = gwMatch[1];
  }

  if (current) adapters.push(current);
  return adapters;
}

function isUsableLanIp(ip) {
  if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) return false;
  if (ip.startsWith('192.168.56.')) return false;
  if (ip.startsWith('172.') && !ip.startsWith('192.')) return false;
  return true;
}

function scoreAdapter(adapter) {
  if (adapter.disconnected) return -1;
  if (VIRTUAL_ADAPTER_RE.test(adapter.name)) return -1;

  const ip = adapter.ipv4.find(isUsableLanIp);
  if (!ip) return -1;

  let score = 0;
  if (adapter.gateway) score += 10;
  if (PREFERRED_ADAPTER_RE.test(adapter.name)) score += 25;
  if (ip.startsWith('192.168.') && !ip.startsWith('192.168.56.')) score += 15;
  if (/ethernet/i.test(adapter.name) && !/vethernet/i.test(adapter.name)) score += 5;

  return score;
}

export function pickLanIPv4(ipconfigText) {
  const adapters = parseIpconfig(ipconfigText);
  let best = null;
  let bestScore = -1;

  for (const a of adapters) {
    const score = scoreAdapter(a);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }

  if (!best) return null;
  return best.ipv4.find(isUsableLanIp) ?? null;
}

function buildEnvContent(ip) {
  const lines = URL_VARS.map(({ key, port }) => `${key}=http://${ip}:${port}`);
  return `${lines.join('\n')}\n`;
}

function readExistingEnv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function patchEnvContent(content, ip) {
  let next = content;
  let changed = false;

  for (const { key, port } of URL_VARS) {
    const re = new RegExp(`^(${key}=https?:\\/\\/)([^:\\/\\s]+)(:${port}\\s*)$`, 'm');
    if (re.test(next)) {
      const patched = next.replace(re, `$1${ip}$3`);
      if (patched !== next) {
        next = patched;
        changed = true;
      }
    } else {
      const line = `${key}=http://${ip}:${port}`;
      next = next.trimEnd() + (next.endsWith('\n') ? '' : '\n') + line + '\n';
      changed = true;
    }
  }

  return { content: next.endsWith('\n') ? next : next + '\n', changed };
}

function main() {
  const ipconfigOut = runIpconfig();
  const ip = pickLanIPv4(ipconfigOut);

  if (!ip) {
    console.error('Could not detect LAN IPv4 from ipconfig. Connect Wi‑Fi and retry.');
    process.exit(1);
  }

  console.log(`LAN IP: ${ip}`);

  for (const filePath of ENV_TARGETS) {
    const existing = readExistingEnv(filePath);
    const { content, changed } = existing
      ? patchEnvContent(existing, ip)
      : { content: buildEnvContent(ip), changed: true };

    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(ROOT, filePath);
    console.log(changed ? `Updated ${rel}` : `No URL changes in ${rel} (already ${ip})`);
  }

  console.log('\nRestart Expo after sync: npm run start:clear');
}

main();
