// main.js — 起動処理と画面の出し分け（エントリーポイント）
(function(App){

  App.render = function(){
    const root = document.getElementById('root');
    if(!root) return;
    if(App.state.loading){
      root.innerHTML = '<div class="spectrum"></div><p class="small-dim" style="padding:24px;">読み込み中...</p>';
      return;
    }
    let html = '';
    switch(App.state.screen){
      case 'home': html = App.Survey.renderHome(); break;
      case 'instructions': html = App.Survey.renderInstructions(); break;
      case 'survey': html = App.Survey.renderSurvey(); break;
      case 'freeText': html = App.Survey.renderFreeText(); break;
      case 'thanks': html = App.Survey.renderThanks(); break;
      case 'admin': html = App.Admin.render(); break;
      case 'report': html = App.Report.render(); break;
      default: html = App.Survey.renderHome();
    }
    root.innerHTML = `<div id="rootInner">${html}</div>`;
    App.hydrateAudio();
  };

  function showAudioError(el, msg){
    if(el.parentNode && el.parentNode.querySelector('.audio-error')) return;
    const warn = document.createElement('div');
    warn.className = 'audio-error';
    warn.textContent = '⚠ ' + msg;
    el.insertAdjacentElement('afterend', warn);
    el.style.display = 'none';
  }

  App.hydrateAudio = function(){
    const els = document.querySelectorAll('audio[data-pick]');
    els.forEach(function(el){
      const pickId = el.getAttribute('data-pick');
      const cacheKey = App.state.currentProjectId + '::' + pickId;
      if(App.state.audioUrls[cacheKey]){
        if(el.getAttribute('src') !== App.state.audioUrls[cacheKey]) el.src = App.state.audioUrls[cacheKey];
        return;
      }
      if(!window.indexedDB){
        showAudioError(el, 'このブラウザ環境では音源機能が使えません（IndexedDB非対応）。');
        return;
      }
      App.Audio.get(cacheKey).then(function(blob){
        if(!blob){
          showAudioError(el, '音源データが見つかりません。管理画面で再アップロードしてください。');
          return;
        }
        const url = URL.createObjectURL(blob);
        App.state.audioUrls[cacheKey] = url;
        el.src = url;
      }).catch(function(e){
        console.error('audio load failed', e);
        showAudioError(el, '音源を読み込めませんでした。index.html を直接開いている場合は、簡易サーバー経由で開いてください（同梱のREADME参照）。');
      });
    });
  };

  App.boot = function(){
    App.State.ensureBootstrap();
    App.State.loadProject(App.state.currentProjectId);
    App.Survey.checkInProgress();
    App.state.loading = false;
    App.render();
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', App.boot);
  }else{
    App.boot();
  }

})(window.App);
