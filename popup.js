// ---------------------------------------------------------------------------
// popup.js  -  the control panel. Replies and debate progress live in
// chrome.storage.session, so the popup can close (it does whenever you click
// another window) and still show everything the next time you open it.
// ---------------------------------------------------------------------------
const $ = (s) => document.querySelector(s);

const LABEL = {
  idle: 'Ready',
  sending: 'Sending',
  waiting: 'Waiting',
  replying: 'Replying',
  done: 'Done',
  error: 'Problem'
};
const EMPTY_TEXT = 'No reply yet. Send a prompt to start.';

const cols = {};
const lastRes = {};     // newest result per AI, so a column can be redrawn
const hidden = {};      // true = that AI's window is hidden or covered right now
let debate = null;      // current debate state from storage, or null
let panelOpen = false;  // debate setup panel visible?

// ----- columns -----
function buildColumns() {
  for (const id of SITE_ORDER) {
    const S = SITES[id];

    const col = document.createElement('section');
    col.className = 'col';
    col.style.setProperty('--accent', S.color);

    const head = document.createElement('div');
    head.className = 'head';
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    const name = document.createElement('span');
    name.textContent = S.name;
    label.append(check, name);
    const state = document.createElement('span');
    state.className = 'state';
    head.append(label, state);

    const body = document.createElement('div');
    body.className = 'body empty';

    const foot = document.createElement('div');
    foot.className = 'foot';
    const copy = document.createElement('button');
    copy.textContent = 'Copy reply';
    copy.disabled = true;
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(body.textContent);
      copy.textContent = 'Copied';
      setTimeout(() => (copy.textContent = 'Copy reply'), 1200);
    });
    foot.append(copy);

    col.append(head, body, foot);
    $('#cols').append(col);
    cols[id] = { check, state, body, copy };
  }
}

function renderColumn(id, r) {
  lastRes[id] = r;
  const c = cols[id];
  const status = (r && r.status) || 'idle';
  const text = (r && r.text) || '';

  c.state.textContent = LABEL[status];
  c.state.dataset.state = status;

  if (status === 'idle') {
    c.body.className = 'body empty';
    c.body.textContent = EMPTY_TEXT;
  } else if (status === 'error') {
    c.body.className = 'body error';
    c.body.textContent = text;
  } else if (!text) {
    c.body.className = 'body empty';
    if (status === 'sending') c.body.textContent = 'Sending your prompt…';
    else {
      let msg = 'Waiting for the first words…';
      if (hidden[id]) msg += '\n\nThis window is hidden or covered, so the site may not show its reply yet. Click the window to show it.';
      if (r && r.note) msg += '\n\nInfo: ' + r.note;   // what the page looks like (helps to find a problem)
      c.body.textContent = msg;
    }
  } else {
    c.body.className = 'body';
    c.body.textContent = text;
    if (status === 'replying') c.body.scrollTop = c.body.scrollHeight;
  }
  c.copy.disabled = !(text && status !== 'error');
}

// ----- debate view -----
function debateSummary(d) {
  const label = debateStepLabel(d.step, d.rounds);
  if (d.status === 'running') {
    const waiting = SITE_ORDER.filter((id) => !(id in d.pending)).map((id) => SITES[id].name);
    return waiting.length
      ? `${label}. Waiting for ${waiting.join(', ')}.`
      : `${label}. Sending the next round…`;
  }
  if (d.status === 'finished') return 'Debate finished. All three gave a final conclusion.';
  if (d.status === 'stopped') return `Debate stopped during: ${label}.`;
  if (d.status === 'error') return `Debate paused. ${d.error} Press Retry to continue from this step.`;
  return '';
}

function transcript(d) {
  const lines = [`Debate topic: ${d.topic}`, ''];
  for (const entry of d.log) {
    lines.push(`===== ${entry.label} =====`, '');
    for (const id of SITE_ORDER) {
      lines.push(`${SITES[id].name}:`, entry.replies[id] || '(no reply)', '');
    }
  }
  return lines.join('\n').trim();
}

function updateView() {
  const hasDebate = !!debate;
  $('#debatebar').hidden = !hasDebate;
  $('#debatepanel').hidden = hasDebate || !panelOpen;
  $('#chat').hidden = hasDebate || panelOpen;
  $('#debate').disabled = hasDebate && debate.status === 'running';

  if (hasDebate) {
    const running = debate.status === 'running';
    $('#debatetext').textContent = debateSummary(debate);
    $('#debatetopic').textContent = 'Topic: ' + debate.topic;
    $('#stopdebate').hidden = !running;
    $('#retrydebate').hidden = debate.status !== 'error';
    $('#closedebate').hidden = running;
    $('#copylog').disabled = debate.log.length === 0;
  }
}

async function loadAll() {
  const keys = SITE_ORDER.map((id) => 'res_' + id).concat(SITE_ORDER.map((id) => 'hid_' + id), 'debate');
  const data = await chrome.storage.session.get(keys);
  for (const id of SITE_ORDER) hidden[id] = !!data['hid_' + id];
  for (const id of SITE_ORDER) renderColumn(id, data['res_' + id]);
  debate = data.debate || null;
  updateView();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  for (const id of SITE_ORDER) {
    const hc = changes['hid_' + id];
    if (hc) hidden[id] = !!hc.newValue;
    const ch = changes['res_' + id];
    if (ch) renderColumn(id, ch.newValue);
    else if (hc) renderColumn(id, lastRes[id]);
  }
  if (changes.debate) {
    debate = changes.debate.newValue || null;
    updateView();
  }
});

// ----- normal chat -----
function send() {
  const prompt = $('#prompt').value.trim();
  const targets = SITE_ORDER.filter((id) => cols[id].check.checked);
  if (!prompt || !targets.length) return;
  chrome.runtime.sendMessage({ type: 'ask', prompt, targets }).catch(() => {});
  $('#prompt').value = '';
  chrome.storage.local.set({ draft: '' });
}

$('#send').addEventListener('click', send);
$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
});
$('#prompt').addEventListener('input', (e) => chrome.storage.local.set({ draft: e.target.value }));

// ----- debate controls -----
$('#debate').addEventListener('click', () => {
  panelOpen = true;
  $('#debateerror').textContent = '';
  updateView();
  $('#topic').focus();
});

$('#canceldebate').addEventListener('click', () => {
  panelOpen = false;
  updateView();
});

async function startDebate() {
  const topic = $('#topic').value.trim();
  if (!topic) { $('#topic').focus(); return; }
  $('#debateerror').textContent = '';
  $('#startdebate').disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'debate_start',
      topic,
      rounds: Number($('#rounds').value)
    });
    if (res && res.ok) {
      panelOpen = false;
      $('#topic').value = '';
    } else {
      $('#debateerror').textContent = (res && res.error) || 'Could not start the debate.';
    }
  } catch (_) {
    $('#debateerror').textContent = 'Could not start the debate.';
  }
  $('#startdebate').disabled = false;
  updateView();
}
$('#startdebate').addEventListener('click', startDebate);
$('#topic').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); startDebate(); }
});

$('#retrydebate').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'debate_retry' }).catch(() => {});
});
$('#stopdebate').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'debate_stop' }).catch(() => {});
});
$('#closedebate').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'debate_close' }).catch(() => {});
});
$('#copylog').addEventListener('click', async () => {
  if (!debate) return;
  await navigator.clipboard.writeText(transcript(debate));
  $('#copylog').textContent = 'Copied';
  setTimeout(() => ($('#copylog').textContent = 'Copy full debate'), 1200);
});

// ----- windows -----
$('#launch').addEventListener('click', () => {
  $('#launch').textContent = 'Opening…';
  chrome.runtime.sendMessage({ type: 'launch' })
    .then((res) => {
      $('#launch').textContent = 'Open 3 windows';
      if (res && !res.ok) alert('Could not open the windows: ' + res.error);
    })
    .catch(() => {}); // popup may already be closed by the new windows
});

$('#newchats').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'newchats' }).catch(() => {});
});

// ----- "bring hidden windows forward" switch -----
chrome.storage.local.get('autoRaise').then(({ autoRaise }) => {
  $('#autoraise').checked = autoRaise !== false;
});
$('#autoraise').addEventListener('change', (e) => chrome.storage.local.set({ autoRaise: e.target.checked }));

// ----- start up -----
buildColumns();
loadAll();
chrome.storage.local.get('draft').then(({ draft }) => {
  if (draft) $('#prompt').value = draft;
  if (!$('#chat').hidden) $('#prompt').focus();
});
