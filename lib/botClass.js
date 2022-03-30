const Upbit = require("./upbit_lib")

// 집
// const secretKey = 'p4rWJsbKVvUk5QemMLm5KHIyjoqq81K5lrvnLUqx';
// cosnt accessKey = 'k2eJf0aqdpCSfm65RkwuWpUHpTROiGMqNLUmAxwW';
// 사무실
const secretKey = 'tEYvH9OsmLeQIhXsusvq4sx23wzUA2csJcqTWofw';
const accessKey = 'nwFxXxXva11NH7YpH7gPjis7WiQeDHrWgVhDXs3F';

class A{
    constructor(){
        this.upibt = new Upbit(secretKey, accessKey);
        this.name = "a"
    }
    async b(){
        let data = await this.upbit.market_minute('KRW-ZIL',1,1);
        console.log(data);
    }
}

module.exports = A