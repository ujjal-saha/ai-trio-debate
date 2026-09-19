// ---------------------------------------------------------------------------
// content.js  -  runs inside claude.ai / gemini / chatgpt.
// Finds the message box, types the prompt, presses send, then watches for the
// reply and reports it back. Selectors live in config.js.
// ---------------------------------------------------------------------------
(() => {
  // Never run twice in the same page. The check is tied to this extension's
  // own runtime object, so a copy left behind by an old (reloaded) version of
  // the extension does not block the new one.
  const rt = chrome.runtime;
  if (window.__tripleAIAlive && window.__tripleAIAlive()) return;
  window.__tripleAIAlive = () => { try { return !!rt.id; } catch (_) { return false; } };

  const siteId = Object.keys(SITES).find((id) =>
    SITES[id].hosts.some((h) => location.hostname === h || location.hostname.endsWith('.' + h))
  );
  if (!siteId) return;
  const S = SITES[siteId];

  const STABLE_MS = 3000;             // reply text must stop changing this long
  const LINGER_MS = 20000;            // keep watching this long after "done"
  const MAX_WAIT_MS = 10 * 60 * 1000; // give up on a reply after 10 minutes

  // A sleep that does not depend only on setTimeout. When this window is hidden
  // or covered by another window, Chrome slows page timers down (sometimes to
  // one check per minute). The background worker sends a "tick" message about
  // every second, and each tick wakes up any sleep whose time has come, so the
  // reply watcher keeps running at a normal speed even in a covered window.
  const sleepers = new Set();
  let sleepTimer = 0;
  function armSleepTimer() {
    clearTimeout(sleepTimer);
    sleepTimer = 0;
    if (!sleepers.size) return;
    let next = Infinity;
    for (const s of sleepers) next = Math.min(next, s.due);
    sleepTimer = setTimeout(flushSleepers, Math.max(0, next - Date.now()));
  }
  function flushSleepers() {
    const now = Date.now();
    for (const s of [...sleepers]) {
      if (now >= s.due) { sleepers.delete(s); s.resolve(); }
    }
    armSleepTimer();
  }
  const sleep = (ms) => new Promise((resolve) => {
    sleepers.add({ due: Date.now() + ms, resolve });
    armSleepTimer();
  });
  const findOne = (sels) => {
    for (const s of sels) { const el = document.querySelector(s); if (el) return el; }
    return null;
  };
  const findAll = (sels) => {
    for (const s of sels) {
      const els = document.querySelectorAll(s);
      if (els.length) return [...els];
    }
    return [];
  };
  async function waitFor(fn, timeout = 10000, step = 250) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const cleanText = (s) => (s || '').replace(/\n{3,}/g, '\n\n').trim();
  const readInput = (el) => (el.value !== undefined ? el.value : el.innerText || el.textContent || '');
  const isDisabled = (b) => b.disabled || b.getAttribute('aria-disabled') === 'true';

  // Turn a reply element into clean answer text.
  function tidy(text) {
    let t = cleanText(text);
    if (S.label) t = t.replace(S.label, '').trim();

    // Some pages show a summary line that the answer then repeats; drop the copy.
    const parts = t.split(/\n\s*\n/);
    if (parts.length > 1) {
      const first = parts[0].trim();
      const rest = parts.slice(1).join('\n\n').trim();
      if (first && rest.startsWith(first)) t = rest;
    }

    // Some pages put extra lines (for example a "thinking" summary such as
    // "Considering how to answer...") between a first line and the real answer,
    // which then starts with that same first line again. Keep only the real answer.
    // Safety rules: the first line must be long, and we only cut when the part
    // before the real answer is small (under half of the text) or when it has the
    // typical sign of this page noise: the same line repeated more than once.
    const lines = t.split('\n');
    const firstIdx = lines.findIndex((l) => l.trim());
    if (firstIdx >= 0) {
      const first = lines[firstIdx].trim();
      if (first.length >= 25) {
        for (let j = firstIdx + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith(first)) {
            const before = lines.slice(firstIdx + 1, j).map((l) => l.trim().toLowerCase().replace(/[.\s]+$/, '')).filter((l) => l.length >= 15);
            const repeated = before.some((l, i) => before.indexOf(l) !== i);
            const cut = lines.slice(0, j).join('\n').length;
            if (repeated || cut < t.length * 0.5) t = lines.slice(j).join('\n').trim();
            break;
          }
        }
      }
    }
    return t;
  }

  // Reads the answer text of one reply element. If config.js names an inner
  // element that holds just the answer (replyInner), read from there so extra
  // parts of the page (thinking summaries, buttons) are left out.
  // replyInnerAll: true means the answer may come in several pieces: read them all.
  function replyText(el) {
    if (S.replyInner) {
      if (S.replyInnerAll) {
        const found = [...el.querySelectorAll(S.replyInner)];
        const top = found.filter((n) => !found.some((o) => o !== n && o.contains(n)));
        if (top.length) return tidy(top.map((n) => n.innerText).join('\n\n'));
      } else {
        const inner = el.querySelector(S.replyInner);
        if (inner) return tidy(inner.innerText);
      }
    }
    return tidy(el.innerText);
  }

  // ----- typing into the message box -----
  // These boxes are rich-text editors, so setting .value or .textContent does
  // nothing. We insert text the way a real keystroke/paste would.
  function setText(el, text) {
    el.focus();

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { /* try paste */ }

    if (!ok || !norm(readInput(el)).includes(norm(text).slice(0, 30))) {
      sel.removeAllRanges();
      sel.addRange(range);
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }
  }

  function pressEnter(el) {
    el.focus();
    const o = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    el.dispatchEvent(new KeyboardEvent('keydown', o));
    el.dispatchEvent(new KeyboardEvent('keypress', o));
    el.dispatchEvent(new KeyboardEvent('keyup', o));
  }

  const generating = () => !!findOne(S.stop);

  // ----- finding the NEW reply -----
  // Counting reply boxes is not enough on its own. Some sites keep only the
  // newest few messages on the page and remove older ones as the chat grows, so
  // from about the third answer on the count stops going up even though a new
  // reply is on screen. So a reply also counts as new when the last one on the
  // page says something different from the last one before we sent the prompt.
  // ("Different" means the first 40 characters differ, so a small late edit of
  // the OLD reply, such as added footnotes, is not mistaken for a new reply.)
  const samePrefix = (a, b) => {
    const x = norm(a).slice(0, 40), y = norm(b).slice(0, 40);
    return !!x && !!y && (x.startsWith(y) || y.startsWith(x));
  };
  function findNewReply(base) {
    const replies = findAll(S.reply);
    const count = replies.length;
    if (!count) return { el: null, text: '', count, lastLen: 0 };
    const last = replies[count - 1];
    const text = replyText(last);
    if (count > base.count) return { el: last, text, count, lastLen: text.length };
    if (text && !samePrefix(text, base.text)) return { el: last, text, count, lastLen: text.length };
    return { el: null, text: '', count, lastLen: text.length };
  }

  // ----- run one prompt -----
  let runId = 0;

  async function run(prompt, opts) {
    const my = ++runId;
    const report = (status, text = '', extra = {}) => {
      if (my !== runId) return;
      try {
        rt.sendMessage({ type: 'status', site: siteId, status, text, turn: opts.turn, ...extra }).catch(() => {});
      } catch (_) { /* extension was reloaded; nothing to do */ }
    };

    try {
      const input = await waitFor(() => findOne(S.input), 12000);
      if (!input) {
        return report('error', 'Could not find the message box. Log in first, or update the selectors in config.js.');
      }

      // Remember what the page looked like before we send: how many replies, and
      // what the last one said. See findNewReply() for why both are needed.
      const baseEls = findAll(S.reply);
      const base = { count: baseEls.length, text: baseEls.length ? replyText(baseEls[baseEls.length - 1]) : '' };

      setText(input, prompt);
      await sleep(400);
      if (!norm(readInput(input)).includes(norm(prompt).slice(0, 30))) {
        return report('error', 'Could not type into the message box.');
      }

      const btn = await waitFor(() => {
        const b = findOne(S.send);
        return b && !isDisabled(b) ? b : null;
      }, 4000, 150);
      if (btn) btn.click(); else pressEnter(input);

      // Did the prompt actually go out? Look everything up fresh each time,
      // because sites like Gemini rebuild the message box after you send, which
      // leaves our old reference pointing at a dead element that still "holds"
      // the text.
      const probe = norm(prompt).slice(0, 30);
      const wentOut = () => {
        if (generating() || findNewReply(base).el) return true;
        const box = findOne(S.input);
        return !box || !norm(readInput(box)).includes(probe); // emptied or replaced
      };
      let went = await waitFor(wentOut, 15000, 250);
      if (!went) {
        const box = findOne(S.input);
        if (box) pressEnter(box);   // the box still holds the text, so try Enter
        went = await waitFor(wentOut, 8000, 250);
      }

      report('waiting');
      // Even if the send could not be confirmed we keep watching: some pages
      // simply give no clear signal. The watcher gives up on its own if
      // no reply ever starts.
      const diag = () =>
        `(box found: ${!!findOne(S.input)}, send button: ${!!findOne(S.send)}, ` +
        `replies: ${findAll(S.reply).length} before: ${base.count})`;
      await watchReply(base, report, my, opts.stableMs || STABLE_MS, {
        startTimeoutMs: went ? 180000 : 45000,
        startTimeoutMsg: went
          ? 'Sent, but no reply appeared. ' + diag()
          : 'The prompt was typed but could not be sent. ' + diag()
      });
    } catch (e) {
      report('error', String(e && e.message ? e.message : e));
    }
  }

  // ----- reply detection -----
  // A reply is finished when: real answer text exists, the "stop" button is
  // gone, and the text has stopped changing for stableMs. After reporting
  // "done" we keep watching for LINGER_MS, and if more text shows up we go
  // back to "replying" instead of missing it.
  async function watchReply(base, report, my, stableMs, startOpts) {
    const t0 = Date.now();
    let started = false;
    let last = '';
    let changedAt = Date.now();
    let lastReport = 0;
    let lastNote = 0;
    let doneAt = 0;

    while (Date.now() - t0 < MAX_WAIT_MS && my === runId) {
      await sleep(500);

      const found = findNewReply(base);
      const busy = generating();
      const isNew = !!found.el;
      const text = found.text;

      // While no answer text has been seen, tell the popup what this page looks
      // like every few seconds. It shows this under "Waiting for the first
      // words" so a stall can be understood from one screenshot.
      if (!text && !doneAt && Date.now() - lastNote > 4000) {
        lastNote = Date.now();
        report(started ? 'replying' : 'waiting', '', {
          heartbeat: true,
          note: `replies on page: ${found.count} (before: ${base.count}), last reply: ${found.lastLen} chars, ` +
                `stop button: ${busy ? 'yes' : 'no'}, window hidden: ${document.visibilityState === 'hidden' ? 'yes' : 'no'}`
        });
      }

      if (!started) {
        if (!isNew && !busy) {
          if (Date.now() - t0 > startOpts.startTimeoutMs) {
            return report('error', startOpts.startTimeoutMsg);
          }
          continue;
        }
        started = true;
        changedAt = Date.now();
        report('replying', text);
        lastReport = Date.now();
      }

      if (doneAt && busy) {            // it started generating again
        doneAt = 0;
        report('replying', text);
        lastReport = Date.now();
      }

      if (text !== last) {
        last = text;
        changedAt = Date.now();
        if (doneAt) {                  // late words arrived after "done"
          doneAt = 0;
          report('replying', text);
          lastReport = Date.now();
        } else if (Date.now() - lastReport > 700) {
          report('replying', text);
          lastReport = Date.now();
        }
      }

      if (!doneAt && !busy && isNew && text && Date.now() - changedAt >= stableMs) {
        doneAt = Date.now();
        report('done', text);
      }
      if (doneAt && Date.now() - doneAt > LINGER_MS) return;
    }

    if (my === runId && !doneAt) {
      if (last) report('done', last);
      else report('error', 'Timed out waiting for a reply.');
    }
  }

  rt.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === 'ping') {
      sendResponse({ ok: true });
    } else if (msg.type === 'tick') {
      flushSleepers();            // wake any sleep that is due (see above)
      // "hidden" = this window is covered or minimized right now. The
      // background worker uses it to explain a stall and to bring the window forward.
      sendResponse({ ok: true, hidden: document.visibilityState === 'hidden' });
    } else if (msg.type === 'ask') {
      sendResponse({ ok: true }); // acknowledge right away; results come via 'status'
      run(msg.prompt, { turn: msg.turn, stableMs: msg.stableMs });
    }
  });
})();
