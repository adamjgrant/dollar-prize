const coinDefs={
  penny:{value:1,img:'images/penny.png'},
  nickel:{value:5,img:'images/nickel.png'},
  dime:{value:10,img:'images/dime.png'},
  quarter:{value:25,img:'images/quarter.png'}
};

const computerIdx=1; // player 2 is the computer
let players=[
  {coins:[],highest:'penny',total:0,convertedThisTurn:false,placedThisTurn:false},
  {coins:[],highest:'penny',total:0,convertedThisTurn:false,placedThisTurn:false}
];
let currentPlayer=0;
let turnInRound=0;
let round=1;

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
          btn.disabled=currentPlayer!==idx || players[idx].placedThisTurn || coin!==players[idx].highest;
        }
      }
    });

    const convertBtn=document.getElementById(id+'Convert');
    const endBtn=document.getElementById(id+'EndTurn');
    if(idx===computerIdx){
      convertBtn.disabled=true;
      endBtn.disabled=true;
    }else{
      convertBtn.disabled=currentPlayer!==idx || players[idx].convertedThisTurn;
      endBtn.disabled=currentPlayer!==idx || !players[idx].placedThisTurn;
    }
  });
  document.getElementById('roundInfo').textContent='Round '+round+' – Player '+(currentPlayer+1)+'\'s turn';
}

function placeCoin(idx,coin){
  const p=players[idx];
  if(p.placedThisTurn) return;
  if(idx!==currentPlayer) return;
  if(coin!==p.highest) return;
  p.coins.push(coin);
  p.total+=coinDefs[coin].value;
  p.placedThisTurn=true;
  updateHighest(p);
  render();
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
  return counts.penny>=5 || counts.nickel>=3 || (counts.nickel>=1 && counts.dime>=2);
}

function convert(idx){
  const p=players[idx];
  if(p.convertedThisTurn)return;
  const counts={penny:0,nickel:0,dime:0,quarter:0};
  p.coins.forEach(c=>counts[c]++);
  let converted=false;
  if(counts.penny>=5){
    removeCoins(p,'penny',5);
    p.coins.push('nickel');
    p.total-=coinDefs.penny.value*5;
    p.total+=coinDefs.nickel.value;
    converted=true;
  }else if(counts.nickel>=3){
    removeCoins(p,'nickel',3);
    p.coins.push('nickel');
    p.coins.push('dime');
    p.total-=coinDefs.nickel.value*3;
    p.total+=coinDefs.nickel.value+coinDefs.dime.value;
    converted=true;
  }else if(counts.nickel>=1&&counts.dime>=2){
    removeCoins(p,'nickel',1);
    removeCoins(p,'dime',2);
    p.coins.push('quarter');
    p.total-=coinDefs.nickel.value+coinDefs.dime.value*2;
    p.total+=coinDefs.quarter.value;
    converted=true;
  }
  if(converted){
    p.convertedThisTurn=true;
    updateHighest(p);
    log('Player '+(idx+1)+' performs a conversion.');
    render();
  }
}

function log(msg){
  document.getElementById('log').innerHTML+=msg+'<br>';}

function endTurn(idx){
  if(idx!==currentPlayer) return;
  const p=players[idx];
  if(!p.placedThisTurn) return;
  p.convertedThisTurn=false;
  p.placedThisTurn=false;
  turnInRound++;
  if(turnInRound===2){
    endOfRoundSteal();
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

function endOfRoundSteal(){
  log('<hr>End of Round '+round);
  const p1Total=players[0].total;
  const p2Total=players[1].total;
  if(p1Total<5&&p2Total<5){
    const p1Heads=Math.random()<0.5;
    const p2Heads=Math.random()<0.5;
    log('P1 flips '+(p1Heads?'Heads':'Tails')+', P2 flips '+(p2Heads?'Heads':'Tails'));
    if(p1Heads!==p2Heads){
      const stealer=p1Heads?0:1;
      const victim=1-stealer;
      if(players[victim].coins.length>0){
        const stolen=players[victim].coins.pop();
        players[stealer].coins.push(stolen);
        players[stealer].total+=coinDefs[stolen].value;
        players[victim].total-=coinDefs[stolen].value;
        log('Player '+(stealer+1)+' steals a '+stolen+' from Player '+(victim+1));
        updateHighest(players[stealer]);
        updateHighest(players[victim]);
      }
    }
  }else{
    const order=['quarter','dime','nickel','penny'];
    for(const coin of order){
      const heads=Math.random()<0.5;
      log(coin+' flip: '+(heads?'Heads':'Tails'));
      if(heads){
        const p1Count=countCoin(players[0],coin);
        const p2Count=countCoin(players[1],coin);
        if(p1Count===0&&p2Count===0){
          log('No player has a '+coin);
        }else if(p1Count>0&&p2Count===0){
          transferCoin(0,1,coin);
        }else if(p2Count>0&&p1Count===0){
          transferCoin(1,0,coin);
        }else{
          if(p1Count>p2Count){
            transferCoin(0,1,coin);
          }else if(p2Count>p1Count){
            transferCoin(1,0,coin);
          }else{
            removeCoins(players[0],coin,1);
            removeCoins(players[1],coin,1);
            players[0].total-=coinDefs[coin].value;
            players[1].total-=coinDefs[coin].value;
            log('Both players lose a '+coin);
          }
        }
        updateHighest(players[0]);
        updateHighest(players[1]);
        break;
      }
    }
  }
  checkVictory();
}

function transferCoin(from,to,coin){
  removeCoins(players[from],coin,1);
  players[from].total-=coinDefs[coin].value;
  players[to].coins.push(coin);
  players[to].total+=coinDefs[coin].value;
  log('Player '+(from+1)+' gives a '+coin+' to Player '+(to+1));
}

function checkVictory(){
  const p1Win=players[0].total>=100;
  const p2Win=players[1].total>=100;
  if(p1Win||p2Win){
    if(players[0].total>players[1].total){
      alert('Player 1 wins!');
    }else if(players[1].total>players[0].total){
      alert('Player 2 wins!');
    }else{
      alert('Tie game!');
    }
    location.reload();
  }
}

function computerTurn(){
  if(currentPlayer!==computerIdx) return;
  const p=players[computerIdx];

  if(canConvert(p) && Math.random()<0.6){
    convert(computerIdx);
  }

  placeCoin(computerIdx,p.highest);

  if(!p.convertedThisTurn && canConvert(p) && Math.random()<0.3){
    convert(computerIdx);
  }

  setTimeout(()=>endTurn(computerIdx),500);
}

document.getElementById('p1Convert').addEventListener('click',()=>convert(0));
document.getElementById('p1EndTurn').addEventListener('click',()=>endTurn(0));
// player 2 is the computer so no manual controls

// coin placement buttons
['Penny','Nickel','Dime','Quarter'].forEach(name=>{
  document.getElementById('p1'+name).addEventListener('click',()=>placeCoin(0,name.toLowerCase()));
  // no click handlers for player 2 (computer)
});

render();
