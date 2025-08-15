# ChessSpace

A modern chess game with AI, local multiplayer, and online multiplayer built with React, TypeScript, and Socket.IO.

## 🎮 Features

- **3 Game Modes**: Play against AI, local multiplayer, or online multiplayer
- **AI Opponent**: Stockfish engine with 3 difficulty levels
- **Real-time Multiplayer**: Live games with other players
- **10-minute Timer**: Visual countdown for both players
- **Sound Effects**: Audio feedback for moves and game events
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/owaissafa/ChessSpace.git

# Navigate to the project directory
cd ChessSpace
```

### Install and Run

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:full

# Open in browser
http://localhost:3000
```

## 🎯 Game Modes

### AI Game
- Choose from Easy, Medium, or Hard difficulty
- AI responds with intelligent moves
- Perfect for practice and learning

### Local Game
- Play with a friend on the same device
- Take turns making moves
- Great for casual games

### Online Game
- Create or join rooms with 4-digit codes
- Real-time multiplayer gameplay
- Full game state synchronization

## 🛠️ Development

```bash
npm run dev          # Frontend only
npm run server       # Backend only  
npm run dev:full     # Both (recommended)
```

## 🚀 Deployment

### Dynamic Port Configuration

ChessSpace supports dynamic port configuration for deployment on any server. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deployment

1. **Set Environment Variables** (minimal):
   ```bash
   SERVER_PORT=8081    # Your server's available port
   CLIENT_PORT=8080    # Your client's available port
   # URLs are auto-generated from the above
   ```

2. **Deploy**:
   ```bash
   npm run start:prod
   ```

### Production Commands

```bash
npm run build         # Build for production
npm run start         # Start with production build
npm run start:prod    # Start in production mode
```

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Chess Engine**: Chess.js, Stockfish AI
- **Real-time**: WebSocket communication

## 🤖 AI Assistance

This project was built with the help of AI tools for debugging, error fixing, and code optimization. While I did most of the development work, AI assistance was invaluable for:

- **Bug Fixing**: Resolving complex issues and edge cases
- **Code Optimization**: Improving performance and readability
- **Feature Implementation**: Helping with Socket.IO integration and real-time features
- **Documentation**: Assisting with README and code comments

The core game logic, design decisions, and overall architecture are my own work, with AI serving as a helpful development partner.

## 📄 License

MIT License

---

**🎯 Ready to play?** Run `npm run dev:full` and open http://localhost:3000
