const Upbit = require("./upbit_lib");
const wscat = require("./webSocket.js");
const xlsx = require('xlsx')

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);
class Bot_rapid {
    constructor(vol) {
        this.vol = vol;
        this.working = true;

        this.set;
        this.ready

        this.open;
        this.trade;

        this.state = 'waiting';
        this.condition0;
        this.condition1;
        this.condition2;
        this.condition3;

        this.permit;
        this.buying;
        this.selling;
        this.hold
        this.term;
        this.done;

        this.buy_myPrice;
        this.trade_vol;
        this.uuid;

        this.Log = [['time', 'side', 'price', 'volume', 'profit', 'totProfit']]
        this.totProfit = 0;

    }

    async play() {
        this.time()
        this.bot()
        this.buy()
        this.sell()
        this.saveLog()
    }

    async bot() {
        while (true) {
            // 5프로 상승주 찾기 // in websocket 
            const markets_data = await upbit.market_all()
            const markets = markets_data.data.map((item) => { return item.market })
            const items = await wscat(markets);
            const ri = items.filter((item => { return (item.scr > 0.03) && (item.cd.startsWith("KRW")) && (!item.cd.startsWith("KRW-BTT")) }))
            const cd = ri.map((item) => { return item.cd })
            const uniq = array => [...new Set(array)];
            this.set = uniq(cd)
            console.log(this.set);
            //조건충족 확인
            if (!this.hold) {
                for (let i = 0; i < this.set.length; i++) {
                    if (!this.ready) {
                        this.market = this.set[i];
                        const res = await upbit.market_minute(this.market, 15, 200)
                        const data = res.data;
                        if (data) {
                            const macd = upbit.get_macd(data)
                            this.open = data[0].opening_price;
                            const low = data[0].low_price;
                            const high = data[0].high_price;
                            this.trade = data[0].trade_price;

                            const condition = this.open * 1.05 <= high
                            if (condition) this.ready = true;

                            const osc = (this.trade / 2000);
                            this.condition0 = (macd.oscillator[1] < 0) && (macd.oscillator[0] >= 0)
                            this.condition1 = (macd.oscillator[0] >= osc)
                            this.condition2 = (macd.oscillator[0] <= 0);
                            this.condition3 = (macd.oscillator[0] <= osc * (-1))
                        }

                    }
                }
            }
            this.state = 'waiting';
            console.log(this.state);
            await this.sleep(1000);
        }
    }

    async buy() {
        while (true) {
            if (this.buying) {
                if (!this.condition0) {
                    this.state = 'canceling order';
                    await upbit.order_delete(this.uuid);
                    this.buying = false;
                }
            } else {
                if (this.ready) {
                    this.buying = true;
                    this.state = 'buying';
                    this.bid(this.adj_price(this.trade))
                }
            }
            await this.sleep(1000)
        }
    }

    async sell() {
        let once;
        while (true) {
            if (this.selling) {
                if (this.condition2) {
                    this.state = 'stopping loss';
                    await upbit.order_delete(this.uuid)
                    this.ask(this.adj_price(this.trade))
                    await this.sleep(1000)
                }
            } else {
                if (this.hold) {
                    this.state = 'selling';
                    if (this.term) {
                        if (this.condition3) {
                            this.ask(this.adj_price(this.trade))
                            this.selling = true;
                        }
                    }
                    else {
                        if (this.condition2) {
                            this.ask(this.adj_price(this.trade))
                            this.selling = true;
                        }
                    }
                    // if(this.term){
                    //     if(this.condition1 || this.condition3){
                    //         this.ask(this.adj_price(this.trade))
                    //         this.selling=true;
                    //     }
                    // }
                    // else{
                    //     if(this.condition1 || this.condition2){
                    //         this.ask(this.adj_price(this.trade))
                    //         this.selling=true;
                    //     }
                    // }
                }
            }
            await this.sleep(1000)
        }

    }

    async time() {
        while (true) {
            const min = new Date().getMinutes();
            const sec = new Date().getSeconds();
            if (this.term) {
                if (min % this.tick_kind == 0 && sec % 60 < 1) {
                    this.term = false;
                }
            }
            if (sec % 60 < 1) console.log(new Date());
            await this.sleep(1000)
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
        while (this.working) {
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
                            if (side == "bid") {
                                this.bid_amount = spend;
                                this.term = true;
                                this.hold = true;
                                this.ready = false;
                            } else {
                                this.buying = false;
                                this.selling = false;
                                this.hold = false;
                                this.done = true;
                                this.ready = false;
                                if (this.bid_amount != 0) {
                                    this.ask_amount = spend;
                                    const profit = parseFloat(this.ask_amount - this.bid_amount - this.ask_amount * 0.005 - this.bid_amount * 0.005).toFixed(3);
                                    this.totProfit += parseFloat(profit);
                                    DATA.push(profit);
                                    if (this.Log[1][5]) {
                                        this.Log[1].push(this.totProfit);
                                        this.Log[1].push(this.totProfit / this.vol * 100);
                                    }
                                    this.Log[1][5] = parseFloat(this.totProfit);
                                    this.Log[1][6] = this.totProfit / this.vol * 100;
                                }
                            }
                            this.Log.push(DATA);
                            console.log(this.Log);
                            this.excel(this.Log)
                        }
                    }
                })
            }
            await this.sleep(1000);
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
        xlsx.writeFile(workbook, this.market+'.xlsx');
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
