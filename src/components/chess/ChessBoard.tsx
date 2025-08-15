
import React from 'react';
import { cn } from '../../lib/utils';
import { GameMode } from './ChessGame';

// Chess Piece and Square components merged into this file
interface ChessSquareProps {
  children?: React.ReactNode;
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isCheckmate?: boolean;
  isKingInCheck?: boolean;
  onClick: () => void;
}

const ChessSquare: React.FC<ChessSquareProps> = ({
  children,
  isLight,
  isSelected,
  isValidMove,
  isCheckmate,
  isKingInCheck,
  onClick
}) => {
  return (
    <div
      className={cn(
        "relative w-full aspect-square cursor-pointer transition-colors",
        isLight ? "chess-square-light" : "chess-square-dark",
        isSelected && "chess-square-selected",
        isValidMove && "chess-square-valid-move",
        isCheckmate && "bg-red-500 animate-pulse ring-2 ring-red-400",
        isKingInCheck && !isCheckmate && "bg-red-400 ring-1 ring-red-500"
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface ChessPieceProps {
  piece: string;
}

const ChessPiece: React.FC<ChessPieceProps> = ({ piece }) => {
  const isWhite = piece.startsWith('w');
  const pieceType = piece.slice(1).toUpperCase();
  const color = isWhite ? 'w' : 'b';
  
  const imagePath = `/images/chess-pieces/${color}${pieceType}.png`;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src={imagePath}
        alt={`${isWhite ? 'White' : 'Black'} ${pieceType}`}
        className="w-3/4 h-3/4 object-contain select-none pointer-events-none"
        draggable={false}
        style={{
          imageRendering: '-webkit-optimize-contrast'
        }}
      />
    </div>
  );
};

// Main ChessBoard component
interface ChessBoardProps {
  board: any[][];
  selectedSquare: string | null;
  validMoves: string[];
  onSquareClick: (square: string) => void;
  isFlipped: boolean;
  mode: GameMode;
  playerColor?: 'white' | 'black' | null;
  isInCheck?: boolean;
  checkmateSquare?: string | null;
  isViewingHistory?: boolean;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  validMoves,
  onSquareClick,
  isFlipped,
  mode,
  playerColor,
  isInCheck,
  checkmateSquare,
  isViewingHistory = false
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const renderCoordinates = () => {
    const displayFiles = isFlipped ? [...files].reverse() : files;
    const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

    return (
      <>
        {/* File labels (a-h) */}
        <div className="absolute -bottom-6 left-0 right-0 flex">
          {displayFiles.map((file) => (
            <div
              key={file}
              className="flex-1 text-center text-xs md:text-sm font-medium text-muted-foreground"
            >
              {file}
            </div>
          ))}
        </div>
        
        {/* Rank labels (1-8) */}
        <div className="absolute -left-6 top-0 bottom-0 flex flex-col">
          {displayRanks.map((rank) => (
            <div
              key={rank}
              className="flex-1 flex items-center justify-center text-xs md:text-sm font-medium text-muted-foreground"
            >
              {rank}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderBoard = () => {
    const squares = [];
    
    // Properly handle board flipping
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        // Calculate actual board positions based on flip state
        const displayRankIndex = isFlipped ? 7 - rankIndex : rankIndex;
        const displayFileIndex = isFlipped ? 7 - fileIndex : fileIndex;
        
        const rank = ranks[displayRankIndex];
        const file = files[displayFileIndex];
        const square = `${file}${rank}`;
        
        // Get piece from the actual board position
        const boardRankIndex = parseInt(rank) - 1;
        const boardFileIndex = files.indexOf(file);
        const piece = board[7 - boardRankIndex][boardFileIndex];
        
        const isSelected = selectedSquare === square;
        const isValidMove = validMoves.includes(square);
        const isLight = (rankIndex + fileIndex) % 2 === 0;
        const isCheckmate = checkmateSquare === square;
        const isKingInCheck = isInCheck && piece && piece.type === 'k';

        const canMove = mode === 'local' || 
                       (mode === 'ai') || 
                       (mode === 'online' && playerColor && 
                        ((playerColor === 'white' && piece && piece.color === 'w') || 
                         (playerColor === 'black' && piece && piece.color === 'b')));

        squares.push(
          <ChessSquare
            key={square}
            isLight={isLight}
            isSelected={isSelected}
            isValidMove={isValidMove}
            isCheckmate={isCheckmate}
            isKingInCheck={isKingInCheck}
            onClick={() => onSquareClick(square)}
          >
            {piece && <ChessPiece piece={`${piece.color}${piece.type}`} />}
          </ChessSquare>
        );
      }
    }

    return squares;
  };

  return (
    <div className="relative mx-auto fade-in w-full max-w-fit">
      <div className="relative p-1 sm:p-2 md:p-4 lg:p-6">
        {renderCoordinates()}
        <div className={cn(
          "w-80 h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] grid grid-cols-8 border-2 rounded-lg overflow-hidden shadow-lg bg-card mx-auto",
          isViewingHistory 
            ? "border-orange-300 dark:border-orange-700 ring-2 ring-orange-200 dark:ring-orange-800" 
            : "border-border"
        )}>
          {renderBoard()}
        </div>
        {isViewingHistory && (
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
            History
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessBoard;


