# Team Member B: Systems, Engine & Data Focus

**Objective:** Robust file handling, database management, and engine integration.

## Tasks

### [ ] Task B1: Implement PGN File I/O
**Goal:** Allow users to open and save chess games.
- **Files:** `electron/main.ts`, `electron/preload.ts`, `src/utils/pgn.ts`
- **Details:**
  - **Main Process:** Add IPC handlers for `dialog.showOpenDialog` and `dialog.showSaveDialog`.
  - **Main Process:** Implement `fs.readFile` and `fs.writeFile` logic for `.pgn` files.
  - **Renderer:** Create a button/menu to trigger these actions.
  - **Parser:** Use `chessops/pgn` (or similar) to parse the loaded text into a usable game object.

### [ ] Task B2: Create the UCI Engine Manager
**Goal:** Interface with the Stockfish chess engine.
- **Files:** `electron/engine/UciEngine.ts` (create this), `electron/main.ts`
- **Details:**
  - Spawn a child process for the Stockfish executable.
  - Implement a class to handle the UCI protocol (send `uci`, `isready`, `position`, `go`).
  - Parse the `stdout` from the engine (info depth, score, bestmove).
  - **Note:** You can expect a stockfish binary to be available in a `resources/bin` folder (or similar) eventually. For dev, assume it's in the path or a specific local folder.

### [ ] Task B3: Implement the Analysis State
**Goal:** Manage the engine's view of the game.
- **Files:** `src/hooks/useAnalysis.ts`
- **Details:**
  - bridge the frontend to the backend engine service via IPC.
  - Send the current board FEN to the engine.
  - Receive evaluation data and display it (e.g., "+0.5").
  - Handle "Stop" and "Start" analysis commands.

### [ ] Task B4: Database Indexing Skeleton
**Goal:** Prepare for handling large databases.
- **Files:** `electron/db/Database.ts`
- **Details:**
  - Design a simple schema (maybe just an in-memory list or a light SQLite wrapper) to store game headers (White, Black, Date, Result).
  - Implement a function to scan a large PGN file and extract *only* headers without parsing the full moves (for speed).
