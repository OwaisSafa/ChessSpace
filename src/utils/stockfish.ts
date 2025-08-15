class StockfishManager {
  private worker: Worker | null = null;
  private isReady = false;
  private bestMoveResolver: ((move: string) => void) | null = null;
  private bestMoveRejecter: ((error: Error) => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    // Use single-threaded version for better compatibility
    this.worker = new Worker('/stockfish/stockfish-nnue-16-single.js', { type: 'module' });
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
    this.postMessage('uci');
    this.postMessage('isready');
  }

  private handleMessage(event: MessageEvent) {
    const line: string = event.data;
    console.log('Stockfish message:', line);

    if (line === 'readyok') {
      this.isReady = true;
    } else if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];
      if (this.bestMoveResolver) {
        this.bestMoveResolver(move);
        this.bestMoveResolver = null;
        this.bestMoveRejecter = null;
      }
    }
  }

  private handleError(error: any) {
    console.error('Raw Stockfish worker error:', error);
    if (this.bestMoveRejecter) {
      this.bestMoveRejecter(new Error('Stockfish worker error. See console for details.'));
      this.bestMoveResolver = null;
      this.bestMoveRejecter = null;
    }
  }

  private postMessage(message: string) {
    this.worker?.postMessage(message);
  }

  public getBestMove(fen: string, depth: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isReady || this.bestMoveResolver) {
        return reject(new Error('Stockfish is not ready or is already thinking.'));
      }

      this.bestMoveResolver = resolve;
      this.bestMoveRejecter = reject;

      this.postMessage('ucinewgame');
      this.postMessage(`position fen ${fen}`);
      this.postMessage(`go depth ${depth}`);
    });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

const stockfishManager = new StockfishManager();

export const getBestMove = stockfishManager.getBestMove.bind(stockfishManager);
export const terminateStockfish = stockfishManager.terminate.bind(stockfishManager);
