const rp = require("request-promise");
const sign = require("jsonwebtoken").sign;
const queryEncode = require("querystring").encode;

async function request(url, qs, token, method) {
  if (!method) {
    method = "GET";
  }
  let options = {
    method: method,
    url: url,
    json: true,
    transform: function (body, response) {
      let remain_min = 0;
      let remain_sec = 0;
      if (response.headers && response.headers["remaining-req"]) {
        let items = response.headers["remaining-req"].split(";");
        for (let item of items) {
          let [key, val] = item.split("=");
          if (key.trim() == "min") {
            remain_min = parseInt(val.trim());
          } else if (key.trim() == "sec") {
            remain_sec = parseInt(val.trim());
          }
        }
      }
      return {
        success: true,
        remain_min: remain_min,
        remain_sec: remain_sec,
        data: body,
      };
    },
  };
  if (method == "POST") {
    options.json = qs;
  } else {
    options.qs = qs;
  }
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }
  let result = { success: false, message: null, name: null };
  try {
    result = await rp(options);
  } catch (e) {
    result.data = null;
    if (e.error.error) {
      result.message = e.error.error.message;
      result.name = e.error.error.name;
    } else {
      result.message = e.message;
    }
  }

  return result;
}

//전체 계좌 조회
async function accounts() {
  const url = "https://api.upbit.com/v1/accounts";

  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, {}, token);
  return result;
}

// 주문 리스트
async function order_list(market, state, uuids, page) {
  //market: null KRW-BTC
  //state: wait done
  const url = "https://api.upbit.com/v1/orders";
  let qs = { state: state, page: page };
  if (market) qs["market"] = market;
  if (uuids) qs["uuids"] = uuids;

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token);
  return result;
}

// 주문(매수)
async function order_bid(market, volume, price) {
  //market: KRW-BTC
  const url = "https://api.upbit.com/v1/orders";
  let qs = {
    market: market,
    side: "bid",
    volume: volume,
    price: price,
    ord_type: "limit",
  };

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token, "POST");
  return result;
}

// 주문(매도)
async function order_ask(market, volume, price) {
  //market: KRW-BTC
  const url = "https://api.upbit.com/v1/orders";
  let qs = {
    market: market,
    side: "ask",
    volume: volume,
    price: price,
    ord_type: "limit",
  };

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token, "POST");
  return result;
}

// 주문 상세
async function order_detail(uuid) {
  const url = "https://api.upbit.com/v1/order";
  let qs = { uuid: uuid };

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token);
  return result;
}

// 주문 취소
async function order_delete(uuid) {
  const url = "https://api.upbit.com/v1/order";
  let qs = { uuid: uuid };

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token, "DELETE");
  return result;
}

// 주문 가능 정보
async function order_chance(market) {
  const url = "https://api.upbit.com/v1/orders/chance";
  let qs = { market: market };

  const query = queryEncode(qs);
  const payload = {
    access_key: this.accessKey,
    nonce: new Date().getTime(),
    query: query,
  };
  const token = sign(payload, this.secretKey);

  let result = await request(url, qs, token);
  return result;
}

// 시세종목정보
async function market_all() {
  const url = "https://api.upbit.com/v1/market/all";
  let result = await request(url);
  return result;
}

// 분 캔들
async function market_minute(market, unit, count,to) {
  //unit:  1, 3, 5, 15, 10, 30, 60, 240
  //to: yyyy-MM-dd'T'HH:mm:ssXXX
  const url = "https://api.upbit.com/v1/candles/minutes/" + unit;
  let qs = { market: market };
  if (to) qs.to = to;
  if (count) qs.count = count;

  let result = await request(url, qs);
  return result;
}

// 일 캔들
async function market_day(market, count,to) {
  //to: yyyy-MM-dd'T'HH:mm:ssXXX
  const url = "https://api.upbit.com/v1/candles/days";
  let qs = { market: market };
  if (to) qs.to = to;
  if (count) qs.count = count;

  let result = await request(url, qs);
  return result;
}

// 주 캔들
async function market_week(market, count) {
  //to: yyyy-MM-dd'T'HH:mm:ssXXX
  const url = "https://api.upbit.com/v1/candles/weeks";
  let qs = { market: market };
  if (to) qs.to = to;
  if (count) qs.count = count;

  let result = await request(url, qs);
  return result;
}

// 월 캔들
async function market_month(market, to, count) {
  //to: yyyy-MM-dd'T'HH:mm:ssXXX
  const url = "https://api.upbit.com/v1/candles/months";
  let qs = { market: market };
  if (to) qs.to = to;
  if (count) qs.count = count;

  let result = await request(url, qs);
  return result;
}

// 채결 정보
async function market_trade_tick(market, to, count) {
  //to: yyyy-MM-dd'T'HH:mm:ssXXX
  const url = "https://api.upbit.com/v1/trades/ticks";
  let qs = { market: market };
  if (to) qs.to = to;
  if (count) qs.count = count;

  let result = await request(url, qs);
  return result;
}

// 시세 Ticker
async function market_ticker(markets) {
  // markets: KRW-BTC,KRW-ETH
  const url = "https://api.upbit.com/v1/ticker";
  let qs = { markets: markets };

  let result = await request(url, qs);
  return result;
}

// 호가 정보
async function trade_orderbook(markets) {
  // markets: KRW-BTC,KRW-ETH
  const url = "https://api.upbit.com/v1/orderbook";
  let qs = { markets: markets };

  let result = await request(url, qs);
  return result;
}

// bollinger band
// tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
function get_bb(data) {
  let bb;
  const range = 20;

  const candles = data;

  let tot = 0;
  for (let i = 0; i < range; i++) {
    tot += candles[i].trade_price;
  }
  const avg = tot / range;
  let M = 0;
  for (let i = 0; i < range; i++) {
    M += Math.pow(Math.abs(candles[i].trade_price - avg), 2);
  }
  const sigma = Math.sqrt(M / range);

  const time = candles[0].candle_date_time_kst;
  const price = candles[0].trade_price;
  const centerband = avg.toFixed(1);
  const highband = parseFloat(centerband) + sigma * 2;
  const lowband = centerband - sigma * 2;

  bb = {
    time: time,
    price: price,
    centerband: centerband,
    highband: highband.toFixed(1),
    lowband: lowband.toFixed(1),
  };
  return bb;
}

function get_ma(data, range) {
  const ma_list = [];
  const candles = data;
  for (let i = 0; i < range; i++) {
    let tot = 0;
    const time = candles[i].candle_date_time_kst;
    const price = candles[i].trade_price;
    for (let j = i; j < range + i; j++) {
      const price = candles[j].trade_price;
      tot += price;
    }
    const ma = tot / range;
    const data = { time: time, trade_price: price, ma: ma };
    ma_list.push(data);
  }

  return ma_list;
}

function ma(data,range){
  const ma = [];
  for (let i = 0; i < data.length-range; i++) {
    let sum = 0;
    for (let j = i; j <i+ range; j++) {
      const price = parseFloat(data[j])
      sum += price;
    }
    const MA = parseFloat(sum)/parseFloat(range)
    ma.push(MA.toFixed(2));
  }
  return ma;
}

function ema(maData,tradeData,range){
  
  const ema = [];
  let ema_list = [];
  const ma = [];
  const trade = [];
  for (let i = 0; i < maData.length; i++) {
    ma.unshift(maData[i]);
    trade.unshift(tradeData[i]);
  }
  for (let j = 0; j < ma.length-range; j++) {
    ema_list = [];
    for (let i = 1+j; i < j+1+range; i++) {
      const ema_previous = ema_list ? ma[i] : ema_list[ema_list.length-1];
      const mul= 2 / (range + 1);
      const EMA = trade[i]*mul+ema_previous*(1-mul);
      ema_list.push(EMA.toFixed(2));
    }
    ema.unshift(ema_list[ema_list.length-1])
  }
  // for (let i = 0; i < maData.length; i++) {
  //   ma.unshift(maData[i]);
  //   trade.unshift(tradeData[i]);
  // }
  // for (let i = 1; i < ma.length; i++) {
  //   const ema_previous = ema_list ? ma[0] : ema_list[ema_list.length-1];
  //   const mul= 2 / (range + 1);
  //   const EMA = trade[i]*mul+ema_previous*(1-mul);
  //   ema_list.push(EMA.toFixed(2));
  // }
  // for (let i = 0 ; i < ema_list.length; i++) {
  //   ema.unshift(ema_list[i]);
  // }

  return ema;
}

function get_ema(data, range) {
  let ema_list = [];
  const res = get_ma(data, 100);
  if (res == null || typeof res == "undefined") {
    setTimeout(() => {
      return get_ema(range);
    }, 1000);
  } else {
    for (let i = 3 * range - 1; i >= 0; i--) {
      let ema_;
      if (ema_list.length == 0) {
        ema_ = parseFloat(res[i + 1].ma);
      } else {
        ema_ = ema_list[3 * range - 2 - i];
      }
      const price = res[i].trade_price;
      const mul = 2 / (1 + range);

      const ema = price * mul + ema_ * (1 - mul);
      ema_list.push(ema);
    }
    const adj_emaList = [];
    for (let i = 3 * range - 1; i >= 0; i--) {
      adj_emaList.push(ema_list[i]);
    }
    ema_list = adj_emaList;
  }
  return ema_list;
}

function get_macd(data) {
  const range = 35;
  let line26 = get_ema(data, 26);
  let line12 = get_ema(data, 12);
  const macd = line12[0] - line26[0];
  let macd_initMa;
  let macd_list = [];
  let signal_list = [];
  const adj_macd = [];
  let signal;
  let oscillator = [];

  // macd
  for (let i = range; i >= 0; i--) {
    const macd = line12[range - i] - line26[range - i];
    macd_list.push(macd);
  }

  let tot = 0;
  for (let i = 0; i < 9; i++) {
    tot += macd_list[i];
  }
  macd_initMa = tot / 9;

  for (let i = range; i >= 0; i--) {
    const mul = 2 / (1 + 9);
    if (signal_list.length == 0) {
      signal = macd_list[i] * mul + macd_initMa * (1 - mul);
    } else {
      signal = macd_list[i] * mul + signal_list[range - 1 - i] * (1 - mul);
    }
    signal_list.push(signal.toFixed(3));
  }

  for (let i = 0; i < signal_list.length; i++) {
    adj_macd.push(signal_list[range - i]);
    macd_list[i]=macd_list[i].toFixed(3)
  }
  signal_list = adj_macd;

  for (let i = 0; i < signal_list.length; i++) {
    oscillator.push((macd_list[i]-signal_list[i]).toFixed(2))
  }
  return { macd: macd, signal: signal, oscillator: oscillator };
}

function get_stochastic(data){
  const range = 20;
  const n = 10;
  const m = 10;
  const list = [];
  let fastK_list = [];
  let slowK_list = [];
  let slowK = []
  let slowD = [];
  
  for (let j = 0; j < data.length-range; j++) {
      let low = 100000000;
      let high = 0;
      for (let i = j; i < j+range; i++) {
        low = data[i].trade_price < low ? data[i].trade_price : low;
        high = data[i].trade_price > high ? data[i].trade_price : high;
      }
    
      const trade = data[j].trade_price;
      const fastK = parseFloat((trade-low)*100/(high-low));
      fastK_list.push(fastK.toFixed(2));
  }
  // slowK_list = ma(array,10);
  slowK_list = ma(fastK_list,10);
  slowD = ma(slowK_list,10)

  // let sum = 0;
  // for (let j = 0; j < 10; j++) {
  //   sum += parseFloat(slowK_list[j])
  // }
  // const d = sum / 10;
  // slowD.push(d.toFixed(2))
  // console.log(slowK_list);
  // console.log(slowD);

  // for (let i = 0; i < slowK_list.length-m; i++) {
  //   let sum = 0;
  //   for (let j = i; j < m+i; j++) {
  //     sum += parseFloat(slowK_list[j])
  //   }
  //   const d = sum/10;
  //   slowD.push(d.toFixed(2))
  // }
  return {slowK:slowK_list,slowD:slowD}
}

async function get_indicator(market, tick_kind) {
  try {
    let result = await market_minute(market, tick_kind, 400);
    const candles = result.data;
    const bb = get_bb(candles);
    const macd = get_macd(candles);
    return {
      success: result.success,
      remain_min: result.remain_min,
      remain_sec: result.remain_sec,
      bb: bb,
      macd: macd,
    };
} catch (error) {
    // setTimeout(() => {
    //   get_indicator(market, tick_kind);
    // },1000);
  }
}

// class Upbit
function Upbit(s, a) {
  this.secretKey = s;
  this.accessKey = a;
}
Upbit.prototype.accounts = accounts;
Upbit.prototype.order_list = order_list;
Upbit.prototype.order_bid = order_bid;
Upbit.prototype.order_ask = order_ask;
Upbit.prototype.order_detail = order_detail;
Upbit.prototype.order_delete = order_delete;
Upbit.prototype.order_chance = order_chance;
Upbit.prototype.market_all = market_all;
Upbit.prototype.market_minute = market_minute;
Upbit.prototype.market_day = market_day;
Upbit.prototype.market_week = market_week;
Upbit.prototype.market_month = market_month;
Upbit.prototype.market_trade_tick = market_trade_tick;
Upbit.prototype.market_ticker = market_ticker;
Upbit.prototype.trade_orderbook = trade_orderbook;
Upbit.prototype.get_bb = get_bb;
Upbit.prototype.get_ma = get_ma;
Upbit.prototype.get_ema = get_ema;
Upbit.prototype.get_macd = get_macd;
Upbit.prototype.get_stochastic = get_stochastic;
Upbit.prototype.get_indicator = get_indicator;

module.exports = Upbit;
