// storage.js — localStorage の読み書きとバックアップ（エクスポート/インポート）
// ※ このアプリは配布・単体運用を想定し、ブラウザの localStorage にデータを保存します。
//    実験用PCのブラウザに保存されるため、別PCへ移す場合は「バックアップ」タブから
//    JSONファイルをエクスポート/インポートしてください。
(function(App){

  App.storage = {
    get(key, fallback){
      try{
        const raw = localStorage.getItem(key);
        if(raw == null) return fallback;
        return JSON.parse(raw);
      }catch(e){
        console.error('storage.get failed', key, e);
        return fallback;
      }
    },
    set(key, value){
      try{
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }catch(e){
        console.error('storage.set failed', key, e);
        App.toast('保存に失敗しました（ブラウザのストレージ容量を確認してください）');
        return false;
      }
    },
    remove(key){
      try{ localStorage.removeItem(key); }catch(e){}
    }
  };

  // プロジェクト単位のキーを作る
  App.pkey = function(projectId, name){
    return 'proj:' + projectId + ':' + name;
  };

  const APP_KEY_PREFIXES = ['proj:', 'projects', 'templates', 'currentProjectId'];
  function isAppKey(k){
    return APP_KEY_PREFIXES.some(p => k === p || k.startsWith(p));
  }

  App.exportBackup = function(){
    const data = {};
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && isAppKey(k)){
        try{ data[k] = JSON.parse(localStorage.getItem(k)); }catch(e){}
      }
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'sd-evaluation-system',
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sd_evaluation_backup_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  App.importBackup = function(file, callback){
    const reader = new FileReader();
    reader.onload = function(e){
      try{
        const payload = JSON.parse(e.target.result);
        const data = payload && payload.data ? payload.data : payload;
        if(!data || typeof data !== 'object') throw new Error('invalid format');
        if(!window.confirm('現在保存されているすべてのデータを、読み込んだバックアップで上書きします。よろしいですか？')){
          callback && callback(false);
          return;
        }
        Object.keys(data).forEach(k => {
          if(isAppKey(k)) localStorage.setItem(k, JSON.stringify(data[k]));
        });
        callback && callback(true);
      }catch(err){
        console.error(err);
        App.toast('読み込みに失敗しました（不正なファイルです）');
        callback && callback(false);
      }
    };
    reader.readAsText(file);
  };

})(window.App);
