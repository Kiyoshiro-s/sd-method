// utils.js — 共通ユーティリティ関数
window.App = window.App || {};

(function(App){
  App.esc = function(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  App.genId = function(prefix){
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  };

  App.toCircled = function(n){
    if(n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
    return '(' + n + ')';
  };

  // ピック識別用：1→A, 2→B, ... 26→Z, 27→AA ... のアルファベット表記
  App.toPickLabel = function(n){
    let s = '';
    let num = n;
    while(num > 0){
      num--;
      s = String.fromCharCode(65 + (num % 26)) + s;
      num = Math.floor(num / 26);
    }
    return s;
  };

  App.shuffle = function(arr){
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  App.fmtDate = function(iso){
    try{
      const d = new Date(iso);
      return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0') + ' ' +
        String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }catch(e){ return iso; }
  };

  App.csvField = function(v){
    const s = String(v == null ? '' : v);
    if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };

  App.debounce = function(fn, wait){
    let t = null;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  App.toast = function(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(App.__toastTimer);
    App.__toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  };

  // ピック識別用の固定パレット（最大8色分を想定、超える場合は循環）
  App.COLORS = ['#8FE3E0','#E3B98F','#E38F8F','#9FE38F','#C79FE3','#E3D98F','#8FB3E3','#E38FC7'];
})(window.App);
