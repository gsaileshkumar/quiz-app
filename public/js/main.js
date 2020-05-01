let socket = io();

let _gameId = null;
let _players = [];
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
  $('#my-name').text(name);
  window.history.replaceState({}, document.title, '/');
});

socket.on('message', (data) => {
  console.log('message', data);
});

socket.on('player-joined', ({ name, players, message }) => {
  console.log(message, players);
  $('.alert').text(message);
  $('.alert').show();
  _players = players;
  updatePlayers();
  setTimeout(function () {
    $('.alert').fadeOut();
  }, 3000);
});
socket.on('player-left', ({ name, message }) => {
  console.log(message);
  $('.alert').text(message);
  $('.alert').show();
  setTimeout(function () {
    $('.alert').fadeOut();
  }, 3000);
});

socket.on('game-created', ({ gameId, message }) => {
  console.log('game-created', gameId);
  _gameId = gameId;
  const gameLink = window.location.origin + '/index.html?gameId=' + _gameId;
  $('#game-link').text(gameLink);
  $('.game-link-text').show();
});

socket.on('game-started', ({ message }) => {
  $('#start').hide();
  $('.game .container').css('display', 'flex');
});

socket.on('game-over', ({ game, winnerList, message }) => {
  console.log('game-over', game, winnerList);
  $('.game .container').hide();
  const winner_message =
    winnerList.length === 1
      ? `${winnerList[0].username} won the quiz`
      : 'Game tied';
  $('.alert').text(winner_message);
  $('.alert').show();
  $('#new-game').show();
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

socket.on('answer-result', ({ players, message }) => {
  console.log('answer-result', message, players);
  _players = players;
  updatePlayers();
});

$('#start').click((e) => {
  socket.emit('start-game', { gameId: _gameId });
});
$('#new-game').click((e) => {
  window.location.reload();
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

function updatePlayers() {
  const playersList = _players.map((player) => {
    return `
    <div class="player">
      <h4 class="name">${player.username}</h4>
      <div class="answers">
      ${player.answers
        .map((answer) => {
          return `<div class="${
            answer.result ? 'answer correct' : 'answer wrong'
          }" ></div>`;
        })
        .join('')}
      </div>
      <h5 class="score-text">Score: <span id="score">${
        player.total_correct_answers
      }</span></h5>
    </div>
    `;
  });
  $('.players').html('');
  $('.players').append(playersList);
}
