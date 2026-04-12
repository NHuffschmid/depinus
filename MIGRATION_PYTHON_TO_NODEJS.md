# Migration Analysis: Python PianoDaemon → Node.js

## Current Architecture

```
Python PianoDaemon  <--WebSocket-->  Node.js Backend (Express)  <--HTTP-->  React Frontend
  - MIDI I/O (mido/rtmidi)               - SQLite DB
  - WebSocket Server                      - REST API
  - Playback loop
  - Recording
```

The goal is to eliminate the Python process entirely and implement everything in Node.js/JavaScript.

---

## Library Mapping

| Python | Purpose | Node.js Equivalent | Notes |
|--------|---------|-------------------|-------|
| `mido` + `rtmidi` | MIDI hardware ports (open, send, receive) | **`midi`** (npm: node-midi) | Wraps rtmidi directly in C++/N-API |
| `mido.MidiFile` (read) | Parse .mid files | **`midi-file`** (npm) | Well-maintained |
| `mido.MidiFile` (write) | Create .mid files | **`midi-file`** (npm) | Well-maintained |
| `websockets` | WebSocket server | **`ws`** | Already a dependency in `www/server`! |
| `configparser` | .ini config files | **`ini`** | Already a dependency in `www/server`! |
| `requests` | HTTP client (REST calls to backend) | `fetch` (Node 18+ built-in) | No new package needed |
| `asyncio` | Async execution, tasks, timers | `async/await`, `EventEmitter`, `setTimeout` | Built into Node.js |
| `logging` | Logging | **`winston`** | Already a dependency in `www/server`! |

**Only 2 new npm packages are needed: `midi` and `midi-file`.**

---

## Component-by-Component Analysis

### ✅ Straightforward to migrate

| Component | Notes |
|-----------|-------|
| `websocket_server.py` | Direct port to `ws`. Message protocol (JSON with `commandType`/`messageType`) stays identical. |
| `config_utils.py` | Full 1:1 replacement with the `ini` package already present in the project. |
| `composition.py` | Simple JS class / plain object. Trivial. |
| `midi_interface_observer.py` | Poll `midi.getInputCount()` / `midi.getOutputCount()` on an interval. Identical logic. |
| `__init__.py` (logger) | Replace with `winston` (already present). |
| `piano_daemon.py` (wiring/orchestration) | Straightforward port; callbacks become EventEmitter events or direct function references. |

### ⚠️ Medium effort

**`piano_recorder.py`**
- mido's `open_input().iter_pending()` polling → replace with `node-midi`'s `input.on('message', handler)` callback model (actually simpler).
- MIDI file creation (delta-time calculation, meta messages) → port to `midi-file` write API. Requires careful attention to tick/time conversion.
- USB reset daemon communication (Linux only, via TCP socket) → direct port using Node.js `net` module.

**`piano_player.py`**
- Properties (tempo, dynamics, transposition, play state flags) → simple class getters/setters.
- `set_midi_out_port()` / `set_midi_in_port()` → direct port.
- `play()`, `pause()`, `stop()`, `goto_play_time()` → async methods, same logic.

### 🔴 Critical / Requires care

**`piano_player.py → _play_mididata()`** — this is the most complex piece:
- Reads all MIDI messages from a file and schedules them with precise timing.
- Python uses `time.perf_counter()` and `await asyncio.sleep()`.
- Node.js equivalent: `process.hrtime.bigint()` for high-resolution time + `setImmediate` or `setTimeout` for sleeping.
- Node.js `setTimeout` has ~1ms jitter, which is acceptable for non-live-performance playback.
- Pause/resume, tempo change mid-playback, and seek (`goto_play_time`) all adjust the time base — must be ported carefully.
- Transposition and dynamics are applied per-message during playback.

**`midi` package native build:**
- `node-midi` is a native C++ addon (N-API).
- Requires a C++ compiler at `npm install` time (MSVC on Windows, gcc on Linux/macOS).
- In the Electron app, it must be rebuilt with `electron-rebuild` — but `sqlite3` is already a native addon and the build pipeline handles this.

---

## Proposed Target Architecture

Two options:

### Option A: Separate daemon process (mirrors current structure)
```
Node.js PianoDaemon (new, replaces Python)    Node.js Backend (existing)
  www/daemon/
    ├─ PianoDaemon.js
    ├─ PianoPlayer.js
    ├─ PianoRecorder.js
    ├─ MidiInterfaceObserver.js
    └─ WebsocketServer.js                  ←→  www/server/app.js (Express REST)
```

### Option B: Single Node.js process (consolidate daemon + backend) ✅ Recommended
```
www/server/
  ├─ app.js                   (Express REST API, SQLite — existing)
  ├─ PianoDaemon.js           (new)
  ├─ PianoPlayer.js           (new)
  ├─ PianoRecorder.js         (new)
  ├─ MidiInterfaceObserver.js (new)
  └─ WebsocketServer.js       (new, or reuse ws server already in app.js)
```
Since both the daemon and the backend already use `ws`, combining them into one process eliminates inter-process communication entirely. The backend can call player/recorder methods directly instead of going through REST.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| MIDI playback timing accuracy | Medium | Use `process.hrtime.bigint()`; acceptable for non-live performance |
| `node-midi` native build on all platforms | Medium | Already handled for `sqlite3`; apply same `electron-rebuild` step |
| `midi-file` write API differences from mido | Low | Well-documented; delta-time conversion is explicit |
| Electron version compatibility with `node-midi` | Medium | Check N-API version; node-midi uses N-API v3+ |

---

## Effort Estimate

Approximately **2–3 days** for an experienced JavaScript developer.

Suggested implementation order:
1. `MidiInterfaceObserver.js` (simplest, no MIDI file I/O)
2. `WebsocketServer.js` (existing ws infrastructure)
3. `PianoPlayer.js` (most complex: timing loop)
4. `PianoRecorder.js` (MIDI input + file creation)
5. `PianoDaemon.js` (orchestration, wire everything up)
6. Remove Python build steps from `build_agent.js` / `build_release_package.js`
7. Remove PyInstaller spec (`piano_daemon.spec`) and venv

---

## New npm Dependencies

```bash
# in www/server (or wherever the daemon will live)
npm install midi midi-file
```

No other new packages are required.
