// survey.js — 被験者向け画面（トップ / 説明 / 評価 / 自由記述 / 完了）
// 評価画面は「ピック 1つにつき1画面」。その中で全ての評価語（形容詞対）をまとめて評価する。
// 画面上部のピックナビゲーター（A, B, C...）から、どのピックへも自由に移動できる。
(function(App){
  App.Survey = {};

  // ---------- セッション構築 ----------
  App.Survey.buildSession = function(subjectId, role){
    const cfg = App.state.config;
    const roleField = role === '演奏者' ? 'showPerformer' : 'showListener';
    const applicableItems = App.state.items.filter(it => it[roleField] !== false);
    let itemOrder = applicableItems.slice();
    if(cfg.itemOrder === 'random') itemOrder = App.shuffle(itemOrder);
    let pickOrder = App.state.picks.slice();
    if(cfg.pickOrder === 'random') pickOrder = App.shuffle(pickOrder);

    const flips = {};
    applicableItems.forEach(it => {
      flips[it.id] = cfg.leftRight === 'random' ? (Math.random() < 0.5) : false;
    });

    return {
      subjectId, role,
      itemOrderIds: itemOrder.map(i => i.id),   // 各ピック画面内での評価語（行）の並び順
      pickOrderIds: pickOrder.map(p => p.id),   // ピック画面そのものの並び順
      flips,
      answers: {},   // key: `${itemId}__${pickId}` -> value(1..N, 反転前の元の並び基準)
      idx: 0,        // 現在表示中のピック（pickOrderIds のインデックス）
      freeText: '',
      startedAt: new Date().toISOString()
    };
  };

  // ---------- ホーム → 説明ページ → 評価開始 ----------
  App.Survey.goToInstructions = function(){
    const subjectId = (App.state.homeSubjectId || '').trim();
    const role = App.state.homeRole;
    if(!role){ App.toast('演奏者 / 聴取者を選択してください'); return; }
    if(!subjectId){ App.toast('被験者番号を入力してください'); return; }
    if(App.state.picks.length === 0){ App.toast('ピックが設定されていません（管理画面で設定してください）'); return; }
    if(App.state.items.length === 0){ App.toast('評価項目が設定されていません（管理画面で設定してください）'); return; }
    App.state.homeSubjectId = subjectId;
    App.state.screen = 'instructions';
    App.render();
  };

  App.Survey.startSurvey = function(){
    const subjectId = App.state.homeSubjectId;
    const role = App.state.homeRole;
    const session = App.Survey.buildSession(subjectId, role);
    if(session.pickOrderIds.length === 0){ App.toast('ピックが設定されていません（管理画面で設定してください）'); App.state.screen='home'; App.render(); return; }
    if(session.itemOrderIds.length === 0){ App.toast('この立場（' + role + '）向けに表示できる評価項目がありません（管理画面で確認してください）'); App.state.screen='home'; App.render(); return; }
    App.state.session = session;
    App.state.screen = 'survey';
    App.Survey.persistInProgress();
    App.render();
  };

  // ---------- 進行中データの自動保存/再開 ----------
  App.Survey.persistInProgress = function(){
    if(!App.state.session) return;
    App.storage.set(App.pkey(App.state.currentProjectId, 'inprogress'), App.state.session);
  };
  App.Survey.clearInProgress = function(){
    App.storage.remove(App.pkey(App.state.currentProjectId, 'inprogress'));
    App.state.inProgressInfo = null;
  };
  App.Survey.checkInProgress = function(){
    App.state.inProgressInfo = App.storage.get(App.pkey(App.state.currentProjectId, 'inprogress'), null);
  };
  App.Survey.resumeInProgress = function(){
    const s = App.state.inProgressInfo;
    if(!s) return;
    App.state.session = s;
    App.state.screen = (s.idx >= s.pickOrderIds.length) ? 'freeText' : 'survey';
    App.render();
  };
  App.Survey.discardInProgress = function(){
    App.Survey.clearInProgress();
    App.render();
  };
  App.Survey.debouncedAutosave = App.debounce(function(){ App.Survey.persistInProgress(); }, 700);

  // ---------- ホーム画面 ----------
  App.Survey.renderHome = function(){
    let banner = '';
    if(App.state.inProgressInfo){
      const info = App.state.inProgressInfo;
      banner = `
        <div class="card resume-card">
          <div class="resume-title">進行中の回答があります</div>
          <div class="small-dim">被験者 ${App.esc(info.subjectId)}（${App.esc(info.role)}） ・ ${Math.min(info.idx, info.pickOrderIds.length)} / ${info.pickOrderIds.length} ピックまで回答済み</div>
          <div class="resume-actions">
            <button class="btn btn-primary btn-sm" onclick="App.Survey.resumeInProgress()">続きから再開</button>
            <button class="btn btn-sm btn-danger" onclick="App.Survey.discardInProgress()">破棄して新規に開始</button>
          </div>
        </div>`;
    }

    return `
      <div class="spectrum"></div>
      <div class="eyebrow">SD法 感性評価システム</div>
      <h1 class="title">ギターピック<br>感性評価実験</h1>
      <p class="subtitle">意味微分法（SD法）により、ピックの弾き心地・音色印象を評価します。ピックごとに、すべての評価語をまとめて評価していただきます。</p>
      ${banner}
      <div class="card">
        <label class="field-label">あなたの立場</label>
        <div class="role-row">
          <div class="role-opt ${App.state.homeRole==='演奏者'?'selected':''}" onclick="App.state.homeRole='演奏者';App.render()">演奏者</div>
          <div class="role-opt ${App.state.homeRole==='聴取者'?'selected':''}" onclick="App.state.homeRole='聴取者';App.render()">聴取者</div>
        </div>
        <div style="height:18px"></div>
        <label class="field-label">被験者番号</label>
        <input type="text" id="subjectIdInput" placeholder="例）001" value="${App.esc(App.state.homeSubjectId)}"
          oninput="App.state.homeSubjectId=this.value">
        <div style="height:24px"></div>
        <button class="btn btn-primary btn-block" onclick="App.Survey.goToInstructions()">次へ</button>
      </div>
      <div style="text-align:center;margin-top:26px;">
        <button class="link-btn" onclick="App.state.screen='admin';App.render()">管理者はこちら</button>
      </div>
    `;
  };

  // ---------- 説明ページ ----------
  App.Survey.renderInstructions = function(){
    const text = App.state.config.instructionsText || '';
    const role = App.state.homeRole;
    const roleField = role === '演奏者' ? 'showPerformer' : 'showListener';
    const applicableItems = App.state.items.filter(it => it[roleField] !== false);
    const itemListHtml = applicableItems.map(it =>
      `<li>${App.esc(it.left)} <span class="item-list-arrow">⇔</span> ${App.esc(it.right)}</li>`
    ).join('');

    return `
      <div class="spectrum"></div>
      <div class="eyebrow">はじめに</div>
      <h1 class="title" style="font-size:22px;">評価にあたっての説明</h1>
      <div class="card">
        <div class="instructions-text">${App.esc(text)}</div>
        <div class="instructions-item-block">
          <div class="small-dim" style="margin-bottom:10px;">以下の評価項目 全${applicableItems.length}件 にご回答いただきます（${App.esc(role)}向け）。</div>
          <ul class="item-list">${itemListHtml}</ul>
        </div>
        <div class="matrix-actions">
          <button class="btn" onclick="App.state.screen='home';App.render()">戻る</button>
          <button class="btn btn-primary" onclick="App.Survey.startSurvey()">評価をはじめる</button>
        </div>
      </div>
    `;
  };

  // ---------- ピックナビゲーター ----------
  function renderPickNav(s){
    const items = s.pickOrderIds.map((pid, i) => {
      const pIdx = App.state.picks.findIndex(p => p.id === pid);
      if(pIdx < 0) return '';
      const label = App.toPickLabel(pIdx + 1);
      const isCurrent = i === s.idx;
      const isComplete = s.itemOrderIds.every(iid => s.answers[iid + '__' + pid] != null);
      const isPartial = !isComplete && s.itemOrderIds.some(iid => s.answers[iid + '__' + pid] != null);
      const cls = ['pick-nav-btn'];
      if(isCurrent) cls.push('current');
      if(isComplete) cls.push('complete');
      else if(isPartial) cls.push('partial');
      return `<button type="button" class="${cls.join(' ')}" onclick="App.Survey.jumpToPick(${i})">${label}</button>`;
    }).join('');
    return `<div class="pick-nav">${items}</div>`;
  }

  App.Survey.jumpToPick = function(idx){
    const s = App.state.session;
    if(idx < 0 || idx >= s.pickOrderIds.length) return;
    s.idx = idx;
    App.Survey.persistInProgress();
    App.render();
  };

  // ---------- 評価画面（ピック単位） ----------
  App.Survey.selectCell = function(itemId, pos){
    const s = App.state.session;
    const pickId = s.pickOrderIds[s.idx];
    const flipped = s.flips[itemId];
    const N = App.state.config.scale;
    const value = flipped ? (N + 1 - pos) : pos;
    s.answers[itemId + '__' + pickId] = value;
    App.render();
  };

  App.Survey.goNext = function(){
    const s = App.state.session;
    const pickId = s.pickOrderIds[s.idx];
    const anyAnswered = s.itemOrderIds.some(iid => s.answers[iid + '__' + pickId] != null);
    if(!anyAnswered){ App.toast('少なくとも1つの評価語を回答してください'); return; }
    s.idx += 1;
    App.Survey.persistInProgress();
    if(s.idx >= s.pickOrderIds.length){
      App.state.screen = 'freeText';
    }
    App.render();
  };

  App.Survey.goBack = function(){
    const s = App.state.session;
    if(s.idx <= 0) return;
    s.idx -= 1;
    App.render();
  };

  App.Survey.renderSurvey = function(){
    const s = App.state.session;
    const pickId = s.pickOrderIds[s.idx];
    const pick = App.state.picks.find(p => p.id === pickId);
    if(!pick){
      // 実験途中でピックが削除された場合の保険
      s.idx += 1;
      if(s.idx >= s.pickOrderIds.length){ App.state.screen = 'freeText'; }
      App.render();
      return '';
    }
    const pickLabel = App.toPickLabel(App.state.picks.findIndex(p => p.id === pickId) + 1);
    const N = App.state.config.scale;
    const pct = Math.round((s.idx / s.pickOrderIds.length) * 100);

    let gridCells = '<div class="pg-empty"></div>';
    for(let pos = 1; pos <= N; pos++){ gridCells += `<div class="scale-num">${pos}</div>`; }
    gridCells += '<div class="pg-empty"></div>';

    s.itemOrderIds.forEach(itemId => {
      const item = App.state.items.find(i => i.id === itemId);
      if(!item) return;
      const flipped = s.flips[itemId];
      const leftLabel = flipped ? item.right : item.left;
      const rightLabel = flipped ? item.left : item.right;
      const existingValue = s.answers[itemId + '__' + pickId];
      let selectedPos = null;
      if(existingValue != null) selectedPos = flipped ? (N + 1 - existingValue) : existingValue;

      gridCells += `<div class="pg-label left">${App.esc(leftLabel)}</div>`;
      for(let pos = 1; pos <= N; pos++){
        gridCells += `<div class="cell ${selectedPos===pos?'selected':''}" onclick="App.Survey.selectCell('${itemId}',${pos})">${pos}</div>`;
      }
      gridCells += `<div class="pg-label right">${App.esc(rightLabel)}</div>`;
    });

    const anyAnswered = s.itemOrderIds.some(iid => s.answers[iid + '__' + pickId] != null);
    const answeredCount = s.itemOrderIds.filter(iid => s.answers[iid + '__' + pickId] != null).length;

    const audioBlock = pick.audioName ? `
      <div class="audio-player-wrap">
        <div class="small-dim" style="margin-bottom:6px;">音源</div>
        <audio controls data-pick="${pick.id}" style="width:100%;"></audio>
      </div>` : '';

    return `
      <div class="spectrum"></div>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-num">ピック ${pickLabel} ・ ${s.idx+1} / ${s.pickOrderIds.length}</div>
      </div>
      ${renderPickNav(s)}
      <div class="card">
        <div class="pick-badge">ピック ${pickLabel}</div>
        ${audioBlock}
        <div class="pickpage-grid-wrap">
          <div class="pickpage-grid" style="grid-template-columns:minmax(96px,120px) repeat(${N},minmax(30px,1fr)) minmax(96px,120px);">${gridCells}</div>
        </div>
        ${answeredCount < s.itemOrderIds.length ? `<p class="small-dim" style="margin-top:14px;">${answeredCount} / ${s.itemOrderIds.length} 評価語 回答済み（未回答のまま次へ進めますが、送信前にすべて回答する必要があります）</p>` : ''}
        <div class="matrix-actions">
          ${s.idx>0 ? `<button class="btn" onclick="App.Survey.goBack()">戻る</button>` : `<span></span>`}
          <button class="btn btn-primary" ${anyAnswered ? '' : 'disabled'} onclick="App.Survey.goNext()">次へ</button>
        </div>
      </div>
    `;
  };

  // ---------- 自由記述 ----------
  App.Survey.renderFreeText = function(){
    const s = App.state.session;
    return `
      <div class="spectrum"></div>
      <div class="eyebrow">最後に</div>
      <h1 class="title" style="font-size:22px;">自由記述</h1>
      <p class="subtitle">気づいたこと、感想などがあればご記入ください（任意）。</p>
      <div class="card">
        <textarea id="freeTextInput" placeholder="ここに入力..." oninput="App.state.session.freeText=this.value;App.Survey.debouncedAutosave();">${App.esc(s.freeText)}</textarea>
        <div class="matrix-actions">
          <button class="btn" onclick="App.Survey.backFromFreeText()">戻る</button>
          <button class="btn btn-primary" onclick="App.Survey.submitResponse()">回答を送信する</button>
        </div>
      </div>
    `;
  };

  App.Survey.backFromFreeText = function(){
    const s = App.state.session;
    if(!s) return;
    const ta = document.getElementById('freeTextInput');
    if(ta) s.freeText = ta.value;
    s.idx = Math.max(0, s.pickOrderIds.length - 1);
    App.state.screen = 'survey';
    App.Survey.persistInProgress();
    App.render();
  };

  App.Survey.submitResponse = function(){
    const s = App.state.session;
    const ta = document.getElementById('freeTextInput');
    if(ta) s.freeText = ta.value;

    // 送信前チェック：すべてのピック × 評価語が回答済みか確認する
    for(let i = 0; i < s.pickOrderIds.length; i++){
      const pickId = s.pickOrderIds[i];
      const hasMissing = s.itemOrderIds.some(iid => s.answers[iid + '__' + pickId] == null);
      if(hasMissing){
        App.toast('未回答の項目があります。すべて回答してから送信してください。');
        s.idx = i;
        App.state.screen = 'survey';
        App.Survey.persistInProgress();
        App.render();
        return;
      }
    }

    const answers = Object.keys(s.answers).map(key => {
      const [itemId, pickId] = key.split('__');
      return {itemId, pickId, value: s.answers[key]};
    });

    const responseObj = {
      id: App.genId('resp'),
      subjectId: s.subjectId,
      role: s.role,
      timestamp: new Date().toISOString(),
      answers,
      freeText: s.freeText
    };
    App.state.responses.push(responseObj);
    App.storage.set(App.pkey(App.state.currentProjectId, 'responses'), App.state.responses);
    App.Survey.clearInProgress();
    App.state.session = null;
    App.state.homeSubjectId = '';
    App.state.homeRole = '';
    App.state.screen = 'thanks';
    App.render();

    // 送信と同時にCSVも保存する
    if(App.Admin && App.Admin.downloadCsv){
      App.Admin.downloadCsv();
    }
  };

  // ---------- 完了画面 ----------
  App.Survey.renderThanks = function(){
    return `
      <div class="spectrum"></div>
      <div class="thanks-wrap">
        <div class="thanks-mark">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6.5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h1 class="title" style="font-size:22px;">ありがとうございました。</h1>
        <p class="subtitle">回答を保存しました。</p>
        <button class="btn" onclick="App.Survey.backToHome()">トップへ戻る</button>
      </div>
    `;
  };

  App.Survey.backToHome = function(){
    App.state.screen = 'home';
    App.state.session = null;
    App.render();
  };

})(window.App);
