const socket = io();

socket.on('connect', () => {
  console.log('connected');
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get('name');
  const gameId = urlParams.get('gameId');
  if (gameId) {
    socket.emit('join-game', { name, gameId });
  } else {
    socket.emit('create-game', { name });
  }
});

socket.on('message', (data) => {
  console.log('message', data);
});

socket.on('game-over', (data) => {
  console.log('game-over', data);
});

$('#game-area').click((e) => {
  socket.emit('hit');
});

$('#start').click((e) => {
  socket.emit('start-game');
});
