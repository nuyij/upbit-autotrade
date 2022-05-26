const Upbit = require("./lib/upbit_lib");
const Bot = require("./lib/botClass");
const Bot_1per = require("./lib/bot")
const Bot_macd = require("./lib/macd")
const Test = require("./lib/backTest")
const express = require("express");
const app = express();
const cors = require("cors");
const bodyparser = require("body-parser");

// 집
const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
// const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
// const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

async function start() {
  const bot = new Bot_macd("WEMIX",15,10)
  bot.play();
}
start();
