const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');

function harness(seed, existing = null) {
  const callbacks = {};
  const app = {
    innerHTML: '',
    addEventListener(event, listener) { callbacks[event] = listener; }
  };
  const storage = new Map(existing ? [['donggu-game-v1', JSON.stringify(existing)]] : []);
  let counter = seed;
  const fakeMath = Object.create(Math);
  fakeMath.random = () => {
    counter = (Math.imul(counter, 1664525) + 1013904223) >>> 0;
    return counter / 4294967296;
  };
  const win = { confirm: () => true };
  const context = {
    Math: fakeMath,
    window: win,
    document: { querySelector: () => app, addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    }
  };
  vm.runInNewContext(source, context);
  function click(action, data = {}) {
    const button = { disabled: false, dataset: { action, ...data } };
    callbacks.click({ target: { closest: () => button } });
  }
  return {
    click,
    html: () => app.innerHTML,
    state: () => JSON.parse(JSON.stringify(win.DongguGame.snapshot()))
  };
}

function setup(game, mode) {
  game.click('mode', { value: String(mode) });
  game.click('begin');
  for(let p=0;p<4;p++) {
    for(let n=0;n<mode;n++) game.click('pick-number', { index: String(p*mode+n) });
    game.click('draw-next');
  }
  const s=game.state();
  assert.equal(s.phase,'game');
  assert.equal(s.deck.length,50);
  assert.equal(s.field.length,2);
  assert.equal(new Set(s.players.flatMap(p=>p.numbers)).size,mode*4);
}

function value(card) {
  return card.rank==='A' ? 1 : ['J','Q','K'].includes(card.rank) ? 10 : Number(card.rank);
}

let seenSafe=false, seenPenalty=false;
for(const mode of [1,2]) {
  for(let seed=1;seed<=20;seed++) {
    const game=harness(seed);
    setup(game,mode);
    const before=game.state();
    const penalty=(value(before.field[0])+value(before.deck[0]))%10||10;
    const caughtIndex=before.players.findIndex(p=>p.numbers.includes(penalty));
    game.click('field',{index:'0'});
    const after=game.state();
    assert.equal(after.round,1);
    assert.equal(after.deck.length,49);
    assert.equal(after.field[0].id,before.deck[0].id);
    if(caughtIndex!==-1) {
      seenPenalty=true;
      assert.equal(after.turn,caughtIndex,'벌칙 플레이어가 다음 차례');
      assert.ok(after.lastResult,'벌칙 팝업 유지');
      assert.match(game.html(),/벌칙 당첨!/);
      assert.match(game.html(),/다음 카드도/);
      assert.equal(after.players[caughtIndex].penalties,1);
      game.click('continue');
      assert.equal(game.state().turn,caughtIndex,'팝업 종료 후에도 벌칙 플레이어의 차례');
    } else {
      seenSafe=true;
      assert.equal(after.turn,1,'무벌칙이면 다음 플레이어로 즉시 이동');
      assert.equal(after.lastResult,null,'무벌칙 팝업 없음');
      assert.doesNotMatch(game.html(),/role="dialog"/);
    }
    for(let n=1;n<50;n++) {
      game.click('field',{index:String(n%2)});
      if(game.state().lastResult) game.click('continue');
    }
    const final=game.state();
    assert.equal(final.phase,'results');
    assert.equal(final.round,50);
    assert.equal(final.deck.length,0);
  }
}
assert.ok(seenPenalty,'벌칙 분기 테스트됨');
assert.ok(seenSafe,'무벌칙 분기 테스트됨');
console.log('동구게임 규칙 검증 통과: 1장/2장, 벌칙 차례, 무벌칙 팝업 제거, 52장 종료');
