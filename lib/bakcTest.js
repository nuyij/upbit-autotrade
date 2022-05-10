const Upbit = require("./upbit_lib");

// 집
// const secretKey = "p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx";
// const accessKey = "k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW";
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

const upbit = new Upbit(secretKey, accessKey);

class Test{
    constructor(market){
        this.market = market;
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
        // '2022-05-10T08:50:00'
        let df = await upbit.market_minute(this.market,5,200,'2022-05-01T08:50:00');
        dfs.push(df.data);
        for (let i = 0; i < 10; i++) {
            df = await upbit.market_minute(this.market,5,200,df.data[0].candle_data_time_kst)
            dfs.push(df.data);
            await sleep(200)
        }
        for (let i = 0; i < dfs.length; i++) {
            for (let j = 0; j < dfs[i].length; j++) {
                if (dfs[i][j].opening_price * 1.01 < dfs[i][j].high_price) {
                    const buyDate = dfs[i][j].candle_date_time_kst
                    buy.push(buyDate);
    
                    const buy_price = dfs[i][j].opening_price * 1.01;
                    const sell_price = dfs[i][j].trade_price;

                    const sellDate = dfs[i][j].candle_date_time_kst;
                    sell.push(sellDate);
    
                    let rate = dfs[i][j].opening_price * 1.02 < dfs[i][j].high_price ?
                        1.005 : sell_price / buy_price;
                    // rate -= 0.001;
                    acc_ror *= rate;
                }
            }
        }
        console.log(acc_ror);
    }
}

module.exports = Test
