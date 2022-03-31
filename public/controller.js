const startTime = document.querySelector('.startTime');
const searchBar = document.querySelector('#searchBar');
const searchBtn = document.querySelector('#searchBtn');
const candle = document.querySelector('#candle');
const AskPoint = document.querySelector('#askPoint');
const amount = document.querySelector("#amount");

const time = new Date();
startTime.innerText = "START : "+time;

class Bot{
    constructor(value){
        this.value = value;
    }
    async makeBot(){
        await axios.get('127.0.0.1:1111/makeBot',this.value)
        .then((res)=>{
            
        })
    }
    makeList(){
        const li = document.createElement('li');
        li.innerHTML = `<div class="list">
                        <div class="component">state: waiting</div>
                        <div class="component">name</div>
                        <div class="component">price</div>
                        <div class="component">profit</div>
                        <button class="button" id="logBtn">LOG</button>
                        <button class="button" id="playBtn">PLAY</button>
                        <button class="button" id="stopBtn">DEL</button>
                        </div>`;
        document.querySelector('.list-body').appendChild(li);
    }
    
}
makeList();
searchBtn.addEventListener('click',function(){
    const market = searchBar.innerText;
    const tick = candle.value;
    const askPoint = AskPoint.value;
    const vol = amount.innerText;
    const value = {'market':market,'tick':tick, 'vol':vol,'askPoint':askPoint};

    makeBot(value)
});


console.log(document.querySelector('#logBtn'));
