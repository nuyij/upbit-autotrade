const WebSocket = require('ws')
var wsUri = "wss://api.upbit.com/websocket/v1";


let websocket;
init()

function init() {
    testWebSocket(["KRW-BTC","KRW-XRP"]);
}
async function sleep (ms){
    return new Promise(
      (resolve, reject) =>
        setTimeout(
          () => resolve(),
          ms
        )
    );
}

async function testWebSocket(market) {
    
    websocket = new WebSocket(wsUri);
    
    websocket.binaryType = 'arraybuffer';

    while(true){
        //websocket.binaryType = 'Blob';
        //websocket.binaryType = 'String';
        websocket.onopen = function (evt) { onOpen(market,evt); };
        websocket.onmessage = function (evt) { onMessage(evt) };
        websocket.onerror = function (evt) { onError(evt) };
        await sleep(200)
    }

}

function onOpen(market,evt) {
    var msg = [
        {
            "ticket": "TEST",
        },
        {
            "type": "ticker",
            "codes": market //이부분입니다. 
        },
        {
            "format":"SIMPLE"
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
    console.log(data);
    websocket.close()
}

function doSend(message) {
    websocket.send(message);
}
