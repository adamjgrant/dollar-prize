const coinDefs={
  penny:{value:1,img:'images/penny.png',tail:'images/penny_tails.png'},
  nickel:{value:5,img:'images/nickel.png',tail:'images/nickel_tails.png'},
  dime:{value:10,img:'images/dime.png',tail:'images/dime_tails.png'},
  quarter:{value:25,img:'images/quarter.png',tail:'images/quarter_tails.png'}
};

const computerIdx=1; // player 2 is the computer
// probability that the computer will use its smarter strategies
const STRATEGY_CHANCE=0.5;
let players=[
  {coins:[],highest:'penny',total:0,convertedThisTurn:false,placedThisTurn:false},
  {coins:[],highest:'penny',total:0,convertedThisTurn:false,placedThisTurn:false}
];
let currentPlayer=0;
let turnInRound=0;
let round=1;
let gameOver=false;

const newGameBtn=document.getElementById('newGameBtn');
newGameBtn.addEventListener('click',()=>location.reload());

const modal=document.getElementById('modal');
const modalBody=document.getElementById('modal-body');
const modalOk=document.getElementById('modal-ok');

function showModal(){modal.classList.add('show');}
function hideModal(){modal.classList.remove('show');modalOk.style.display='none';modalOk.onclick=null;}

function delay(ms){
  return new Promise(res=>setTimeout(res,ms));
}

function render(){
  ['p1','p2'].forEach((id,idx)=>{
    const div=document.getElementById(id+'Coins');
    const total=document.getElementById(id+'Total');
    div.innerHTML='';
    const sorted=players[idx].coins.slice().sort((a,b)=>coinDefs[a].value-coinDefs[b].value);
    sorted.forEach(c=>{
      const img=document.createElement('img');
      img.src=coinDefs[c].img;
      img.alt=c;
      div.appendChild(img);
    });
    if(total){
      total.textContent='$'+(players[idx].total/100).toFixed(2);
    }

    // update coin buttons
    ['penny','nickel','dime','quarter'].forEach(coin=>{
      const btn=document.getElementById(id+coin.charAt(0).toUpperCase()+coin.slice(1));
      if(btn){
        if(idx===computerIdx){
          btn.disabled=true;
        }else{
          const highest=players[idx].highest;
          btn.disabled=
            currentPlayer!==idx ||
            players[idx].placedThisTurn ||
            coinDefs[coin].value>coinDefs[highest].value;
        }
      }
    });

    const convertBtn=document.getElementById(id+'Convert');
    const endBtn=document.getElementById(id+'EndTurn');
    if(convertBtn){
      if(idx===computerIdx){
        convertBtn.disabled=true;
      }else{
        convertBtn.disabled=
          currentPlayer!==idx ||
          players[idx].convertedThisTurn ||
          !canConvert(players[idx]);
      }
    }
    if(endBtn){
      if(idx===computerIdx){
        endBtn.disabled=true;
      }else{
        endBtn.disabled=currentPlayer!==idx || !players[idx].placedThisTurn;
      }
    }
  });
  const turnText=currentPlayer===0?"Your turn":"Computer's turn";
  document.getElementById('roundInfo').textContent='Round '+round+' – '+turnText;
}

function placeCoin(idx,coin){
  if(gameOver) return;
  const p=players[idx];
  if(p.placedThisTurn) return;
  if(idx!==currentPlayer) return;
  if(coinDefs[coin].value>coinDefs[p.highest].value) return;
  p.coins.push(coin);
  p.total+=coinDefs[coin].value;
  p.placedThisTurn=true;
  updateHighest(p);
  render();
  if(idx===0 && (!canConvert(p) || p.convertedThisTurn)){
    setTimeout(() => endTurn(idx), 200);
  }
}

function removeCoins(p,coinType,num){
  for(let i=0;i<num;i++){
    const ind=p.coins.indexOf(coinType);
    if(ind>-1){p.coins.splice(ind,1);}  }
}

function updateHighest(p){
  let maxValue=0;
  let maxCoin='penny';
  p.coins.forEach(c=>{
    if(coinDefs[c].value>maxValue){
      maxValue=coinDefs[c].value;
      maxCoin=c;
    }
  });
  p.highest=maxCoin;
}

function canConvert(p){
  const counts={penny:0,nickel:0,dime:0};
  p.coins.forEach(c=>{if(counts.hasOwnProperty(c)) counts[c]++;});
  return counts.penny>=5 ||
         counts.nickel>=2 ||
         (counts.nickel>=1 && counts.dime>=2) ||
         (counts.penny>=5 && counts.dime>=2);
}

async function convert(idx,strategic=true){
  if(gameOver) return;

  const p=players[idx];
  if(p.convertedThisTurn) return;

  const counts={penny:0,nickel:0,dime:0};
  p.coins.forEach(c=>{if(counts.hasOwnProperty(c)) counts[c]++;});

  const options=[];
  if(counts.penny>=5){
    options.push({from:{penny:5},to:'nickel'});
  }
  if(counts.nickel>=2){
    options.push({from:{nickel:2},to:'dime'});
  }
  if(counts.nickel>=1 && counts.dime>=2){
    options.push({from:{nickel:1,dime:2},to:'quarter'});
  }
  if(counts.penny>=5 && counts.dime>=2){
    options.push({from:{penny:5,dime:2},to:'quarter'});
  }
  if(options.length===0) return;

  const apply=opt=>{
    for(const c in opt.from){
      removeCoins(p,c,opt.from[c]);
      p.total-=coinDefs[c].value*opt.from[c];
    }
    p.coins.push(opt.to);
    p.total+=coinDefs[opt.to].value;
    p.convertedThisTurn=true;
    updateHighest(p);
  };

  const chooseAndApply=opt=>{
    apply(opt);
    render();
  };

  if(idx===computerIdx){
    if(!strategic){
      chooseAndApply(options[0]);
      return;
    }
    if(Math.random()>=STRATEGY_CHANCE){
      const randOpt=options[Math.floor(Math.random()*options.length)];
      chooseAndApply(randOpt);
      return;
    }
    const oppCounts=getCoinCounts(players[1-idx]);
    const myCounts=getCoinCounts(players[idx]);
    let bestRisk=computeRisk(myCounts,oppCounts);
    let best=null;
    for(const opt of options){
      const testCounts={...myCounts};
      for(const c in opt.from){testCounts[c]-=opt.from[c];}
      testCounts[opt.to]=(testCounts[opt.to]||0)+1;
      const r=computeRisk(testCounts,oppCounts);
      if(r<bestRisk){bestRisk=r;best=opt;}
    }
    if(best){chooseAndApply(best);} 
    return;
  }
  if(options.length===1){
    chooseAndApply(options[0]);
    return;
  }

  await new Promise(resolve=>{
    modalBody.innerHTML='<div>Choose a conversion:</div>';
    options.forEach(opt=>{
      const div=document.createElement('div');
      div.className='convert-option';
      div.style.cursor='pointer';
      Object.keys(opt.from).forEach(type=>{
        for(let i=0;i<opt.from[type];i++){
          div.appendChild(createCoinElement(coinDefs[type].img));
        }
      });
      const arrow=document.createElement('span');
      arrow.textContent='\u2192';
      arrow.style.margin='0 8px';
      div.appendChild(arrow);
      div.appendChild(createCoinElement(coinDefs[opt.to].img));
      div.onclick=()=>{
        chooseAndApply(opt);
        hideModal();
        resolve();
      };
      modalBody.appendChild(div);
    });
    showModal();
  });
}


function createCoinElement(src){
  const img=document.createElement('img');
  img.src=src;
  img.className='coin';
  return img;
}

function formatCoins(arr){
  const counts={};
  arr.forEach(c=>{counts[c]=(counts[c]||0)+1;});
  const parts=Object.keys(counts).map(c=>{
    const n=counts[c];
    const name=c+(n>1?"s":"");
    return n===1?`a ${name}`:`${n} ${name}`;
  });
  if(parts.length===1) return parts[0];
  const last=parts.pop();
  return parts.join(', ')+' and '+last;
}

function getDownConvertOptions(coin){
  switch(coin){
    case 'quarter':
      return [["quarter"],["dime","dime","nickel"]];
    case 'dime':
      return [["dime"],["nickel","nickel"]];
    case 'nickel':
      return [["nickel"],["penny","penny","penny","penny","penny"]];
    default:
      return [[coin]];
  }
}

async function maybeDownConvert(idx,coin){
  const opts=getDownConvertOptions(coin);
  if(opts.length<=1) return [coin];
  const p=players[idx];
  if(idx===computerIdx){
    if(Math.random()>=STRATEGY_CHANCE){
      return [coin];
    }
    const oppCounts=getCoinCounts(players[1-idx]);
    const myCounts=getCoinCounts(p);
    const baseRisk=computeRisk(myCounts,oppCounts);

    const convertCounts={...myCounts};
    convertCounts[coin]--;
    opts[1].forEach(c=>{convertCounts[c]=(convertCounts[c]||0)+1;});
    const convertRisk=computeRisk(convertCounts,oppCounts);

    const nearEnd=players[0].total>=80 && players[1].total>=80;
    let keepProb=0.5;
    if(convertRisk<baseRisk){
      keepProb=nearEnd?0.35:0.2;
    }else if(convertRisk>baseRisk){
      keepProb=nearEnd?0.6:0.8;
    }

    if(Math.random()>keepProb){
      const choice=opts[1];
      removeCoins(p,coin,1);
      p.total-=coinDefs[coin].value;
      choice.forEach(c=>{p.coins.push(c);p.total+=coinDefs[c].value;});
      updateHighest(p);
      return choice;
    }
    return [coin];
  }
  return new Promise(resolve=>{
    modalBody.innerHTML='<div>Choose how to keep your '+coin+':</div>';
    opts.forEach((set,i)=>{
      const div=document.createElement('div');
      div.className='convert-option';
      div.style.cursor='pointer';
      set.forEach(c=>{div.appendChild(createCoinElement(coinDefs[c].img));});
      div.onclick=()=>{
        let finalCoins=[coin];
        if(i!==0){
          removeCoins(p,coin,1);
          p.total-=coinDefs[coin].value;
          set.forEach(c=>{p.coins.push(c);p.total+=coinDefs[c].value;});
          updateHighest(p);
          finalCoins=set;
        }
        modalBody.innerHTML='';
        render();
        resolve(finalCoins);
      };
      modalBody.appendChild(div);
    });
    showModal();
  });
}

function flipAnimation(img){
  return new Promise(res=>{
    img.classList.add('flipping');
    setTimeout(()=>{
      img.classList.remove('flipping');
      res();
    },600);
  });
}

function chooseSideModal(){
  return new Promise(resolve=>{
    modalBody.innerHTML='<div>Choose heads or tails</div>';
    const btnHeads=document.createElement('button');
    const btnTails=document.createElement('button');
    btnHeads.textContent='Heads';
    btnTails.textContent='Tails';
    btnHeads.onclick=()=>{hideModal();resolve('heads');};
    btnTails.onclick=()=>{hideModal();resolve('tails');};
    modalBody.appendChild(btnHeads);
    modalBody.appendChild(btnTails);
    showModal();
  });
}

function flipFivePenniesModal(){
  return new Promise(async resolve=>{
    modalBody.innerHTML='<div>Flipping pennies...</div>';
    const container=document.createElement('div');
    container.style.display='flex';
    container.style.justifyContent='space-around';
    modalBody.appendChild(container);
    showModal();
    const results=[];
    for(let i=0;i<5;i++){
      const img=createCoinElement(coinDefs.penny.img);
      container.appendChild(img);
      await delay(200);
      await flipAnimation(img);
      const heads=Math.random()<0.5;
      img.src=heads?coinDefs.penny.img:coinDefs.penny.tail;
      results.push(heads?'heads':'tails');
      await delay(200);
    }
    modalOk.style.display='block';
    modalOk.onclick=()=>{hideModal();resolve(results);};
  });
}

async function pennyFlipModal(){
  return new Promise(resolve=>{
    modalBody.innerHTML='';
    const playerDiv=document.createElement('div');
    const playerImg=createCoinElement(coinDefs.penny.img);
    const playerRes=document.createElement('div');
    playerRes.className='result';
    const flipBtn=document.createElement('button');
    flipBtn.textContent='Flip';
    playerDiv.appendChild(playerImg);
    playerDiv.appendChild(playerRes);
    playerDiv.appendChild(flipBtn);

    const compDiv=document.createElement('div');
    const compImg=createCoinElement(coinDefs.penny.img);
    const compRes=document.createElement('div');
    compRes.className='result';
    compDiv.appendChild(compImg);
    compDiv.appendChild(compRes);

    const container=document.createElement('div');
    container.style.display='flex';
    container.style.justifyContent='space-around';
    container.appendChild(playerDiv);
    container.appendChild(compDiv);
    modalBody.appendChild(container);
    showModal();

    flipBtn.onclick=async()=>{
      flipBtn.disabled=true;
      const p1Heads=Math.random()<0.5;
      await flipAnimation(playerImg);
      playerImg.src=p1Heads?coinDefs.penny.img:coinDefs.penny.tail;
      playerRes.textContent=p1Heads?'Heads':'Tails';
      await new Promise(r=>setTimeout(r,500));

      const p2Heads=Math.random()<0.5;
      await flipAnimation(compImg);
      compImg.src=p2Heads?coinDefs.penny.img:coinDefs.penny.tail;
      compRes.textContent=p2Heads?'Heads':'Tails';

      let msg=document.createElement('div');
      msg.style.marginTop='10px';
      if(p1Heads!==p2Heads){
        const stealer=p1Heads?0:1;
        const victim=1-stealer;
        if(players[victim].coins.length>0){
          const stolen=players[victim].coins.pop();
          players[stealer].coins.push(stolen);
          players[stealer].total+=coinDefs[stolen].value;
          players[victim].total-=coinDefs[stolen].value;
          const finalCoins=await maybeDownConvert(stealer,stolen);
          updateHighest(players[stealer]);
          updateHighest(players[victim]);
          const phrase=stealer===0?'You':'Computer';
          const verb=stealer===0?'steal':'steals';
          const target=victim===0?'you':'Computer';
          msg.textContent=phrase+' '+verb+' '+formatCoins(finalCoins)+' from '+target;
        }else{
          msg.textContent='No coin to steal.';
        }
      }else{
        msg.textContent='No steal this round.';
      }
      modalBody.appendChild(msg);
      modalOk.style.display='block';
      modalOk.onclick=()=>{hideModal();resolve();};
    };
  });
}

async function highFlipModal(){
  return new Promise(async resolve=>{
    modalBody.innerHTML='';
    const info=document.createElement('div');
    modalBody.appendChild(info);
    const img=createCoinElement('');
    modalBody.appendChild(img);
    const resDiv=document.createElement('div');
    resDiv.className='result';
    modalBody.appendChild(resDiv);
    showModal();

    const baseOrder=['quarter','dime','nickel','penny'];
    let startIdx=0;
    while(startIdx<baseOrder.length){
      const c=baseOrder[startIdx];
      if(countCoin(players[0],c)>0 || countCoin(players[1],c)>0){
        break;
      }
      startIdx++;
    }
    const order=baseOrder.slice(startIdx);

    let actionMsg='No steal this round.';
    for(const coin of order){
      img.src=coinDefs[coin].img;
      resDiv.textContent='';
      info.textContent='Flipping '+coin+'...';
      await flipAnimation(img);
      const heads=Math.random()<0.5;
      img.src=heads?coinDefs[coin].img:coinDefs[coin].tail;
      resDiv.textContent=heads?'Heads':'Tails';
      await new Promise(r=>setTimeout(r,500));
      if(heads){
        const p1Count=countCoin(players[0],coin);
        const p2Count=countCoin(players[1],coin);
        if(p1Count===p2Count){
          actionMsg=p1Count===0?'No player has a '+coin:'Both players have the same number of '+coin+'s.';
        }else if(p1Count>p2Count){
          const given=await transferCoin(0,1,coin);
          actionMsg='You give '+formatCoins(given)+' to Computer';
        }else{
          const given=await transferCoin(1,0,coin);
          actionMsg='Computer gives '+formatCoins(given)+' to you';
        }
        updateHighest(players[0]);
        updateHighest(players[1]);
        break;
      }
    }
    const msg=document.createElement('div');
    msg.style.marginTop='10px';
    msg.textContent=actionMsg;
    modalBody.appendChild(msg);
    modalOk.style.display='block';
    modalOk.onclick=()=>{hideModal();resolve();};
  });
}

async function endTurn(idx){
  if(gameOver) return;
  if(idx!==currentPlayer) return;
  const p=players[idx];
  if(!p.placedThisTurn) return;
  p.convertedThisTurn=false;
  p.placedThisTurn=false;
  turnInRound++;
  if(turnInRound===2){
    await endOfRoundSteal();
    turnInRound=0;
    round++;  }
  currentPlayer=(currentPlayer+1)%2;
  render();
  if(currentPlayer===computerIdx){
    setTimeout(computerTurn,500);
  }
}

function countCoin(p,coinType){
  return p.coins.filter(c=>c===coinType).length;
}

function getCoinCounts(p){
  return ['penny','nickel','dime','quarter'].reduce((acc,c)=>{
    acc[c]=countCoin(p,c);
    return acc;
  },{penny:0,nickel:0,dime:0,quarter:0});
}

function computeRisk(myCounts,otherCounts){
  const weights={penny:1,nickel:2,dime:3,quarter:4};
  let risk=0;
  for(const coin in weights){
    const diff=myCounts[coin]-otherCounts[coin];
    if(diff>0) risk+=diff*weights[coin];
  }
  return risk;
}

function chooseBestPlacement(idx){
  const p=players[idx];
  const opp=players[1-idx];
  const myCounts=getCoinCounts(p);
  const oppCounts=getCoinCounts(opp);
  const allowed=['penny','nickel','dime','quarter'].filter(c=>coinDefs[c].value<=coinDefs[p.highest].value);

  if(idx===computerIdx){
    if(myCounts.dime===2 && myCounts.nickel===0 && allowed.includes('nickel') && allowed.includes('dime') && Math.random()<STRATEGY_CHANCE){
      const oppQuarters=oppCounts.quarter;
      const myQuarters=myCounts.quarter;
      if(oppQuarters-myQuarters===1){
        return 'dime';
      }
      return 'nickel';
    }
  }
  let best=allowed[0];
  let bestScore=Infinity;
  for(const coin of allowed){
    const testCounts={...myCounts};
    testCounts[coin]++;
    const risk=computeRisk(testCounts,oppCounts);
    const score=risk - coinDefs[coin].value/10;
    if(score<bestScore){bestScore=score;best=coin;}
  }
  if(idx===computerIdx && Math.random()>=STRATEGY_CHANCE){
    return allowed[Math.floor(Math.random()*allowed.length)];
  }
  return best;
}

async function endOfRoundSteal(){
  const p1Total=players[0].total;
  const p2Total=players[1].total;
  if(p1Total>=5 || p2Total>=5){
    await highFlipModal();
  }
  checkVictory();
}

async function transferCoin(from,to,coin){
  removeCoins(players[from],coin,1);
  players[from].total-=coinDefs[coin].value;
  players[to].coins.push(coin);
  players[to].total+=coinDefs[coin].value;
  const finalCoins=await maybeDownConvert(to,coin);
  return finalCoins||[coin];
}

function checkVictory(){
  const p1Win=players[0].total>=100;
  const p2Win=players[1].total>=100;
  if(p1Win||p2Win){
    gameOver=true;
    let msg='Tie game!';
    if(players[0].total>players[1].total){
      msg='You win!';
    }else if(players[1].total>players[0].total){
      msg='Computer wins!';
    }
    modalBody.textContent=msg;
    modalOk.style.display='block';
    modalOk.onclick=hideModal;
    showModal();
    render();
  }
}

async function computerTurn(){
  if(gameOver) return;
  if(currentPlayer!==computerIdx) return;
  const p=players[computerIdx];

  const strategic=Math.random()<0.7;

  if(strategic){
    if(canConvert(p)){
      await convert(computerIdx,true);
      await delay(500);
    }
    const coin=chooseBestPlacement(computerIdx);
    placeCoin(computerIdx,coin);
    await delay(500);
    if(!p.convertedThisTurn && canConvert(p)){
      await convert(computerIdx,true);
      await delay(500);
    }
  }else{
    if(canConvert(p) && Math.random()<0.6){
      await convert(computerIdx,false);
      await delay(500);
    }
    placeCoin(computerIdx,p.highest);
    await delay(500);
    if(!p.convertedThisTurn && canConvert(p) && Math.random()<0.3){
      await convert(computerIdx,false);
      await delay(500);
    }
  }

  await endTurn(computerIdx);
}

document.getElementById('p1Convert').addEventListener('click',()=>convert(0));
document.getElementById('p1EndTurn').addEventListener('click',()=>endTurn(0));
// player 2 is the computer so no manual controls

// coin placement buttons
['Penny','Nickel','Dime','Quarter'].forEach(name=>{
  document.getElementById('p1'+name).addEventListener('click',()=>placeCoin(0,name.toLowerCase()));
  // no click handlers for player 2 (computer)
});

async function setupGame(){
  const playerSide=await chooseSideModal();
  const results=await flipFivePenniesModal();
  results.forEach(r=>{
    const idx=r===playerSide?0:1;
    players[idx].coins.push('penny');
    players[idx].total+=coinDefs.penny.value;
  });
  updateHighest(players[0]);
  updateHighest(players[1]);
  render();
  if(currentPlayer===computerIdx){
    setTimeout(computerTurn,500);
  }
}

render();
setupGame();
