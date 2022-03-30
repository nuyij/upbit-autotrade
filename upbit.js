const Upbit = require('./lib/upbit_lib')
const express = require('express'); 
const app = express();
const cors = require('cors');
const bodyparser = require('body-parser');

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
        this.upbit = new Upbit('p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx', 'k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW')
        this.market = market;
        this.tick_kind = tick_kind;
        this.vol = vol;
        this.ms = tick_kind*60000/10;
        this.unit;
        this.trading;
    }
    async init(){
        //bollinger band
        let {'data':bb} = await this.upbit.get_bb(this.market,this.tick_kind);
        //내계좌 정보(전체 금액)
        let {'data':acc} = await this.upbit.accounts();
        
    
        //마켓 정보(시세,주문 금액 단위)
        let {'data':oc} = await this.upbit.order_chance(this.market);
        this.unit = oc.market.bid.min_total;
    
        // looptime : 분봉캔들종류 / 10
        
        return bb;
    }

    async bid(){
        const volume = this.vol*10000/bb.lowband;
        await this.upbit.order_bid(market, volume, price)
    }
    
    looper(){
        setTimeout(()=>{
            this.bot(this.market,this.tick_kind);
        },this.ms)
    }
}


async function start() {
    const upbit = new Upbit('p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx', 'k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW')

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
        // let {'data':dat} = await upbit.order_chance('KRW-BTC')
        // console.log(dat)
    // }
    // {
    // }
    
    {
        let data = await upbit.get_bb('KRW-ZIL',5);
        // log.push(data);
        console.log(data);
        // console.log(log);
        
        // bot = new Bot('KRW-ZIL',5,20);
        // console.log(bot.bot());
    }
        
}
start();