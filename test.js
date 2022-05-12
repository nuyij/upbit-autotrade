const Test = require("./lib/backTest")

function start(){
    const test = new Test('KRW-BTC',3);
    test.excel();
}
start();