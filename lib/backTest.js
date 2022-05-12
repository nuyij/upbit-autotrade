const Upbit = require("./upbit_lib");
const xlsx = require('xlsx')

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);

class Test{
    constructor(market,tick_kind){
        this.market = market;
        this.tick_kind = tick_kind;

        this.acc_ror = 1;
        this.dfs = [];
        this.buy = [];
        this.sell = [];
        
    }

    async excel(){
        const df = await upbit.market_day(this.market, 99);
        const data = []
        data.push(['market','time','open','high','low','trade'])
        for (let i = df.data.length-1; i >= 0; i--) {
            data.push([df.data[i].market,df.data[i].candle_date_time_kst,df.data[i].opening_price,
            df.data[i].high_price,df.data[i].low_price,df.data[i].trade_price])
        }
        console.log(data);


        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(df);

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
        let df = await upbit.market_minute(this.market,this.tick_kind,200);
        for (let j = 0; j < df.data.length; j++) {
            this.dfs.push(df.data[j]);
        }
        for (let i = 0; i < 3; i++) {
            df = await upbit.market_minute(this.market,this.tick_kind,200,df.data[0].candle_date_time_kst+'Z')
            for (let j = 0; j < df.data.length; j++) {
                this.dfs.push(df.data[j]);
            }
            await this.sleep(200)
        }
        //매수 매도 조건
        this.ma_condition()
    }

    ma_condition(){
        for (let i = 0; i < this.dfs.length; i++) {
            const ma5 = this.ma(i,5)
            const ma20 = this.ma(i,20)
            const ma100 = this.ma(i,100)
            const condition1 = ma5 > ma20;
            const condition2 = ma20 > ma100;

            if (condition1 && this.dfs[i].opening_price * 1.01 < this.dfs[i].high_price) {
                const buyDate = this.dfs[i].candle_date_time_kst
                this.buy.push(buyDate);

                const buy_price = this.dfs[i].opening_price * 1.01;
                const sell_price = this.dfs[i].trade_price;

                const sellDate = this.dfs[i].candle_date_time_kst;
                this.sell.push(sellDate);

                let rate = this.dfs[i].opening_price * 1.02 < this.dfs[i].high_price ?
                    1.01 : sell_price / buy_price;
                rate -= 0.001;
                    this.acc_ror *= rate;
        }
    }
    console.log(this.acc_ror);
    }

    ma(i,range){
        let sum = 0;
        for (let j = 0; j < range; j++) {
            if(this.dfs[i+j]){
                sum += this.dfs[i+j].trade_price
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
