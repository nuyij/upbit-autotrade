const Upbit = require('./lib/upbit_lib')
const A = require('./lib/botClass')
const express = require('express'); 
const app = express();
const cors = require('cors');
const bodyparser = require('body-parser');

// tick_kind : 분봉 캔들 종류 / 1, 3 , 5 , 10 ,15 , 30 ,60 , 240
// 매수 량  
// 매수 매도 취소
// 손절 퍼센트
// vol : 쓸 돈
class Bot{
    // 0. 매수 해야할지 매도해야할지 현상태 확인, 초기 데이터 수집
    // 1. 볼린저밴드 시간마다 확인 매수, 매수한거 취소
    // 2. 매수 시 수량 저장, 현재 상태 매수로 변경
    // 3. 볼린저밴드 시간마다 확인 매도, -4% 달성시 매도취소, 매도

    constructor(market,tick_kind,vol){
        this.upbit = new Upbit(secretKey, accessKey)
        this.market = market;
        this.tick_kind = tick_kind;
        this.vol = vol;
        this.ms = tick_kind*60000/10;
        this.unit;
        this.trading;
        this.balance;
        this.uuid;
        this.stopLoss=0.04;
    }

    play(){
        this.init();
        this.stop();
    }
    async init(){
        //마켓 정보(시세,주문 금액 단위)
        await this.upbit.order_chance(this.market)
        .then((res)=>{
            this.balance = res.data.ask_account.balance
            if(this.balance > 0.0001){
                this.trading = true;
            }
            this.body();
        })
    }
    async body(){
       
         //bollinger band
         //매수 매도
         await this.upbit.get_bb(this.market,this.tick_kind)
         .then((res)=> {
             if(this.trading){
                 console.log("----trading-----");
                 const highband = this.adj_price(res.data.highband);
                 this.ask(highband);
             }else{
                 console.log("-----start bidding-----");
                 const lowband = this.adj_price(res.data.lowband);
                 this.bid(lowband);
             }
            })
            setTimeout(()=>{
                this.upbit.order_delete(this.uuid);
                this.body();
            },ms)
        }

    //손절가시 손절
    async stop(){
        await this.upbit.get_bb(this.market,this.tick_kind)
        .then((res)=>{
            const price = res.data.price;
            let {'data':oc} = this.upbit.order_chance(this.market)
            const myPrice = oc.data.ask_account.avg_but_price;
            if(myPrice*this.stopLoss > price ){
                this.upbit.order_delete(this.uuid);
            }
        })
    }
        
    // 주문하는 단위에 맞게 금액 조정
    adj_price(price){
        this.oreder_unit(price);
        price = price-price%this.unit;
        return price
    }

    oreder_unit(price){
        if(price>2000000){
            this.unit = 1000; return;
        }else if(price>1000000){
            this.unit = 500; return;
        }else if(price>500000){
            this.unit = 100; return;
        }else if(price>100000){
            this.unit = 50; return;
        }else if(price>10000){
            this.unit = 10; return;
        }else if(price>1000){
            this.unit = 5; return;
        }else if(price>100){
            this.unit = 1; return;
        }else if(price>10){
            this.unit = 0.1; return;
        }else if(price>1){
            this.unit = 0.01; return;
        }else if(price>0.1){
            this.unit = 0.001; return;
        }else{
            this.unit = 0.0001; return;
        }
    }
    async bid(price){
        const volume = this.vol*10000/price;
        await this.upbit.order_bid(market, volume, price)
        .then((res)=>{
            this.uuid = res.data.uuid
        })
    }

    async ask(price){
        await this.upbit.order_chance(this.market)
        .then((res)=>{
            this.balance = res.data.ask_account.balance;
            let data = this.upbit.order_ask(this.market,this.balance,price);
            this.uuid = data.data.uuid;
            })
    }
    
    // looptime : 분봉캔들종류 / 10
    looper(){
        setTimeout(()=>{
            this.bot(this.market,this.tick_kind);
        },this.ms)
    }
}

// 집
// const secretKey = 'p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx';
// cosnt accessKey = 'k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW';
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended : true}));

const server = app.listen('1111',()=>{
    console.log("connect server");
});

// app.use(express.static(__dirname+'/public'));
app.get('/',function(req,res){
    res.send(log);
})

const log = [];


async function start() {
    const upbit = new Upbit(secretKey, accessKey)

    // console.log('-- market_all -------------------------------------------------')
    // let json = await upbit.market_all()
    // console.log(json.data)
    // return json.data
    // {
    //     console.log('-- market_minute -------------------------------------------------')
        // let {'success':success, 'message':message, 'data':data, 'remain_min':remain_min, 'remain_sec':remain_sec} = await upbit.market_minute('KRW-BTC', 1,'', 2)
    //     console.log('remain_sec:',remain_sec)
    //     console.log('remain_min:',remain_min)
        // console.log(data)
    // }

    // {
        // console.log('-- order_chance -------------------------------------------------')
        let {'data':dat} = await upbit.order_chance('KRW-VET')
        console.log(dat)
    // }
    // {
    // }
    
    {
        // let data = await upbit.market_minute('KRW-ZIL',1,1);
        // let data = await upbit.get_bb('KRW-ZIL',5);
        // log.push(data);
        // console.log(data);
        // console.log(log);
        
        bot = new Bot('KRW-VET',5,20);
        // bot.play();

        bot2 = new Bot('KRW-BTC',5,20)
        // bot2.play();
        
    }
        
}
start();

