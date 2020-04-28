const socket = io();

let _gameId = null;
let _questionId = null;

socket.on('connect', () => {
  console.log('connected');
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get('name');
  const gameId = urlParams.get('gameId');
  if (gameId) {
    socket.emit('join-game', { name, gameId });
    _gameId = gameId;
  } else {
    socket.emit('create-game', { name });
  }
});

socket.on('message', (data) => {
  console.log('message', data);
});

socket.on('game-created', ({ gameId, message }) => {
  console.log('game-created', gameId);
  _gameId = gameId;
});

socket.on('game-over', ({ game, winner, message }) => {
  console.log('game-over', game, winner);
});

socket.on('question', ({ question, currentQuestion }) => {
  console.log('question', question);
  $('.question').text(question.text);
  const options = question.options.map((option) => {
    return `<div class="option">${option}</div>`;
  });
  $('.options').html(options);
  _questionId = currentQuestion;
});

socket.on('answer-result', ({ result, message }) => {
  console.log('answer-result', message, result);
});

$('#game-area').click((e) => {
  socket.emit('hit');
});

$('#start').click((e) => {
  socket.emit('start-game', { gameId: _gameId });
});

$('body').on('click', '.option', function (e) {
  const answer = $(this).text();
  console.log(answer);
  socket.emit('answer', {
    gameId: _gameId,
    answer,
    currentQuestion: _questionId,
  });
});
