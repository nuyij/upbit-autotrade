const res = require("express/lib/response");
const Upbit = require("./upbit_lib");

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

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
    this.ms_init = (tick_kind * 60000) / 10;
    this.ms = (tick_kind * 60000) / 10;

    this.unit;
    this.balance;
    this.buy_myPrice;
    this.trade_vol;
    this.uuid;

    this.init_working = false;
    this.checkReady_working = 0;
    this.trading = false;
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
      this.stopLoss = 1 - 0.009;
      this.limitLie1 = -40;
      this.limitLie2 = -350;
      this.limitLie3 = -700;
      this.limitLie4 = -1500;
    }
    this.dif = this.limitLie1 / 4;
    this.presentMacd;
    this.isBorkenLimit = 0;
  }

  async play() {
    this.getReady();
    this.init();
  }

  async init() {
    console.log('----------init working---------');
    this.init_working =true;
    //마켓 정보(시세,주문 금액 단위)
    await upbit.order_chance(this.market).then((res) => {
      if (res.data) {
        const price = res.data.ask_account.avg_buy_price;
        const locked_ask = res.data.ask_account.locked;
        const locked_bid = res.data.bid_account.locked;
        const vol = res.data.ask_account.balance ;
        this.buy_myPrice = price;
        this.trade_vol = vol > 0 ? vol : locked_ask;
        //  매도주문 체크
        if (locked_ask > 0 || locked_bid > 0) {
          upbit.order_delete(this.uuid);
        } else {
          if (price * vol > 5000 || locked_ask * vol > 5000) {
            this.trading = true;
          } else {
            if(this.trading && this.uuid){
              this.saveLog();
            }
            this.trading = false;
          }
          if (this.trading) {
            if (this.state_stop) {
              return setTimeout(() => this.init(), 1000);
            }else{
              return setTimeout(() => this.body(), 100);
            }
          } else {
            if (this.ready) {
              return setTimeout(() => this.body(), 100);
            } else {
              return setTimeout(() => this.init(), 1000);
            }
          }
        }
      }else{
        return setTimeout(() => this.init(), 1000);
      }
    });
  }

  async getReady() {
    // init 작동 중인지 체크 , 중복 체크 후 init 실행
    this.checkReady_working++;
    if(this.checkReady_working==10){
      if(!this.init_working){
        setTimeout(()=>{
          if(!this.init_working){
            this.init();
          }
        },1000)
      }
      this.checkReady_working = 0;
    }
    this.init_working = false;
    await upbit.get_indicator(this.market, this.tick_kind).then((res) => {
      if (res) {
        const macd = res.macd;
        const bb = res.bb;
        this.macd = macd;
        this.bb = bb;
        this.presentMacd = macd.macd;
        this.checkMACD(macd.macd, macd.oscillator);
      }else{
        return setTimeout(() => this.getReady(), 1000);
      }
    });
  }

  async body() {
    //bollinger band
    if (this.bb) {
      // 매도
      if (this.trading) {
        const highband = parseFloat(this.bb.highband);
        const centerband = parseFloat(this.bb.centerband);
        const price = (highband + centerband) / 2;
        this.ask(this.adj_price(highband));
      } else {
        // 매수
        const trade_price = this.bb.price;
        const lowband = this.bb.lowband;
        const price = trade_price < lowband ? this.adj_price(trade_price) : this.adj_price(lowband);
        this.bid(price);
      }
    }
    //무한 루프 및 주문 취소
    setTimeout(() => { 
      upbit.order_delete(this.uuid).then(()=>{
        this.saveLog(res.data);
        return this.init()
      })
    }, 1000);
  }

  //macd 체크
  checkMACD(macd, osc) {
    console.log('----------check working---------');
    if (!this.trading) {
      this.state_stop =false;
      if (this.isBorkenLimit == 1) {
        if (macd < this.limitLie2 && osc > macd + this.dif && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie1) {
          this.isBorkenLimit = 0;
        }
      } else if (this.isBorkenLimit == 2) {
        if (macd < this.limitLie3 && osc > macd + this.dif && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie1*2/3) {
          this.isBorkenLimit = 1;
        }
      } else if (this.isBorkenLimit == 3) {
        if (macd < this.limitLie4 && osc > macd + this.dif && osc < 0) {
          this.ready = true;
        } else if (macd > this.limitLie2*2/3) {
          this.isBorkenLimit = 2;
        }
      } else {
        if (macd < this.limitLie1 && osc < 0) {
          this.ready = true;
        } else {
          this.ready = false;
        }
      }
      setTimeout(()=>{this.getReady()},1000)
    } else {
      this.stop();
    }
  }

  // 로그 저장
  async saveLog() {
    await upbit.order_detail(this.uuid).then((res) => {
      if (res.data) {
        this.uuid = null;
        const state = res.data.state;
        if (state == "done") {
    
          const time = res.data.created_at;
          const side = res.data.side;
          const price = res.data.trades[0].price;
          let volume = 0;
          for (let i = 0; i < res.data.trades.length; i++) {
            volume += parseFloat(res.data.trades[i].volume);
          }
          const spend = price * volume;
          const DATA = { time: time, side: side, price: price, spend: spend };
          this.Log.log.push(DATA);
          if (side == "bid") {
            this.bid_amount = spend;
            this.trading = true;
          } else {
            this.ready = false;
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
              const profit = parseFloat(this.ask_amount - this.bid_amount);
              this.totProfit += profit;
              DATA.profit = profit;
            }
          }
          console.log('--------------------------------------');
          console.log(this.isBorkenLimit);
          console.log(DATA);
          console.log(this.market + " tot profit : " + this.totProfit);
          console.log('--------------------------------------');
        }
      }
    })
  }

  //손절가시 손절
  async stop() {
      const price = this.bb.price;
      this.stopLoss = parseFloat(this.stopLoss);
      this.buy_myPrice = parseFloat(this.buy_myPrice);
      if (this.buy_myPrice * this.stopLoss > price) {
        this.state_stop = true;
        console.log(this.uuid);
        await upbit.order_delete(this.uuid);
        this.ask(this.adj_price(price)).then(()=>{
        this.saveLog(res.data);
          setTimeout(() => { this.getReady() }, this.ms)
        })
      } else {
        setTimeout(()=>{this.getReady()},1000)
        this.state_stop = false;
      }
  }

  async bid(price) {
    const volume = (this.vol * 10000) / price;
    await upbit.order_bid(this.market, volume, price).then((res) => {
      if (res.data) {
        this.buy_myPrice = price;
        this.trade_vol = volume;
        this.uuid = res.data.uuid;
        this.ms = this.ms_init;
      } else {
        this.ms = 1000;
      }
    });
  }

  async ask(price) {
    upbit.order_ask(this.market, this.trade_vol, price).then((oa) => {
      if (oa.data) {
        this.uuid = oa.data.uuid;
        this.ms = this.ms_init;
      } else {
        this.ms = 1000;
      }
    });
  }

  // 주문하는 단위에 맞게 금액 조정
  adj_price(price) {
    this.oreder_unit(price);
    const spare = price % this.unit;
    price = spare < this.unit / 2 ? price - spare : price + this.unit -spare;
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
