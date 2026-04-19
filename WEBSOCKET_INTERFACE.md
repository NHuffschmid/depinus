# Depinus WebSocket Interface

The PianoDaemon exposes a WebSocket server. The React frontend connects to it and exchanges JSON messages in both directions.

---

## General structure

Messages sent from the server to the client are JSON objects discriminated by the `infoType` field. Commands sent from the client to the server are JSON objects discriminated by the `commandType` field.

### Server → Client

| `infoType` | Description |
|---|---|
| `keyboard` | MIDI note event from player or physical keyboard |
| `playState` | Transport state change |
| `settings` | Settings change (tempo, dynamics, transposition) |
| `midiPorts` | MIDI port configuration |
| `playlist` | Playlist state sync |
| `recordingMidi` | Raw MIDI event during live recording |
| `rpcResponse` | Response to an RPC call |

### Client → Server

| `commandType` | Description |
|---|---|
| `keyboard` | Key press/release from the on-screen keyboard |
| `control` | Transport and settings commands |
| `rpc` | Remote procedure call |

---

## Server → Client messages

All server notifications are distinguished solely by `infoType`.

#### `infoType: "keyboard"`

Sent for every MIDI note event produced by the piano player or the physical keyboard.
High frequency (one message per note event).

```json
{
  "infoType": "keyboard",
  "note": 64,
  "velocity": 80,
  "playTime": 12.34
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `note` | `number` (0–127) | yes | MIDI note number |
| `velocity` | `number` (0–127) | yes | 0 = note off |
| `playTime` | `number` | no | Current playback position in seconds (only present during playback) |

> A `note: 0, velocity: 0` message means "all notes off" (keyboard reset).

---

#### `infoType: "playState"`

Sent whenever the transport state changes (play, pause, stop, record, seek, …).
Fields are sent partially – only changed fields are included, except on initial connect.

```json
{
  "infoType": "playState",
  "isStoppable": true,
  "isPlayable": false,
  "isPauseable": true,
  "isRecordable": false,
  "isRecording": false,
  "isWaiting": false,
  "wasCancelled": false,
  "recordingSaved": false,
  "composition": {
    "name": "Moonlight Sonata",
    "compositionId": 42,
    "composerName": "Beethoven",
    "duration": 360,
    "playTime": 0.0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `isStoppable` | `boolean` | Stop button enabled |
| `isPlayable` | `boolean` | Play button enabled |
| `isPauseable` | `boolean` | Pause button enabled; also used to start/stop the progress bar tick |
| `isRecordable` | `boolean` | Record button enabled |
| `isRecording` | `boolean` | Recording is currently active |
| `isWaiting` | `boolean` | Server is busy (e.g. seeking); all buttons should be disabled |
| `wasCancelled` | `boolean` | Playback ended because it was stopped, not because it finished naturally |
| `recordingSaved` | `boolean` | A recording was successfully saved; clients should refresh the archive |
| `composition` | `object` | Currently loaded composition (see below) |

**`composition` object:**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Composition title |
| `compositionId` | `number` | Database ID (absent for live recordings) |
| `composerName` | `string` | Composer name |
| `duration` | `number` | Total duration in seconds |
| `playTime` | `number` | Current playback position in seconds |

---

#### `infoType: "settings"`

Sent when a setting changes. Each change sends exactly one field.

```json
{ "infoType": "settings", "tempo": 1.25 }
{ "infoType": "settings", "dynamics": 70 }
{ "infoType": "settings", "transposition": -2 }
```

| Field | Type | Range | Description |
|---|---|---|---|
| `tempo` | `number` | > 0 | Playback speed factor (1.0 = normal) |
| `dynamics` | `number` | 0–127 | Volume level |
| `transposition` | `number` | –12 … +12 | Semitone offset |

On initial connect all three fields are sent together in one message.

---

#### `infoType: "midiPorts"`

Sent on connect, when the MIDI interface configuration changes, or when the user selects a port.

```json
{
  "infoType": "midiPorts",
  "availableMidiOutPorts": ["Microsoft GS Wavetable Synth 0", "USB Midi Cable 1"],
  "selectedMidiOutPort": "USB Midi Cable 1",
  "availableMidiInPorts": ["USB Midi Cable 0"],
  "selectedMidiInPort": "USB Midi Cable 0",
  "isRecordable": true
}
```

| Field | Type | Description |
|---|---|---|
| `availableMidiOutPorts` | `string[]` | All detected MIDI output ports |
| `selectedMidiOutPort` | `string \| null` | Currently active MIDI output |
| `availableMidiInPorts` | `string[]` | All detected MIDI input ports |
| `selectedMidiInPort` | `string \| null` | Currently active MIDI input |
| `isRecordable` | `boolean` | Whether recording is possible (input port available) |

---

#### `infoType: "playlist"`

Sent to synchronise playlist state across all connected clients.

```json
{
  "infoType": "playlist",
  "playlist": {
    "id": 3,
    "shuffle": false,
    "repeatMode": "playlist",
    "forwardable": true,
    "backwardable": false,
    "compositionId": 42
  }
}
```

**`playlist` object:**

| Field | Type | Description |
|---|---|---|
| `id` | `number` | Database ID of the active playlist |
| `shuffle` | `boolean` | Shuffle mode active |
| `repeatMode` | `"off" \| "playlist" \| "composition"` | Repeat mode |
| `forwardable` | `boolean` | A next track exists |
| `backwardable` | `boolean` | A previous track exists |
| `compositionId` | `number` | ID of the currently playing composition |

---

#### `infoType: "recordingMidi"`

Sent during a live recording for each incoming MIDI event. High frequency (one message per MIDI event).

```json
{
  "infoType": "recordingMidi",
  "midiEventBytes": "kEBA"
}
```

| Field | Type | Description |
|---|---|---|
| `midiEventBytes` | `string` | Raw MIDI event bytes, Base64-encoded |

---

#### `infoType: "rpcResponse"`

Response to a client RPC call.

**Success:**
```json
{ "infoType": "rpcResponse", "result": { ... } }
```

**Error:**
```json
{ "infoType": "rpcResponse", "error": "Unknown method 'Foo'" }
```

---

### Initial connect sequence

When a client connects, the server sends three messages in order:

1. `infoType: "settings"` – current tempo, dynamics, transposition
2. `infoType: "playState"` – full transport state including composition (if any)
3. `infoType: "midiPorts"` – available and selected MIDI ports

---

## Client → Server commands

### `keyboard` – on-screen key press/release

```json
{ "commandType": "keyboard", "note": 60, "pressed": true }
```

| Field | Type | Description |
|---|---|---|
| `note` | `number` (0–127) | MIDI note number |
| `pressed` | `boolean` | `true` = note on, `false` = note off |

---

### `control` – transport and settings

```json
{ "commandType": "control", "command": "<command>", "value": <optional> }
```

| `command` | `value` | Description |
|---|---|---|
| `play` | – | Start or resume playback / resume recording |
| `pause` | – | Pause playback or recording |
| `stop` | – | Stop playback or save and stop recording |
| `record` | – | Start recording |
| `tempo` | `number` | Set playback speed |
| `dynamics` | `number` | Set volume level |
| `transposition` | `number` | Set semitone offset |
| `selectedMidiOutPort` | `string` | Select MIDI output port |
| `selectedMidiInPort` | `string` | Select MIDI input port |
| `gotoPlayTime` | `number` | Seek to position in seconds |
| `playlist` | `object` | Update or request playlist state (see below) |
| `shutdown` | – | Shut down the piano daemon |
| `play_startup_jingle` | – | Play the startup jingle |

**`playlist` value:**

- `{ "id": 0 }` – request current playlist state from server
- `{ "id": N, "shuffle": bool, "repeatMode": string, ... }` – update playlist state

---

### `rpc` – remote procedure call

```json
{ "commandType": "rpc", "method": "<method>", "params": { ... } }
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `PlayComposition` | `name`, `compositionId`, `composer`, `duration`, `mididata`, `playlistId?` | – | Load and play a composition |
| `CalculatePlayDuration` | `mididata` | `number` | Calculate duration of a MIDI file in seconds |
| `GetCurrentMidiData` | – | `{ midiBase64, compositionName, composerName }` | Get MIDI data of the currently loaded composition |
