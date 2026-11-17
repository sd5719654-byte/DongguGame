/* 동구게임 v1.0 — offline, 4 players, one standard deck */
(() => {
  'use strict';
  const KEY = 'donggu-game-v1';
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const app = document.querySelector('#app');
  const defaults = () => ({
    phase:'home', engineVersion:2, mode:1, draftNames:['플레이어 1','플레이어 2','플레이어 3','플레이어 4'],
    soundOn:true, players:[], numberCards:[], currentDraw:0,
    deck:[], field:[], turn:0, round:0, lastResult:null
  });
  let state = defaults();
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored && ['home','draw','game','results'].includes(stored.phase)) {
      state = { ...defaults(), ...stored };
      // 이전 버전에서 저장된 진행 중 게임도 새 차례 규칙으로 이어간다.
      if ((stored.engineVersion||1)<2 && state.phase==='game' && state.lastResult) {
        if (state.lastResult.caught.length) {
          state.turn=state.lastResult.caught[0];
        } else {
          state.turn=(state.turn+1)%4;
          state.lastResult=null;
          if(!state.deck.length) state.phase='results';
        }
      }
      state.engineVersion=2;
    }
  } catch (_) {}

  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  function randomInt(max) {
    if (globalThis.crypto?.getRandomValues) {
      const sample = new Uint32Array(1), limit = Math.floor(4294967296/max)*max;
      do { crypto.getRandomValues(sample); } while (sample[0] >= limit);
      return sample[0] % max;
    }
    return Math.floor(Math.random()*max);
  }
  function shuffle(input) {
    const result = [...input];
    for(let i=result.length-1;i>0;i--) {
      const j = randomInt(i+1);
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  function buildDeck() {
    return shuffle(SUITS.flatMap((suit,si) =>
      RANKS.map((rank,ri) => ({ id:si*13+ri, suit, rank }))
    ));
  }
  function cardValue(card) {
    return card.rank === 'A' ? 1 : ['J','Q','K'].includes(card.rank) ? 10 : Number(card.rank);
  }
  function playSound(type='tap') {
    if (!state.soundOn) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const ctx = playSound.ctx ||= new Context();
      if (ctx.state === 'suspended') ctx.resume();
      const notes = type==='penalty' ? [380,460,570] : type==='draw' ? [370,520] : [270];
      notes.forEach((frequency,i)=>{
        const t=ctx.currentTime+i*.07;
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type=type==='penalty'?'triangle':'sine';
        osc.frequency.setValueAtTime(frequency,t);
        gain.gain.setValueAtTime(.0001,t);
        gain.gain.exponentialRampToValueAtTime(.09,t+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,t+.11);
        osc.connect(gain).connect(ctx.destination);osc.start(t);osc.stop(t+.12);
      });
    } catch (_) {}
  }
  function shell(body) {
    const progress = state.phase === 'game' || state.phase === 'results';
    const badge = progress
      ? `<span class="pill">진행 <b>${Math.min(state.round,50)} / 50</b></span><span class="pill">남은 카드 <b>${state.deck.length}장</b></span>`
      : `<span class="pill">4인용 · 52장 · 오프라인</span>`;
    app.innerHTML = `<div class="shell">
      <header class="topbar">
        <div class="brand"><div class="brand-icon">D</div><div>
          <div class="brand-title">동구게임</div><div class="brand-caption">DONGGU CARD GAME</div>
        </div></div>
        <div class="topbar-right">${badge}
          <button class="icon-btn" data-action="sound" aria-label="효과음 ${state.soundOn?'끄기':'켜기'}" title="효과음">${state.soundOn?'♪':'♪̸'}</button>
          ${state.phase==='home'?'':`<button class="text-btn" data-action="reset">처음으로 ↗</button>`}
        </div>
      </header>
      ${body}
      <footer class="footer">DONGGU GAME · 1~10 중복 없이 추첨 · A=1 · J/Q/K=10 · 합계 끝자리 0은 번호 10</footer>
    </div>`;
  }
  function renderHome() {
    shell(`<main class="home-layout">
      <section class="hero">
        <div class="eyebrow">THE HOUSE RULES · NO. 01</div>
        <div class="hero-suits">♠</div>
        <h1>카드 한 장,<br><span class="gold">운명의 끝자리.</span></h1>
        <p>카드를 고르고, 뒤집고, 숫자를 더해봐.<br>끝자리가 내 번호와 같다면? 오늘의 벌칙 주인공!</p>
        <div class="hero-chips"><span>♠ 4 PLAYERS</span><span>♢ 52 CARDS</span><span>♣ ONE DECK</span></div>
      </section>
      <section class="setup-panel">
        <div class="panel-title">새 게임 시작</div>
        <div class="panel-sub">플레이 방식과 친구들의 이름을 정해줘.</div>
        <div class="mode-pair">
          <button class="mode-card ${state.mode===1?'selected':''}" data-action="mode" data-value="1">
            <strong>🂠 번호 1개</strong><small>각자 1장씩 직접 뽑기</small><span class="check">${state.mode===1?'●':'○'}</span>
          </button>
          <button class="mode-card ${state.mode===2?'selected':''}" data-action="mode" data-value="2">
            <strong>🂠 번호 2개</strong><small>각자 2장씩 직접 뽑기</small><span class="check">${state.mode===2?'●':'○'}</span>
          </button>
        </div>
        <div class="names-grid">${state.draftNames.map((name,i)=>`
          <label class="name-box"><span class="name-dot">${i+1}</span>
            <input maxlength="10" data-name-index="${i}" value="${esc(name)}" aria-label="플레이어 ${i+1} 이름">
          </label>`).join('')}</div>
        <div class="setup-footer">
          <span>✓ 번호 중복 없음<br>✓ 벌칙 자동 집계</span>
          <button class="gold-btn" data-action="begin">번호 뽑으러 가기 →</button>
        </div>
      </section>
    </main>`);
  }
  function renderDraw() {
    const p = state.players[state.currentDraw];
    if (!p) return renderHome();
    const ready=p.numbers.length===state.mode;
    const drawn=state.numberCards.filter(c=>c.owner!==-1).length;
    shell(`<main class="draw-layout">
      <section class="draw-lead">
        <div class="eyebrow">STEP 01 · NUMBER DRAW</div>
        <h2><span style="color:var(--gold)">${esc(p.name)}</span> 차례야!</h2>
        <p>뒤집힌 카드 중 ${state.mode}장을 직접 뽑아줘.<br>뽑힌 번호는 다른 사람이 가져갈 수 없어.</p>
        <div class="draw-progress">${state.players.map((_,i)=>`<span class="progress-dot ${i<=state.currentDraw?'done':''}"></span>`).join('')}</div>
        <div class="tiny-label" style="margin-top:9px">플레이어 ${state.currentDraw+1} / 4</div>
      </section>
      <section class="draw-board">
        <div class="draw-board-head"><div class="tiny-label">카드를 터치해서 뒤집어봐</div><div class="tiny-label">${drawn} / ${state.mode*4}장 선택</div></div>
        <div class="number-grid">${state.numberCards.map((card,i)=>{
          const owned=card.owner===state.currentDraw, taken=card.owner!==-1;
          return `<button class="number-card ${owned?'chosen':taken?'taken':''}" data-action="pick-number" data-index="${i}"
            ${taken||ready?'disabled':''} aria-label="${owned?esc(card.value)+'번 선택됨':taken?'이미 선택한 카드':'뒤집힌 카드 '+(i+1)}">
            ${owned?`<span class="number">${card.value}</span><span class="mini-brand">MY NUMBER</span>`
              :taken?'<span class="small-suit">✓</span><span class="mini-brand">TAKEN</span>'
              :'<span class="small-suit">♠</span><span class="mini-brand">DONGGU</span>'}
          </button>`;
        }).join('')}</div>
      </section>
      <section class="draw-aside">
        <div class="tiny-label">MY LUCKY NUMBER</div>
        <h3>${esc(p.name)}의 번호</h3>
        <div class="picked-row">${Array.from({length:state.mode},(_,i)=>
          `<div class="picked-slot ${p.numbers[i]?'active':''}">${p.numbers[i]??'?'}</div>`
        ).join('')}</div>
        <div class="tiny-label">${ready?'선택 완료! 다음 단계로 넘어가자.':'뒤집힌 카드를 선택해줘.'}</div>
        <button class="gold-btn" data-action="draw-next" ${ready?'':'disabled'}>
          ${state.currentDraw===3?'게임 시작하기 →':'다음 플레이어 →'}
        </button>
      </section>
    </main>`);
  }
  function face(card) {
    const red=card.suit==='♥'||card.suit==='♦';
    return `<span class="corner">${card.rank}<span>${card.suit}</span></span>
      <span class="center-suit">${card.suit}</span>
      <span class="corner bottom">${card.rank}<span>${card.suit}</span></span>`;
  }
  function bigCard(card,i) {
    return `<button class="playing-card ${card.suit==='♥'||card.suit==='♦'?'red':''}"
      data-action="field" data-index="${i}" ${state.lastResult?'disabled':''}
      aria-label="필드 ${i+1}번 카드 ${card.suit} ${card.rank} 선택">${face(card)}
      <span class="card-tap">여기를 선택</span></button>`;
  }
  function miniCard(card) {
    return `<span class="mini-card ${card.suit==='♥'||card.suit==='♦'?'red':''}">
      <small>${card.suit}</small><b>${card.rank}</b></span>`;
  }
  function renderResult() {
    const r=state.lastResult;
    if(!r) return '';
    const playerName=esc(state.players[r.caught[0]].name);
    return `<div class="overlay" role="dialog" aria-modal="true" aria-label="카드 결과">
      <div class="result-panel">
        <div class="result-top">ROUND ${String(state.round).padStart(2,'0')} · CARD REVEAL</div>
        <h2>🍻 벌칙 당첨!</h2>
        <div class="result-math">${miniCard(r.before)}<span class="math-symbol">+</span>${miniCard(r.drawn)}<span class="math-symbol">=</span>
          <span class="math-total"><b>${r.sum}</b></span></div>
        <div class="math-total">끝자리 번호 <b>${r.number}</b> ${r.number===10?'<small>(끝자리 0)</small>':''}</div>
        <div class="caught">
          <div class="names">${playerName}</div>
          <div class="explain">벌칙 횟수 +1 · 다음 카드도 ${playerName}님이 선택해!</div>
        </div>
        <button class="gold-btn" data-action="continue">${state.deck.length===0?'최종 결과 보기 →':playerName+'님 카드 선택하기 →'}</button>
      </div>
    </div>`;
  }
  function renderGame() {
    const p=state.players[state.turn];
    shell(`<main class="game-layout">
      <section class="players-box">
        <div class="players-head"><strong>PLAYERS</strong><span>벌칙 기록</span></div>
        <div class="players-list">${state.players.map((player,i)=>`
          <div class="player ${i===state.turn?'current':''}">
            <div class="avatar">${i+1}</div>
            <div class="player-main"><div class="player-name">${esc(player.name)} ${i===state.turn?'✦':''}</div>
              <div class="player-numbers">번호 ${player.numbers.join(' · ')}</div></div>
            <div class="penalty-num">${player.penalties}<small>회</small></div>
          </div>`).join('')}</div>
      </section>
      <section class="felt">
        <div class="felt-title">✦ FIELD CARDS <b>·</b> 카드 한 장을 골라줘 ✦</div>
        <div class="field-cards">${bigCard(state.field[0],0)}<span class="between">or</span>${bigCard(state.field[1],1)}</div>
        <div class="felt-bottom">선택한 카드 + 덱에서 나온 카드 = <b style="color:var(--gold)">벌칙 번호</b></div>
      </section>
      <section class="deck-box">
        <div><div class="turn-caption">CURRENT TURN</div><div class="turn-name">${esc(p.name)}</div></div>
        <div class="deck-stack" aria-label="남은 카드 덱"><span class="suit">♠</span><span class="deck-brand">DONGGU</span></div>
        <div class="remaining">남은 카드 <b>${state.deck.length}</b>장</div>
      </section>
    </main>${renderResult()}`);
  }
  function renderRanks() {
    const ranked=state.players.map((p,i)=>({...p,index:i})).sort((a,b)=>b.penalties-a.penalties||a.index-b.index);
    let previous=null, previousRank=0;
    const rows=ranked.map((p,i)=>{
      const rank=p.penalties===previous?previousRank:i+1;
      previous=p.penalties; previousRank=rank;
      return `<div class="rank-row ${rank===1?'first':''}"><div class="rank-badge">${rank===1?'♛':rank}</div>
        <div class="rank-name">${esc(p.name)}<div class="tiny-label">번호 ${p.numbers.join(' · ')}</div></div>
        <div class="rank-number">${p.penalties}<small> 회</small></div></div>`;
    }).join('');
    const top=ranked.filter(p=>p.penalties===ranked[0].penalties).map(p=>esc(p.name)).join(', ');
    shell(`<main class="result-layout">
      <section class="result-summary">
        <div class="eyebrow">GAME OVER · ALL 52 CARDS</div>
        <h1>오늘의<br><span style="color:var(--gold)">벌칙왕은?</span></h1>
        <p><b style="color:var(--cream)">${top}</b><br>52장의 카드로 50번의 선택을 완료했어.<br>아래에서 모두의 벌칙 횟수를 확인해봐!</p>
        <button class="gold-btn" data-action="new-game">다시 한 판 ↗</button>
      </section>
      <section class="ranking">
        <div class="ranking-title">🏆 벌칙 순위 · 많이 걸린 순서</div>
        ${rows}
        <div class="rules">동률이면 공동 순위로 표시돼. 다음 판에는 새로운 번호와 카드가 섞여.</div>
      </section>
    </main>`);
  }
  function render() {
    if (state.phase==='draw') renderDraw();
    else if (state.phase==='game') renderGame();
    else if (state.phase==='results') renderRanks();
    else renderHome();
  }
  function begin() {
    const names=state.draftNames.map((name,i)=>name.trim()||`플레이어 ${i+1}`);
    state.players=names.map(name=>({name,numbers:[],penalties:0}));
    state.numberCards=shuffle(Array.from({length:10},(_,i)=>i+1))
      .map(value=>({value,owner:-1}));
    state.currentDraw=0;state.phase='draw';
    state.deck=[];state.field=[];state.turn=0;state.round=0;state.lastResult=null;
    playSound('draw');save();render();
  }
  function pickNumber(index) {
    if(state.phase!=='draw') return;
    const card=state.numberCards[index],p=state.players[state.currentDraw];
    if(!card || card.owner!==-1 || p.numbers.length>=state.mode) return;
    card.owner=state.currentDraw;p.numbers.push(card.value);
    playSound('draw');save();render();
  }
  function nextDraw() {
    if(state.phase!=='draw') return;
    if(state.players[state.currentDraw].numbers.length!==state.mode) return;
    if(state.currentDraw<3) {
      state.currentDraw++;
    } else {
      const deck=buildDeck();
      state.field=deck.splice(0,2);
      state.deck=deck;
      state.turn=0;state.round=0;state.lastResult=null;state.phase='game';
    }
    playSound('tap');save();render();
  }
  function chooseField(index) {
    if(state.phase!=='game'||state.lastResult||![0,1].includes(index)||!state.deck.length) return;
    const before=state.field[index],drawn=state.deck.shift();
    const sum=cardValue(before)+cardValue(drawn),number=sum%10||10;
    const caught=[];
    state.players.forEach((p,i)=>{if(p.numbers.includes(number)){p.penalties++;caught.push(i);}});
    state.field[index]=drawn;state.round++;
    // 벌칙이면 걸린 사람이 연속 진행한다. 무벌칙이면 시계 방향으로 즉시 넘긴다.
    state.turn=caught.length ? caught[0] : (state.turn+1)%4;
    state.lastResult=caught.length ? {before,drawn,sum,number,caught,index} : null;
    if(!caught.length && !state.deck.length) state.phase='results';
    playSound(caught.length?'penalty':'draw');save();render();
  }
  function continueTurn() {
    if(state.phase!=='game'||!state.lastResult) return;
    state.lastResult=null;
    if(!state.deck.length) state.phase='results';
    playSound('tap');save();render();
  }
  function reset(confirmFirst) {
    if(confirmFirst && !window.confirm('현재 게임 기록을 지우고 처음으로 돌아갈까?')) return;
    const names=state.draftNames,soundOn=state.soundOn;
    state={...defaults(),draftNames:names,soundOn};
    save();render();
  }
  app.addEventListener('input',e=>{
    const input=e.target.closest('[data-name-index]');
    if(!input) return;
    const i=Number(input.dataset.nameIndex);
    if(i>=0&&i<4){state.draftNames[i]=input.value;save();}
  });
  app.addEventListener('click',e=>{
    const button=e.target.closest('[data-action]');
    if(!button||button.disabled) return;
    const action=button.dataset.action;
    switch(action){
      case 'mode':state.mode=Number(button.dataset.value);save();render();break;
      case 'begin':begin();break;
      case 'pick-number':pickNumber(Number(button.dataset.index));break;
      case 'draw-next':nextDraw();break;
      case 'field':chooseField(Number(button.dataset.index));break;
      case 'continue':continueTurn();break;
      case 'new-game':reset(false);break;
      case 'reset':reset(true);break;
      case 'sound':state.soundOn=!state.soundOn;save();render();break;
    }
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&state.phase!=='home'&&!state.lastResult) {
      // Intentional: the back key never silently destroys a game.
    }
  });
  render();
  // Read-only snapshot supports automated gameplay and rule verification.
  window.DongguGame = Object.freeze({ snapshot:()=>JSON.parse(JSON.stringify(state)) });
})();
