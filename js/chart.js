// chart.js — 外部ライブラリなしのSVGレーダーチャート（オフライン環境でも動作）
(function(App){
  App.Chart = {};

  function polarPoint(cx, cy, r, angle){
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // opts: { axes:[string], series:[{name,color,values:[number|null]}], min, max, size }
  App.Chart.radarSVG = function(opts){
    const axes = opts.axes || [];
    const series = opts.series || [];
    const min = opts.min != null ? opts.min : 1;
    const max = opts.max;
    const size = opts.size || 380;
    const cx = size / 2, cy = size / 2;
    const margin = opts.margin || Math.round(size * 0.26);
    const radius = size / 2 - margin;
    const n = axes.length;

    if(n < 3){
      return '<div class="empty-note">評価項目が3つ未満のため、レーダーチャートは表示できません。</div>';
    }

    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    let grid = '';
    const levels = 4;
    for(let lvl = 1; lvl <= levels; lvl++){
      const r = radius * (lvl / levels);
      const pts = [];
      for(let i = 0; i < n; i++){
        pts.push(polarPoint(cx, cy, r, startAngle + i * angleStep).join(','));
      }
      grid += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--grid-line,#3a4a66)" stroke-width="1" opacity="' + (lvl===levels?0.7:0.32) + '"/>';
    }

    let axisLines = '';
    let axisLabels = '';
    for(let i = 0; i < n; i++){
      const a = startAngle + i * angleStep;
      const [x2, y2] = polarPoint(cx, cy, radius, a);
      axisLines += '<line x1="'+cx+'" y1="'+cy+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--grid-line,#3a4a66)" stroke-width="1" opacity="0.5"/>';
      const [lx, ly] = polarPoint(cx, cy, radius + 24, a);
      let anchor = 'middle';
      if(Math.cos(a) > 0.35) anchor = 'start';
      else if(Math.cos(a) < -0.35) anchor = 'end';
      axisLabels += '<text x="'+lx+'" y="'+ly+'" text-anchor="'+anchor+'" dominant-baseline="middle" font-size="11" fill="var(--axis-label,#20304a)" font-family="var(--font-mono, monospace)">'+App.esc(axes[i])+'</text>';
    }

    let seriesSvg = '';
    series.forEach(s => {
      const pts = s.values.map((v, i) => {
        const a = startAngle + i * angleStep;
        const val = (v == null) ? min : v;
        const rr = radius * Math.max(0, Math.min(1, (val - min) / (max - min)));
        return polarPoint(cx, cy, rr, a).join(',');
      });
      seriesSvg += '<polygon points="'+pts.join(' ')+'" fill="'+s.color+'" fill-opacity="0.13" stroke="'+s.color+'" stroke-width="2.3"/>';
      s.values.forEach((v, i) => {
        if(v == null) return;
        const a = startAngle + i * angleStep;
        const rr = radius * Math.max(0, Math.min(1, (v - min) / (max - min)));
        const [px, py] = polarPoint(cx, cy, rr, a);
        seriesSvg += '<circle cx="'+px+'" cy="'+py+'" r="3.2" fill="'+s.color+'"/>';
      });
    });

    const pad = 50;
    return '<svg viewBox="'+(-pad)+' 0 '+(size+pad*2)+' '+size+'" width="100%" style="max-width:'+(size+pad*2)+'px;display:block;margin:0 auto;" role="img">'
      + grid + axisLines + seriesSvg + axisLabels + '</svg>';
  };

  // 片側の評価語（左の語）を軸にするため、値を反転（外側ほど左の語に近い）
  App.Chart.flip = function(s, N){
    return Object.assign({}, s, {values: s.values.map(v => v == null ? null : N + 1 - v)});
  };
  App.Chart.axisWords = function(){
    return App.state.items.map(it => it.left);
  };

  App.Chart.legendHTML = function(series){
    return '<div class="chart-legend">' + series.map(s =>
      '<div class="legend-item"><span class="legend-swatch" style="background:'+s.color+'"></span>'+App.esc(s.name)+'</div>'
    ).join('') + '</div>';
  };

})(window.App);
