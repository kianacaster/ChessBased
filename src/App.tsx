import Layout from './components/Layout';
import Board from './components/Board';
import useGame from './hooks/useGame';
import Notation from './components/Notation';
import './App.css';

function App() {
  const { fen, move, dests, history, currentMoveIndex, jumpToMove } = useGame();

  const handleMove = (orig: string, dest: string) => {
    move(orig, dest);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Layout
        sidebar={
          <div className="pane">
            <h2>Sidebar</h2>
            <p>Database/Game list (Placeholder)</p>
          </div>
        }
        main={
          <div className="pane">
            <Board fen={fen} onMove={handleMove} dests={dests} />
          </div>
        }
        analysis={
          <div className="pane">
            <h2>Analysis/Notation Panel</h2>
            <Notation history={history} currentMoveIndex={currentMoveIndex} onMoveClick={jumpToMove} />
          </div>
        }
      />
    </div>
  );
}

export default App;

