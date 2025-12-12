// electron/engine/UciEngine.ts
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

interface UciEngineOptions {
  path: string; // Path to the Stockfish executable
  onOutput?: (output: string) => void; // Callback for engine output
}

export class UciEngine {
  private engineProcess: ChildProcessWithoutNullStreams | null = null;
  private options: UciEngineOptions;
  private dataBuffer: string = '';
  private onOutputCallback: ((output: string) => void) | undefined;

  constructor(options: UciEngineOptions) {
    this.options = options;
    this.onOutputCallback = options.onOutput;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.engineProcess) {
        console.warn('Engine already started.');
        resolve();
        return;
      }

      try {
        this.engineProcess = spawn(this.options.path);

        this.engineProcess.stdout.on('data', (data) => {
          this.dataBuffer += data.toString();
          // Process lines
          let newlineIndex;
          while ((newlineIndex = this.dataBuffer.indexOf('\n')) >= 0) {
            const line = this.dataBuffer.substring(0, newlineIndex).trim();
            this.dataBuffer = this.dataBuffer.substring(newlineIndex + 1);
            this.handleEngineOutput(line);
          }
        });

        this.engineProcess.stderr.on('data', (data) => {
          console.error(`Engine stderr: ${data}`);
        });

        this.engineProcess.on('close', (code) => {
          console.log(`Engine process exited with code ${code}`);
          this.engineProcess = null;
        });

        this.engineProcess.on('error', (err) => {
          console.error('Failed to start engine process:', err);
          reject(err);
        });

        // Initial UCI setup
        this.sendUciCommand('uci');
        this.sendUciCommand('isready').then(() => {
          console.log('Stockfish is ready.');
          resolve();
        });

      } catch (error) {
        console.error('Error spawning engine process:', error);
        reject(error);
      }
    });
  }

  public stop(): void {
    if (this.engineProcess) {
      this.engineProcess.kill();
      this.engineProcess = null;
      console.log('Engine process stopped.');
    }
  }

  public sendUciCommand(command: string): Promise<string | void> {
    return new Promise((resolve) => {
      if (!this.engineProcess) {
        console.error('Engine not started.');
        return resolve();
      }
      const handler = (line: string) => {
        if (line === 'readyok' || line.startsWith('bestmove')) { // Basic response for now
          this.engineProcess?.stdout.removeListener('data', onData);
          resolve(line);
        }
      };
      const onData = (data: Buffer) => {
        this.dataBuffer += data.toString();
        let newlineIndex;
        while ((newlineIndex = this.dataBuffer.indexOf('\n')) >= 0) {
          const line = this.dataBuffer.substring(0, newlineIndex).trim();
          this.dataBuffer = this.dataBuffer.substring(newlineIndex + 1);
          handler(line);
        }
      };
      this.engineProcess.stdout.on('data', onData);
      this.engineProcess.stdin.write(`${command}\n`);
      console.log(`Sent to engine: ${command}`);
    });
  }

  private handleEngineOutput(line: string): void {
    if (this.onOutputCallback) {
      this.onOutputCallback(line);
    }
    console.log(`Engine output: ${line}`);
  }
}
