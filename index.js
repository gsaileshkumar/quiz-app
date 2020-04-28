const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuid } = require('uuid');

const port = process.env.PORT || 4001;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const io = socketIo(server);

let game = { status: 'Closed', users: [], winner: null };

let timeout;

io.on('connection', (socket) => {
  socket.on('create-game', ({ name }) => {
    clearTimeout(timeout);
    if (game.users.length === 2) {
      socket.emit('message', {
        message: 'Game in progress',
      });
      return;
    }
    game.status = 'Open';
    game.users.push({ name, id: socket.id, hits: 0 });

    socket.join('game-room');

    socket.emit('message', {
      message: `Welcome to the game!: ${name}`,
    });

    socket.to('game-room').emit('message', {
      message: `${name} has joined the game`,
    });
  });

  socket.on('start-game', () => {
    if (game.users.length === 2) {
      game.status = 'In Progress';
      io.in('game-room').emit('message', { message: 'Game started' });
      timeout = setTimeout(() => {
        const winner = game.users.reduce(
          (prev, current) => (prev.hits > current.hits ? prev : current),
          0
        );
        game.status = 'Finished';
        game.winner = winner;
        io.in('game-room').emit('game-over', { message: 'Game over', game });
        game.winner = null;
        game.users.forEach((user) => {
          user.hits = 0;
        });
      }, 5000);
    } else {
      socket.emit('message', {
        message: 'Not enough users to start the game',
      });
    }
  });

  socket.on('hit', () => {
    if (game.status === 'In Progress') {
      const userIndex = game.users.findIndex((user) => user.id === socket.id);
      game.users[userIndex].hits++;
    }
  });

  socket.on('disconnect', () => {
    const userIndex = game.users.findIndex((user) => user.id === socket.id);
    const user = game.users[userIndex];
    game.users.splice(userIndex, 1);
    socket.broadcast.emit('message', {
      message: `${user.name} has left the game`,
    });
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
