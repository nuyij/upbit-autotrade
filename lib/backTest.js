const Upbit = require("./upbit_lib");
const xlsx = require('xlsx')

// 집
const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
// const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
// const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);

class Test{
    constructor(market,tick_kind){
        this.market = market;
        this.tick_kind = tick_kind;

        this.acc_ror = 1;
        this.df;
        this.dfs = [];
        this.maData ;
        this.buy = [];
        this.sell = [];
        
        this.year = new Date().getFullYear()
        this.MONTH = new Date().getMonth() + 1;
        this.month = this.MONTH < 10 ? '0' + this.MONTH : this.MONTH
        this.date = new Date().getDate() < 10 ? '0' + new Date().getDate() : new Date().getDate()
        this.hours = new Date().getHours() < 10 ? '0' + new Date().getHours() : new Date().getHours()
        this.minutes = new Date().getMinutes() < 10 ? '0' + new Date().getMinutes() : new Date().getMinutes()
        this.now = this.year+'-'+this.month+'-'+this.date+' '+this.hours+':'+this.minutes+':00';
    }

    async excel(){
        console.log(this.now);
        const data = [];
        const dfs = [];
        // const time = '2022-05-17 15:50:00'
        const time = this.now
        data.push(['market','time','open','high','low','trade'])
        let df = await upbit.market_minute(this.market,this.tick_kind,200,time);
        for (let i = 0; i < df.data.length; i++) {
            dfs.push(df.data[i]);
        }
        for (let i = 0; i < 60; i++) {
            df = await upbit.market_minute(this.market,this.tick_kind,200,df.data[df.data.length-1].candle_date_time_kst+'Z')
            for (let j = 0; j < df.data.length; j++) {
                dfs.push(df.data[j]);
            }
            await this.sleep(200)
        }
        for (let i = 0; i < dfs.length; i++) {
            data.push([dfs[i].market,dfs[i].candle_date_time_kst,dfs[i].opening_price,
                    dfs[i].high_price,dfs[i].low_price,dfs[i].trade_price])
        }
        
        // const df = await upbit.market_day(this.market, 99);
        // const data = []
        // data.push(['market','time','open','high','low','trade'])
        // for (let i = df.data.length-1; i >= 0; i--) {
        //     data.push([df.data[i].market,df.data[i].candle_date_time_kst,df.data[i].opening_price,
        //     df.data[i].high_price,df.data[i].low_price,df.data[i].trade_price])
        // }

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(data);

        xlsx.utils.book_append_sheet(workbook, worksheet, 'sheet1');
        xlsx.writeFile(workbook, 'excel.xlsx');
    }

    sleep = async(ms) => {
            return new Promise(
              (resolve, reject) =>
                setTimeout(
                  () => resolve(),
                  ms
                )
            );
    }

    async play(){
        // 1d = 1440min = 1.5
        // '2022-05-10T08:50:00Z'
        //yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss
        // const time = '2021-04-14T23:00:00Z'
        const time = this.now;
        this.df = await upbit.market_minute(this.market,this.tick_kind,200);
        
        for (let j = 0; j < this.df.data.length; j++) {
            this.dfs.push(this.df.data[j]);
            
        }
        console.log(this.df.data[0].candle_date_time_kst);
        console.log(this.df.data[this.df.data.length-1].candle_date_time_kst);
        for (let i = 0; i <10; i++) {
            let lastTime = this.df.data[this.df.data.length-1].candle_date_time_utc+'Z';
            this.df = await upbit.market_minute(this.market,this.tick_kind,200,lastTime)
            for (let j = 0; j < this.df.data.length; j++) {
                this.dfs.push(this.df.data[j]);
            }
            await this.sleep(200)
        }
        const data = await upbit.get_stochastic(this.dfs);
        // console.log(this.dfs[this.dfs.length-1].candle_date_time_kst);
        console.log(data.slowK[0],data.slowD[0]);

        await this.sleep(200)
        //excel
        {
            const slowK = data.slowK;
            const slowD = data.slowD;
            const buy = [];
            const sell = [];
            let price;
            let hold;
            let num = 0;
            for (let i = 0; i < slowD.length-2; i++) {
                const isBuy = (slowK[i]+20<slowD[i])&&
                (slowK[i]<20) ? true : false;
                buy.push(isBuy);
                // const isSell = (slowK[i+2]>slowD[i+2])&&(slowK[i+1]<slowD[i+1]) ? true : false;
                let isSell = (slowK[i]-20>slowD[i]) ? true : false;
                // if(isSell){
                //     console.log(slowK[i]);
                // }
                if(!isSell){
                    if((slowK[i+2]>slowD[i+2])&&(slowK[i+1]<slowD[i+1])){
                        isSell = true;
                    }
                }
                sell.push(isSell)
                if(isBuy) num++;
            }
            console.log(num);
            const input = [['market','time','open','high','low','trade','slowK','slowD','buy','sell']];
            let acc_ror = 1;
            let rate;
            for (let i = buy.length-1; i >= 0; i--) {
                if(!hold && buy[i]) {
                    hold=true;
                    price = this.dfs[i].opening_price;
                }
                if(hold&& sell[i]){
                    hold=false;
                    rate=this.dfs[i].opening_price/price - 0.001;
                    acc_ror *= rate;
                }
                input.push([
                    this.dfs[i].market,this.dfs[i].candle_date_time_kst,
                    this.dfs[i].opening_price,
                    this.dfs[i].high_price,
                    this.dfs[i].low_price,
                    this.dfs[i].trade_price,
                    slowK[i],
                    slowD[i],
                    buy[i],
                    sell[i]
                ])
            }
            acc_ror = acc_ror.toFixed(3)
            input[0].push(acc_ror)
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.aoa_to_sheet(input);

            xlsx.utils.book_append_sheet(workbook, worksheet, 'sheet1');
            xlsx.writeFile(workbook, 'xrpStochastic.xlsx');
        }
        //매수 매도 조건
        // await this.ma_condition()
    }

    async ma_condition(){
        this.maData=this.dfs;
        let sum = 0;
        const lastTime = this.df.data[0].candle_date_time_utc.replace('T',' ');
        this.df = await upbit.market_minute(this.market,this.tick_kind,200,lastTime)
            for (let j = 0; j < this.df.data.length; j++) {
                this.maData.push(this.df.data[j]);
            }
        for (let i = 0; i < this.dfs.length; i++) {
            const ma5 = this.ma(i,15)
            const ma20 = this.ma(i,50)
            const ma100 = this.ma(i,120)
            const condition1 = (ma5 >= ma20)
            const condition2 = (ma20 >= ma100);
        //    if(i%200==0){
        //        console.log(this.dfs[i].candle_date_time_kst);
        //    }
            if ( this.dfs[i].opening_price * 1.01 < this.dfs[i].high_price) {
                sum++;
                // console.log('satisfy');
                const buyDate = this.dfs[i].candle_date_time_kst
                this.buy.push(buyDate);

                const buy_price = this.dfs[i].opening_price * 1.01;
                const sell_price = this.dfs[i].trade_price;

                const sellDate = this.dfs[i].candle_date_time_kst;
                this.sell.push(sellDate);

                let rate = this.dfs[i].opening_price * 1.02 < this.dfs[i].high_price ?
                    1.009: (sell_price / buy_price) - 0.001;
                    this.acc_ror *= rate;
        }
    }
    console.log(this.market+' : '+this.acc_ror);
    }

    ma(i,range){
        let sum = 0;
        for (let j = 0; j < range; j++) {
            if(this.maData[i+j]){
                const price = parseFloat(this.maData[i+j].trade_price)
                sum += price
            }else{
                return;
            }
        }
        return sum / range;
    }

    async indicator(){
        const df = await upbit.market_minute(this.market,this.tick_kind,200,this.dfs[this.dfs.length-1].candle_date_time_kst+"Z")
        const candles = df.data;
        const temp = [];
        for (let i = this.dfs.length-1; i >= 0 ; i--) {
            if(i!=this.dfs.length-1){
                candles.unshift(this.dfs[i]);
                candles.pop();
            }
            const bb = upbit.get_bb(candles);
            const macd = upbit.get_macd(candles)
        }

    }
}

module.exports = Test
