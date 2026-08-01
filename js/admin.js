// admin.js — 管理画面のタブ群
(function(App){
  App.Admin = {};

  function navItem(key, label){
    return `<button class="${App.state.adminTab===key?'active':''}" onclick="App.state.adminTab='${key}';App.state.confirmDelete=null;App.render()">${label}</button>`;
  }

  App.Admin.render = function(){
    let content = '';
    switch(App.state.adminTab){
      case 'projects': content = App.Admin.renderProjectsTab(); break;
      case 'items': content = App.Admin.renderItemsTab(); break;
      case 'picks': content = App.Admin.renderPicksTab(); break;
      case 'settings': content = App.Admin.renderSettingsTab(); break;
      case 'responses': content = App.Admin.renderResponsesTab(); break;
      case 'aggregate': content = App.Admin.renderAggregateTab(); break;
      case 'csv': content = App.Admin.renderCsvTab(); break;
      case 'backup': content = App.Admin.renderBackupTab(); break;
      default: content = App.Admin.renderProjectsTab();
    }
    return `
      <div class="spectrum"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;flex-wrap:wrap;gap:10px;">
        <div>
          <div class="eyebrow" style="margin-bottom:0;">管理画面</div>
          <div class="small-dim" style="margin-top:4px;">現在のプロジェクト: ${App.esc(App.State.currentProjectName())}</div>
        </div>
        <button class="btn btn-sm" onclick="App.state.screen='home';App.state.confirmDelete=null;App.render()">被験者画面に戻る</button>
      </div>
      <div class="admin-shell">
        <div class="admin-nav">
          ${navItem('projects','プロジェクト')}
          ${navItem('items','評価項目')}
          ${navItem('picks','ピック設定')}
          ${navItem('settings','実験設定')}
          ${navItem('responses','回答確認')}
          ${navItem('aggregate','集計')}
          ${navItem('csv','CSVダウンロード')}
          ${navItem('backup','バックアップ')}
        </div>
        <div class="admin-main"><div class="card">${content}</div></div>
      </div>
    `;
  };

  // ============ プロジェクト ============
  App.Admin.renderProjectsTab = function(){
    const rows = App.state.projects.map(p => {
      const active = p.id === App.state.currentProjectId;
      return `
        <div class="row-item">
          <div class="row-main">
            <span class="pair">${App.esc(p.name)}</span>
            ${active ? '<span class="small-dim" style="margin-left:8px;">（選択中）</span>' : ''}
          </div>
          <div class="row-actions">
            ${!active ? `<button class="btn btn-sm" onclick="App.State.switchProject('${p.id}')">選択</button>` : ''}
            <button class="icon-btn" title="名前を変更" onclick="App.State.renameProject('${p.id}')">✎</button>
            <button class="icon-btn danger" title="削除" onclick="App.State.deleteProject('${p.id}')">✕</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="eyebrow">実験プロジェクト管理</div>
      <p class="subtitle">実験ごとに評価項目・ピック・回答をまとめて分けて管理できます（例：2026年9月 本実験 / 2026年8月 予備実験）。</p>
      ${rows}
      <button class="btn" style="margin-top:10px;" onclick="App.State.createProject()">＋新しいプロジェクトを作成</button>
    `;
  };

  // ============ 評価項目 ============
  App.Admin.renderItemsTab = function(){
    let rows = App.state.items.map((it, idx) => {
      if(App.state.editingItemId === it.id){
        return `
        <div class="row-item">
          <div class="row-num">${idx+1}</div>
          <div class="row-main">
            <div class="inline-form">
              <input type="text" id="editLeft_${it.id}" value="${App.esc(it.left)}" placeholder="左側の言葉">
              <span class="small-dim">⇔</span>
              <input type="text" id="editRight_${it.id}" value="${App.esc(it.right)}" placeholder="反対語">
            </div>
          </div>
          <div class="row-actions">
            <button class="btn btn-sm btn-primary" onclick="App.Admin.saveItem('${it.id}')">保存</button>
            <button class="btn btn-sm" onclick="App.state.editingItemId=null;App.render()">取消</button>
          </div>
        </div>`;
      }
      if(App.state.confirmDelete && App.state.confirmDelete.type==='item' && App.state.confirmDelete.id===it.id){
        return `
        <div class="row-item">
          <div class="row-num">${idx+1}</div>
          <div class="row-main confirm-row"><span class="confirm-text">この項目を削除しますか？</span></div>
          <div class="row-actions">
            <button class="btn btn-sm btn-danger" onclick="App.Admin.confirmDeleteItem('${it.id}')">削除する</button>
            <button class="btn btn-sm" onclick="App.state.confirmDelete=null;App.render()">キャンセル</button>
          </div>
        </div>`;
      }
      const showP = it.showPerformer !== false;
      const showL = it.showListener !== false;
      return `
        <div class="row-item">
          <div class="row-num">${idx+1}</div>
          <div class="row-main">
            <span class="pair">${App.esc(it.left)}</span><span class="arrow">⇔</span><span class="pair">${App.esc(it.right)}</span>
            <div class="role-chips">
              <span class="role-chip ${showP?'on':'off'}" onclick="App.Admin.toggleItemRole('${it.id}','showPerformer')">演奏者${showP?'':'（非表示）'}</span>
              <span class="role-chip ${showL?'on':'off'}" onclick="App.Admin.toggleItemRole('${it.id}','showListener')">聴取者${showL?'':'（非表示）'}</span>
            </div>
          </div>
          <div class="row-actions">
            <button class="icon-btn" title="上へ" onclick="App.Admin.moveItem('${it.id}',-1)">↑</button>
            <button class="icon-btn" title="下へ" onclick="App.Admin.moveItem('${it.id}',1)">↓</button>
            <button class="icon-btn" title="編集" onclick="App.state.editingItemId='${it.id}';App.render()">✎</button>
            <button class="icon-btn danger" title="削除" onclick="App.state.confirmDelete={type:'item',id:'${it.id}'};App.render()">✕</button>
          </div>
        </div>`;
    }).join('');
    if(App.state.items.length === 0) rows = '<div class="empty-note">評価項目がありません。追加するか、テンプレートを適用してください。</div>';

    const addForm = App.state.addingItem ? `
      <div class="row-item">
        <div class="row-num">+</div>
        <div class="row-main">
          <div class="inline-form">
            <input type="text" id="newItemLeft" placeholder="例）シャリっとした">
            <span class="small-dim">⇔</span>
            <input type="text" id="newItemRight" placeholder="例）なめらか">
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-sm btn-primary" onclick="App.Admin.addItem()">追加</button>
          <button class="btn btn-sm" onclick="App.state.addingItem=false;App.render()">取消</button>
        </div>
      </div>` : '';

    const templateOptions = App.state.templates.map(t => `<option value="${t.id}">${App.esc(t.name)}</option>`).join('');
    const templateBlock = `
      <div class="divider"></div>
      <div class="settings-group" style="margin-bottom:0;">
        <h3>評価項目テンプレート</h3>
        <p class="small-dim" style="margin:0 0 10px;line-height:1.7;">よく使う項目セットを保存し、他のプロジェクトでもワンクリックで使い回せます。</p>
        <div class="inline-form">
          <select id="templateSelect" ${App.state.templates.length===0?'disabled':''} style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:9px;padding:11px 12px;">
            ${App.state.templates.length===0 ? '<option>（テンプレートがありません）</option>' : templateOptions}
          </select>
          <button class="btn btn-sm" ${App.state.templates.length===0?'disabled':''} onclick="App.Admin.applySelectedTemplate()">適用</button>
          <button class="btn btn-sm" ${App.state.templates.length===0?'disabled':''} onclick="App.Admin.deleteSelectedTemplate()">削除</button>
        </div>
        <div style="height:10px"></div>
        <button class="btn btn-sm" onclick="App.State.saveAsTemplate()">現在の項目をテンプレートとして保存</button>
      </div>
    `;

    return `
      <div class="admin-topbar">
        <div>
          <div class="eyebrow">評価項目編集</div>
          <p class="subtitle" style="margin-bottom:0;">SD法で使う形容詞対を管理します。編集ボタンひとつで文言を差し替えられます。「演奏者」「聴取者」チップをクリックすると、その立場の被験者にこの項目を表示するかどうかを切り替えられます。</p>
        </div>
      </div>
      ${rows}
      ${addForm}
      ${!App.state.addingItem ? `<button class="btn" style="margin-top:6px;" onclick="App.state.addingItem=true;App.render()">＋追加</button>` : ''}
      ${templateBlock}
    `;
  };

  App.Admin.addItem = function(){
    const l = document.getElementById('newItemLeft').value.trim();
    const r = document.getElementById('newItemRight').value.trim();
    if(!l || !r){ App.toast('両方の言葉を入力してください'); return; }
    App.state.items.push({id:App.genId('item'), left:l, right:r, showPerformer:true, showListener:true});
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.state.addingItem = false;
    App.toast('評価項目を追加しました');
    App.render();
  };
  App.Admin.toggleItemRole = function(id, field){
    const it = App.state.items.find(x => x.id === id);
    if(!it) return;
    if(it[field] === undefined) it[field] = true;
    const other = field === 'showPerformer' ? 'showListener' : 'showPerformer';
    const otherVal = it[other] !== false;
    if(it[field] !== false && !otherVal){
      App.toast('少なくとも一方の立場には表示してください');
      return;
    }
    it[field] = it[field] === false ? true : false;
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.render();
  };
  App.Admin.saveItem = function(id){
    const l = document.getElementById('editLeft_'+id).value.trim();
    const r = document.getElementById('editRight_'+id).value.trim();
    if(!l || !r){ App.toast('両方の言葉を入力してください'); return; }
    const it = App.state.items.find(x => x.id === id);
    it.left = l; it.right = r;
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.state.editingItemId = null;
    App.toast('更新しました');
    App.render();
  };
  App.Admin.confirmDeleteItem = function(id){
    App.state.items = App.state.items.filter(x => x.id !== id);
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.state.confirmDelete = null;
    App.toast('削除しました');
    App.render();
  };
  App.Admin.moveItem = function(id, dir){
    const idx = App.state.items.findIndex(x => x.id === id);
    const swapIdx = idx + dir;
    if(swapIdx < 0 || swapIdx >= App.state.items.length) return;
    [App.state.items[idx], App.state.items[swapIdx]] = [App.state.items[swapIdx], App.state.items[idx]];
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.render();
  };
  App.Admin.applySelectedTemplate = function(){
    const sel = document.getElementById('templateSelect');
    if(!sel || !sel.value) return;
    App.State.applyTemplate(sel.value);
  };
  App.Admin.deleteSelectedTemplate = function(){
    const sel = document.getElementById('templateSelect');
    if(!sel || !sel.value) return;
    App.State.deleteTemplate(sel.value);
  };

  // ============ ピック設定 ============
  App.Admin.renderPicksTab = function(){
    let rows = App.state.picks.map((p, idx) => {
      const label = App.toPickLabel(idx+1);
      if(App.state.editingPickId === p.id){
        return `
        <div class="row-item">
          <div class="row-num">${label}</div>
          <div class="row-main"><input type="text" id="editPickName_${p.id}" value="${App.esc(p.actualName)}" placeholder="材質名"></div>
          <div class="row-actions">
            <button class="btn btn-sm btn-primary" onclick="App.Admin.savePick('${p.id}')">保存</button>
            <button class="btn btn-sm" onclick="App.state.editingPickId=null;App.render()">取消</button>
          </div>
        </div>`;
      }
      if(App.state.confirmDelete && App.state.confirmDelete.type==='pick' && App.state.confirmDelete.id===p.id){
        return `
        <div class="row-item">
          <div class="row-num">${label}</div>
          <div class="row-main confirm-row"><span class="confirm-text">このピックを削除しますか？</span></div>
          <div class="row-actions">
            <button class="btn btn-sm btn-danger" onclick="App.Admin.confirmDeletePick('${p.id}')">削除する</button>
            <button class="btn btn-sm" onclick="App.state.confirmDelete=null;App.render()">キャンセル</button>
          </div>
        </div>`;
      }
      const audioBlock = p.audioName ? `
        <div class="audio-block">
          <audio controls data-pick="${p.id}" style="width:100%;height:32px;"></audio>
          <div class="small-dim" style="margin-top:4px;">${App.esc(p.audioName)} <button type="button" class="link-btn" onclick="App.Admin.removeAudio('${p.id}')">削除</button></div>
        </div>` : `
        <div class="audio-block">
          <label class="link-btn" style="cursor:pointer;">＋音源を追加
            <input type="file" accept="audio/*" style="display:none" onchange="App.Admin.handleAudioUpload('${p.id}', this)">
          </label>
        </div>`;
      return `
        <div class="row-item">
          <div class="row-num">${label}</div>
          <div class="row-main">
            <span class="pair">${App.esc(p.actualName)}</span>
            ${audioBlock}
          </div>
          <div class="row-actions">
            <button class="icon-btn" title="上へ（再生順・表示順も変わります）" onclick="App.Admin.movePick('${p.id}',-1)">↑</button>
            <button class="icon-btn" title="下へ（再生順・表示順も変わります）" onclick="App.Admin.movePick('${p.id}',1)">↓</button>
            <button class="icon-btn" title="編集" onclick="App.state.editingPickId='${p.id}';App.render()">✎</button>
            <button class="icon-btn danger" title="削除" onclick="App.state.confirmDelete={type:'pick',id:'${p.id}'};App.render()">✕</button>
          </div>
        </div>`;
    }).join('');
    if(App.state.picks.length === 0) rows = '<div class="empty-note">ピックが登録されていません。追加してください。</div>';

    const addForm = App.state.addingPick ? `
      <div class="row-item">
        <div class="row-num">+</div>
        <div class="row-main"><input type="text" id="newPickName" placeholder="例）チタン"></div>
        <div class="row-actions">
          <button class="btn btn-sm btn-primary" onclick="App.Admin.addPick()">追加</button>
          <button class="btn btn-sm" onclick="App.state.addingPick=false;App.render()">取消</button>
        </div>
      </div>` : '';

    return `
      <div class="admin-topbar">
        <div>
          <div class="eyebrow">ピック設定</div>
          <p class="subtitle" style="margin-bottom:0;">被験者にはアルファベット表記（A・B・C…）のみが表示されます。実際の材質名は管理者だけが確認できます。並び順（↑↓）が、被験者に提示されるアルファベットの割り当てと、音源の再生順の両方になります。聴取者向けに音源を添付できます。</p>
        </div>
      </div>
      ${rows}
      ${addForm}
      ${!App.state.addingPick ? `<button class="btn" style="margin-top:6px;" onclick="App.state.addingPick=true;App.render()">＋追加</button>` : ''}
    `;
  };

  App.Admin.handleAudioUpload = function(pickId, input){
    const file = input.files[0];
    if(!file) return;
    const key = App.Audio.key(App.state.currentProjectId, pickId);
    App.Audio.put(key, file).then(function(){
      const p = App.state.picks.find(x => x.id === pickId);
      if(p) p.audioName = file.name;
      App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
      delete App.state.audioUrls[key];
      App.toast('音源を保存しました');
      App.render();
    }).catch(function(e){
      console.error(e);
      App.toast('音源の保存に失敗しました');
    });
  };
  App.Admin.removeAudio = function(pickId){
    if(!window.confirm('この音源を削除しますか？')) return;
    const key = App.Audio.key(App.state.currentProjectId, pickId);
    App.Audio.delete(key).then(function(){
      const p = App.state.picks.find(x => x.id === pickId);
      if(p) delete p.audioName;
      App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
      delete App.state.audioUrls[key];
      App.toast('削除しました');
      App.render();
    }).catch(function(e){
      console.error(e);
      App.toast('削除に失敗しました');
    });
  };

  App.Admin.addPick = function(){
    const n = document.getElementById('newPickName').value.trim();
    if(!n){ App.toast('材質名を入力してください'); return; }
    App.state.picks.push({id:App.genId('pick'), actualName:n});
    App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
    App.state.addingPick = false;
    App.toast('ピックを追加しました');
    App.render();
  };
  App.Admin.savePick = function(id){
    const n = document.getElementById('editPickName_'+id).value.trim();
    if(!n){ App.toast('材質名を入力してください'); return; }
    const p = App.state.picks.find(x => x.id === id);
    p.actualName = n;
    App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
    App.state.editingPickId = null;
    App.toast('更新しました');
    App.render();
  };
  App.Admin.confirmDeletePick = function(id){
    App.state.picks = App.state.picks.filter(x => x.id !== id);
    App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
    App.state.confirmDelete = null;
    App.toast('削除しました');
    App.render();
  };
  App.Admin.movePick = function(id, dir){
    const idx = App.state.picks.findIndex(x => x.id === id);
    const swapIdx = idx + dir;
    if(swapIdx < 0 || swapIdx >= App.state.picks.length) return;
    [App.state.picks[idx], App.state.picks[swapIdx]] = [App.state.picks[swapIdx], App.state.picks[idx]];
    App.storage.set(App.pkey(App.state.currentProjectId,'picks'), App.state.picks);
    App.render();
  };

  // ============ 実験設定 ============
  function radioGroup(options, current, onChangeFn){
    return `<div class="radio-row">` + options.map(o => `
      <div class="radio-opt ${String(current)===String(o.value)?'selected':''}" onclick="App.Admin.${onChangeFn}('${o.value}')">${o.label}</div>
    `).join('') + `</div>`;
  }

  App.Admin.renderSettingsTab = function(){
    const c = App.state.config;
    return `
      <div class="eyebrow">実験設定</div>
      <p class="subtitle">回答バイアスを減らすための表示順を設定します。</p>
      <div class="settings-group">
        <h3>SD法 段階</h3>
        ${radioGroup([{value:7,label:'7段階'},{value:5,label:'5段階'}], c.scale, 'updateScale')}
      </div>
      <div class="settings-group">
        <h3>ピックの提示順（評価画面の順番・音源の再生順）</h3>
        ${radioGroup([{value:'fixed',label:'固定'},{value:'random',label:'ランダム'}], c.pickOrder, 'updatePickOrder')}
      </div>
      <div class="settings-group">
        <h3>評価語の提示順（各ピック画面内での並び順）</h3>
        ${radioGroup([{value:'fixed',label:'固定'},{value:'random',label:'ランダム'}], c.itemOrder, 'updateItemOrder')}
      </div>
      <div class="settings-group">
        <h3>左右の入れ替え</h3>
        ${radioGroup([{value:'fixed',label:'固定'},{value:'random',label:'ランダム'}], c.leftRight, 'updateLeftRight')}
        <p class="small-dim" style="margin-top:10px;line-height:1.7;">例）「鋭い ── 丸い」が、次の被験者では「丸い ── 鋭い」のように左右反転します（同一被験者内では固定）。集計時の値は常に元の並び基準に変換して保存されます。</p>
      </div>
      <div class="divider"></div>
      <div class="settings-group" style="margin-bottom:0;">
        <h3>説明ページの文章</h3>
        <p class="small-dim" style="margin:0 0 10px;line-height:1.7;">被験者が評価を始める前に表示される説明文です。素材への先入観を持たないよう促す文言など、実験内容に応じて自由に編集できます。</p>
        <textarea id="instructionsTextarea" style="min-height:170px;">${App.esc(c.instructionsText || '')}</textarea>
        <div style="height:10px"></div>
        <button class="btn btn-sm btn-primary" onclick="App.Admin.saveInstructions()">保存</button>
      </div>
    `;
  };
  App.Admin.saveInstructions = function(){
    const ta = document.getElementById('instructionsTextarea');
    if(!ta) return;
    App.state.config.instructionsText = ta.value;
    App.storage.set(App.pkey(App.state.currentProjectId,'config'), App.state.config);
    App.toast('説明文を保存しました');
  };
  App.Admin.updateScale = function(v){ App.Admin.updateConfig('scale', Number(v)); };
  App.Admin.updatePickOrder = function(v){ App.Admin.updateConfig('pickOrder', v); };
  App.Admin.updateItemOrder = function(v){ App.Admin.updateConfig('itemOrder', v); };
  App.Admin.updateLeftRight = function(v){ App.Admin.updateConfig('leftRight', v); };
  App.Admin.updateConfig = function(key, value){
    App.state.config[key] = value;
    App.storage.set(App.pkey(App.state.currentProjectId,'config'), App.state.config);
    App.toast('設定を保存しました');
    App.render();
  };

  // ============ 回答確認 ============
  App.Admin.renderResponsesTab = function(){
    if(App.state.responses.length === 0){
      return `
        <div class="eyebrow">回答確認</div>
        <p class="subtitle">まだ回答がありません。</p>
        <div class="empty-note">評価が送信されるとここに表示されます。</div>
      `;
    }
    const items = App.state.responses.slice().reverse().map(r => {
      const expanded = App.state.expandedResponseId === r.id;
      let body = '';
      if(expanded){
        const byPick = {};
        r.answers.forEach(a => {
          if(!byPick[a.pickId]) byPick[a.pickId] = [];
          byPick[a.pickId].push(a);
        });
        let tableRows = '';
        Object.keys(byPick).forEach(pickId => {
          const pIdx = App.state.picks.findIndex(p => p.id === pickId);
          const pickLabel = pIdx >= 0 ? App.toPickLabel(pIdx+1) : '(削除済み)';
          byPick[pickId].forEach(a => {
            const item = App.state.items.find(i => i.id === a.itemId);
            tableRows += `<tr><td>${pickLabel}</td><td>${item ? App.esc(item.left)+' ⇔ '+App.esc(item.right) : '(削除済み)'}</td><td class="val">${a.value}</td></tr>`;
          });
        });
        body = `
          <div class="resp-body">
            <table class="score-table"><thead><tr><th>ピック</th><th>評価語</th><th>値</th></tr></thead><tbody>${tableRows}</tbody></table>
            ${r.freeText ? `<div class="freetext-box">${App.esc(r.freeText)}</div>` : ''}
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();App.Report.openSubjectReport('${r.id}')">レポートを出力（PDF）</button>
              ${App.state.confirmDelete && App.state.confirmDelete.type==='response' && App.state.confirmDelete.id===r.id ? `
                <span class="confirm-text">この回答を削除しますか？</span>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();App.Admin.confirmDeleteResponse('${r.id}')">削除する</button>
                <button class="btn btn-sm" onclick="event.stopPropagation();App.state.confirmDelete=null;App.render()">キャンセル</button>
              ` : `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();App.state.confirmDelete={type:'response',id:'${r.id}'};App.render()">この回答を削除</button>`}
            </div>
          </div>`;
      }
      return `
        <div class="resp-item">
          <div class="resp-head" onclick="App.Admin.toggleResponse('${r.id}')">
            <div>
              <div class="resp-id">被験者 ${App.esc(r.subjectId)} <span class="small-dim">（${App.esc(r.role)}）</span></div>
              <div class="resp-meta">${App.fmtDate(r.timestamp)} ・ 回答 ${r.answers.length}件</div>
            </div>
            <div class="small-dim">${expanded ? '閉じる ▲' : '詳細 ▼'}</div>
          </div>
          ${body}
        </div>`;
    }).join('');

    return `
      <div class="eyebrow">回答確認</div>
      <p class="subtitle">全 ${App.state.responses.length} 件の回答。クリックで詳細を表示します。</p>
      ${items}
    `;
  };
  App.Admin.toggleResponse = function(id){
    App.state.expandedResponseId = (App.state.expandedResponseId === id) ? null : id;
    App.render();
  };
  App.Admin.confirmDeleteResponse = function(id){
    App.state.responses = App.state.responses.filter(x => x.id !== id);
    App.storage.set(App.pkey(App.state.currentProjectId,'responses'), App.state.responses);
    App.state.confirmDelete = null;
    App.toast('回答を削除しました');
    App.render();
  };

  // ============ 集計（リアルタイム） ============
  App.Admin.renderAggregateTab = function(){
    if(App.state.responses.length === 0){
      return `
        <div class="eyebrow">集計</div>
        <p class="subtitle">まだ回答がありません。回答が集まると、ここに平均値のレーダーチャートが表示されます。</p>
        <div class="empty-note">データがありません。</div>
      `;
    }
    if(App.state.items.length < 3){
      return `<div class="eyebrow">集計</div><p class="subtitle">レーダーチャートの表示には評価項目が3つ以上必要です。</p>`;
    }
    const axes = App.state.items.map(it => it.left + '/' + it.right);
    const allSeries = App.state.picks.map((p, idx) => {
      const values = App.state.items.map(it => {
        const vals = [];
        App.state.responses.forEach(r => {
          const a = r.answers.find(x => x.pickId === p.id && x.itemId === it.id);
          if(a) vals.push(a.value);
        });
        if(vals.length === 0) return null;
        return vals.reduce((a,b) => a+b, 0) / vals.length;
      });
      return {name: App.toPickLabel(idx+1), pid: p.id, actualName: p.actualName, color: App.COLORS[idx % App.COLORS.length], values};
    });

    if(App.state.aggregateSelectedPickIds == null || App.state.aggregateSelectedPickIds.length === 0){
      App.state.aggregateSelectedPickIds = allSeries.map(s => s.pid);
    }
    const selectedIds = App.state.aggregateSelectedPickIds.filter(id => allSeries.some(s => s.pid === id));
    App.state.aggregateSelectedPickIds = selectedIds.length ? selectedIds : allSeries.map(s => s.pid);

    const series = allSeries.filter(s => App.state.aggregateSelectedPickIds.includes(s.pid));
    const chartsHtml = series.length ? series.map(s => `
      <div class="radar-tile">
        ${App.Chart.radarSVG({axes, series:[s], min:1, max:App.state.config.scale, size:220})}
        <div class="radar-tile-label"><span class="legend-swatch" style="background:${s.color}"></span>${App.esc(s.name)} ${App.esc(s.actualName)}</div>
      </div>
    `).join('') : '<div class="empty-note">表示するピックを選択してください。</div>';

    const toggles = allSeries.map(s => {
      const checked = App.state.aggregateSelectedPickIds.includes(s.pid);
      return `<label class="pick-toggle">
        <input type="checkbox" ${checked?'checked':''} onchange="App.Admin.toggleAggregatePick('${s.pid}')">
        <span class="legend-swatch" style="background:${s.color}"></span>${App.esc(s.name)} ${App.esc(s.actualName)}
        <button type="button" class="link-btn" onclick="App.Admin.selectOnlyAggregatePick('${s.pid}')">これだけ</button>
      </label>`;
    }).join('');

    return `
      <div class="eyebrow">集計（リアルタイム）</div>
      <p class="subtitle">全 ${App.state.responses.length} 件の回答から算出した、ピックごとの平均値です。重なって見にくくならないよう、ピックごとに分けて表示しています。</p>
      <div class="pick-toggle-list">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="small-dim">表示するピック</span>
          <button type="button" class="link-btn" onclick="App.Admin.selectAllAggregatePicks()">すべて表示</button>
        </div>
        ${toggles}
      </div>
      <div class="radar-grid">${chartsHtml}</div>
      <div style="height:16px"></div>
      <button class="btn btn-primary" onclick="App.Report.openAggregateReport(App.state.aggregateSelectedPickIds)">全体レポートを出力（PDF）</button>
    `;
  };
  App.Admin.toggleAggregatePick = function(pickId){
    const arr = App.state.aggregateSelectedPickIds || App.state.picks.map(p => p.id);
    const idx = arr.indexOf(pickId);
    if(idx >= 0){
      if(arr.length === 1){ App.toast('少なくとも1つは選択してください'); return; }
      arr.splice(idx, 1);
    }else{
      arr.push(pickId);
    }
    App.state.aggregateSelectedPickIds = arr;
    App.render();
  };
  App.Admin.selectOnlyAggregatePick = function(pickId){
    App.state.aggregateSelectedPickIds = [pickId];
    App.render();
  };
  App.Admin.selectAllAggregatePicks = function(){
    App.state.aggregateSelectedPickIds = App.state.picks.map(p => p.id);
    App.render();
  };

  // ============ CSV ============
  App.Admin.buildCsv = function(){
    const rows = [['被験者番号','役割','ピック番号','評価語','値','日時']];
    App.state.responses.forEach(r => {
      r.answers.forEach(a => {
        const pIdx = App.state.picks.findIndex(p => p.id === a.pickId);
        const item = App.state.items.find(i => i.id === a.itemId);
        const pickLabel = pIdx >= 0 ? App.toPickLabel(pIdx+1) : '(削除済み)';
        const itemLabel = item ? (item.left + '⇔' + item.right) : '(削除済み)';
        rows.push([r.subjectId, r.role, pickLabel, itemLabel, a.value, App.fmtDate(r.timestamp)]);
      });
      rows.push([r.subjectId, r.role, '-', '自由記述', r.freeText || '', App.fmtDate(r.timestamp)]);
    });
    return rows.map(row => row.map(App.csvField).join(',')).join('\r\n');
  };

  App.Admin.renderCsvTab = function(){
    const preview = App.state.responses.length ? App.Admin.buildCsv().split('\r\n').slice(0,8).join('\n') : '（回答がまだありません）';
    return `
      <div class="eyebrow">CSVダウンロード</div>
      <p class="subtitle">現在のプロジェクトの全回答をCSV形式（Excel対応）で書き出します。</p>
      <div class="csv-preview">${App.esc(preview)}${App.state.responses.length>8 ? '\n...' : ''}</div>
      <div style="height:18px"></div>
      <button class="btn btn-primary btn-block" onclick="App.Admin.downloadCsv()">CSVダウンロード</button>
    `;
  };
  App.Admin.downloadCsv = function(){
    if(App.state.responses.length === 0){ App.toast('まだ回答がありません'); return; }
    const csv = '\uFEFF' + App.Admin.buildCsv();
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = App.State.currentProjectName().replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF-]/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    App.toast('CSVをダウンロードしました');
  };

  // ============ バックアップ ============
  App.Admin.renderBackupTab = function(){
    return `
      <div class="eyebrow">バックアップ</div>
      <p class="subtitle">データはこのブラウザ内（localStorage）に保存されています。別のPCへ移す場合や、実験終了後の保管には、ここからバックアップファイルを書き出してください。</p>
      <button class="btn btn-primary btn-block" onclick="App.exportBackup()">バックアップをダウンロード（全プロジェクト）</button>
      <div class="divider"></div>
      <label class="field-label">バックアップファイルを読み込む（現在のデータは上書きされます）</label>
      <input type="file" id="importFileInput" accept=".json" onchange="App.Admin.handleImport(this)">
    `;
  };
  App.Admin.handleImport = function(input){
    const file = input.files[0];
    if(!file) return;
    App.importBackup(file, function(ok){
      if(ok){
        App.toast('読み込みました。再読み込みします。');
        setTimeout(() => location.reload(), 800);
      }
    });
  };

})(window.App);
