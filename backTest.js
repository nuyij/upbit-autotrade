const Test = require("./lib/backTest")

function start(){
    const test = new Test('KRW-XRP',3);
    test.play();
}
start();