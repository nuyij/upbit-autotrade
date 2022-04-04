const Upbit = require('./lib/upbit_lib')
const A = require('./lib/botClass')
const express = require('express');
const app = express();
const client = express();
const cors = require('cors');
const bodyparser = require('body-parser');

// 집
// const secretKey = 'p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx';
// const accessKey = 'k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW';
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

// tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
// vol : 쓸 돈
class Bot {
    // 0. 매수 해야할지 매도해야할지 현상태 확인, 초기 데이터 수집
    // 1. 볼린저밴드 시간마다 확인 매수, 매수한거 취소
    // 2. 매수 시 수량 저장, 현재 상태 매수중으로 변경
    // 3. 볼린저밴드 시간마다 확인 매도, -4% 달성시 매도취소, 매도

    constructor(market, tick_kind, vol) {
        this.upbit = new Upbit(secretKey, accessKey)
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
        await this.upbit.order_chance(this.market)
            .then((res) => {
                const myBal = res.data.bid_account.balance+res.data.bid_account.locked;
                const price = res.data.ask_account.avg_buy_price;
                const vol = res.data.ask_account.balance;
                const locked = res.data.ask_account.locked;
                this.balance = price * vol;
                // 잔고 일정 금액 이하시 스탑
                if(myBal<1500000){
                    console.log("잔고 일정 금액 돌파 : STOP");
                }else{
                    //  매도주문 체크 
                    if (locked > 0) {
                        console.log("매도 주문 취소 요망");
                    } else {
                        if (this.balance > 5000) {
                            this.trading = true;
                        } else {
                            this.trading = false;
                        }
                        this.body();
                    }
                }
            })
    }
    async body() {
        //bollinger band
        //매수 매도
        await this.upbit.get_bb(this.market, this.tick_kind)
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
            this.upbit.order_delete(this.uuid)
                .then(() => {
                    this.upbit.order_detail(this.uuid)
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
            await this.upbit.get_bb(this.market, this.tick_kind)
                .then((res) => {
                    const price = res.price;
                    this.upbit.order_chance(this.market)
                        .then((oc) => {
                            const myPrice = oc.data.ask_account.avg_buy_price;
                            if (myPrice * this.stopLoss > price) {
                                this.upbit.order_delete(this.uuid)
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
        await this.upbit.order_bid(this.market, volume, price)
            .then((res) => {
                this.uuid = res.data.uuid
            })
    }

    async ask(price) {
        await this.upbit.order_chance(this.market)
            .then((res) => {
                this.balance = res.data.ask_account.balance;
                this.upbit.order_ask(this.market, this.balance, price)
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
//------------------------------------CLASS END-----------------------------------------

app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

const server = app.listen('1111', () => {
    console.log("connect server");
});
//------------------------------------SERVER-----------------------------------------
bot = new Bot('ZIL', 5, 100);

// client.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    const LOG = bot.Log;
    LOG.totProfit = bot.totProfit;
    res.send(LOG);
})

//------------------------------------SERVER END-----------------------------------------



async function start() {
    const upbit = new Upbit(secretKey, accessKey)

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
        let data = await upbit.get_macd('KRW-ZIL',15);
        console.log(data);
    }

}
start();

