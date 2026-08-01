// report.js — レーダーチャート付きレポート画面（ブラウザの印刷機能でPDF保存）
(function(App){
  App.Report = {};

  function subjectSeries(response){
    const N = App.state.config.scale;
    const axes = App.state.items.map(it => it.left + '/' + it.right);
    const byPick = {};
    response.answers.forEach(a => {
      if(!byPick[a.pickId]) byPick[a.pickId] = [];
      byPick[a.pickId].push(a);
    });
    const series = [];
    App.state.picks.forEach((p, idx) => {
      const list = byPick[p.id];
      if(!list || list.length === 0) return;
      const values = App.state.items.map(it => {
        const found = list.find(a => a.itemId === it.id);
        return found ? found.value : null;
      });
      series.push({name: App.toPickLabel(idx+1), pid: p.id, actualName: p.actualName, color: App.COLORS[idx % App.COLORS.length], values});
    });
    return {axes, series, N};
  }

  function aggregateSeries(){
    const N = App.state.config.scale;
    const axes = App.state.items.map(it => it.left + '/' + it.right);
    const series = [];
    App.state.picks.forEach((p, idx) => {
      const values = App.state.items.map(it => {
        const vals = [];
        App.state.responses.forEach(r => {
          const a = r.answers.find(x => x.pickId === p.id && x.itemId === it.id);
          if(a) vals.push(a.value);
        });
        if(vals.length === 0) return null;
        return vals.reduce((a,b) => a+b, 0) / vals.length;
      });
      series.push({name: App.toPickLabel(idx+1), pid: p.id, actualName: p.actualName, color: App.COLORS[idx % App.COLORS.length], values});
    });
    return {axes, series, N};
  }

  App.Report.openSubjectReport = function(responseId){
    const r = App.state.responses.find(x => x.id === responseId);
    if(!r) return;
    const {axes, series, N} = subjectSeries(r);
    App.state.reportType = 'subject';
    App.state.reportData = {response:r, axes, series, N};
    App.state.reportSelectedPickIds = series.map(s => s.pid);
    App.state.screen = 'report';
    App.render();
  };

  App.Report.openAggregateReport = function(preselectedIds){
    if(App.state.responses.length === 0){ App.toast('まだ回答がありません'); return; }
    const {axes, series, N} = aggregateSeries();
    App.state.reportType = 'aggregate';
    App.state.reportData = {axes, series, N};
    App.state.reportSelectedPickIds = (preselectedIds && preselectedIds.length)
      ? series.filter(s => preselectedIds.includes(s.pid)).map(s => s.pid)
      : series.map(s => s.pid);
    App.state.screen = 'report';
    App.render();
  };

  App.Report.togglePick = function(pickId){
    const arr = App.state.reportSelectedPickIds;
    const idx = arr.indexOf(pickId);
    if(idx >= 0){
      if(arr.length === 1){ App.toast('少なくとも1つは選択してください'); return; }
      arr.splice(idx, 1);
    }else{
      arr.push(pickId);
    }
    App.render();
  };
  App.Report.selectOnlyPick = function(pickId){
    App.state.reportSelectedPickIds = [pickId];
    App.render();
  };
  App.Report.selectAllPicks = function(){
    App.state.reportSelectedPickIds = App.state.reportData.series.map(s => s.pid);
    App.render();
  };

  App.Report.close = function(){
    App.state.screen = 'admin';
    App.state.reportData = null;
    App.render();
  };

  App.Report.print = function(){ window.print(); };

  function buildTable(axes, series, isAggregate){
    const head = '<tr><th>評価語</th>' + series.map(s => '<th>'+App.esc(s.name)+'</th>').join('') + '</tr>';
    const body = axes.map((axisLabel, i) => {
      const cells = series.map(s => {
        const v = s.values[i];
        return '<td>' + (v == null ? '-' : (isAggregate ? v.toFixed(2) : v)) + '</td>';
      }).join('');
      return '<tr><td>'+App.esc(axisLabel)+'</td>'+cells+'</tr>';
    }).join('');
    return '<table class="report-table"><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
  }

  App.Report.render = function(){
    const d = App.state.reportData;
    if(!d) return '<div class="empty-note">レポートがありません。</div>';

    const selected = App.state.reportSelectedPickIds || d.series.map(s => s.pid);
    const filteredSeries = d.series.filter(s => selected.includes(s.pid));

    const toggles = d.series.map(s => {
      const checked = selected.includes(s.pid);
      return `<label class="pick-toggle">
        <input type="checkbox" ${checked?'checked':''} onchange="App.Report.togglePick('${s.pid}')">
        <span class="legend-swatch" style="background:${s.color}"></span>${App.esc(s.name)} ${App.esc(s.actualName)}
        <button type="button" class="link-btn" onclick="App.Report.selectOnlyPick('${s.pid}')">これだけ</button>
      </label>`;
    }).join('');
    const pickToggleBlock = `
      <div class="pick-toggle-list no-print">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="small-dim">表示するピック</span>
          <button type="button" class="link-btn" onclick="App.Report.selectAllPicks()">すべて表示</button>
        </div>
        ${toggles}
      </div>`;

    const chartsHtml = filteredSeries.length
      ? filteredSeries.map(s => `
          <div class="radar-tile">
            ${App.Chart.radarSVG({axes:d.axes, series:[s], min:1, max:d.N, size:230})}
            <div class="radar-tile-label"><span class="legend-swatch" style="background:${s.color}"></span>${App.esc(s.name)} ${App.esc(s.actualName)}</div>
          </div>
        `).join('')
      : '<div class="empty-note">表示するピックを選択してください。</div>';

    const title = App.state.reportType === 'subject'
      ? '被験者 ' + App.esc(d.response.subjectId) + '（' + App.esc(d.response.role) + '）の評価レポート'
      : '全体集計レポート（回答 ' + App.state.responses.length + ' 件・平均値）';

    const sub = App.state.reportType === 'subject'
      ? App.fmtDate(d.response.timestamp) + ' ・ プロジェクト: ' + App.esc(App.State.currentProjectName())
      : 'プロジェクト: ' + App.esc(App.State.currentProjectName()) + ' ・ 出力日: ' + App.fmtDate(new Date().toISOString());

    const pickLegend = App.state.picks.map((p, idx) =>
      '<div class="pick-legend-row"><span class="row-num">'+App.toPickLabel(idx+1)+'</span> '+App.esc(p.actualName)+'</div>'
    ).join('');

    const freeTextBlock = (App.state.reportType === 'subject' && d.response.freeText)
      ? '<div class="report-section-title">自由記述</div><div class="report-freetext">'+App.esc(d.response.freeText)+'</div>'
      : '';

    return `
      <div class="report-toolbar no-print">
        <button class="btn" onclick="App.Report.close()">← 管理画面に戻る</button>
        <button class="btn btn-primary" onclick="App.Report.print()">PDFとして保存（印刷）</button>
      </div>
      <div class="report-sheet">
        <div class="report-eyebrow">SD法 感性評価システム / 評価レポート</div>
        <h1 class="report-title">${title}</h1>
        <div class="report-sub">${sub}</div>
        ${pickToggleBlock}
        <div class="radar-grid report-chart">${chartsHtml}</div>
        ${filteredSeries.length ? buildTable(d.axes, filteredSeries, App.state.reportType === 'aggregate') : ''}
        <div class="report-section-title">ピック対応表（管理者用・被験者には非公開の情報です）</div>
        ${pickLegend}
        ${freeTextBlock}
      </div>
    `;
  };

})(window.App);
