<div align="center">

# 🔱 Triple AI Split

### ⟪ Claude ⟫ ═ ⟪ Gemini ⟫ ═ ⟪ ChatGPT ⟫
**One prompt. Three minds. One screen.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge&logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.3.1-success?style=for-the-badge)
![Chrome](https://img.shields.io/badge/Chrome-111%2B-yellow?style=for-the-badge&logo=googlechrome&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Use](https://img.shields.io/badge/use-personal-lightgrey?style=for-the-badge)

</div>

---

## ✨ What is this?

**Triple AI Split** is a Chrome / Edge extension that lets you talk to **three AI assistants at the same time**.

With one click it opens **Claude**, **Gemini** and **ChatGPT** in three browser windows, tiled side by side, each one taking exactly **⅓ of your screen**. You type **one prompt** in the extension popup, and it is sent to all three. When they finish, you see **all three answers together** and can copy any of them.

Want them to argue? Press **Debate** — the three AIs debate your topic round by round, and each one gives a **final conclusion** at the end. 🥊

```
┌────────────────────┬────────────────────┬────────────────────┐
│                    │                    │                    │
│     🟠 CLAUDE      │     🔵 GEMINI      │     🟢 CHATGPT     │
│    (claude.ai)     │ (gemini.google.com)│    (chatgpt.com)   │
│                    │                    │                    │
│      ⅓ screen      │      ⅓ screen      │      ⅓ screen      │
└────────────────────┴────────────────────┴────────────────────┘
                              ▲
                              │  one prompt from the popup
                       ┌──────┴───────┐
                       │ 🔱 Triple AI │
                       └──────────────┘
```

---

## 🚀 Features

| | Feature | What it does |
|---|---|---|
| 🪟 | **Auto tiling** | Measures your screen and opens 3 windows, left → right: Claude, Gemini, ChatGPT |
| ⌨️ | **One prompt for all** | Types your prompt into each site and presses send for you |
| 👀 | **Reply detection** | Knows when each AI has finished and shows the full reply in the popup |
| 📋 | **Copy buttons** | Copy each reply, one click |
| 🥊 | **Debate mode** | 1–6 back-and-forth rounds, then a final conclusion from each AI |
| 📜 | **Copy full debate** | Copies the whole debate as one text |
| 🔁 | **Retry** | If one AI fails in a debate, retry only that AI from the same step |
| 🫥 | **Works when covered** | Ticker + "always awake" page script + auto bring-to-front |
| 💾 | **Remembers state** | Close the popup any time; replies and debate progress are kept |
| ☑️ | **Choose who gets it** | Untick a column to skip that AI |

---

## 📦 Requirements

- 🖥️ **Windows** PC (tiling is tuned for Windows 10 / 11)
- 🌐 **Google Chrome 111 or newer** (or Microsoft Edge)
- 🔑 You must be **logged in** to **claude.ai**, **gemini.google.com** and **chatgpt.com** in the same browser

---

## 🛠️ How to install (step by step)

> No coding needed. This takes about 2 minutes.

**1️⃣ Get the files**
- On this GitHub page click the green **`<> Code`** button → **Download ZIP**.
- Right-click the ZIP → **Extract All…**
- Put the folder somewhere permanent (for example `Documents`). ⚠️ **Do not delete it later** — Chrome reads the extension from this folder.

**2️⃣ Open the extensions page**
- Chrome: type `chrome://extensions` in the address bar and press Enter.
- Edge: type `edge://extensions`.

**3️⃣ Turn on Developer mode**
- Switch on **Developer mode** (top-right corner).

**4️⃣ Load the extension**
- Click **Load unpacked**.
- Choose the folder that **contains the file `manifest.json`**.
- You should now see **Triple AI Split** with version **1.3.1**. ✅

**5️⃣ Pin the icon**
- Click the 🧩 puzzle icon in the toolbar → click the 📌 pin next to **Triple AI Split**.

**6️⃣ Log in first**
- Open claude.ai, gemini.google.com and chatgpt.com once and log in to each.

**7️⃣ Use it**
- Click the extension icon → **Open 3 windows** → type a prompt → **Send to all** (or press **Ctrl + Enter**).

---

## 🎮 How to use

### 💬 Normal chat
1. Click **Open 3 windows**. Wait until all three sites have loaded.
2. Type your prompt in the popup.
3. Press **Send to all** (or **Ctrl + Enter**).
4. Watch the three columns: **Sending → Waiting → Replying → Done**.
5. Press **Copy reply** under any column.
6. Press **New chats** to start fresh conversations.

### 🥊 Debate
1. Press **Debate**.
2. Write your topic or idea.
3. Choose **1–6 rounds**.
4. Press **Start debate**.

The flow:

```
 Step 0 ─► Opening statements      (each AI gives its position)
 Step 1 ─► Round 1                 (each AI answers the OTHER two)
   ...
 Step N ─► Round N
 Step N+1 ► Final conclusions      (each AI gives a bottom line)
```

- Each AI only receives the **other two** AIs' latest replies.
- If something goes wrong, the debate **pauses** with a clear message. Press **Retry** to continue from the same step.
- **Copy full debate** copies everything as text. **Close** clears the debate.

---

## ⚙️ Highly recommended: Chrome setting for covered windows

When one window is **covered** by another, Chrome treats it like a background tab and slows it down. The best fix is to start your browser with these switches.

1. Close **all** Chrome windows (also check the tray icon near the clock).
2. Right-click your **Chrome shortcut** → **Properties**.
3. In the **Target** box, go to the very end and add a **space**, then paste:

```
--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-features=CalculateNativeWinOcclusion
```

4. Click **OK** and always start Chrome from this shortcut.
5. Check it worked: open `chrome://version` and look at **Command Line**.

(For Edge do the same with the Edge shortcut and check `edge://version`.)

> 💡 Some people report that a real background tab can still be slowed even with these switches. That is why the extension also has **auto bring-to-front** as a backup.

---

## 🧠 How it works

| File | Job |
|---|---|
| 📄 `manifest.json` | Extension settings, permissions, which scripts run where |
| 🎯 `config.js` | **The only file with site-specific CSS selectors**, URLs, colors, window order |
| 🥊 `debate.js` | The pre-written debate messages (opening, exchange, final) |
| 🧠 `background.js` | Screen measuring, window tiling, prompt relay, debate state machine, ticker, lost-page detection, auto bring-to-front |
| 🕵️ `content.js` | Runs inside each AI site: types the prompt, clicks send, watches the reply |
| 👁️ `awake.js` | Runs in the page itself: makes the page believe it is always visible and focused |
| 🎛️ `popup.html` / `popup.js` | The control panel |
| 🖼️ `icons/` | Extension icons |

### Design decisions (kept on purpose)

- ⌨️ **Typing:** the sites use rich-text editors, so the script uses `document.execCommand('insertText')` and falls back to a simulated paste. It never sets `.value` or `.textContent` on them.
- 🖱️ **Sending:** clicks the send button once it is enabled; presses Enter as a fallback.
- 🔍 **Fresh lookups:** every element is looked up **fresh** each time. Never a stored element.
- ✅ **Reply finished =** real text exists **AND** the stop button is gone **AND** the text stayed unchanged for a few seconds (3 s normal, 6 s in debate). It keeps watching 20 s more and goes back to "replying" if new text appears.
- 🆕 **Finding the NEW reply:** a reply counts as new if the number of reply boxes went up, **or** the last reply starts differently (first 40 characters) than before you sent the prompt.
- 🧹 **Cleaning:** removes hidden labels ("Gemini said", "Claude responded:"), duplicated first lines, and repeated thinking-summary lines.
- 💾 **State:** stored in `chrome.storage.session`, so the popup can close and the debate keeps going. The draft prompt is in `chrome.storage.local`.

---

## 🐛 Problems we faced → ✅ Solutions we found

This project was built step by step. Here is every real problem and how it was solved.

| # | 🐛 Problem | 🔎 Cause | ✅ Solution |
|---|---|---|---|
| 1 | Gemini reply showed only **"Gemini said"** | The finish check fired on a hidden label | Read text from `message-content` inside `model-response`; strip the label |
| 2 | Claude reply showed **"Claude responded:"** and a repeated first line | Hidden screen-reader label + duplicated summary | Strip the label, drop the duplicate first line |
| 3 | **"The page is not ready"** after reloading the extension | Pages already open had no working script | Background pings the tab; if no answer, it **injects** `awake.js`, `config.js`, `content.js` itself |
| 4 | Gemini showed a **false error** although the prompt was sent and answered | The old message box was removed and rebuilt after sending; a stored reference went stale | **Fresh lookups** everywhere + **soft failure** (keep watching; error only after 45 s / 180 s) |
| 5 | Popup stuck on **"Waiting for the first words"** when a window was covered | Chrome slows timers in covered windows | **Ticker** (a message every ~1 s, not slowed) + `awake.js` (fakes visibility) |
| 6 | Debate **waited forever** when a page stopped answering | No lost-page detection | Lost-page error after 12 missed ticks + **Retry** button |
| 7 | ChatGPT / Gemini showed the reply **only after clicking their tab** | Sites stop drawing while the window is hidden | **Auto bring-to-front** (hidden + silent 20 s → raise, max once per 60 s) + a hint in the popup + a checkbox to turn it off |
| 8 | Claude replies had repeated **"Considering how to…"** lines, passed on to other AIs | Thinking-summary lines inside the reply | Read only `.font-claude-response` parts; drop junk lines between a first line and its repeat |
| 9 | From **debate round 2** the popup stayed on "Replying / Waiting" | Sites remove old messages, so the reply **count** stopped going up | `findNewReply`: new = count went up **or** last reply starts differently |
| 10 | Tiles did not line up on Windows | Windows adds an invisible ~7 px resize border | `WINDOW_FRAME_FIX_WIN = 7` in `background.js` |
| 11 | Ticker stopped when Chrome put the worker to sleep | MV3 service workers sleep | `chrome.alarms` **watchdog** every 30 s restarts the ticker |
| 12 | A late note could overwrite a real reply | Two writes at the same time | All result writes go through **one queue** |

---

## 🩺 Troubleshooting

### 🔧 Quick fixes first
1. Are you **logged in** on all three sites, in the **same browser**?
2. Did the three pages finish loading?
3. Any **pop-up** on the page (ChatGPT sometimes shows one)? Close it by hand.
4. Go to `chrome://extensions`, click ⟳ **reload** on Triple AI Split, and check the **version number**. No need to refresh the three windows.

### 📋 Message → meaning → fix

| 💬 You see | 🧐 Meaning | 🛠️ Fix |
|---|---|---|
| **Could not reach the page…** | Page still loading, or not logged in | Wait, log in, try again |
| **Could not find the message box…** | Not logged in, or the site changed | Log in; else update the `input` selectors in `config.js` |
| **Could not type into the message box.** | A pop-up or overlay blocks typing | Close the pop-up, send again |
| **The prompt was typed but could not be sent.** | Send button blocked or changed | Close pop-ups; else update the `send` selectors in `config.js` |
| **Sent, but no reply appeared.** | Nothing started within 180 s | Read the `(box found…, replies…)` note; check the window is visible |
| **Lost contact with the page…** | Window was reloaded or closed | Press **Retry** (debate) or send again |
| **The prompt took too long to send.** | Window not open or not logged in | Press **Open 3 windows**, log in, retry |
| **Debate paused. …** | One AI had an error | Fix the cause, press **Retry** |
| **Timed out waiting for a reply.** | 10 minutes with no answer | Check the site itself, send again |

### 🕵️ "Waiting for the first words…" with an **Info:** line

The popup shows a line like:

```
Info: replies on page: 2 (before: 2), last reply: 83 chars, stop button: yes, window hidden: no
```

| Part | What it tells you |
|---|---|
| `replies on page` vs `before` | Same number = no new reply box was found (yet) |
| `last reply: … chars` | How much text the last reply box holds |
| `stop button: yes / no` | Is the AI generating right now? |
| `window hidden: yes / no` | Is this window covered or minimized? |

**How to read it**
- `stop button: yes` + `window hidden: yes` → the window is covered. Use the **Chrome setting** above and keep the **bring-to-front** checkbox ticked.
- `stop button: no` + same count + `0 chars` → the reply selector may be wrong. Update `reply` (and `replyInner`) in `config.js`.
- **Still stuck?** Take a screenshot showing the **Info:** line and say **which AI** is stuck.

### 🎨 Other things

| 😕 Problem | 🛠️ Fix |
|---|---|
| Windows do not line up | Change `WINDOW_FRAME_FIX_WIN` in `background.js` (0 turns the fix off) |
| Reply starts with "Gemini said" / "Claude responded" | Adjust the `label` pattern in `config.js` |
| A window keeps jumping to the front | Untick **"If a window is hidden and stuck, bring it to the front"** |
| Gemini answers using things it knows about you | That is Gemini's own memory feature, not the extension. Check Gemini's own personalization settings |
| **Stop** does not stop an AI that is already writing | Known limit. Press the stop button inside that AI's window |
| Extension disappeared after moving the folder | Chrome reads it from the folder. Load unpacked again from the new place |

---

## 🔄 How to update

1. Download the new ZIP and extract it.
2. **Copy the files over the old folder** (replace all).
3. Open `chrome://extensions` → click ⟳ **reload** on Triple AI Split.
4. Check the **version number**.
5. You do **not** need to refresh the three AI windows.

---

## 🧩 Customize

- 🎯 **Site changed its layout?** Edit only `config.js`. Each list of selectors is tried in order; the first match wins.
- 🥊 **Different debate style or word limit?** Edit `debate.js` (`DEBATE_WORDS = 250`, `DEBATE_STABLE_MS = 6000`, and the message texts).
- 🔀 **Different window order?** Change `SITE_ORDER` in `config.js`.
- 🪟 **Slimmer windows without tab strip?** Change `WINDOW_TYPE` to `'popup'` in `background.js`.
- 👁️ **Turn off the "always awake" trick:** remove the `awake.js` block from `manifest.json`.

---

## ⚠️ Limits and honest notes

- 🧪 The selectors in `config.js` are **best guesses that match the sites today**. Sites change their layout without warning, so a selector may need an update one day.
- 🚫 The debate does **not cancel** an AI that is already generating when you press **Stop**.
- 🌐 Needs a recent **Chrome (111+)** because `awake.js` runs in the page's own world (`"world": "MAIN"`).
- 📜 Automating consumer chat websites may go against their **terms of service**. Use this **for personal use, at a normal pace**, and at your own risk.
- 🔒 Your prompts and replies stay in your browser. The extension has **no server** and sends nothing anywhere except to the three sites you are already logged in to.
- ℹ️ This is an independent project. It is **not affiliated with** Anthropic, Google or OpenAI. Claude, Gemini and ChatGPT are trademarks of their owners.

---

## 🗺️ Ideas for the future

- 📤 Export the debate transcript as a file
- 🎭 Custom debate wording or roles per AI
- 📑 A side panel instead of a popup (so it never closes)
- 🛑 Make **Stop** also cancel generation

---

## 🕰️ Version history

| Version | Changes |
|---|---|
| **1.3.1** | `findNewReply` (debate round 2 fix), **Info:** diagnostic line, serialized result writes |
| **1.3.0** | Auto bring-to-front, "hidden window" hint, checkbox, Claude reply cleaning |
| **1.2.0** | Ticker, `awake.js`, lost-page errors, Retry, alarms watchdog |
| **1.1.1** | Start of the history |

---

<div align="center">

**Made for personal use · Windows · Chrome / Edge**

⭐ If this helps you, give the repo a star!

</div>
