const res = require("express/lib/response");
const Upbit = require("./upbit_lib");

// 집
const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
// const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
// const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);
class Bot {
  // tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
  // vol : 쓸 돈
  // 0. 매수 해야할지 매도해야할지 현상태 확인, 초기 데이터 수집
  // 1. 볼린저밴드 시간마다 확인 매수, 매수한거 취소
  // 2. 매수 시 수량 저장, 현재 상태 매수중으로 변경
  // 3. 볼린저밴드 시간마다 확인 매도, -4% 달성시 매도취소, 매도
  constructor(market, tick_kind, vol) {
    this.market = "KRW-" + market;
    this.tick_kind = tick_kind;
    this.vol = vol;

    this.bb;
    this.macd;

    this.trade_price;
    this.ms = (tick_kind * 60000) / 10;
    this.unit;
    this.trading = false;
    this.balance;
    this.buy_myPrice;
    this.trade_vol;
    this.uuid;
    this.ready = false;
    this.state_stop = false;
    this.order_exist = false;
    this.bid_amount = 0;
    this.ask_amount = 0;
    this.Log = { name: market, log: [], totProfit: "" };
    this.totProfit = 0;
    if (market == "BTC") {
      this.limitLie1 = -17000;
      this.limitLie2 = -150000;
      this.limitLie3 = -200000;
      this.limitLie4 = -280000;
      this.stopLoss = 1 - 0.0045;
    } else if (market == "SOL") {
      this.stopLoss = 1 - 0.008;
      this.limitLie1 = -40;
      this.limitLie2 = -400;
      this.limitLie3 = -700;
      this.limitLie4 = -1500;
    }
    this.presentMacd;
    this.isBorkenLimit = 0;
  }
  async get_indicator() {
    let data = await upbit.get_indicator("KRW-BTC", 5);
  }

  async play() {
    this.getReady();
    this.init();
  }

  async init() {
    //마켓 정보(시세,주문 금액 단위)
    await upbit.order_chance(this.market).then((res) => {
      if (typeof res.data != "undefined" && res.data != null) {
        const price = res.data.ask_account.avg_buy_price;
        this.buy_myPrice = price;
        const vol = res.data.ask_account.balance;
        this.trade_vol = vol;
        const locked_ask = res.data.ask_account.locked;
        const locked_bid = res.data.bid_account.locked;
        //  매도주문 체크
        if(locked_ask >0 || locked_bid > 0 ){
          upbit.order_delete(this.uuid);
        }else{
          if (price * vol > 5000 || locked_ask*vol > 5000) {
            this.trading = true;
          } else {
            this.trading = false;
          }
          if (this.trading) {
            if (!this.state_stop) {
              return this.body();
            }
          } else {
            if (this.ready) {
              return this.body();
            } else {
              return setTimeout(() => this.init(), 1000);
            }
          }
        }
      }
    });
  }

  async getReady() {
    await upbit.get_indicator(this.market, this.tick_kind).then((res) => {
      if (typeof res != "undefined") {
        const macd = res.macd;
        const bb = res.bb;
        this.macd = macd;
        this.bb = bb;
        this.presentMacd = macd.macd;
        this.checkMACD(macd.macd, macd.oscillator);
      } 
      return setTimeout(() => this.getReady(), 500);
    });
  }

  async body() {
    if (typeof this.bb != "undefined") {
      //bollinger band
      //매수 매도
      // 데이터 있으면
      if (this.trading) {
        // 매도
        const highband = this.adj_price(this.bb.highband);
        const centerband = this.adj_price(this.bb.centerband);
        const price = (highband + centerband)/2;
        this.ask(this.adj_price(price));
      } else {
        // 매수
        const trade_price = this.bb.price;
        const lowband = this.bb.lowband;
        let price = this.adj_price(lowband);
        if (trade_price < lowband) {
          price = this.adj_price(trade_price);
        }
        this.bid(price);
      }
      //무한 루프 및 주문 취소
      setTimeout(() => {
        upbit.order_delete(this.uuid).then(() => {
          upbit.order_detail(this.uuid).then((res) => {
            if (res.data != null && typeof res.data != "undefined") {
              this.saveLog(res.data);
            }else{
              console.log('save error');
            }
          });
        });
        return this.init();
      }, this.ms);
    }
  }

  //macd 체크
  checkMACD(macd, osc) {
    if (!this.trading) {
      if (this.isBorkenLimit == 1) {
        if (macd < this.limitLie2 && osc > macd + 5000 && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie1) {
          this.isBorkenLimit = 0;
        }
      } else if (this.isBorkenLimit == 2) {
        if (macd < this.limitLie3 && osc > macd + 5000 && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie1) {
          this.isBorkenLimit = 1;
        }
      } else if (this.isBorkenLimit == 3) {
        if (macd < this.limitLie4 && osc > macd + 5000 && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie2) {
          this.isBorkenLimit = 2;
        }
      } else {
        if (macd < this.limitLie1 && osc < 0) {
          this.ready = true;
        } else {
          this.ready = false;
        }
      }
    } else {
      this.stop();
    }
  }

  // 로그 저장
  saveLog(data) {
    const state = data.state;
    if (state == "done") {
      const time = data.created_at;
      const side = data.side;
      const price = data.price;
      const spend = price * data.executed_volume;
      const DATA = { time: time, side: side, price: price, spend: spend };
      this.Log.log.push(DATA);
      if (side == "this.bid") {
        this.bid_amount = spend;
        this.trading = true;
      } else {
        this.trading = false;
        this.state_stop = false;
        if (this.presentMacd > this.limitLie1) {
          this.isBorkenLimit = 0;
        } else if (this.presentMacd < this.limitLie1) {
          this.isBorkenLimit = 1;
        } else if (this.presentMacd < this.limitLie2) {
          this.isBorkenLimit = 2;
        } else if (this.presentMacd < this.limitLie3) {
          this.isBorkenLimit = 3;
        }
        if (this.bid_amount != 0) {
          this.ask_amount = spend;
          const profit = this.ask_amount - this.bid_amount;
          this.totProfit += profit;
          DATA.profit = profit;
        }
      }
      console.log(DATA);
      console.log(this.market + " tot profit : " + this.totProfit);
    }
  }

  //손절가시 손절
  async stop() {
    if (this.trading) {
      const price = this.bb.price;
      if (this.buy_myPrice * this.stopLoss > price) {
        this.state_stop = true;
        upbit.order_delete(this.uuid);
        this.ask(this.adj_price(price));
      } else {
        this.state_stop = false;
      }
    }
  }

  async bid(price) {
    const volume = (this.vol * 10000) / price;
    this.buy_myPrice = price;
    this.trade_vol = volume;
    await upbit.order_bid(this.market, volume, price).then((res) => {
      if (res.data != null && typeof res.data != "undefined") {
        this.uuid = res.data.uuid;
      } else {
        console.log('bid error');
      }
    });
  }

  async ask(price) {
    upbit.order_ask(this.market, this.trade_vol, price).then((oa) => {
      if (oa.data != null && typeof oa.data != "undefined") {
        this.uuid = oa.data.uuid;
      } else {
        console.log('ask error');
      }
    });
  }

  // 주문하는 단위에 맞게 금액 조정
  adj_price(price) {
    this.oreder_unit(price);
    const spare = price % this.unit;
    price = spare < this.unit/2 ? price-spare : price + spare;
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
}

module.exports = Bot;
