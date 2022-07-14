const Upbit = require("./upbit_lib");
const wscat = require("./webSocket.js");
const xlsx = require('xlsx')

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

// 1.급등주 찾기
// 2.매수 / 매수취소 / 매수 시 매수불가
// 3.매도 / 매도취소 및 스탑로스 / 분할매도
const upbit = new Upbit(secretKey, accessKey);
class Bot_rapid {
    constructor(vol) {
        this.vol = vol;
        this.working = true;
        this.tick_kind = 240;

        this.working = true;
        this.set;
        this.ready
        this.trading_ready = false;

        this.data
        this.open;
        this.trade;
        this.high

        this.state = 'waiting';
        this.state_sell = 0;
        this.condition;
        this.condition0;
        this.condition1;
        this.condition2;
        this.condition3;

        this.permit;
        this.buy_price;
        this.buying;
        this.selling;
        this.hold = false;
        this.term;
        this.done;
        this.am9=false;

        this.trade_vol;
        this.uuid;

        this.Log = [['time', 'side', 'price', 'volume', 'profit', 'totProfit']]
        this.totProfit = 0;

    }

    async play() {
        this.time()
        this.bot()
    }

    async bot() {
        while (this.working) {
            if (!this.hold) { // 미트레이딩 시
                // 3프로 상승주 찾기 // in websocket 
                const increament =  this.am9 ? 0.03 : 0.05 ; 
                const markets_data = await upbit.market_all()
                const markets = markets_data.data.map((item) => { return item.market })
                const items = await wscat(markets);
                const ri = items.filter((item => {
                    return (item.scr > increament) && (item.cd.startsWith("KRW")) && (item.tp > 3) 
                    && (!item.cd.startsWith("KRW-SOL")) && (!item.cd.startsWith("KRW-XRP"))
                    && (!item.cd.startsWith("KRW-DOGE")) && (!item.cd.startsWith("KRW-BTC"))
                    && (!item.cd.startsWith("KRW-PLA")) && (!item.cd.startsWith("KRW-CHZ"))
                }))
                const sort = ri.sort(function (a, b) {
                    return b.atp24h - a.atp24h;
                })
                const cd = sort.map((item) => { return item.cd })
                const uniq = array => [...new Set(array)];
                this.set = uniq(cd)
                console.log(this.set);
            }
            //조건충족 확인
            if (this.set) {
                for (let i = 0; i < this.set.length; i++) {
                    if (!this.ready && !this.hold) {
                        this.market = this.set[i];
                        const res = await upbit.market_minute(this.market, this.tick_kind, 200)
                        this.data = res.data;
                        if (this.data) {
                            const macd = upbit.get_macd(this.data)
                            this.open = this.data[0].opening_price;
                            const low = this.data[0].low_price;
                            const high = this.data[0].high_price;
                            this.trade = this.data[0].trade_price;

                            this.condition = (this.open * 1.03 <= this.trade) && (this.trade*1.003 > high)
                            if (this.condition) this.ready = true;
                            else {
                                this.ready = false;
                            }
                        }
                    }
                    await this.sleep(200);
                }
            }
            if (this.data && (this.ready || this.hold)) {
                const { data } = await upbit.market_minute(this.market, this.tick_kind, 200)
                this.data = data;
                const macd = upbit.get_macd(this.data)
                this.open = this.data[0].opening_price;
                const low = this.data[0].low_price;
                this.high = this.data[0].high_price;
                this.trade = this.data[0].trade_price;

                this.trading_ready = false;
                this.trading_ready = (this.open * 1.03 <= this.high) && (this.trade * 1.003 > this.high)
                this.ready = this.trading_ready 

                const osc = (this.trade / 2000);
                this.condition0 = (macd.oscillator[1] < 0) && (macd.oscillator[0] >= 0)
                this.condition1 = (macd.oscillator[0] >= osc)
                this.condition2 = (macd.oscillator[0] <= 0);
                this.condition3 = (macd.oscillator[0] <= osc * (-1))
                // this.condition4 = (stochastic.slowK[0] < stochastic.slowD[0])
                this.condition_buy = (this.trade * 1.005 < this.high)
                this.condition_sell = (this.trade < this.buy_price * 0.97)
            }
            this.state = 'waiting';

            await this.sleep(100);
            this.buy()
            this.sell()
            this.saveLog()
            console.log("MARKET", this.market);
            // console.log("condition",this.condition);
            // if(stochastic) console.log("STOCASTIC",stochastic.slowK[0]-stochastic.slowD[0]);
            // console.log("ready",this.ready);
            // console.log("buying",this.buying);
            // console.log("term",this.term);
            // console.log("hold",this.hold);
            console.log("state", this.state);
            await this.sleep(1000);
        }
    }

    async buy() {
        if (this.buying) {
            if (!this.trading_ready) {
                this.state = 'canceling order';
                await upbit.order_delete(this.uuid);
                this.buying = false;
            }
        } else {
            if (!this.hold && (this.trading_ready)) {
                console.log("buying");
                this.buying = true;
                this.state = 'buying';
                this.bid(this.adj_price(this.trade))
            }
        }
    }

    // state_sell
    //  -1 : stop loss  , 0 : heading 3percent profit , 
    // 1 : heading 5percent profit , 2 : heading 10percent , 3 : heading 20percent
    async sell() {
        if (this.hold) {
            const _this = this;
            console.log('buy_price:',this.buy_price,'  trade_price:',this.trade,'  stoploss:',this.buy_price * 0.97 >= this.trade);
            const vol = parseFloat(this.trade_vol / 4);
            console.log('stopTarget',this.buy_price * 0.97);
            const stopLoss = (this.buy_price * 0.97 >= this.trade)
            const profit3P = (this.buy_price * 1.03 <= this.trade)
            const profit5P = (this.buy_price * 1.05 <= this.trade)
            const profit10P = (this.buy_price * 1.1 <= this.trade)
            const profit20P = (this.buy_price * 1.2 <= this.trade)
            const profitRate = this.high / this.buy_price
            if (stopLoss) { // cut loss
                this.state = 'stopping loss';
                stopSelling()
            }else { // take profit
                this.state = 'selling';
                takeProfit()
            }
            function takeProfit() {
                console.log('state_sell',_this.state_sell);
                switch (_this.state_sell) {
                    case 0: console.log('target ', _this.buy_price * 1.03);
                        if (profit3P) _this.ask(_this.adj_price(_this.trade), vol)
                        break;
                    case 1: console.log('target ', _this.buy_price * 1.05);
                        if (profit5P) _this.ask(_this.adj_price(_this.trade), vol)
                        else if ((profitRate >= 1.04) && (_this.trade <= _this.buy_price*1.03)) {  // 달성가 미돌파시 이전달성가로 매도
                            stopSelling()
                        }
                        break;
                    case 2: console.log('target ', _this.buy_price * 1.1);
                        if (profit10P) _this.ask(_this.adj_price(_this.trade), vol)
                        else if ((profitRate >= 1.08) && (_this.trade <= _this.buy_price*1.05)) {  // 달성가 미돌파시 이전달성가로 매도
                            stopSelling()
                        }
                        break;
                    case 3: console.log('target ', _this.buy_price * 1.2);
                        if (profit20P) _this.ask(_this.adj_price(_this.trade), vol)
                        else if ((profitRate >= 1.15) && (_this.trade <= _this.buy_price*1.1)) {  // 달성가 미돌파시 이전달성가로 매도
                            stopSelling()
                        }
                        break;
                }
            }
            async function stopSelling() {    // 현재가 매도
                if(_this.uuid) await upbit.order_delete(_this.uuid)
                _this.ask(_this.adj_price(_this.trade), _this.trade_vol)
                _this.state_sell = -1;
            }
        }
    }

    async time() {
        while (true) {
            const hour = new Date().getHours();
            const min = new Date().getMinutes();
            const sec = new Date().getSeconds();
            this.am9 = (hour == 9)&& (min<5) ? true : false;
            await this.sleep(1000)
        }
    }

    async bid(price) {
        const volume = (this.vol * 10000) / price;
        await upbit.order_bid(this.market, volume, price).then((res) => {
            if (res.data) {
                this.buying = true;
                this.buy_price = price;
                this.trade_vol = volume;
                this.uuid = res.data.uuid;
            }
        });
    }

    async ask(price, vol) {
        upbit.order_ask(this.market, vol, price).then((oa) => {
            if (oa.data) {
                this.selling = true;
                this.uuid = oa.data.uuid;
            }
        });
    }

    // 로그 저장
    async saveLog() {
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
                        const spend = (price * volume).toFixed(3);
                        const DATA = [time, side, price, spend];
                        if (side == "bid") { // bid // buy
                            this.buy_price = price;
                            this.bid_amount = spend;
                            this.term = true;
                            this.hold = true;
                        } else { // ask // sell
                            this.trade_vol = this.trade_vol - volume
                            console.log("vol", this.trade_vol);
                            if (this.state_sell == -1 || this.state_sell == 3) {
                                // init
                                this.buying = false;
                                this.selling = false;
                                this.hold = false;
                                this.done = true;
                                this.ready = false;
                                this.trading_ready = false;
                                this.state_sell = 0;
                            } else {
                                this.state_sell++;
                            }
                            if (this.bid_amount != 0) { // log
                                this.ask_amount = spend;
                                const profit = parseFloat(this.ask_amount - this.bid_amount - this.vol * 0.001).toFixed(3);
                                this.totProfit += parseFloat(profit);
                                DATA.push(profit);
                                if (this.Log[1][5]) {
                                    this.Log[1].push(this.totProfit);
                                    this.Log[1].push(this.totProfit / this.vol * 100);
                                }
                                this.Log[1][5] = parseFloat(this.totProfit);
                                this.Log[1][6] = this.totProfit / this.vol / 100;
                            }
                        }
                        this.Log.push(DATA);
                        console.log(this.Log);
                        // this.excel(this.Log);
                    }
                }
            })
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
        xlsx.writeFile(workbook, this.market + '.xlsx');
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

module.exports = Bot_rapid
