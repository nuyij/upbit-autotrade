const Upbit = require("./upbit_lib");
const xlsx = require('xlsx')

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);
class Bot_1per {
  constructor(market, tick_kind, vol) {
    this.market = "KRW-" + market;
    this.tick_kind = tick_kind;
    this.vol = vol;

    this.open;
    this.trade;

    this.state = 'waiting';
    this.condition0;
    this.condition1;
    this.condition2;

    this.permit;
    this.buying;
    this.selling;
    this.hold
    this.done;

    this.buy_myPrice;
    this.trade_vol;
    this.uuid;

    this.Log = [['time', 'side', 'price', 'volume', 'profit']]

  }

  play() {
    this.time()
    this.bot()
    this.buy()
    this.sell()
    this.saveLog()
  }

  async bot() {
    while (true) {
      this.state = 'waiting';
      const res = await upbit.market_minute(this.market, this.tick_kind, 200)
      const data = res.data;
      if (data[0]) {
        this.open = data[0].opening_price;
        const high = data[0].high_price;
        this.trade = data[0].trade_price;

        const ma5 = upbit.get_ma(data, 5)[0].ma;
        const ma20 = upbit.get_ma(data, 20)[0].ma;
        const ma100 = upbit.get_ma(data, 100)[0].ma;
        this.condition0 = this.open*1.01 < high;
        this.condition1 = (ma5 > ma20) && (ma5 <= ma20*1.03);
        this.condition2 = ma20 > ma100;
      }
      console.log(this.state);
      await this.sleep(200);
    }
  }

  async buy() {
    while (true) {
      if (this.buying) {
        if (!this.permit) {
          this.state = 'canceling order';
          await upbit.order_delete(this.uuid);
          this.buying = false;
        }
      } else {
        if (this.condition0 && this.condition1 && this.condition2 && this.permit && !this.done) {
          this.state = 'buying';
          this.bid(this.adj_price(this.open * 1.01))
        }
      }
      await this.sleep(200)
    }
  }

  async sell() {
    let once;
    while (true) {
      if (this.selling) {
        if (!this.permit && !once) {
          this.state = 'stopping loss';
          await upbit.order_delete(this.uuid)
          this.ask(this.adj_price(this.trade))
          once = true;
        } else if (this.permit && this.done) {
          this.state = 'stopping loss';
          await upbit.order_delete(this.uuid)
          this.ask(this.adj_price(this.trade));
          await this.sleep(2000)
        }
      } else {
        if (this.hold && this.permit && !this.done) {
          this.state = 'selling';
          this.ask(this.adj_price(this.open * 1.02))
          once = false;
        }
      }
      await this.sleep(200)
    }

  }

  async time() {
    while (true) {
      const min = new Date().getMinutes();
      const sec = new Date().getSeconds();
      if (min % 3 == 0 && sec % 60 < 1) {
        if (!this.selling) this.done = false;
      }
      if (min % 3 == 2 && sec % 60 > 57) {
        this.permit = false;
        this.done = true;
      } else {
        this.permit = true;
      }
      await this.sleep(200)
    }
  }

  async bid(price) {
    const volume = (this.vol * 10000) / price;
    await upbit.order_bid(this.market, volume, price).then((res) => {
      if (res.data) {
        this.buying = true;
        this.buy_myPrice = price;
        this.trade_vol = volume;
        this.uuid = res.data.uuid;
      }
    });
  }

  async ask(price) {
    upbit.order_ask(this.market, this.trade_vol, price).then((oa) => {
      if (oa.data) {
        this.selling = true;
        this.uuid = oa.data.uuid;
      }
    });
  }

  // 로그 저장
  async saveLog() {
    while (true) {
      if (this.uuid) {
        await upbit.order_detail(this.uuid).then((res) => {
          if (res.data) {
            const state = res.data.state;
            if (state == "done") {
              this.state = 'done';
              this.uuid = null;
              const time = res.data.created_at;
              const side = res.data.side;
              const price = res.data.trades[0].price;
              let volume = 0;
              for (let i = 0; i < res.data.trades.length; i++) {
                volume += parseFloat(res.data.trades[i].volume);
              }
              const spend = price * volume;
              const DATA = { time: time, side: side, price: price, spend: spend };
              this.Log.push(DATA);
              if (side == "bid") {
                this.bid_amount = spend;
                this.trading = true;
                this.hold = true;
              } else {
                this.buying = false;
                this.selling = false;
                this.hold = false;
                this.done = true;
                if (this.bid_amount != 0) {
                  this.ask_amount = spend;
                  const profit = parseFloat(this.ask_amount - this.bid_amount - this.ask_amount * 0.005 - this.bid_amount * 0.005);
                  this.totProfit += profit;
                  DATA.profit = profit;
                }
              }
            }
            console.log(this.Log);
            this.excel(this.Log)
          }
        })
      }
      await this.sleep(200);
    }
  }

  // 주문하는 단위에 맞게 금액 조정
  adj_price(price) {
    this.oreder_unit(price);
    const spare = price % this.unit;
    price = spare < this.unit / 2 ? price - spare : price + this.unit - spare;
    return price;
  }

  oreder_unit(price) {
    if (price > 2000000) {
      this.unit = 1000;
      return;
    } else if (price > 1000000) {
      this.unit = 500;
      return;
    } else if (price > 500000) {
      this.unit = 100;
      return;
    } else if (price > 100000) {
      this.unit = 50;
      return;
    } else if (price > 10000) {
      this.unit = 10;
      return;
    } else if (price > 1000) {
      this.unit = 5;
      return;
    } else if (price > 100) {
      this.unit = 1;
      return;
    } else if (price > 10) {
      this.unit = 0.1;
      return;
    } else if (price > 1) {
      this.unit = 0.01;
      return;
    } else if (price > 0.1) {
      this.unit = 0.001;
      return;
    } else {
      this.unit = 0.0001;
      return;
    }
  }

  async excel(data) {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data);

    xlsx.utils.book_append_sheet(workbook, worksheet, 'sheet1');
    xlsx.writeFile(workbook, 'excel.xlsx');
  }

  sleep = async (ms) => {
    return new Promise(
      (resolve, reject) =>
        setTimeout(
          () => resolve(),
          ms
        )
    );
  }
}

module.exports = Bot_1per