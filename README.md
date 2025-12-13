# ChessBased

A modern, free, open-source chess database and analysis application built with Electron, React, and TypeScript. Inspired by Lichess and ChessBase.

## Features

*   **Game Database:** Store and manage your chess games.
*   **Lichess Import:** Easily import your games from Lichess.
*   **Tree Navigation:** Infinite variation support with a structured "folder-tree" notation view.
*   **Engine Analysis:** Integrated UCI engine support (Stockfish) with deep analysis mode and visual evaluation.
*   **Engine Manager:** Download and manage chess engines directly within the app.
*   **Modern UI:** Clean, dark-themed interface powered by Tailwind CSS.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [Git](https://git-scm.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/chessbased.git
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