# Wispr Flow - Extraction & Analysis

## How to Unpack Any Electron App

```bash
# Install asar extractor
npm install -g @electron/asar

# Find the app's resources folder
# Windows: %LocalAppData%\{AppName}\resources\app.asar
# macOS: /Applications/{App}.app/Contents/Resources/app.asar

# Extract
npx @electron/asar extract app.asar ./extracted
```

For Wispr specifically:
```bash
npx @electron/asar extract "C:\Users\sidro\AppData\Local\WisprFlow\app-1.4.138\resources\app.asar" ./wispr-extracted
```

---

## Wispr Flow v1.4.138 - Tech Stack

### Core Framework
| Component | Technology |
|-----------|------------|
| Desktop | Electron 38.2.1 |
| UI | React 18.3 |
| Language | TypeScript 5.7 |
| Bundler | Webpack (electron-forge) |

### State & Data
| Component | Technology |
|-----------|------------|
| State Management | Zustand 5.0 |
| Local Database | SQLite 5.1.7 + Sequelize 6.37 |
| Cloud Backend | Supabase 2.44 |
| ORM | Sequelize |

### UI Libraries
| Component | Technology |
|-----------|------------|
| Animations | Motion (framer-motion) 12.23 |
| Forms | React Hook Form 7.65 + Zod 4.1 |
| Rich Text | Lexical 0.32 |
| Markdown | react-markdown 10.1 |
| Emoji | emoji-mart 5.6 |
| Lottie | lottie-web 5.12 |
| CSS | Tailwind (via sass-loader) |

### Audio/Voice
| Component | Technology |
|-----------|------------|
| Audio | Howler 2.2 |
| Speech | Web Audio API (recorderWorklet.js) |
| Opus | opusscript 0.1 |
| ONNX | onnxruntime-web 1.22 |

### Monitoring & Analytics
| Component | Technology |
|-----------|------------|
| Error Tracking | Sentry (electron) 7.0 |
| Analytics | PostHog 4.0 |
| System Info | systeminformation 5.25 |

### Communication
| Component | Technology |
|-----------|------------|
| IPC | Electron IPC + custom protocol |
| gRPC | @grpc/grpc-js + protobuf-ts |
| HTTP | Built-in fetch |

---

## Window Architecture

Wispr uses multiple Electron BrowserWindows:

| Window | Purpose | Location |
|--------|---------|----------|
| `hub` | Main settings/dashboard | renderer/hub/ |
| `status` | Floating status bar | renderer/status/ |
| `aiterminal` | AI interaction terminal | renderer/aiterminal/ |
| `contextMenu` | Right-click menus | renderer/contextMenu/ |

Each window is a minimal HTML shell that loads a React app:
```html
<!doctype html>
<html>
<head><meta charset="UTF-8"/><script defer src="../hub/index.js"></script></head>
<body style="background-color: white; height: 100%; width: 100%; overflow: hidden"></body>
</html>
```

---

## Code Structure (from package.json scripts)

```
src/
├── main/                    # Electron main process
│   └── backend/             # Has tests: test-backend script
├── api/
│   └── helper/
│       ├── schema.json      # API schema
│       └── generated/
│           ├── bundledSchema.json
│           └── models.ts    # Generated types
├── [renderer components]    # React UI
└── [shared modules]
```

### Native Helpers
Wispr has separate native helper apps:
- `swift-helper-app/Wispr Flow Helper/` - macOS native
- `windows-helper-app/Wispr Flow Helper/` - Windows native

These handle low-level OS integration (keyboard hooks, accessibility, etc.)

---

## Key Design Patterns

### 1. Multi-Window Architecture
Instead of one big window, split into purpose-specific windows:
- Status window is tiny and always-on-top
- Main hub opens when user wants full control
- Overlays for notifications

### 2. Local-First with Cloud Sync
- SQLite for local persistence
- Supabase for cloud sync
- Works offline, syncs when online

### 3. Schema-Driven Development
Uses JSON Schema + quicktype for:
- API type generation
- Cross-platform models (TypeScript, Swift, C#)

### 4. Minimal HTML, React Everything
HTML files are empty shells. React handles all UI rendering.

---

## What We Can Learn for WellnessGuard

### Adopt
1. **Zustand for state** - Simple, works well in Electron
2. **Multi-window pattern** - Status bar separate from main hub
3. **Motion for animations** - Smooth, professional feel
4. **SQLite + Sequelize** - Proven local storage
5. **Supabase** - Same backend choice
6. **TypeScript + Zod** - Type safety

### Adapt
1. **MediaPipe instead of voice** - We need CV, not speech
2. **Simpler helper apps** - We may not need native helpers initially
3. **Fewer windows** - Start with 2-3, not 4+

### Skip (for MVP)
1. **gRPC** - Overkill for our use case
2. **ONNX runtime** - We use MediaPipe instead
3. **Lottie animations** - Simple CSS animations first
4. **Complex IPC schema** - Simple IPC is fine

---

## Extracted Files Location

```
final-architecture/wispr-extracted/
├── package.json              # Dependencies & scripts
├── .webpack/
│   ├── main/                 # Main process (bundled)
│   └── renderer/
│       ├── hub/              # Main window
│       ├── status/           # Status bar
│       ├── aiterminal/       # AI terminal
│       ├── contextMenu/      # Context menus
│       └── [assets]          # SVGs, PNGs, fonts
└── node_modules/             # (if extracted)
```

Note: The JavaScript is minified/bundled by Webpack, so actual source code isn't readable. But we can see:
- File structure
- Dependencies from package.json
- HTML templates
- Static assets (icons, fonts)

---

## Legal Note

Extracting for analysis/learning is generally acceptable. Do not:
- Redistribute their code
- Copy copyrighted assets
- Bypass license restrictions
- Claim their work as yours

We're using this purely as architectural reference.
