# Team Member A: UI & Interaction Focus

**Objective:** Create a seamless interactive board and notation experience.

## Tasks

### [ ] Task A1: Setup main application layout
**Goal:** Create the visual skeleton of the app.
- **Files:** `src/App.tsx`, `src/components/Layout.tsx` (create this).
- **Details:**
  - Use `react-resizable-panels` to create a 3-pane layout:
    - **Left:** Sidebar (Database/Game list - Placeholder for now).
    - **Center:** Main Board area.
    - **Right:** Analysis/Notation panel.
  - Ensure the layout is responsive and resizes gracefully.

### [ ] Task A2: Integrate `chessground`
**Goal:** Render a playable chess board.
- **Files:** `src/components/Board.tsx`
- **Details:**
  - Create a React component wrapper for `chessground`.
  - Initialize the board with the starting position.
  - Allow piece movement (drag & drop).
  - **Note:** For now, just logging the move to console is enough. Validation comes next.

### [ ] Task A3: Connect `chessops` for Move Validation
**Goal:** Enforce chess rules and maintain game state.
- **Files:** `src/hooks/useGame.ts` (create this), `src/components/Board.tsx`
- **Details:**
  - Use `chessops` (specifically `chessops/chess` or `chessops/variant`) to maintain the internal board state.
  - On user move (from Task A2), validate the move against `chessops`.
  - If valid, update the internal state and the visual board.
  - If invalid, snap the piece back.

### [ ] Task A4: Build the Move Notation Component
**Goal:** Display the list of moves made.
- **Files:** `src/components/Notation.tsx`
- **Details:**
  - Receive the history of moves from the game state.
  - Render them in a standard PGN style (e.g., "1. e4 e5 2. Nf3...").
  - Highlight the current move.
  - (Bonus) Click a move to jump to that position (requires state management support).
