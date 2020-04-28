const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuid } = require('uuid');
const fetch = require('node-fetch');

const port = process.env.PORT || 4001;

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

      socket.emit('message', {
        message: `Welcome to the game!: ${name}`,
      });

      socket.to(gameId).emit('message', {
        message: `${name} has joined the game`,
      });
    }
  });

  socket.on('start-game', async ({ gameId }) => {
    try {
      if (games[gameId].users.length !== 2) {
        socket.emit('message', {
          message: 'Cannot start game without 2 players',
        });
        return;
      }
      games[gameId].status = 'In Progress';
      const resp = await fetch(
        'https://opentdb.com/api.php?amount=3&category=9&difficulty=easy&type=multiple'
      );
      const respJson = await resp.json();

      games[gameId].questions = respJson.results.map((result) => {
        return {
          text: result.question,
          options: shuffle([
            result.correct_answer,
            ...result.incorrect_answers,
          ]),
          correct_answer: result.correct_answer,
          responses: 0,
        };
      });

      console.log('questions ', games[gameId].questions);
      io.in(gameId).emit('message', { message: 'Game started' });

      const question = {
        ...games[gameId].questions[0],
        correct_answer: undefined,
      };
      io.in(gameId).emit('question', {
        message: 'Question',
        currentQuestion: 0,
        question,
      });

      // setTimeout(() => {}, 10000);
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
      game.questions[cq].responses++;
      user.answers.push(answer);
      const result = game.questions[cq].correct_answer === answer;
      if (result) {
        user.total_correct_answers++;
      }
      socket.emit('answer-result', {
        result,
        message: `Your answer is ${result ? 'correct' : 'wrong'}`,
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
        const winner = game.users.reduce(
          (prev, current) =>
            prev.total_correct_answers > current.total_correct_answers
              ? prev
              : current,
          0
        );
        game.winner = winner;
        game.status = 'Finished';
        io.in(gameId).emit('game-over', {
          message: 'Game over',
          game,
          winner,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    const game = games[socket.gameId];
    const userIndex = game.users.findIndex((user) => user.id === socket.id);
    const user = game.users[userIndex];
    game.users.splice(userIndex, 1);
    socket.broadcast.emit('message', {
      message: `${user.name} has left the game`,
    });
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
