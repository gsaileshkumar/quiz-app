let game = {};

function createGame(username, socketId) {
  const users = [];
  const user = {
    username,
    socketId,
  };
  users.push(user);
  game = {
    users,
  };
  return game;
}

module.exports = {
  createGame,
};
