const WebSocket = require('ws')
var wsUri = "wss://api.upbit.com/websocket/v1";


let websocket;
let wscat = [];
// init(["KRW-BTC","KRW-AQT"])

async function sleep(ms) {
    return new Promise(
        (resolve, reject) =>
            setTimeout(
                () => resolve(),
                ms
            )
    );
}

async function init(market) {
    wscat = [];
    testWebSocket(market);
    await sleep(200)
    return wscat
}
async function testWebSocket(market) {

    websocket = new WebSocket(wsUri);

    websocket.binaryType = 'arraybuffer';

    //websocket.binaryType = 'Blob';
    //websocket.binaryType = 'String';
    websocket.onopen = function (evt) { onOpen(market, evt); };
    websocket.onmessage = function (evt) { onMessage(evt) };
    websocket.onerror = function (evt) { onError(market,evt) };
}

function onOpen(market, evt) {
    var msg = [
        {
            "ticket": "TEST",
        },
        {
            "type": "ticker",
            "codes": market
        },
        {
            "format": "SIMPLE"
        }
    ];
    msg = JSON.stringify(msg);
    doSend(msg);
}

function onMessage(evt) {
    //console.log(evt.data);

    var enc = new TextDecoder("utf-8");
    var arr = new Uint8Array(evt.data);
    const data = JSON.parse(enc.decode(arr));
    // console.log(data);
    websocket.close()
    wscat.push(data)
}

function doSend(message) {
    websocket.send(message);
}

function onError(market,evt){
    init(market)
}

module.exports = init