const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuid } = require('uuid');
// const fetch = require('node-fetch');
const quiz_q = require('./resources');

const port = process.env.PORT || 4000;

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const io = socketIo(server);

const games = {};

io.on('connection', (socket) => {
  socket.on('create-game', ({ name }) => {
    const gameId = uuid();
    const user = {
      username: name,
      id: socket.id,
      answers: [],
      total_correct_answers: 0,
    };
    const game = {
      gameId,
      users: [user],
      questions: [],
      currentQuestion: 0,
    };

    games[gameId] = game;

    socket.join(gameId);
    socket.gameId = gameId;

    socket.emit('game-created', {
      gameId,
      message: `Welcome to the game!: ${name}`,
    });

    socket.to(gameId).emit('message', {
      message: `${name} has joined the game`,
    });
  });

  socket.on('join-game', ({ name, gameId }) => {
    if (games[gameId] && games[gameId].users.length === 1) {
      const user = {
        username: name,
        id: socket.id,
        answers: [],
        total_correct_answers: 0,
      };

      games[gameId].users.push(user);

      socket.join(gameId);
      socket.gameId = gameId;

      io.in(gameId).emit('player-joined', {
        name: name,
        players: games[gameId].users,
        message: `${name} has joined the game`,
      });
    } else {
      socket.emit('game-not-exists', {
        message: 'Game not exists',
      });
    }
  });

  socket.on('start-game', async ({ gameId }) => {
    try {
      if (
        games[gameId].users.length !== 2 &&
        games[gameId].status !== 'In Progress'
      ) {
        socket.emit('message', {
          message: 'Cannot start game without 2 players',
        });
        return;
      }
      games[gameId].status = 'In Progress';
      // const tokenResp = await fetch(
      //   `https://opentdb.com/api_token.php?command=request`
      // );
      // const { token } = await tokenResp.json();
      // const resp = await fetch(
      //   `https://opentdb.com/api.php?amount=10&category=9&difficulty=easy&type=multiple&token=${token}`
      // );
      // const respJson = await resp.json();

      // games[gameId].questions = respJson.results.map((result) => {

      const game_q = getRandom(quiz_q, 5);
      games[gameId].questions = game_q.map((result) => {
        return {
          text: capitalize(result.question),
          options: result.options.map((option) => capitalize(option)),
          correct_answer: capitalize(result.correct_answer),
          responses: 0,
        };
      });

      io.in(gameId).emit('game-started', { message: 'Game started' });

      const question = {
        ...games[gameId].questions[0],
        correct_answer: undefined,
      };
      io.in(gameId).emit('question', {
        message: 'Question',
        currentQuestion: 0,
        question,
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('answer', ({ gameId, answer, currentQuestion: cq }) => {
    const game = games[gameId];
    if (
      game &&
      game.status === 'In Progress' &&
      cq === game.currentQuestion &&
      game.questions[cq].responses < 2
    ) {
      const userIndex = game.users.findIndex((user) => user.id === socket.id);
      const user = game.users[userIndex];
      if (user.answers.length > cq) {
        socket.emit('message', {
          message: 'Already answered',
        });
        return;
      }
      game.questions[cq].responses++;
      const result = game.questions[cq].correct_answer === answer;
      user.answers.push({ answer, result });
      if (result) {
        user.total_correct_answers++;
      }
      io.in(gameId).emit('answer-result', {
        players: game.users,
        message: `${user.username} answered ${result ? 'correct' : 'wrong'}`,
      });

      if (
        game.questions[cq].responses === 2 &&
        cq !== game.questions.length - 1
      ) {
        game.currentQuestion++;
        io.in(gameId).emit('question', {
          message: 'Question',
          currentQuestion: game.currentQuestion,
          question: game.questions[game.currentQuestion],
        });
      } else if (
        game.questions[cq].responses === 2 &&
        cq === game.questions.length - 1
      ) {
        let winnerList = [];
        game.users.map((user) => {
          if (winnerList.length === 0) {
            winnerList.push(user);
            return;
          }
          if (
            user.total_correct_answers > winnerList[0].total_correct_answers
          ) {
            winnerList = [user];
            return;
          }
          if (
            user.total_correct_answers === winnerList[0].total_correct_answers
          ) {
            winnerList.push(user);
            return;
          }
        });
        game.winner = winnerList;
        game.status = 'Finished';
        io.in(gameId).emit('game-over', {
          message: 'Game over',
          game,
          winnerList,
        });
        Object.values(io.sockets.connected).map((socket) =>
          socket.leave(gameId)
        );
      }
    }
  });

  socket.on('disconnect', () => {
    const game = games[socket.gameId];
    if (!game) {
      return;
    }
    socket.leave(socket.gameId);
    io.in(socket.gameId).emit('player-left', {
      message: `Your friend has left the game`,
    });
    games[socket.gameId] = null;
    socket.gameId = null;
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function getSubSet(array, n) {
  // Shuffle array
  const shuffled = array.sort(() => 0.5 - Math.random());

  // Get sub-array of first n elements after shuffled
  return shuffled.slice(0, n);
}

function getRandom(arr, n) {
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  if (n > len)
    throw new RangeError('getRandom: more elements taken than available');
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

const capitalize = (s) => {
  if (typeof s !== 'string') return s;
  var text = s.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
