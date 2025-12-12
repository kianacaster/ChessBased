// src/hooks/useAnalysis.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface AnalysisResult {
  evaluation: string | null;
  bestMove: string | null;
  pv: string | null; // Principal Variation
}

const useAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    evaluation: null,
    bestMove: null,
    pv: null,
  });
  const currentFen = useRef<string | null>(null); // To keep track of the FEN being analyzed

  // Function to parse engine output - wrapped in useCallback for stability
  const parseEngineOutput = useCallback((output: string) => {
    // This is a basic parser and will need to be expanded
    // Example output: "info depth 1 seldepth 1 multipv 1 score cp 33 nodes 13 nps 1300 tbhits 0 time 13 pv d2d4"
    const scoreMatch = output.match(/score (cp|mate) (-?\d+)/);
    const pvMatch = output.match(/pv (.+)/);
    const bestMoveMatch = output.match(/bestmove (\S+)/);

    let evaluation: string | null = null;
    if (scoreMatch) {
      if (scoreMatch[1] === 'cp') {
        evaluation = (parseInt(scoreMatch[2], 10) / 100).toFixed(2); // Convert centipawns to pawns
      } else if (scoreMatch[1] === 'mate') {
        evaluation = `M${scoreMatch[2]}`;
      }
    }

    const bestMove = bestMoveMatch ? bestMoveMatch[1] : null;
    const pv = pvMatch ? pvMatch[1] : null;

    // Only update if there's new meaningful information
    if (evaluation || bestMove || pv) {
      setAnalysisResult((prev) => ({
        ...prev,
        evaluation: evaluation || prev.evaluation,
        bestMove: bestMove || prev.bestMove,
        pv: pv || prev.pv,
      }));
    }
  }, []);

  const startAnalysis = async (fen: string) => {
    if (!window.electronAPI) {
      console.error('Electron API not available.');
      return;
    }

    setIsAnalyzing(true);
    currentFen.current = fen;
    setAnalysisResult({ evaluation: null, bestMove: null, pv: null }); // Reset analysis

    // Start the engine if not already started
    await window.electronAPI.startEngine();
    
    // Set up the position
    await window.electronAPI.sendUciCommand(`position fen ${fen}`);
    // Start infinite analysis
    await window.electronAPI.sendUciCommand('go infinite');
  };

  const stopAnalysis = async () => {
    if (!window.electronAPI) {
      console.error('Electron API not available.');
      return;
    }
    setIsAnalyzing(false);
    await window.electronAPI.sendUciCommand('stop'); // Tell engine to stop analyzing
    await window.electronAPI.stopEngine(); // Also stop the engine process
    currentFen.current = null;
  };

  // Effect to handle incoming analysis updates from the main process
  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    const handler = (output: string) => {
      // Filter 'info' lines for analysis, 'bestmove' lines
      if (output.startsWith('info') || output.startsWith('bestmove')) {
        parseEngineOutput(output);
      }
    };

    window.electronAPI.onEngineAnalysisUpdate(handler);

    return () => {
      // No explicit remove listener for contextBridge exposed functions,
      // but the effect cleanup ensures this handler isn't used after unmount.
      // If ipcRenderer.removeListener was available, we'd use it here.
    };
  }, [parseEngineOutput]); // Dependency on parseEngineOutput

  return {
    isAnalyzing,
    analysisResult,
    startAnalysis,
    stopAnalysis,
  };
};

export default useAnalysis;
