# ChessBased

A modern, free, open-source chess database and analysis application built with Electron, React, and TypeScript. Inspired by Lichess and ChessBase.

## Features

*   **Comprehensive Database Management:**
    *   Store, manage, create, and import your chess game databases (PGN files).
    *   Games within databases now persist across application sessions.
    *   **Save & Load:** Save the current game to a selected database or as a standalone PGN file.
    *   **"Trash" Functionality:** Delete databases safely, moving PGN files to a recoverable trash folder.
*   **Enhanced Lichess Integration:**
    *   **Persistent Background Download:** Import games from Lichess that download in the background and are automatically saved as new, persistent databases.
*   **Advanced Engine Management:**
    *   **Installed Engines GUI:** Visually manage and select from your downloaded engines.
    *   **Smart Detection:** The Engine Manager intelligently detects and lists only executable engine files.
*   **Intuitive Game Navigation:**
    *   **Keyboard Navigation:** Navigate game moves quickly using arrow keys (previous, next, first, last move).
    *   **Revamped PGN Notation:** Clear, paragraph-style notation view with intelligent handling of variations for optimal readability.
*   **Powerful Analysis Tools:**
    *   **Dynamic Engine Analysis:** Integrated UCI engine support with intelligent score normalization (always from White's perspective).
    *   **Database Explorer:** Analyze current board positions against your collected games, showing move statistics, win rates, and top games from selected databases.
    *   **Opening Prep & Comparison Tool:**
        -   Compare your game history ("Hero") against an opponent's ("Opponent") in any opening.
        -   Generates "Likely Scenarios" (move sequences) based on historical probabilities.
        -   Ranks scenarios by "Opportunity Score," highlighting lines where you perform well and your opponent is likely to play into your strengths.
        -   Clickable game counts to load example games for quick review.
        -   "Play Line" feature to instantly add a full scenario's move sequence to your current game.
*   **Modern UI:** Clean, dark-themed interface powered by Tailwind CSS.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kianacaster/chessbased.git
    cd chessbased
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the App

To start the application in development mode (with hot-reloading):

```bash
npm run dev
```

### Building for Production

To create a distributable executable for your platform (Windows, macOS, or Linux):

```bash
npm run dist
```

The output files (e.g., `.exe`, `.dmg`, `.AppImage`) will be located in the `dist/` directory.

## Architecture

*   **Frontend:** React, TypeScript, Tailwind CSS, Chessground (board), Chessops (chess logic).
*   **Backend (Electron):** Electron main process, Node.js integration for file system and engine processes.
*   **Engine:** UCI protocol support (Stockfish included/downloadable).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)