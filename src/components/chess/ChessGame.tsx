import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Badge,
  Input,
  Label,
  Switch,
  Slider,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '../ui';
import { 
  Bot, Users, Monitor, Trophy, Star, Zap, Settings, Info, Crown, Award, Target,
  ArrowLeft, Wifi, WifiOff, Copy, Check, Plus, LogIn, Clock, Play,
  Sun, Moon, Rotate3D, Handshake, Flag, Github, Heart, Volume2, VolumeX
} from 'lucide-react';
import { Chess } from 'chess.js';
import { io, Socket } from 'socket.io-client';
import ChessBoard from './ChessBoard';
import { useToast } from '@/hooks/use-toast';
import { cn, playSound } from '../../lib/utils';
import { useStockfish } from '../../hooks/useStockfish';
import config from '../../config';

export type GameMode = 'local' | 'ai' | 'online';
export type GameState = 'menu' | 'playing';

type Theme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'dark',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'chess-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
};

const useSound = () => {
  const playSound = useCallback((soundName: string) => {
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.5;
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.debug(`Could not play sound ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.debug(`Sound system error for ${soundName}:`, error);
    }
  }, []);

  return { playSound };
};

const SocketContext = createContext<Socket | null>(null);

const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return socket;
};

const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Use dynamic server URL from config
    const socketUrl = config.serverUrl;
    
    console.log('Connecting to Socket.IO server:', socketUrl);
    console.log('Current hostname:', window.location.hostname);
    console.log('Environment:', config.isDevelopment ? 'Development' : 'Production');
    
    const newSocket = io(socketUrl, {
      transports: ['polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      upgrade: false
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

const useOnlineGame = ({ onMoveReceived, onGameOver, onDrawOffered, onGameStart }: any) => {
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [opponent, setOpponent] = useState<string>('');
  const { playSound } = useSound();
  const { toast } = useToast();

  useEffect(() => {
    const handleConnect = () => {
      console.log('✅ Connected to Socket.IO server successfully');
      setIsConnected(true);
    };
    const handleDisconnect = () => {
      console.log('❌ Disconnected from Socket.IO server');
      setIsConnected(false);
    };
    const handleConnectError = (error: any) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    };
    const handleError = (message: string) => toast({ title: 'Error', description: message, variant: 'destructive' });
      const handleRoomCreated = (data: { room_code: string, player_color: 'white' | 'black' }) => {
    setRoomCode(data.room_code);
    setPlayerColor(data.player_color);
  };
  const handleJoinedRoom = (data: { room_code: string, player_color: 'white' | 'black', opponent: string }) => {
    setRoomCode(data.room_code);
    setPlayerColor(data.player_color);
    setOpponent(data.opponent);
    onGameStart(data.player_color);
    playSound('move');
  };
  const handleOpponentJoined = (data: { opponent: string }) => {
    setOpponent(data.opponent);
    onGameStart(playerColor);
    playSound('move');
  };
  const handleOpponentLeft = () => {
    onGameOver('Opponent left');
    setOpponent('');
  };
  const handleDrawAccepted = () => onGameOver('Draw accepted');
  const handleDrawDeclined = () => toast({ title: 'Draw offer declined' });

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('error', (data) => handleError(data.message || 'An error occurred'));
    socket.on('room_created', handleRoomCreated);
    socket.on('room_joined', handleJoinedRoom);
    socket.on('opponent_joined', handleOpponentJoined);
    socket.on('chess_move', onMoveReceived);
    socket.on('player_disconnected', handleOpponentLeft);
    socket.on('draw_offered', () => {
      console.log('Draw offered event received');
      onDrawOffered();
    });
    socket.on('draw_response', (data) => {
      console.log('Draw response received:', data);
      if (data.accepted) {
        handleDrawAccepted();
      } else {
        handleDrawDeclined();
      }
    });
    socket.on('opponent_resigned', () => onGameOver('Opponent resigned'));
    socket.on('game_ended', (data) => onGameOver(data.reason || 'Game ended'));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('error');
      socket.off('room_created', handleRoomCreated);
      socket.off('room_joined', handleJoinedRoom);
      socket.off('opponent_joined', handleOpponentJoined);
      socket.off('chess_move', onMoveReceived);
      socket.off('player_disconnected', handleOpponentLeft);
      socket.off('draw_offered', onDrawOffered);
      socket.off('draw_response');
      socket.off('opponent_resigned');
      socket.off('game_ended');
    };
  }, [socket, onMoveReceived, onGameOver, onDrawOffered, onGameStart, playerColor, playSound, toast]);

  const createRoom = useCallback(() => {
    const playerName = `Player${Math.floor(Math.random() * 1000)}`;
    socket?.emit('create_room', { playerName });
  }, [socket]);

  const joinRoom = useCallback((code: string) => {
    const playerName = `Player${Math.floor(Math.random() * 1000)}`;
    socket?.emit('join_room', { room_id: code, player_name: playerName });
  }, [socket]);

  const sendMove = useCallback((move: { from: string; to: string; }) => {
    socket?.emit('make_move', { move });
  }, [socket]);

  const resignGame = useCallback(() => {
    socket?.emit('resign_game');
  }, [socket]);

  const acceptDraw = useCallback(() => {
    console.log('Accepting draw');
    socket?.emit('draw_response', { accepted: true });
  }, [socket]);

  const declineDraw = useCallback(() => {
    console.log('Declining draw');
    socket?.emit('draw_response', { accepted: false });
  }, [socket]);

  const offerDraw = useCallback(() => {
    console.log('Sending draw offer');
    socket?.emit('offer_draw');
  }, [socket]);

  return {
    socket,
    roomCode,
    playerColor,
    isConnected,
    opponent,
    createRoom,
    joinRoom,
    sendMove,
    resignGame,
    acceptDraw,
    declineDraw,
    offerDraw
  };
};

const useChessEngine = ({ mode, aiDifficulty, onGameOver, onPlayerChange }: any) => {
  const [game] = useState(() => new Chess());
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [isInCheck, setIsInCheck] = useState(false);
  const [checkmateSquare, setCheckmateSquare] = useState<string | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [viewingMoveIndex, setViewingMoveIndex] = useState(-1);
  const { playSound } = useSound();
  const { getBestMove } = useStockfish();
  const [isAiThinking, setIsAiThinking] = useState(false);

  const getValidMoves = (square: string | null) => {
    if (!square) return [];
    const moves = game.moves({ square: square as any, verbose: true });
    return moves.map(move => move.to);
  };

  const findKing = (board: any[], turn: 'w' | 'b') => {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${String.fromCharCode(97 + j)}${8 - i}`;
        }
      }
    }
    return null;
  };

  const updateGameState = useCallback(() => {
    const newPlayer = game.turn() === 'w' ? 'white' : 'black';
    setBoard(game.board());
    setCurrentPlayer(newPlayer);
    setGameHistory(game.history({ verbose: false }));
    setIsInCheck(game.isCheck());
    onPlayerChange(newPlayer);

    if (game.isCheck()) {
      playSound('check');
    }

    if (game.isGameOver()) {
      let result = '';
      if (game.isCheckmate()) {
        result = `${newPlayer === 'white' ? 'Black' : 'White'} wins by checkmate!`;
        setCheckmateSquare(findKing(game.board(), game.turn()));
        playSound('checkmate');
      } else if (game.isStalemate()) {
        result = 'Game drawn by stalemate!';
        playSound('draw');
      } else if (game.isInsufficientMaterial()) {
        result = 'Game drawn by insufficient material!';
        playSound('draw');
      } else if (game.isThreefoldRepetition()) {
        result = 'Game drawn by threefold repetition!';
        playSound('draw');
      } else {
        result = 'Game drawn!';
        playSound('draw');
      }
      onGameOver(result);
    }
  }, [game, onGameOver, onPlayerChange, playSound]);

  const makeMove = useCallback((from: string, to: string) => {
    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        if (move.captured) playSound('capture');
        else playSound('move');
        updateGameState();
        return true;
      }
    } catch (error) {
      // Ignore invalid moves
    }
    return false;
  }, [game, updateGameState, playSound]);

  const selectSquare = useCallback((square: string) => {
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    if (validMoves.includes(square)) {
      if (makeMove(selectedSquare!, square)) {
        setSelectedSquare(null);
        setValidMoves([]);
      }
      return;
    }

    const piece = game.get(square as any);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      setValidMoves(getValidMoves(square));
    }
  }, [selectedSquare, validMoves, makeMove, game]);

  const makeAIMove = useCallback(async () => {
    if (game.isGameOver() || isAiThinking || isViewingHistory) return;
    setIsAiThinking(true);
    try {
      const bestMoveUci = await getBestMove(game.fen(), aiDifficulty);
      if (bestMoveUci) {
        const from = bestMoveUci.substring(0, 2);
        const to = bestMoveUci.substring(2, 4);
        makeMove(from, to);
      }
    } catch (error) {
      console.error('AI move generation failed:', error);
    } finally {
      setIsAiThinking(false);
    }
  }, [game, isAiThinking, isViewingHistory, getBestMove, aiDifficulty, makeMove]);

  useEffect(() => {
    if (mode === 'ai' && currentPlayer === 'black' && !isAiThinking && !isViewingHistory && !game.isGameOver()) {
      const timer = setTimeout(() => makeAIMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [mode, currentPlayer, isAiThinking, makeAIMove, isViewingHistory, game]);

  const resetGame = useCallback(() => {
    game.reset();
    setBoard(game.board());
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentPlayer('white');
    setGameHistory([]);
    setIsInCheck(false);
    setCheckmateSquare(null);
    setIsViewingHistory(false);
    setViewingMoveIndex(-1);
    onPlayerChange('white');
  }, [game, onPlayerChange]);

  const navigateToMove = useCallback((moveIndex: number) => {
    if (moveIndex < -1 || moveIndex >= gameHistory.length) return;
    
    // Reset to initial position
    game.reset();
    
    // Apply moves up to the specified index
    for (let i = 0; i <= moveIndex; i++) {
      const move = gameHistory[i];
      if (move) {
        try {
          game.move(move);
        } catch (error) {
          console.error('Error applying move:', move, error);
        }
      }
    }
    
    // Update board state
    setBoard(game.board());
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentPlayer(game.turn() === 'w' ? 'white' : 'black');
    setIsInCheck(game.isCheck());
    setCheckmateSquare(null);
    setIsViewingHistory(moveIndex < gameHistory.length - 1);
    setViewingMoveIndex(moveIndex);
    onPlayerChange(game.turn() === 'w' ? 'white' : 'black');
    
    // If we're returning to the current position and it's AI's turn, add a small delay
    if (moveIndex === gameHistory.length - 1 && mode === 'ai' && game.turn() === 'b') {
      // Add a small delay to prevent immediate AI move
      setTimeout(() => {
        setIsViewingHistory(false);
      }, 100);
    }
  }, [game, gameHistory, onPlayerChange, mode]);

  const offerDraw = useCallback(() => {
    if (mode === 'ai') {
      const moveCount = game.history().length;
      if (aiDifficulty === 'easy') return Math.random() < 0.4;
      if (aiDifficulty === 'medium') return Math.random() < (moveCount > 40 ? 0.3 : 0.1);
      return Math.random() < (moveCount > 50 ? 0.2 : 0.05);
    }
    return false;
  }, [mode, aiDifficulty, game]);

  return {
    board,
    selectedSquare,
    validMoves,
    currentPlayer,
    gameHistory,
    isInCheck,
    checkmateSquare,
    isViewingHistory,
    viewingMoveIndex,
    selectSquare,
    makeMove,
    resetGame,
    navigateToMove,
    offerDraw,
    game
  };
};

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="h-9 w-9 hover:bg-secondary/80 transition-colors"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

const GameControls: React.FC<{
  onFlipBoard: () => void;
  onResign: () => void;
  onOfferDraw?: () => void;
  isGameOver: boolean;
}> = ({ onFlipBoard, onResign, onOfferDraw, isGameOver }) => (
  <Card className="panel border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold">Game Controls</CardTitle>
    </CardHeader>
    <CardContent className="p-2">
      <div className="flex gap-1">
        <Button onClick={onFlipBoard} variant="outline" size="sm" className="flex-1 h-8 text-xs">
          <Rotate3D className="h-3 w-3 mr-1" />
          Flip
        </Button>
        <Button 
          onClick={onOfferDraw} 
          variant="outline" 
          size="sm"
          className="flex-1 h-8 text-xs" 
          disabled={isGameOver || !onOfferDraw}
        >
          <Handshake className="h-3 w-3 mr-1" />
          Draw
        </Button>
        <Button onClick={onResign} variant="destructive" size="sm" className="flex-1 h-8 text-xs" disabled={isGameOver}>
          <Flag className="h-3 w-3 mr-1" />
          Resign
        </Button>
      </div>
    </CardContent>
  </Card>
);

const DrawOfferDialog: React.FC<{
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  playerName: string;
}> = ({ isVisible, onAccept, onDecline, playerName }) => {
  console.log('DrawOfferDialog render:', { isVisible, playerName });
  
  return (
    <Dialog open={isVisible} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draw Offer</DialogTitle>
          <DialogDescription>
            {playerName} has offered a draw. Do you accept?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={onAccept}>
            Accept Draw
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SettingsDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState([50]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your chess game experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sound</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-toggle" className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Enable Sound Effects
              </Label>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
            
            {soundEnabled && (
              <div className="space-y-2">
                <Label>Volume: {volume[0]}%</Label>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Visual</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="animations-toggle">
                Enable Animations
              </Label>
              <Switch
                id="animations-toggle"
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AboutDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          About ChessSpace
        </DialogTitle>
        <DialogDescription>
          A modern chess application built with React and TypeScript
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">♔</div>
          <h2 className="text-2xl font-bold">ChessSpace</h2>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Version 2.0.0
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Play against intelligent AI opponents</li>
              <li>• Local multiplayer games</li>
              <li>• Online multiplayer support</li>
              <li>• Beautiful, responsive design</li>
              <li>• Sound effects and animations</li>
              <li>• Multiple difficulty levels</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Technologies</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">React</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">Tailwind CSS</Badge>
              <Badge variant="outline">Chess.js</Badge>
              <Badge variant="outline">Socket.IO</Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
              Made with <Heart className="h-4 w-4 text-red-500" /> for chess enthusiasts
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={() => window.open('https://github.com/owaissafa/ChessSpace', '_blank')}
        >
          <Github className="h-4 w-4" />
          View Source
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const OnlineGamePanel: React.FC<{
  roomCode: string;
  isConnected: boolean;
  opponent: string;
  playerColor: 'white' | 'black' | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  waitingForOpponent?: boolean;
  gameStarted?: boolean;
}> = ({
  roomCode,
  isConnected,
  opponent,
  playerColor,
  onCreateRoom,
  onJoinRoom,
  waitingForOpponent = false,
  gameStarted = false
}) => {
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleJoinRoom = () => {
    if (joinCode.trim()) {
                    onJoinRoom(joinCode.trim());
    }
  };

  const copyRoomCode = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Room Code Copied!",
          description: "Room code copied to clipboard",
          duration: 2000,
        });
        return;
      }
      
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Room Code Copied!",
          description: "Room code copied to clipboard",
          duration: 2000,
        });
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Failed to copy room code:', err);
      // Show a toast or alert to the user
      toast({
        title: "Copy Failed",
        description: "Please manually copy the room code: " + roomCode,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/90 border-2 border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 font-semibold">
          <Users className="h-5 w-5" />
          Online Multiplayer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Connected to Server</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Connecting...</span>
            </>
          )}
        </div>

        {!roomCode ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Start Your Game</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a new room or join an existing one
              </p>
            </div>

            <Button 
              onClick={onCreateRoom} 
              className="w-full py-3 font-medium text-lg"
              disabled={!isConnected}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Room
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-medium">or join existing</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="Enter 4-digit number"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
                className="text-center font-mono text-xl py-3 tracking-widest"
                disabled={!isConnected}
              />
              <Button 
                onClick={handleJoinRoom} 
                variant="outline" 
                className="w-full py-3 font-medium text-lg"
                disabled={!joinCode.trim() || !isConnected}
              >
                <LogIn className="h-5 w-5 mr-2" />
                Join Room
              </Button>
            </div>

            {!isConnected && (
              <div className="text-center text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="animate-pulse">Connecting to game server...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Game Room</h3>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground text-center">Room Code:</div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-2xl font-bold text-center p-4 bg-primary/10 border-2 border-primary/20 rounded-lg flex-1 tracking-widest">
                  {roomCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyRoomCode}
                  className="shrink-0 h-12 w-12"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              {playerColor && (
                <div className="text-center">
                  <Badge variant="outline" className="px-4 py-2 text-lg font-semibold">
                    You are playing as{' '}
                    <span className={playerColor === 'white' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}>
                      {playerColor}
                    </span>
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              {gameStarted ? (
                <div>
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Play className="h-5 w-5" />
                    <span className="font-semibold text-lg">Game in Progress</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Playing against {opponent}
                  </div>
                </div>
              ) : waitingForOpponent ? (
                <div>
                  <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                    <Clock className="h-5 w-5 animate-pulse" />
                    <span className="font-medium text-lg">Waiting for Opponent</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Share the room code with your friend to start the game
                  </div>
                  <div className="animate-pulse">
                    <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full w-1/2 animate-bounce"></div>
                    </div>
                  </div>
                </div>
              ) : opponent ? (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Opponent Connected:</div>
                  <div className="font-semibold text-lg text-green-600 dark:text-green-400 mb-2">
                    {opponent}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Game starting soon...
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-muted-foreground">
                    Waiting for opponent...
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Share the room code with your friend
                  </div>
                  <div className="animate-pulse mt-2">
                    <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {gameStarted && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  <div className="font-medium">Game Active!</div>
                  <div className="mt-1">
                    {playerColor === 'white' ? 'You move first' : 'Waiting for white to move'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MenuScreen: React.FC<{ onStartGame: (mode: GameMode, difficulty?: 'easy' | 'medium' | 'hard') => void }> = ({ onStartGame }) => {
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleAiGame = (difficulty: 'easy' | 'medium' | 'hard') => {
    setShowAiDialog(false);
    onStartGame('ai', difficulty);
  };

  const difficultyConfig = {
    easy: {
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900',
      borderColor: 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
      description: 'Perfect for beginners and casual players',
      features: ['Forgiving gameplay', 'Basic strategies', 'Good for learning']
    },
    medium: {
      icon: Award,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900',
      borderColor: 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700',
      description: 'Balanced challenge for intermediate players',
      features: ['Strategic thinking', 'Tactical combinations', 'Moderate difficulty']
    },
    hard: {
      icon: Crown,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900',
      borderColor: 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
      description: 'Ultimate challenge for experienced players',
      features: ['Advanced tactics', 'Deep calculations', 'Expert level play']
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-6xl mb-4">♛</div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-3">
            ChessSpace
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Experience the ultimate chess adventure
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button> */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAbout(true)}
            className="flex items-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <Info className="h-4 w-4" />
            About
          </Button>
          <ThemeToggle />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="panel border-2 hover:border-primary/50 cursor-pointer group transition-transform hover:scale-105 scale-in">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors">
                <Bot className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl font-bold">Play vs AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center mb-6">
                Challenge our intelligent AI with multiple difficulty levels
              </p>
              <Button 
                onClick={() => setShowAiDialog(true)}
                className="w-full py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Choose Difficulty
              </Button>
            </CardContent>
          </Card>

          <Card className="panel border-2 hover:border-primary/50 cursor-pointer group transition-transform hover:scale-105 scale-in">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-50 hover:bg-green-100 transition-colors">
                <Monitor className="h-8 w-8 text-green-500 group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl font-bold">Local Play</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center mb-6">
                Play with a friend on the same device, taking turns
              </p>
              <Button 
                onClick={() => onStartGame('local')}
                className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 transition-colors"
              >
                Start Local Game
              </Button>
            </CardContent>
          </Card>

          <Card className="panel border-2 hover:border-primary/50 cursor-pointer group transition-transform hover:scale-105 scale-in">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors">
                <Users className="h-8 w-8 text-purple-500 group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl font-bold">Online Play</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center mb-6">
                Play with friends online in real-time multiplayer
              </p>
              <Button 
                onClick={() => onStartGame('online')}
                className="w-full py-3 text-lg font-semibold bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                Play Online
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Trophy className="h-4 w-4 mr-1" />
              Multiple AI Levels
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Star className="h-4 w-4 mr-1" />
              Beautiful Interface
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Zap className="h-4 w-4 mr-1" />
              Real-time Play
            </Badge>
          </div>
        </div>

        <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <Bot className="h-6 w-6 text-blue-500" />
                Choose AI Difficulty
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {Object.entries(difficultyConfig).map(([difficulty, config]) => {
                const IconComponent = config.icon;
                return (
                  <Card 
                    key={difficulty} 
                    className={`cursor-pointer hover:scale-105 transition-transform ${config.bgColor} ${config.borderColor} border-2`}
                    onClick={() => handleAiGame(difficulty as 'easy' | 'medium' | 'hard')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full bg-white/50 dark:bg-black/20`}>
                          <IconComponent className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold capitalize">{difficulty}</h3>
                            <Badge variant="outline" className="text-xs">
                              {difficulty === 'easy' ? 'Beginner' : difficulty === 'medium' ? 'Intermediate' : 'Expert'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">{config.description}</p>
                          <ul className="space-y-1">
                            {config.features.map((feature, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Choose your preferred difficulty level to begin playing against the AI
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
      </div>
    </div>
  );
};

const MoveHistory: React.FC<{
  gameHistory: string[];
  currentMoveIndex: number;
  onMoveClick?: (index: number) => void;
  onNavigateToMove?: (index: number) => void;
  isGameOver?: boolean;
}> = ({ gameHistory, currentMoveIndex, onMoveClick, onNavigateToMove, isGameOver = false }) => {
  const [viewingMoveIndex, setViewingMoveIndex] = useState(currentMoveIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);

  // Update viewing index when current move changes
  useEffect(() => {
    setViewingMoveIndex(currentMoveIndex);
  }, [currentMoveIndex]);

  const handleNavigateToMove = (index: number) => {
    setViewingMoveIndex(index);
    onNavigateToMove?.(index);
  };

  const startAutoPlay = () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    const interval = setInterval(() => {
      setViewingMoveIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < gameHistory.length) {
          onNavigateToMove?.(nextIndex);
          return nextIndex;
        } else {
          stopAutoPlay();
          return prevIndex;
        }
      });
    }, 1000);
    
    setPlayInterval(interval);
  };

  const stopAutoPlay = () => {
    if (playInterval) {
      clearInterval(playInterval);
      setPlayInterval(null);
    }
    setIsPlaying(false);
  };

  // Cleanup interval on unmount or when game history changes
  useEffect(() => {
    return () => {
      if (playInterval) {
        clearInterval(playInterval);
      }
    };
  }, [playInterval, gameHistory.length]);

  // Stop auto-play when game history changes
  useEffect(() => {
    if (isPlaying && gameHistory.length > 0) {
      stopAutoPlay();
    }
  }, [gameHistory.length]);
  const formatMove = (move: string, index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    
    if (isWhiteMove) {
      return `${moveNumber}. ${move}`;
    } else {
      return move;
    }
  };

  const moves = [];
  for (let i = 0; i < gameHistory.length; i += 2) {
    const whiteMove = gameHistory[i];
    const blackMove = gameHistory[i + 1];
    
    moves.push({
      number: Math.floor(i / 2) + 1,
      white: whiteMove,
      black: blackMove
    });
  }

  return (
    <Card className="panel border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Move History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto move-history-scroll">
          {moves.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="text-2xl mb-2">♔</div>
              <p className="text-sm">No moves yet</p>
              <p className="text-xs">Make your first move to start the game</p>
            </div>
          ) : (
            <div className="move-history-grid p-2 text-sm">
              <div className="font-semibold text-muted-foreground px-2 py-1">#</div>
              <div className="font-semibold text-muted-foreground px-2 py-1">White</div>
              <div className="font-semibold text-muted-foreground px-2 py-1">Black</div>
              
              {moves.map((move, index) => (
                <React.Fragment key={move.number}>
                  <div className="move-number">
                    {move.number}
                  </div>
                  <div 
                    className={cn(
                      "move-cell",
                      viewingMoveIndex === index * 2 && "move-cell-active",
                      currentMoveIndex === index * 2 && "move-cell-current"
                    )}
                    onClick={() => onMoveClick?.(index * 2)}
                  >
                    {move.white}
                  </div>
                  <div 
                    className={cn(
                      "move-cell",
                      move.black && viewingMoveIndex === index * 2 + 1 && "move-cell-active",
                      move.black && currentMoveIndex === index * 2 + 1 && "move-cell-current"
                    )}
                    onClick={() => move.black && onMoveClick?.(index * 2 + 1)}
                  >
                    {move.black || "..."}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        
        {moves.length > 0 && (
          <div className="p-3 border-t bg-secondary/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Total moves: {gameHistory.length}</span>
              <span>Viewing: {viewingMoveIndex + 1}</span>
            </div>
            {isPlaying && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Auto-playing...</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/20 ring-1 ring-primary rounded"></div>
                <span>Viewing</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500/20 ring-1 ring-green-500 rounded"></div>
                <span>Current</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-7"
                onClick={() => handleNavigateToMove(0)}
                disabled={viewingMoveIndex === 0 || isGameOver}
                title="Go to start position"
              >
                ⏮️ Start
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-7"
                onClick={() => handleNavigateToMove(Math.max(0, viewingMoveIndex - 1))}
                disabled={viewingMoveIndex === 0 || isGameOver}
                title="Previous move"
              >
                ⏪ Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-7"
                onClick={() => handleNavigateToMove(Math.min(gameHistory.length - 1, viewingMoveIndex + 1))}
                disabled={viewingMoveIndex === gameHistory.length - 1 || isGameOver}
                title="Next move"
              >
                ⏩ Next
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-7"
                onClick={() => handleNavigateToMove(gameHistory.length - 1)}
                disabled={viewingMoveIndex === gameHistory.length - 1 || isGameOver}
                title="Go to current position"
              >
                ⏭️ End
              </Button>
            </div>
            {gameHistory.length > 1 && (
              <div className="flex gap-1 mt-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 text-xs h-7"
                  onClick={isPlaying ? stopAutoPlay : startAutoPlay}
                  title={isPlaying ? "Stop auto-play" : "Auto-play from current position"}
                >
                  {isPlaying ? "⏹️ Stop" : "▶️ Play"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs h-7"
                  onClick={() => {
                    if (isPlaying) stopAutoPlay();
                    handleNavigateToMove(-1); // Go to start
                    setTimeout(() => startAutoPlay(), 100); // Start playing after navigation
                  }}
                  title="Play from start"
                  disabled={isPlaying}
                >
                  🔄 Replay
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GameBoard: React.FC<{
  mode: GameMode;
  aiDifficulty: 'easy' | 'medium' | 'hard';
  onBackToMenu: () => void;
}> = ({ mode, aiDifficulty, onBackToMenu }) => {
  const [gameStatus, setGameStatus] = useState('White to move');
  const [isFlipped, setIsFlipped] = useState(false);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600); // 10 minutes
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayerRef = useRef<'white' | 'black'>('white');
  const [gameStarted, setGameStarted] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleGameOver = useCallback((result: string) => {
    setIsGameOver(true);
    setGameStatus(result);
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    toast({
      title: "Game Over!",
      description: result,
      duration: 5000,
    });
  }, [toast, timerInterval]);

  const handlePlayerChange = useCallback((player: 'white' | 'black') => {
    if (!isGameOver) {
      setGameStatus(`${player === 'white' ? 'White' : 'Black'} to move`);
    }
  }, [isGameOver]);

  const {
    board,
    selectedSquare,
    validMoves,
    currentPlayer,
    gameHistory,
    isInCheck,
    checkmateSquare,
    isViewingHistory,
    viewingMoveIndex,
    selectSquare,
    resetGame,
    offerDraw: offerDrawLocal,
    makeMove,
    navigateToMove,
    game
  } = useChessEngine({
    mode,
    aiDifficulty,
    onGameOver: handleGameOver,
    onPlayerChange: handlePlayerChange
  });

  const handleSelectSquare = (square: string) => {
    // Don't allow moves when viewing history
    if (isViewingHistory) {
      return;
    }
    
    if (mode === 'online' && playerColor && currentPlayer !== playerColor) {
      return;
    }
    const currentHistory = game.history().length;
    selectSquare(square);
    // Check if a move was made
    if (game.history().length > currentHistory && mode === 'online') {
      const move = game.history({ verbose: true }).slice(-1)[0];
      sendMove({ from: move.from, to: move.to });
    }
  };

  const handleMoveReceived = useCallback((move: { from: string, to: string, promotion?: string }) => {
    console.log('Online move received:', move);
    if (move && move.from && move.to) {
      makeMove(move.from, move.to);
    }
  }, [makeMove]);

  const handleDrawOffered = useCallback(() => {
    console.log('Draw offer received');
    if (mode !== 'ai') {
      setShowDrawOffer(true);
      toast({
        title: "Draw Offer Received",
        description: "Your opponent has offered a draw",
        duration: 5000,
      });
    }
  }, [mode, toast]);

  const handleGameStart = useCallback(() => {
    console.log('Game start callback triggered');
    setGameStarted(true);
    setGameStatus('Game started! White to move');
    // Reset timers when game starts
    setWhiteTime(600);
    setBlackTime(600);
  }, []);

  const {
    socket,
    roomCode,
    playerColor,
    isConnected,
    opponent,
    createRoom,
    joinRoom,
    sendMove,
    offerDraw: offerDrawOnline,
    resignGame: resignOnline,
    acceptDraw,
    declineDraw
  } = useOnlineGame({
    onMoveReceived: handleMoveReceived,
    onGameOver: handleGameOver,
    onDrawOffered: handleDrawOffered,
    onGameStart: handleGameStart
  });

  // Update current player ref
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  // Timer effect - using refs to avoid closure issues
  useEffect(() => {
    console.log('Timer effect triggered:', { 
      isGameOver, 
      gameStarted, 
      mode, 
      opponent, 
      currentPlayer
    });
    
    // Clear existing timer
    if (timerRef.current) {
      console.log('Clearing existing timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop timer if game is over or not started
    if (isGameOver || !gameStarted) {
      console.log('Not starting timer - game over or not started');
      return;
    }

    // Don't start timer if waiting for opponent in online mode
    if (mode === 'online' && !opponent) {
      console.log('Not starting timer - waiting for opponent');
      return;
    }

    console.log('Starting timer for player:', currentPlayer);
    
    const timer = setInterval(() => {
      const activePlayer = currentPlayerRef.current;
      console.log('Timer tick for:', activePlayer);
      
      if (activePlayer === 'white') {
        setWhiteTime(prev => {
          const newTime = prev - 1;
          console.log('White time:', prev, '->', newTime);
          if (newTime <= 0) {
            handleGameOver("Time's up! Black wins");
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return newTime;
        });
      } else {
        setBlackTime(prev => {
          const newTime = prev - 1;
          console.log('Black time:', prev, '->', newTime);
          if (newTime <= 0) {
            handleGameOver("Time's up! White wins");
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return newTime;
        });
      }
    }, 1000);
    
    timerRef.current = timer;
    console.log('Timer started with ID:', timer);

    return () => {
      console.log('Cleaning up timer in useEffect cleanup');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentPlayer, isGameOver, gameStarted, mode, opponent, handleGameOver]);

  useEffect(() => {
    if (mode === 'online' && opponent && !gameStarted) {
      console.log('Starting online game - opponent joined');
      setGameStarted(true);
      setGameStatus('Game started! White to move');
    }
  }, [mode, opponent, gameStarted]);

  useEffect(() => {
    if ((mode === 'ai' || mode === 'local') && !gameStarted) {
      console.log('Auto-starting game for', mode, 'mode');
      setGameStarted(true);
      setGameStatus('Game started! White to move');
    }
  }, [mode]);

  // Update game status when viewing history
  useEffect(() => {
    if (isViewingHistory && !isGameOver) {
      setGameStatus(`Viewing move ${viewingMoveIndex + 1}`);
    } else if (!isGameOver) {
      setGameStatus(`${currentPlayer === 'white' ? 'White' : 'Black'} to move`);
    }
  }, [isViewingHistory, viewingMoveIndex, currentPlayer, isGameOver]);

  useEffect(() => {
    if (mode === 'online' && playerColor === 'black') {
      setIsFlipped(true);
    } else if (mode === 'online' && playerColor === 'white') {
      setIsFlipped(false);
    }
    
    // Reset timers when mode changes
    setWhiteTime(600);
    setBlackTime(600);
    
    // Only reset gameStarted for online mode, not for local/AI modes
    if (mode === 'online') {
      setGameStarted(false);
    }
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [mode, playerColor]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  const handleFlipBoard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleOfferDraw = () => {
    console.log('Offer draw clicked, mode:', mode);
    if (mode === 'online') {
      offerDrawOnline();
      toast({ 
        title: "Draw Offered", 
        description: "Draw offer sent to opponent",
        duration: 3000
      });
    } else if (mode === 'local') {
      setShowDrawOffer(true);
    } else if (mode === 'ai') {
      const accepted = offerDrawLocal();
      if (accepted) {
        toast({ 
          title: "Draw Accepted", 
          description: "AI accepted your draw offer",
          duration: 3000
        });
      } else {
        toast({ 
          title: "Draw Declined", 
          description: "AI declined your draw offer",
          duration: 3000
        });
      }
    }
  };

  const handleResign = () => {
    const winner = currentPlayer === 'white' ? 'Black wins by resignation' : 'White wins by resignation';
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    if (mode === 'online') {
      resignOnline();
    } else {
      handleGameOver(winner);
    }
  };

  const handleAcceptDraw = () => {
    setShowDrawOffer(false);
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    if (mode === 'online') {
      acceptDraw();
    }
    handleGameOver('Game drawn by agreement');
  };

  const handleDeclineDraw = () => {
    setShowDrawOffer(false);
    if (mode === 'online') {
      declineDraw();
    }
    toast({ 
      title: "Draw Declined", 
      description: "Draw offer declined",
      duration: 3000
    });
  };

  const startAutoPlay = () => {
    if (isAutoPlaying) return;
    
    setIsAutoPlaying(true);
    navigateToMove(0);
    
    setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < gameHistory.length - 1) {
          currentIndex++;
          navigateToMove(currentIndex);
        } else {
          stopAutoPlay();
        }
      }, 1000);
      
      setAutoPlayInterval(interval);
    }, 100);
  };

  const stopAutoPlay = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
    setIsAutoPlaying(false);
  };

  // Cleanup auto-play interval on unmount
  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
      }
    };
  }, [autoPlayInterval]);

  // Stop auto-play when game history changes
  useEffect(() => {
    if (isAutoPlaying && gameHistory.length > 0) {
      stopAutoPlay();
    }
  }, [gameHistory.length]);



  if (mode === 'online' && (!roomCode || (roomCode && !opponent && playerColor === 'white'))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 gradient-bg">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <Button variant="outline" onClick={onBackToMenu} className="btn-hover text-sm sm:text-base">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back to Menu</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <ThemeToggle />
          </div>
          
          <OnlineGamePanel
            roomCode={roomCode}
            isConnected={isConnected}
            opponent={opponent}
            playerColor={playerColor}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            waitingForOpponent={roomCode && !opponent && playerColor === 'white'}
            gameStarted={gameStarted}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      {/* Header with Game Status and Timer */}
      <div className="header-bg border-b border-border/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          {/* Mobile Layout - Stacked */}
          <div className="block sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <Button 
                variant="outline" 
                onClick={onBackToMenu} 
                size="sm" 
                className="btn-hover text-xs font-medium px-2 py-1.5 hover:bg-secondary/80 transition-all duration-200"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Menu
              </Button>
              
              <ThemeToggle />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs px-2 py-1 font-semibold bg-primary/10 text-primary border-primary/20"
                >
                  {mode === 'ai' ? `♔ AI (${aiDifficulty})` : mode === 'local' ? '♔ Local' : '♔ Online'}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-1 font-medium border-primary/30 text-primary/80"
                >
                  {mode === 'online' && !gameStarted && opponent ? 'Starting...' : gameStatus}
                </Badge>
              </div>
              
              <div className="flex gap-1">
                <div className={`px-2 py-1.5 rounded text-center transition-all duration-300 shadow-sm ${
                  currentPlayer === (isFlipped ? 'white' : 'black') && gameStarted
                    ? 'bg-primary/20 ring-1 ring-primary/50 shadow-md active-timer' 
                    : 'bg-secondary/60'
                }`}>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {isFlipped ? 'W' : 'B'}
                  </div>
                  <div className="text-sm font-mono font-bold">
                    {formatTime(isFlipped ? whiteTime : blackTime)}
                  </div>
                </div>
                
                <div className={`px-2 py-1.5 rounded text-center transition-all duration-300 shadow-sm ${
                  currentPlayer === (isFlipped ? 'black' : 'white') && gameStarted
                    ? 'bg-primary/20 ring-1 ring-primary/50 shadow-md active-timer' 
                    : 'bg-secondary/60'
                }`}>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {isFlipped ? 'B' : 'W'}
                  </div>
                  <div className="text-sm font-mono font-bold">
                    {formatTime(isFlipped ? blackTime : whiteTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            {/* Left side - Back button and game info */}
            <div className="flex items-center gap-4 sm:gap-6">
              <Button 
                variant="outline" 
                onClick={onBackToMenu} 
                size="sm" 
                className="btn-hover text-sm font-medium px-3 py-2 hover:bg-secondary/80 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Menu</span>
                <span className="sm:hidden">Menu</span>
              </Button>
              
              <div className="flex items-center gap-3 sm:gap-4">
                <Badge 
                  variant="secondary" 
                  className="text-sm px-3 py-1.5 font-semibold bg-primary/10 text-primary border-primary/20"
                >
                  {mode === 'ai' ? `♔ vs AI (${aiDifficulty})` : mode === 'local' ? '♔ Local Game' : '♔ Online Game'}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-sm px-3 py-1.5 font-medium border-primary/30 text-primary/80"
                >
                  {mode === 'online' && !gameStarted && opponent ? 'Starting game...' : gameStatus}
                </Badge>
              </div>
            </div>

            {/* Right side - Timer and theme toggle */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex gap-2 sm:gap-3">
                <div className={`px-4 py-2 rounded-lg text-center transition-all duration-300 shadow-sm ${
                  currentPlayer === (isFlipped ? 'white' : 'black') && gameStarted
                    ? 'bg-primary/20 ring-2 ring-primary/50 shadow-lg scale-105 active-timer' 
                    : 'bg-secondary/60 hover:bg-secondary/80'
                }`}>
                  <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">
                    {isFlipped ? 'White' : 'Black'}
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-bold">
                    {formatTime(isFlipped ? whiteTime : blackTime)}
                  </div>
                </div>
                
                <div className={`px-4 py-2 rounded-lg text-center transition-all duration-300 shadow-sm ${
                  currentPlayer === (isFlipped ? 'black' : 'white') && gameStarted
                    ? 'bg-primary/20 ring-2 ring-primary/50 shadow-lg scale-105 active-timer' 
                    : 'bg-secondary/60 hover:bg-secondary/80'
                }`}>
                  <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">
                    {isFlipped ? 'Black' : 'White'}
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-bold">
                    {formatTime(isFlipped ? blackTime : whiteTime)}
                  </div>
                </div>
              </div>
              
              <div className="ml-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-1 sm:gap-2 md:gap-4 lg:gap-6 max-w-7xl mx-auto w-full p-1 sm:p-2 md:p-4">
        <div className="flex-1 flex items-center justify-center order-1 lg:order-2 min-h-0 px-1 sm:px-2 md:px-4">
          <div className="w-full max-w-[280px] xs:max-w-xs sm:max-w-sm md:max-w-md lg:max-w-none">
            <ChessBoard 
              board={board}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              onSquareClick={handleSelectSquare}
              isFlipped={isFlipped}
              mode={mode}
              playerColor={playerColor}
              isInCheck={isInCheck}
              checkmateSquare={checkmateSquare}
              isViewingHistory={isViewingHistory}
            />
            

          </div>
        </div>

        <div className="w-full lg:w-80 xl:w-96 space-y-1 sm:space-y-2 md:space-y-4 order-2 lg:order-1 min-h-0 px-1 sm:px-2 md:px-4">

          <div className="lg:hidden">
            <Card className="panel border shadow-lg">
              <CardContent className="p-2 sm:p-3">
                <div className="flex gap-1 sm:gap-2">
                  <Button onClick={handleFlipBoard} variant="outline" size="sm" className="flex-1 text-xs sm:text-sm h-8 sm:h-9">
                    Flip
                  </Button>
                  <Button 
                    onClick={handleOfferDraw} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs sm:text-sm h-8 sm:h-9" 
                    disabled={isGameOver}
                  >
                    Draw
                  </Button>
                  <Button onClick={handleResign} variant="destructive" size="sm" className="flex-1 text-xs sm:text-sm h-8 sm:h-9" disabled={isGameOver}>
                    Resign
                  </Button>
                </div>

              </CardContent>
            </Card>

            {/* Mobile Move History */}
            <Card className="panel border shadow-lg mt-2 sm:mt-3">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Moves
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-32 overflow-y-auto move-history-scroll">
                  {gameHistory.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground">
                      <p className="text-xs">No moves yet</p>
                    </div>
                  ) : (
                    <div className="move-history-grid p-2 text-xs">
                      <div className="font-semibold text-muted-foreground px-1 py-1">#</div>
                      <div className="font-semibold text-muted-foreground px-1 py-1">W</div>
                      <div className="font-semibold text-muted-foreground px-1 py-1">B</div>
                      
                      {Array.from({ length: Math.ceil(gameHistory.length / 2) }, (_, i) => {
                        const whiteMove = gameHistory[i * 2];
                        const blackMove = gameHistory[i * 2 + 1];
                        return (
                          <React.Fragment key={i}>
                            <div className="move-number px-1 py-1">
                              {i + 1}
                            </div>
                            <div 
                              className={cn(
                                "move-cell px-1 py-1",
                                isViewingHistory && viewingMoveIndex === i * 2 && "move-cell-active",
                                !isViewingHistory && (gameHistory.length - 1) === i * 2 && "move-cell-current"
                              )}
                              onClick={() => navigateToMove(i * 2)}
                            >
                              {whiteMove}
                            </div>
                            <div 
                              className={cn(
                                "move-cell px-1 py-1",
                                isViewingHistory && viewingMoveIndex === i * 2 + 1 && "move-cell-active",
                                !isViewingHistory && (gameHistory.length - 1) === i * 2 + 1 && "move-cell-current"
                              )}
                              onClick={() => blackMove && navigateToMove(i * 2 + 1)}
                            >
                              {blackMove || "..."}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {gameHistory.length > 0 && (
                  <div className="p-2 border-t bg-secondary/20">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Moves: {gameHistory.length}</span>
                      <span>Viewing: {isViewingHistory ? viewingMoveIndex + 1 : gameHistory.length}</span>
                    </div>
                    {isAutoPlaying && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">Auto-playing...</span>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-6"
                        onClick={() => navigateToMove(0)}
                        disabled={isViewingHistory ? viewingMoveIndex === 0 : gameHistory.length === 0}
                        title="Go to start"
                      >
                        ⏮️
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-6"
                        onClick={() => navigateToMove(Math.max(0, (isViewingHistory ? viewingMoveIndex : gameHistory.length - 1) - 1))}
                        disabled={isViewingHistory ? viewingMoveIndex === 0 : gameHistory.length === 0}
                        title="Previous"
                      >
                        ⏪
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-6"
                        onClick={() => navigateToMove(Math.min(gameHistory.length - 1, (isViewingHistory ? viewingMoveIndex : gameHistory.length - 1) + 1))}
                        disabled={isViewingHistory ? viewingMoveIndex === gameHistory.length - 1 : gameHistory.length === 0}
                        title="Next"
                      >
                        ⏩
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-6"
                        onClick={() => navigateToMove(gameHistory.length - 1)}
                        disabled={isViewingHistory ? viewingMoveIndex === gameHistory.length - 1 : gameHistory.length === 0}
                        title="Go to end"
                      >
                        ⏭️
                      </Button>
                    </div>
                    {gameHistory.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1 text-xs h-6"
                          onClick={isViewingHistory ? () => navigateToMove(gameHistory.length - 1) : startAutoPlay}
                          title={isViewingHistory ? "Return to current" : "Auto-play from start"}
                        >
                          {isViewingHistory ? "Current" : "🔄 Replay"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs h-6"
                          onClick={isAutoPlaying ? stopAutoPlay : () => {
                            if (isViewingHistory) {
                              // If viewing history, play from current viewing position to end
                              let currentIndex = viewingMoveIndex;
                              setIsAutoPlaying(true);
                              const interval = setInterval(() => {
                                if (currentIndex < gameHistory.length - 1) {
                                  currentIndex++;
                                  navigateToMove(currentIndex);
                                } else {
                                  clearInterval(interval);
                                  setIsAutoPlaying(false);
                                }
                              }, 1000);
                              setAutoPlayInterval(interval);
                            } else {
                              // If at current position, start from beginning
                              startAutoPlay();
                            }
                          }}
                          title={isAutoPlaying ? "Stop auto-play" : "Play from current position"}
                        >
                          {isAutoPlaying ? "⏹️ Stop" : "▶️ Play"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block flex flex-col h-full">
            {/* Move History - 70% of space */}
            <div className="flex-1 min-h-0">
              <MoveHistory 
                gameHistory={gameHistory} 
                currentMoveIndex={gameHistory.length - 1} 
                onMoveClick={(index) => {
                  navigateToMove(index);
                }}
                onNavigateToMove={navigateToMove}
                isGameOver={game.isGameOver()}
              />
            </div>
            
            {/* Game Controls - 30% of space */}
            <div className="mt-4">
              <GameControls 
                onFlipBoard={handleFlipBoard}
                onResign={handleResign}
                onOfferDraw={handleOfferDraw}
                isGameOver={isGameOver}
              />
            </div>

            {isViewingHistory && (
              <Card className="panel border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Viewing Move {viewingMoveIndex + 1}
                        {game.isGameOver() && " (Game Over)"}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigateToMove(gameHistory.length - 1)}
                      className="text-xs h-7"
                    >
                      Return to Current
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {mode === 'online' && roomCode && !gameStarted && (
              <OnlineGamePanel
                roomCode={roomCode}
                isConnected={isConnected}
                opponent={opponent}
                playerColor={playerColor}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoom}
                waitingForOpponent={!opponent}
                gameStarted={gameStarted}
              />
            )}
          </div>
        </div>
      </div>

      <DrawOfferDialog
        isVisible={showDrawOffer}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
        playerName={mode === 'online' ? opponent : 'Your opponent'}
      />
    </div>
  );
};

const ChessGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleStartGame = (mode: GameMode, difficulty?: 'easy' | 'medium' | 'hard') => {
    setGameMode(mode);
    if (difficulty) {
      setAiDifficulty(difficulty);
    }
    setGameState('playing');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {gameState === 'menu' ? (
        <div className="p-4 w-full max-w-4xl">
          <MenuScreen onStartGame={handleStartGame} />
        </div>
      ) : (
        <div className="w-full">
          <GameBoard 
            mode={gameMode} 
            aiDifficulty={aiDifficulty}
            onBackToMenu={handleBackToMenu}
          />
        </div>
      )}
    </div>
  );
};

const ChessGameWithTheme: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="chess-app-theme">
      <SocketProvider>
        <ChessGame />
      </SocketProvider>
    </ThemeProvider>
  );
};

export default ChessGameWithTheme;
export { ThemeProvider, useTheme };
