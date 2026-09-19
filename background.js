// ---------------------------------------------------------------------------
// background.js  -  screen measuring, window tiling, prompt relay, debate.
// ---------------------------------------------------------------------------
importScripts('config.js', 'debate.js');

// 'normal' = full browser windows. 'popup' = slimmer windows with no tab strip.
const WINDOW_TYPE = 'normal';

// Windows 10/11 gives every browser window an invisible ~7px resize border on
// the left, right and bottom. This compensates so the tiles line up. If your
// tiles look off, change this number (0 turns the fix off).
const WINDOW_FRAME_FIX_WIN = 7;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Statuses that mean "an AI is being asked or is replying right now".
const BUSY = new Set(['sending', 'waiting', 'replying']);

// ----- small storage helpers (session storage survives worker restarts) -----
async function getTabMap() {
  const { tabs = {} } = await chrome.storage.session.get('tabs');
  return tabs;
}
// All writes of results go through one line, so a small "note" update can never
// overwrite a newer reply that was saved at the same moment.
let resChain = Promise.resolve();
function queueResultWrite(fn) {
  const p = resChain.then(fn);
  resChain = p.catch(() => {});
  return p;
}
function setResult(id, status, text = '') {
  if (BUSY.has(status)) ensureTicker();
  return queueResultWrite(() => chrome.storage.session.set({
    ['res_' + id]: { status, text, updated: Date.now() }
  }));
}
// Adds a short diagnostic note to the current result without counting as
// progress (the "updated" time stays the same).
function setNote(id, status, note) {
  return queueResultWrite(async () => {
    const key = 'res_' + id;
    const cur = (await chrome.storage.session.get(key))[key];
    if (cur && cur.status === status && !cur.text) {
      await chrome.storage.session.set({ [key]: { ...cur, note } });
    }
  });
}

// ----- screen measuring -----
async function pickDisplay() {
  const displays = await chrome.system.display.getInfo();
  try {
    const w = await chrome.windows.getLastFocused();
    const cx = w.left + w.width / 2;
    const cy = w.top + w.height / 2;
    const hit = displays.find(
      (d) =>
        cx >= d.bounds.left && cx < d.bounds.left + d.bounds.width &&
        cy >= d.bounds.top && cy < d.bounds.top + d.bounds.height
    );
    if (hit) return hit;
  } catch (_) { /* fall through */ }
  return displays.find((d) => d.isPrimary) || displays[0];
}

// ----- find a usable tab for a site -----
async function tabIfAlive(info) {
  if (!info) return null;
  try { return await chrome.tabs.get(info.tabId); } catch (_) { return null; }
}
async function findTab(id) {
  const map = await getTabMap();
  const stored = await tabIfAlive(map[id]);
  if (stored) return stored;
  const patterns = SITES[id].hosts.map((h) => `https://${h}/*`);
  const found = await chrome.tabs.query({ url: patterns });
  return found[0] || null;
}

// ----- launch: measure the screen, split it in 3, open/position windows -----
async function launch() {
  const display = await pickDisplay();
  const { left, top, width, height } = display.workArea; // excludes the taskbar
  const { os } = await chrome.runtime.getPlatformInfo();
  const fix = os === 'win' ? WINDOW_FRAME_FIX_WIN : 0;

  const n = SITE_ORDER.length;
  const each = Math.floor(width / n);
  const oldMap = await getTabMap();
  const newMap = {};

  for (let i = 0; i < n; i++) {
    const id = SITE_ORDER[i];
    const bounds = {
      left: left + i * each - fix,
      top,
      width: (i === n - 1 ? width - each * (n - 1) : each) + fix * 2,
      height: height + fix
    };

    const existing = await tabIfAlive(oldMap[id]);
    if (existing) {
      await chrome.windows.update(existing.windowId, { state: 'normal' });
      await chrome.windows.update(existing.windowId, bounds);
      newMap[id] = { tabId: existing.id, windowId: existing.windowId };
    } else {
      const win = await chrome.windows.create({
        url: SITES[id].url,
        type: WINDOW_TYPE,
        focused: false,
        ...bounds
      });
      const tabId =
        (win.tabs && win.tabs[0] && win.tabs[0].id) ||
        (await chrome.tabs.query({ windowId: win.id }))[0].id;
      newMap[id] = { tabId, windowId: win.id };
    }
    await setResult(id, 'idle');
  }
  await chrome.storage.session.set({ tabs: newMap });
}

// ----- new chats: reload each site's start page -----
async function newChats() {
  for (const id of SITE_ORDER) {
    const tab = await findTab(id);
    if (tab) await chrome.tabs.update(tab.id, { url: SITES[id].url });
    await setResult(id, 'idle');
  }
}

// ----- talking to the pages -----
async function ping(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    return !!(r && r.ok);
  } catch (_) { return false; }
}

// Makes sure our script is alive in that tab. Pages that were already open
// when the extension was installed or reloaded have no working script, so we
// inject it ourselves instead of asking you to refresh.
async function ensureReady(tabId) {
  for (let i = 0; i < 3; i++) {
    if (await ping(tabId)) return true;
    await sleep(700);
  }
  try {
    // Lets the page keep working when its window is covered (see awake.js).
    await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['awake.js'] });
  } catch (_) { /* not important */ }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['config.js', 'content.js'] });
  } catch (_) { /* page may still be loading or be a login screen */ }
  for (let i = 0; i < 10; i++) {
    if (await ping(tabId)) return true;
    await sleep(800);
  }
  return false;
}

async function sendToTab(tabId, msg) {
  if (!(await ensureReady(tabId))) {
    throw new Error('Could not reach the page. Wait for it to finish loading, make sure you are logged in, then try again.');
  }
  return chrome.tabs.sendMessage(tabId, msg);
}

async function askOne(id, prompt, turn, stableMs) {
  lastHidden[id] = false;
  lastRaise[id] = 0;
  await chrome.storage.session.set({ ['hid_' + id]: false });
  await setResult(id, 'sending');
  try {
    const tab = await findTab(id);
    if (!tab) throw new Error(`No ${SITES[id].name} window found. Press "Open 3 windows" first.`);
    await sendToTab(tab.id, { type: 'ask', prompt, turn, stableMs });
  } catch (e) {
    await setResult(id, 'error', e.message);
    if (turn != null) onDebateStatus({ site: id, status: 'error', text: e.message, turn });
  }
}

// ---------------------------------------------------------------------------
// Ticker. While any AI is being asked or is replying, this sends a small
// "tick" to that page about every second.
//
//  1. When a window is covered by another window, Chrome slows the page's own
//     timers a lot. A tick is a message, not a timer, so it is not slowed. The
//     page uses it to keep its reply watcher running at normal speed.
//  2. If a page stops answering ticks (it was reloaded or closed), or a prompt
//     never gets sent, we show a clear error instead of waiting forever.
// ---------------------------------------------------------------------------
const TICK_MS = 1000;
const LOST_TICKS = 12;            // this many missed ticks in a row = lost page
const SENDING_TIMEOUT_MS = 90000; // a prompt should be out well within this
const RAISE_AFTER_MS = 20000;     // hidden window with no news for this long...
const RAISE_EVERY_MS = 60000;     // ...gets brought forward, at most this often
let tickTimer = null;
let ticking = false;
const missed = {};
const lastHidden = {};
const lastRaise = {};

async function autoRaiseOn() {
  try {
    const { autoRaise } = await chrome.storage.local.get('autoRaise');
    return autoRaise !== false;   // on unless the checkbox was unticked
  } catch (_) { return true; }
}

// Brings a window to the front. A hidden or covered window is treated by
// Chrome like a background tab, and some sites (ChatGPT, Gemini) then stop
// showing the reply until the window is visible again.
async function raiseWindow(windowId) {
  try {
    const w = await chrome.windows.get(windowId);
    await chrome.windows.update(windowId, w.state === 'minimized'
      ? { state: 'normal', focused: true }
      : { focused: true });
  } catch (_) { /* window was closed */ }
}

function ensureTicker() {
  if (!tickTimer) tickTimer = setInterval(tick, TICK_MS);
}
function stopTicker() {
  clearInterval(tickTimer);
  tickTimer = null;
}

// Marks one AI as failed. If a debate is running, it pauses with this error.
async function failSite(id, text) {
  await setResult(id, 'error', text);
  await debateUpdate(async (d) => {
    if (!d || d.status !== 'running' || id in d.pending) return null;
    d.status = 'error';
    d.error = `${SITES[id].name}: ${text}`;
    return { state: d };
  });
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const data = await chrome.storage.session.get(SITE_ORDER.map((id) => 'res_' + id));
    let any = false;
    for (const id of SITE_ORDER) {
      const r = data['res_' + id];
      const recentDone = r && r.status === 'done' && Date.now() - r.updated < 25000;
      if (!r || !(BUSY.has(r.status) || recentDone)) { missed[id] = 0; continue; }
      any = true;

      if (r.status === 'sending') {
        if (Date.now() - r.updated > SENDING_TIMEOUT_MS) {
          await failSite(id, 'The prompt took too long to send. Make sure the window is open and logged in, then try again.');
        }
        continue; // the page is still being prepared, so ticks may not land yet
      }

      let ok = false;
      let res = null;
      let tab = null;
      try {
        tab = await findTab(id);
        if (tab) {
          res = await chrome.tabs.sendMessage(tab.id, { type: 'tick' });
          ok = !!(res && res.ok);
        }
      } catch (_) { /* no answer */ }

      if (ok) {
        missed[id] = 0;
        const hidden = !!res.hidden;
        if (lastHidden[id] !== hidden) {       // tell the popup, so it can explain a stall
          lastHidden[id] = hidden;
          await chrome.storage.session.set({ ['hid_' + id]: hidden });
        }
        if (hidden && r.status !== 'done' &&
            Date.now() - r.updated > RAISE_AFTER_MS &&
            Date.now() - (lastRaise[id] || 0) > RAISE_EVERY_MS &&
            (await autoRaiseOn())) {
          lastRaise[id] = Date.now();
          await raiseWindow(tab.windowId);
        }
        continue;
      }
      if (r.status === 'done') continue;
      missed[id] = (missed[id] || 0) + 1;
      if (missed[id] >= LOST_TICKS) {
        missed[id] = 0;
        await failSite(id, 'Lost contact with the page (was the window reloaded or closed?). Use Retry, or send the prompt again.');
      }
    }
    if (!any) stopTicker();
  } catch (e) {
    console.error(e);
  } finally {
    ticking = false;
  }
}

// ---------------------------------------------------------------------------
// Debate. All progress lives in chrome.storage.session ("debate"), and each
// step advances when the last of the three replies arrives, so it keeps going
// even if the popup is closed or the worker restarts.
// ---------------------------------------------------------------------------
let debateChain = Promise.resolve();

// Runs fn(currentDebate) one at a time. fn returns null (do nothing) or
// { state, after } where state is saved (null removes it) and after() runs next.
function debateUpdate(fn) {
  debateChain = debateChain
    .then(async () => {
      const { debate } = await chrome.storage.session.get('debate');
      const res = await fn(debate ? JSON.parse(JSON.stringify(debate)) : null);
      if (!res) return;
      if ('state' in res) {
        if (res.state) await chrome.storage.session.set({ debate: res.state });
        else await chrome.storage.session.remove('debate');
      }
      if (res.after) res.after().catch(console.error);
    })
    .catch(console.error);
  return debateChain;
}

function dispatchStep(turn, prompts) {
  return Promise.all(SITE_ORDER.map((id) => askOne(id, prompts[id], turn, DEBATE_STABLE_MS)));
}

function promptsForStep(d, replies) {
  const out = {};
  for (const id of SITE_ORDER) {
    if (d.step === 0) out[id] = debateOpening(d.topic, id);
    else if (d.step > d.rounds) out[id] = debateFinal(d.topic, id, replies);
    else out[id] = debateExchange(d.topic, id, replies, d.step, d.rounds);
  }
  return out;
}

function advanceDebate(d) {
  const replies = { ...d.pending };
  d.log.push({ step: d.step, label: debateStepLabel(d.step, d.rounds), replies });
  d.pending = {};

  if (d.step > d.rounds) {          // the final conclusions just came in
    d.status = 'finished';
    return { state: d };
  }
  d.step += 1;
  d.turn += 1;
  const prompts = promptsForStep(d, replies);
  return { state: d, after: () => dispatchStep(d.turn, prompts) };
}

function onDebateStatus(msg) {
  return debateUpdate(async (d) => {
    // While the debate is paused by an error we still keep the replies of the
    // other AIs, so Retry only has to redo the one that failed.
    if (!d || (d.status !== 'running' && d.status !== 'error') || d.turn !== msg.turn) return null;

    if (msg.status === 'error') {
      if (d.status === 'running') {
        d.status = 'error';
        d.error = `${SITES[msg.site].name}: ${msg.text}`;
      }
      return { state: d };
    }
    if (msg.status === 'done') {
      d.pending[msg.site] = msg.text;
      if (d.status !== 'running' || Object.keys(d.pending).length < SITE_ORDER.length) return { state: d };
      return advanceDebate(d);
    }
    if (msg.status === 'replying' && d.pending[msg.site] !== undefined) {
      delete d.pending[msg.site];   // more text arrived after "done"
      return { state: d };
    }
    return null;
  });
}

// Retry after an error: goes on from the same step. AIs that already gave their
// reply keep it, AIs that are still working are left alone, and only the ones
// that failed get the prompt again.
async function retryDebate() {
  const statuses = await chrome.storage.session.get(SITE_ORDER.map((id) => 'res_' + id));
  await debateUpdate(async (d) => {
    if (!d || d.status !== 'error') return null;
    d.status = 'running';
    delete d.error;

    if (Object.keys(d.pending).length >= SITE_ORDER.length) return advanceDebate(d);

    const replies = d.step === 0 || !d.log.length ? {} : d.log[d.log.length - 1].replies;
    const prompts = promptsForStep(d, replies);
    const todo = SITE_ORDER.filter((id) => {
      if (id in d.pending) return false;
      const r = statuses['res_' + id];
      return !r || !BUSY.has(r.status);   // still replying? leave it alone
    });
    const turn = d.turn;
    return {
      state: d,
      after: () => Promise.all(todo.map((id) => askOne(id, prompts[id], turn, DEBATE_STABLE_MS)))
    };
  });
}

async function startDebate(topic, rounds) {
  for (const id of SITE_ORDER) {
    if (!(await findTab(id))) {
      throw new Error(`No ${SITES[id].name} window found. Press "Open 3 windows" first.`);
    }
  }
  for (const id of SITE_ORDER) await setResult(id, 'idle');

  const state = {
    status: 'running',
    topic,
    rounds: Math.max(1, Math.min(6, Number(rounds) || 3)),
    step: 0,
    turn: Date.now(),
    pending: {},
    log: []
  };
  const prompts = promptsForStep(state, {});
  await debateUpdate(async () => ({ state, after: () => dispatchStep(state.turn, prompts) }));
}

// ----- message router -----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'launch') {
    launch()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'newchats') {
    newChats().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'ask') {
    Promise.all((msg.targets || SITE_ORDER).map((id) => askOne(id, msg.prompt)))
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'debate_start') {
    startDebate(msg.topic, msg.rounds)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'debate_retry') {
    retryDebate().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'debate_stop') {
    debateUpdate(async (d) => (d && d.status === 'running' ? { state: { ...d, status: 'stopped' } } : null))
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'debate_close') {
    debateUpdate(async () => ({ state: null })).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'status' && sender.tab && SITES[msg.site]) {
    if (msg.heartbeat) { setNote(msg.site, msg.status, msg.note || ''); return; }
    setResult(msg.site, msg.status, msg.text || '');
    if (msg.turn != null) onDebateStatus(msg);
  }
});

// ----- keep the ticker alive -----
// The worker can be put to sleep by Chrome. An alarm wakes it about every 30
// seconds, and starting the ticker is harmless when nothing is running.
chrome.alarms.get('watchdog').then((a) => {
  if (!a) chrome.alarms.create('watchdog', { periodInMinutes: 0.5 });
}).catch(() => {});
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'watchdog') ensureTicker(); });
ensureTicker();
