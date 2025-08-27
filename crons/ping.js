const ping = async () => {
  await fetch("https://crypto-app-be.onrender.com/");
};

module.exports = ping;
