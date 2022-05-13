const Upbit = require("./lib/upbit_lib");
const Bot = require("./lib/botClass");
const Bot_1per = require("./lib/bot")
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

//------------------------------------CLASS END-----------------------------------------

app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

// const server = app.listen("1111", () => {
//   console.log("connect server");
// });
//------------------------------------SERVER-----------------------------------------

const bot = new Bot("BTC", 5, 25);
// client.use(express.static(__dirname + '/public'));
app.get("/", function (req, res) {
  const LOG = bot.Log;
  LOG.totProfit = bot.totProfit;
  res.send(LOG);
});

//------------------------------------SERVER END-----------------------------------------

async function start() {
  const bot = new Bot_1per("BTC",3,30)
  bot.play();
  // const upbit = new Upbit(secretKey, accessKey)

  {
    // let data = await upbit.order_chance('KRW-ZIL');
    // console.log(data);
    // let data = await upbit.market_minute('KRW-ZIL',1,1);
    // let data = await upbit.get_bb('KRW-ZIL',5);
    // log.push(data);
    // console.log(data);
    // console.log(log);
    //Bot ( market, min : candle , vol of money(만) )
    // bot.play();
    // let data = await upbit.get_macd('KRW-ZIL',15);
    // console.log(data);
    // const abd= new upbit.abc("kim");
    // abd.myname();
    // await bot.play();
  }
  // bot.play();

}
start();
