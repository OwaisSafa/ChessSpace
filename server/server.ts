import express = require('express');
import * as http from 'http';
import { Server } from 'socket.io';
import cors = require('cors');
import { Chess } from 'chess.js';
import config from '../config';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: config.socket.cors,
  transports: ['polling', 'websocket']
});

const rooms: { [key: string]: { 
  players: { [socketId: string]: { color: 'white' | 'black', name: string } }, 
  game: any,
  gameState: 'waiting' | 'playing' | 'finished'
} } = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('create_room', ({ playerName }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      players: { [socket.id]: { color: 'white', name: playerName } },
      game: new Chess(),
      gameState: 'waiting'
    };
    socket.join(roomId);
    console.log(`Room ${roomId} created by ${playerName} (${socket.id})`);
    socket.emit('room_created', { room_code: roomId, player_color: 'white', status: 'waiting' });
  });

  socket.on('join_room', ({ room_id, player_name }) => {
    const room = rooms[room_id];
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }
    if (Object.keys(room.players).length >= 2) {
      return socket.emit('error', { message: 'Room is full' });
    }
    const playerIds = Object.keys(room.players);
    if (playerIds.includes(socket.id)) {
      return socket.emit('error', { message: 'You are already in this room' });
    }

    room.players[socket.id] = { color: 'black', name: player_name };
    room.gameState = 'playing';
    socket.join(room_id);
    console.log(`${player_name} (${socket.id}) joined room ${room_id}`);

    const opponentId = playerIds[0];
    const opponentName = room.players[opponentId].name;

    // Notify the new player they joined
    socket.emit('room_joined', { 
      room_code: room_id, 
      player_color: 'black', 
      opponent: opponentName,
      status: 'playing'
    });

    // Notify the existing player that an opponent joined
    socket.to(room_id).emit('opponent_joined', { opponent: player_name, status: 'playing' });
  });

  socket.on('make_move', ({ move }) => {
    // Find the room this player is in
    let playerRoom = null;
    let roomId = null;
    
    for (const [id, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        playerRoom = room;
        roomId = id;
        break;
      }
    }

    if (!playerRoom || !roomId) {
      return socket.emit('error', { message: 'Not in a game' });
    }

    const player = playerRoom.players[socket.id];
    if (player && player.color === (playerRoom.game.turn() === 'w' ? 'white' : 'black')) {
      const result = playerRoom.game.move(move);
      if (result) {
        console.log(`Move in room ${roomId}:`, move);
        // Broadcast to all players in the room
        io.to(roomId).emit('chess_move', {
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
          player: player.name,
          color: player.color
        });
      } else {
        socket.emit('error', { message: 'Invalid move' });
      }
    } else {
      socket.emit('error', { message: "Not your turn" });
    }
  });

  socket.on('offer_draw', () => {
    // Find the room this player is in
    let playerRoom = null;
    let roomId = null;
    
    for (const [id, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        playerRoom = room;
        roomId = id;
        break;
      }
    }

    if (!playerRoom || !roomId) {
      return;
    }

    // Get opponent's socket ID
    const playerIds = Object.keys(playerRoom.players);
    const opponentId = playerIds.find(id => id !== socket.id);
    
    if (opponentId) {
      // Emit draw offer to opponent
      socket.to(opponentId).emit('draw_offered');
      console.log(`Draw offer sent from ${socket.id} to ${opponentId}`);
    }
  });

  socket.on('draw_response', ({ accepted }) => {
    // Find the room this player is in
    let playerRoom = null;
    let roomId = null;
    
    for (const [id, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        playerRoom = room;
        roomId = id;
        break;
      }
    }

    if (!playerRoom || !roomId) {
      return;
    }

    // Get opponent's socket ID
    const playerIds = Object.keys(playerRoom.players);
    const opponentId = playerIds.find(id => id !== socket.id);
    
    if (opponentId) {
      // Emit draw response to opponent
      socket.to(opponentId).emit('draw_response', { accepted });
      console.log(`Draw response sent from ${socket.id} to ${opponentId}: ${accepted}`);
      
      if (accepted) {
        playerRoom.gameState = 'finished';
        io.to(roomId).emit('game_ended', {
          result: 'draw',
          reason: 'Draw by agreement'
        });
      }
    }
  });

  socket.on('resign_game', () => {
    // Find the room this player is in
    let playerRoom = null;
    let roomId = null;
    
    for (const [id, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        playerRoom = room;
        roomId = id;
        break;
      }
    }

    if (!playerRoom || !roomId) {
      return;
    }

    // Get opponent's socket ID
    const playerIds = Object.keys(playerRoom.players);
    const opponentId = playerIds.find(id => id !== socket.id);
    
    if (opponentId) {
      // Emit resignation to opponent
      socket.to(opponentId).emit('opponent_resigned');
      console.log(`Resignation sent from ${socket.id} to ${opponentId}`);
      playerRoom.gameState = 'finished';
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        console.log(`Player ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit('player_disconnected', {
          player: room.players[socket.id]?.name || 'Unknown',
          color: room.players[socket.id]?.color || 'unknown',
          game_state: 'finished'
        });
        if (Object.keys(room.players).length === 0) {
          console.log(`Room ${roomId} is empty, deleting.`);
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

const PORT = config.server.port;
const HOST = config.server.host;
server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
  console.log(`CORS origin: ${config.socket.cors.origin}`);
});
