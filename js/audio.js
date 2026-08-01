// audio.js — ピックに紐づく音源ファイルの保存（IndexedDB。容量の大きい音声を扱うため localStorage は使わない）
(function(App){
  App.Audio = {};
  let dbPromise = null;

  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if(!window.indexedDB){ reject(new Error('IndexedDB not supported')); return; }
      const req = indexedDB.open('sd_audio_store', 1);
      req.onupgradeneeded = function(e){
        const db = e.target.result;
        if(!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      };
      req.onsuccess = function(e){ resolve(e.target.result); };
      req.onerror = function(e){ reject(e); };
    });
    return dbPromise;
  }

  App.Audio.key = function(projectId, pickId){ return projectId + '::' + pickId; };

  App.Audio.put = function(key, blob){
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    }));
  };

  App.Audio.get = function(key){
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('audio', 'readonly');
      const req = tx.objectStore('audio').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e);
    }));
  };

  App.Audio.delete = function(key){
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    }));
  };

})(window.App);
