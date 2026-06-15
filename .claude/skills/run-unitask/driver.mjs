#!/usr/bin/env node
/**
 * UniTask driver — Playwright-based CLI for interacting with the running app.
 *
 * Run from: UniTask/.claude/skills/run-unitask/
 *   node driver.mjs <command> [args...]
 *
 * Commands:
 *   ss [path] [filename]    screenshot (path="" or "uniflux"; saves to screenshots/)
 *   get [path]              print status + first 500 chars of body
 *   click [path] selector   click element, save after-click.png
 *   fill [path] sel value   fill input, save after-fill.png
 *   text [path] selector    print textContent of selector
 *
 * Path notes (IMPORTANT):
 *   - Pass "" for the root ("/") — git bash expands "/" to the Windows FS root
 *   - Other paths: omit the leading slash → "uniflux", "tasks", "uniflux/core"
 *   - Or use the UNITASK_URL env var to override the base URL entirely
 *
 * Examples:
 *   node driver.mjs ss "" home.png          # screenshot of /
 *   node driver.mjs ss uniflux flow.png     # screenshot of /uniflux
 *   node driver.mjs get agenda              # GET /agenda
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.UNITASK_URL || 'http://localhost:3000').replace(/\/$/, '');
const SCREENSHOTS_DIR = resolve(__dirname, 'screenshots');

if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const [,, cmd = 'ss', ...args] = process.argv;

function toUrl(path = '') {
  const clean = path === '' ? '' : (path.startsWith('/') ? path : '/' + path);
  return `${BASE_URL}${clean}`;
}

async function withPage(fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function nav(page, path) {
  const url = toUrl(path);
  await page.goto(url, { waitUntil: 'networkidle' });
  return url;
}

switch (cmd) {
  case 'ss': {
    const [path = '', filename = 'ss.png'] = args;
    const dest = resolve(SCREENSHOTS_DIR, filename);
    await withPage(async (page) => {
      const url = await nav(page, path);
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`Screenshot: ${dest}`);
      console.log(`URL: ${url}`);
      console.log(`Title: ${await page.title()}`);
    });
    break;
  }

  case 'get': {
    const [path = ''] = args;
    const url = toUrl(path);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Body:\n${text.slice(0, 500)}`);
    break;
  }

  case 'click': {
    const [path, selector] = args;
    await withPage(async (page) => {
      await nav(page, path);
      await page.click(selector);
      await page.waitForLoadState('networkidle');
      const dest = resolve(SCREENSHOTS_DIR, 'after-click.png');
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`Clicked "${selector}" → ${dest}`);
    });
    break;
  }

  case 'fill': {
    const [path, selector, value] = args;
    await withPage(async (page) => {
      await nav(page, path);
      await page.fill(selector, value);
      const dest = resolve(SCREENSHOTS_DIR, 'after-fill.png');
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`Filled "${selector}" with "${value}" → ${dest}`);
    });
    break;
  }

  case 'text': {
    const [path, selector] = args;
    await withPage(async (page) => {
      await nav(page, path);
      console.log(await page.textContent(selector));
    });
    break;
  }

  default:
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands: ss, get, click, fill, text');
    process.exit(1);
}
