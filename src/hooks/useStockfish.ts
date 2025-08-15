
import { getBestMove as getBestMoveFromWorker } from '../utils/stockfish';

// A simple hook to wrap the Stockfish utility functions.
export const useStockfish = () => {
  const getBestMove = (fen: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<string> => {
    const depthMap = {
      'easy': 3,
      'medium': 8,
      'hard': 15
    };
    const depth = depthMap[difficulty];
    console.log(`Getting Stockfish move at depth ${depth} for difficulty ${difficulty}`);
    return getBestMoveFromWorker(fen, depth);
  };

  return { getBestMove };
};
