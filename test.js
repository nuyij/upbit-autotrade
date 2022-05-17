const Test = require("./lib/backTest")

async function start() {
    const sleep = async (ms) => {
        return new Promise(
            (resolve, reject) =>
                setTimeout(
                    () => resolve(),
                    ms
                )
        );
    }
    const freq = 60*200;
    const XRP = new Test('KRW-XRP', 3);
    XRP.play();
    // await sleep(freq);
    // const SOL = new Test('KRW-SOL', 3)
    // await sleep(freq);
    // const ETH = new Test('KRW-ETH', 3)
    // await sleep(freq);
    // const MANA = new Test('KRW-MANA', 3)
}
start();