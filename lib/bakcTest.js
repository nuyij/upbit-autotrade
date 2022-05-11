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
    }

    async excel(){
        const df = await upbit.market_day(this.market, 200);

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(df);

        xlsx.utils.book_append_sheet(workbook, worksheet, 'sheet1');
        xlsx.writeFile(workbook, 'excel.xlsx');
    }

    async play(){
        const sleep = async (ms) => {
            return new Promise(
              (resolve, reject) =>
                setTimeout(
                  () => resolve(),
                  ms
                )
            );
          };
        const dfs = [];
        const buy = [];
        const sell = [];
        let acc_ror = 1;
        // 1d = 1440min = 1.5
        // '2022-05-10T08:50:00Z'
        //yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd HH:mm:ss
        let df = await upbit.market_minute(this.market,this.tick_kind,200);
        for (let j = 0; j < df.data.length; j++) {
            dfs.push(df.data[j]);
        }
        for (let i = 0; i < 60; i++) {
            df = await upbit.market_minute(this.market,this.tick_kind,200,df.data[0].candle_date_time_kst+'Z')
            for (let j = 0; j < df.data.length; j++) {
                dfs.push(df.data[j]);
            }
            await sleep(200)
        }
        for (let i = 0; i < dfs.length; i++) {
                const ma5 = this.ma(dfs,i,5)
                const ma20 = this.ma(dfs,i,20)
                const ma100 = this.ma(dfs,i,100)
                const condition1 = ma5 > ma20;
                const condition2 = ma20 > ma100;

                if (condition1 && dfs[i].opening_price * 1.01 < dfs[i].high_price) {
                    const buyDate = dfs[i].candle_date_time_kst
                    buy.push(buyDate);
    
                    const buy_price = dfs[i].opening_price * 1.01;
                    const sell_price = dfs[i].trade_price;

                    const sellDate = dfs[i].candle_date_time_kst;
                    sell.push(sellDate);
    
                    let rate = dfs[i].opening_price * 1.02 < dfs[i].high_price ?
                        1.005 : sell_price / buy_price;
                    if(rate==1.005) console.log("profit");
                    acc_ror *= rate;
            }
        }
        console.log(acc_ror);
    }
    ma(dfs,i,range){
        let sum = 0;
        for (let j = 0; j < range; j++) {
            if(dfs[i+j]){
                const trade_price = parseFloat(dfs[i+j].trade_price)
                sum += dfs[i+j].trade_price
            }else{
                return;
            }
        }
        return sum / range;
    }
}

module.exports = Test
