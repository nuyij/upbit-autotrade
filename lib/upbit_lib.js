const rp = require("request-promise")
const sign = require("jsonwebtoken").sign
const queryEncode = require("querystring").encode

async function request(url, qs, token, method) {
    if (!method) {
        method = 'GET'
    }
    let options = {
        method: method, 
        url: url,
        json: true,
        transform: function (body, response) {
            let remain_min = 0
            let remain_sec = 0
            if (response.headers && response.headers['remaining-req']) {
                let items = response.headers['remaining-req'].split(';')
                for (let item of items) {
                    let [key, val] = item.split('=')
                    if (key.trim()=='min') {
                        remain_min = parseInt(val.trim())
                    } else if (key.trim()=='sec') {
                        remain_sec = parseInt(val.trim())
                    }
                }
            }
            return {
                'success': true,
                'remain_min': remain_min, 
                'remain_sec': remain_sec, 
                'data': body
            }
        }
    }
    if (method=='POST') {
        options.json = qs
    } else {
        options.qs = qs
    }
    if (token) {
        options.headers = {Authorization: `Bearer ${token}`}
    }
    let result = {'success': false, 'message': null, 'name': null}
    try {
        result = await rp(options)
    } catch(e) {
        result.data = null
        if (e.error.error) {
            result.message = e.error.error.message
            result.name = e.error.error.name
        } else {
            result.message = e.message
        }
    }

    return result
}

//전체 계좌 조회
async function accounts() {
    const url = 'https://api.upbit.com/v1/accounts'

    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, {}, token)
    return result
}

// 주문 리스트
async function order_list(market, state, uuids, page) {
    //market: null KRW-BTC
    //state: wait done
    const url = 'https://api.upbit.com/v1/orders'
    let qs = {state:state, page:page}
    if (market) qs['market'] = market
    if (uuids) qs['uuids'] = uuids

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token)
    return result
}

// 주문(매수)
async function order_bid(market, volume, price) {
    //market: KRW-BTC
    const url = 'https://api.upbit.com/v1/orders'
    let qs = {market:market, side:'bid', volume:volume, price:price, ord_type:'limit'}

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token, 'POST')
    return result
}

// 주문(매도)
async function order_ask(market, volume, price) {
    //market: KRW-BTC
    const url = 'https://api.upbit.com/v1/orders'
    let qs = {market:market, side:'ask', volume:volume, price:price, ord_type:'limit'}

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token, 'POST')
    return result
}

// 주문 상세
async function order_detail(uuid) {
    const url = 'https://api.upbit.com/v1/order'
    let qs = {uuid:uuid}

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token)
    return result
}

// 주문 취소
async function order_delete(uuid) {
    const url = 'https://api.upbit.com/v1/order'
    let qs = {uuid:uuid}

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token, 'DELETE')
    return result
}

// 주문 가능 정보
async function order_chance(market) {
    const url = 'https://api.upbit.com/v1/orders/chance'
    let qs = {market:market}

    const query = queryEncode(qs)
    const payload = {
        access_key: this.accessKey,
        nonce: (new Date).getTime(),
        query: query
    }
    const token = sign(payload, this.secretKey)

    let result = await request(url, qs, token)
    return result
}

// 시세종목정보
async function market_all() {
    const url = 'https://api.upbit.com/v1/market/all'
    let result = await request(url)
    return result
}

// 분 캔들
async function market_minute(market, unit, count) {
    //unit:  1, 3, 5, 15, 10, 30, 60, 240
    //to: yyyy-MM-dd'T'HH:mm:ssXXX
    const url = 'https://api.upbit.com/v1/candles/minutes/'+unit
    let qs = {market:market}
    if (count) qs.count = count

    let result = await request(url, qs)
    return result
}

// 일 캔들
async function market_day(market, to, count) {
    //to: yyyy-MM-dd'T'HH:mm:ssXXX
    const url = 'https://api.upbit.com/v1/candles/days'
    let qs = {market:market}
    if (to) qs.to = to
    if (count) qs.count = count

    let result = await request(url, qs)
    return result
}

// 주 캔들
async function market_week(market, to, count) {
    //to: yyyy-MM-dd'T'HH:mm:ssXXX
    const url = 'https://api.upbit.com/v1/candles/weeks'
    let qs = {market:market}
    if (to) qs.to = to
    if (count) qs.count = count

    let result = await request(url, qs)
    return result
}

// 월 캔들
async function market_month(market, to, count) {
    //to: yyyy-MM-dd'T'HH:mm:ssXXX
    const url = 'https://api.upbit.com/v1/candles/months'
    let qs = {market:market}
    if (to) qs.to = to
    if (count) qs.count = count

    let result = await request(url, qs)
    return result
}

// 채결 정보
async function market_trade_tick(market, to, count) {
    //to: yyyy-MM-dd'T'HH:mm:ssXXX
    const url = 'https://api.upbit.com/v1/trades/ticks'
    let qs = {market:market}
    if (to) qs.to = to
    if (count) qs.count = count

    let result = await request(url, qs)
    return result
}


// 시세 Ticker
async function market_ticker(markets) {
    // markets: KRW-BTC,KRW-ETH
    const url = 'https://api.upbit.com/v1/ticker'
    let qs = {markets:markets}

    let result = await request(url, qs)
    return result
}


// 호가 정보
async function trade_orderbook(markets) {
    // markets: KRW-BTC,KRW-ETH
    const url = 'https://api.upbit.com/v1/orderbook'
    let qs = {markets:markets}

    let result = await request(url, qs)
    return result
}

// bollinger band
// tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
async function get_bb(market,tick_kind){
    let bb;
    const range = 20;
    await market_minute(market,tick_kind,range)
    .then((res)=>{
        const candles = res.data;
    
        let tot = 0;
        for (let i = 0; i < candles.length; i++) {
            tot += candles[i].trade_price;
        }
        const avg = tot/candles.length;
        let M = 0;
        for (let i = 0; i < candles.length; i++) {
            M += Math.pow(Math.abs(candles[i].trade_price-avg),2);
        }
        const sigma = Math.sqrt(M/candles.length);
    
        const time = res.data[0].candle_date_time_kst;
        const price = res.data[0].trade_price;
        const centerband = avg.toFixed(1);
        const highband =parseFloat(centerband) + sigma*2;
        const lowband = centerband - sigma*2;
        
        bb = {'time':time, 'price': price,'centerband':centerband, 'highband':highband.toFixed(1), 'lowband': lowband.toFixed(1)};
    })
    return bb;
}

async function get_ma(market,tick_kind,range){
    const ma_list = [];
    await market_minute(market, tick_kind, 400)
        .then((res) => {
            
            const candles = res.data;
            if(typeof candles =='undefined'){
                return setTimeout(()=>{get_ma(market,tick_kind,range)},100)
            }else{
                for (let i = 0; i < range; i++) {
                    let tot = 0;
                    const time = res.data[i].candle_date_time_kst;
                    const price = res.data[i].trade_price;
                    for (let j = i; j < range + i; j++) {
                        const price = candles[j].trade_price;
                        tot += price;
                    }
                    const ma = tot / range;
                    const data = { 'time':time, 'trade_price': price, 'ma': ma }
                    ma_list.push(data)

            }
            }
        })

    return ma_list;
}

async function get_ema(market, tick_kind, range) {
    let ema_list = [];
    await get_ma(market, tick_kind, 100)
        .then((res) => {
            for (let i = 3*range-1; i >= 0; i--) {
                let ema_;
                if(ema_list.length==0){
                    ema_ = parseFloat(res[i+1].ma) ;
                }else{
                    ema_ = ema_list[3*range-2-i];
                }
                const price = res[i].trade_price;
                const mul = 2 / (1 + range);
    
                const ema = (price * mul) + (ema_ * (1 - mul));
                ema_list.push(ema);
            }
            const adj_emaList = [];
            for (let i = 3*range-1; i >= 0; i--) {
                adj_emaList.push(ema_list[i]);
            }
            ema_list = adj_emaList;
        })
        return ema_list;
}

async function get_macd(market,tick_kind){
    const range = 35;
    let line26 = await get_ema(market,tick_kind,26);
    let line12 = await get_ema(market,tick_kind,12);
    const macd = line12[0]-line26[0];
    let macd_initMa;
    let macd_list = [];
    let signal_list = [];
    const adj_macd=[];
    let signal;
    let oscillator;

    // macd 
    for (let i = range; i >= 0; i--) {
        const macd = line12[range - i] - line26[range - i]
        macd_list.push(macd);
    }

    // init_ma , signal_list(macd_ema) for signal(=macd_ema)
    let tot = 0;
    for (let i = 0; i < 9; i++) {
        tot += macd_list[i];
    }
    macd_initMa = tot/9;

    for (let i = range; i >= 0; i--) {
        const mul = 2/ (1+9);
        if(signal_list.length==0){
            signal = (macd_list[i]*mul)+(macd_initMa*(1-mul));
        }else{
            signal = (macd_list[i]*mul)+(signal_list[range-1-i]*(1-mul));
        }
        signal_list.push(signal);
    }

    for (let i = 0; i < macd_list.length; i++) {
        adj_macd.push(macd_list[range-i]);
    }
    macd_list = adj_macd;


    oscillator =  macd - signal;
    return { "macd": macd, "signal": signal, 'oscillator': oscillator };
    
}

// tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
// vol : 쓸 돈
class Bot {
    // 0. 매수 해야할지 매도해야할지 현상태 확인, 초기 데이터 수집
    // 1. 볼린저밴드 시간마다 확인 매수, 매수한거 취소
    // 2. 매수 시 수량 저장, 현재 상태 매수중으로 변경
    // 3. 볼린저밴드 시간마다 확인 매도, -4% 달성시 매도취소, 매도

    constructor(market, tick_kind, vol) {
        this.market = 'KRW-' + market;
        this.tick_kind = tick_kind;
        this.vol = vol;
        this.ms = tick_kind * 60000 / 10;
        this.unit;
        this.trading;
        this.balance;
        this.uuid;
        this.stopLoss = 0.04;
        this.bid_amount = 0;
        this.ask_amount = 0;
        this.Log = {'name':market,'log':[],'totProfit':""};
        this.totProfit = 0;
    }

    async play() {
        this.init();
    }
    async init() {
        //마켓 정보(시세,주문 금액 단위)
        await order_chance(this.market)
            .then((res) => {
                const myBal = res.data.bid_account.balance+res.data.bid_account.locked;
                const price = res.data.ask_account.avg_buy_price;
                const vol = res.data.ask_account.balance;
                const locked = res.data.ask_account.locked;
                this.balance = price * vol;
                // 잔고 일정 금액 이하시 스탑
                if(myBal<1500000){
                    console.log("잔고 일정 금액 돌파 : STOP"); return;
                }else{
                    //  매도주문 체크 
                    if (locked > 0) {
                        console.log("매도 주문 취소 요망"); return;
                    } else {
                        if (this.balance > 5000) {
                            this.trading = true;
                        } else {
                            this.trading = false;
                        }
                        this.getReady();
                    }
                }
            })
    }
    async getReady() {
        await get_macd(this.market,5)
        .then((res)=>{
            return console.log(res.macd);
        })
    }
    async body() {
        //bollinger band
        //매수 매도
        await get_bb(this.market, this.tick_kind)
            .then((res) => {
                if(typeof res !='undefined'){ 
                    // 데이터 있으면
                    if (this.trading) {
                        // 매도
                        const highband = this.adj_price(res.highband);
                        this.ask(highband);
                    } else {
                        // 매수
                        const lowband = this.adj_price(res.lowband);
                        this.bid(lowband);
                    }
                    this.stop();
                }else{
                    return this.body();
                }
            })
        //무한 루프 및 주문 취소
        setTimeout(() => {
            order_delete(this.uuid)
                .then(() => {
                    order_detail(this.uuid)
                        .then((res) => {
                            this.saveLog(res.data)
                            this.init();
                        })
                })
        }, this.ms)
    }

    // 로그 저장
    saveLog(data) {
        const state = data.state;
        if (state == 'done') {
            const time = data.created_at;
            const side = data.side;
            const price = data.price;
            const spend = price * data.executed_volume;
            const DATA = { 'time': time, 'side': side, 'price':price ,'spend': spend };
            this.Log.log.push(DATA);
            if (side == 'bid') {
                this.bid_amount = spend;
            } else {
                if (this.bid_amount != 0) {
                    this.ask_amount = spend;
                    const profit = this.ask_amount - this.bid_amount;
                    this.totProfit += profit;
                    DATA.profit = profit;
                }
            }
            console.log(DATA);
            console.log(this.market + ' tot profit : ' + this.totProfit);
        }
    }

    //손절가시 손절
    async stop() {
        if (this.trading) {
            await get_bb(this.market, this.tick_kind)
                .then((res) => {
                    const price = res.price;
                    order_chance(this.market)
                        .then((oc) => {
                            const myPrice = oc.data.ask_account.avg_buy_price;
                            if (myPrice * this.stopLoss > price) {
                                order_delete(this.uuid)
                                    .then(() => {
                                        this.ask(this.adj_price(price));
                                    })
                            }
                        })
                })
        }
    }

    async bid(price) {
        const volume = this.vol * 10000 / price;
        await order_bid(this.market, volume, price)
            .then((res) => {
                this.uuid = res.data.uuid
            })
    }

    async ask(price) {
        await order_chance(this.market)
            .then((res) => {
                this.balance = res.data.ask_account.balance;
                order_ask(this.market, this.balance, price)
                    .then((oa) => {
                        this.uuid = oa.data.uuid;
                    })
            })
    }

    // 주문하는 단위에 맞게 금액 조정
    adj_price(price) {
        this.oreder_unit(price);
        price = price - price % this.unit;
        return price
    }

    oreder_unit(price) {
        if (price > 2000000) {
            this.unit = 1000; return;
        } else if (price > 1000000) {
            this.unit = 500; return;
        } else if (price > 500000) {
            this.unit = 100; return;
        } else if (price > 100000) {
            this.unit = 50; return;
        } else if (price > 10000) {
            this.unit = 10; return;
        } else if (price > 1000) {
            this.unit = 5; return;
        } else if (price > 100) {
            this.unit = 1; return;
        } else if (price > 10) {
            this.unit = 0.1; return;
        } else if (price > 1) {
            this.unit = 0.01; return;
        } else if (price > 0.1) {
            this.unit = 0.001; return;
        } else {
            this.unit = 0.0001; return;
        }
    }
}

// class Upbit
function Upbit(s, a) {
    this.secretKey = s
    this.accessKey = a
}
Upbit.prototype.accounts = accounts
Upbit.prototype.order_list = order_list
Upbit.prototype.order_bid = order_bid
Upbit.prototype.order_ask = order_ask
Upbit.prototype.order_detail = order_detail
Upbit.prototype.order_delete = order_delete
Upbit.prototype.order_chance = order_chance
Upbit.prototype.market_all = market_all
Upbit.prototype.market_minute = market_minute
Upbit.prototype.market_day = market_day
Upbit.prototype.market_week = market_week
Upbit.prototype.market_month = market_month
Upbit.prototype.market_trade_tick = market_trade_tick
Upbit.prototype.market_ticker = market_ticker
Upbit.prototype.trade_orderbook = trade_orderbook
Upbit.prototype.get_bb = get_bb
Upbit.prototype.get_ma = get_ma
Upbit.prototype.get_ema = get_ema
Upbit.prototype.get_macd = get_macd
Upbit.prototype.Bot = Bot

module.exports = Upbit
