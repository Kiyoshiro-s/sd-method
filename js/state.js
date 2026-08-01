// state.js — アプリの状態、プロジェクト管理、テンプレート管理
(function(App){

  App.state = {
    screen: 'home',       // home | instructions | survey | freeText | thanks | admin | report
    loading: true,

    projects: [],
    currentProjectId: null,
    templates: [],

    config: null,
    items: [],
    picks: [],
    responses: [],
    audioUrls: {},

    session: null,
    inProgressInfo: null,

    homeSubjectId: '',
    homeRole: '',

    adminTab: 'projects',
    addingItem: false,
    addingPick: false,
    editingItemId: null,
    editingPickId: null,
    confirmDelete: null,   // {type:'item'|'pick'|'response', id}
    expandedResponseId: null,

    reportType: null,      // 'subject' | 'aggregate'
    reportData: null
  };

  App.State = {};

  function defaultItems(){
    return [
      {id:App.genId('item'), left:'シャリっとした', right:'なめらか', showPerformer:true, showListener:true},
      {id:App.genId('item'), left:'明るい', right:'暗い', showPerformer:true, showListener:true},
      {id:App.genId('item'), left:'鋭い', right:'丸い', showPerformer:true, showListener:true},
      {id:App.genId('item'), left:'好き', right:'嫌い', showPerformer:true, showListener:true}
    ];
  }
  function defaultPicks(){
    return [
      {id:App.genId('pick'), actualName:'シリカガラス'},
      {id:App.genId('pick'), actualName:'セルロイド'},
      {id:App.genId('pick'), actualName:'ナイロン'},
      {id:App.genId('pick'), actualName:'アルミ'},
      {id:App.genId('pick'), actualName:'PEI'}
    ];
  }
  function defaultConfig(){
    return {
      scale:7, pickOrder:'fixed', itemOrder:'fixed', leftRight:'random',
      instructionsText: 'これから複数のギターピックを評価していただきます。\n\n・ピックの素材名は評価中は伏せられています。素材に対する先入観を持たず、実際に触れた・聞いた印象のみで評価してください。\n・正解や不正解はありません。感じたままにお答えください。\n・評価は途中で中断しても、同じ端末・ブラウザから続きを再開できます。'
    };
  }

  App.State.ensureBootstrap = function(){
    let projects = App.storage.get('projects', []);
    if(!projects || projects.length === 0){
      const id = App.genId('proj');
      projects = [{id, name:'本実験', createdAt:new Date().toISOString()}];
      App.storage.set('projects', projects);
      App.storage.set(App.pkey(id,'config'), defaultConfig());
      App.storage.set(App.pkey(id,'items'), defaultItems());
      App.storage.set(App.pkey(id,'picks'), defaultPicks());
      App.storage.set(App.pkey(id,'responses'), []);
      App.storage.set('currentProjectId', id);
    }
    App.state.projects = App.storage.get('projects', []);
    let curId = App.storage.get('currentProjectId', null);
    if(!curId || !App.state.projects.find(p=>p.id===curId)){
      curId = App.state.projects[0].id;
      App.storage.set('currentProjectId', curId);
    }
    App.state.currentProjectId = curId;
    App.state.templates = App.storage.get('templates', []);
  };

  App.State.currentProjectName = function(){
    const p = App.state.projects.find(x => x.id === App.state.currentProjectId);
    return p ? p.name : '';
  };

  App.State.loadProject = function(id){
    const savedConfig = App.storage.get(App.pkey(id,'config'), defaultConfig());
    App.state.config = Object.assign({}, defaultConfig(), savedConfig);
    App.state.items = App.storage.get(App.pkey(id,'items'), []);
    App.state.picks = App.storage.get(App.pkey(id,'picks'), []);
    App.state.responses = App.storage.get(App.pkey(id,'responses'), []);
  };

  App.State.createProject = function(){
    const name = window.prompt('新しいプロジェクト名を入力してください（例：2026年9月 本実験）');
    if(!name) return;
    const id = App.genId('proj');
    App.state.projects.push({id, name, createdAt:new Date().toISOString()});
    App.storage.set('projects', App.state.projects);
    App.storage.set(App.pkey(id,'config'), defaultConfig());
    App.storage.set(App.pkey(id,'items'), []);
    App.storage.set(App.pkey(id,'picks'), []);
    App.storage.set(App.pkey(id,'responses'), []);
    App.toast('プロジェクトを作成しました');
    App.State.switchProject(id);
  };

  App.State.renameProject = function(id){
    const p = App.state.projects.find(x => x.id === id);
    if(!p) return;
    const name = window.prompt('新しいプロジェクト名', p.name);
    if(!name) return;
    p.name = name;
    App.storage.set('projects', App.state.projects);
    App.render();
  };

  App.State.deleteProject = function(id){
    if(App.state.projects.length <= 1){ App.toast('最後のプロジェクトは削除できません'); return; }
    if(!window.confirm('このプロジェクトと、その中のすべての設定・回答データを削除します。よろしいですか？')) return;
    const wasCurrent = App.state.currentProjectId === id;
    App.state.projects = App.state.projects.filter(x => x.id !== id);
    App.storage.set('projects', App.state.projects);
    App.storage.remove(App.pkey(id,'config'));
    App.storage.remove(App.pkey(id,'items'));
    App.storage.remove(App.pkey(id,'picks'));
    App.storage.remove(App.pkey(id,'responses'));
    App.storage.remove(App.pkey(id,'inprogress'));
    App.toast('削除しました');
    if(wasCurrent){
      App.State.switchProject(App.state.projects[0].id);
    }else{
      App.render();
    }
  };

  App.State.switchProject = function(id){
    App.state.currentProjectId = id;
    App.storage.set('currentProjectId', id);
    App.State.loadProject(id);
    App.state.session = null;
    App.state.screen = 'admin';
    App.state.adminTab = 'projects';
    App.state.confirmDelete = null;
    if(App.Survey && App.Survey.checkInProgress) App.Survey.checkInProgress();
    App.render();
  };

  // ---- 評価項目テンプレート ----
  App.State.saveAsTemplate = function(){
    if(App.state.items.length === 0){ App.toast('評価項目がありません'); return; }
    const name = window.prompt('テンプレート名を入力してください', App.State.currentProjectName() + ' の項目');
    if(!name) return;
    const tpl = {id:App.genId('tpl'), name, items: App.state.items.map(it => ({left:it.left, right:it.right, showPerformer:it.showPerformer!==false, showListener:it.showListener!==false}))};
    App.state.templates.push(tpl);
    App.storage.set('templates', App.state.templates);
    App.toast('テンプレートを保存しました');
    App.render();
  };

  App.State.applyTemplate = function(tplId){
    const tpl = App.state.templates.find(t => t.id === tplId);
    if(!tpl) return;
    if(App.state.items.length > 0 && !window.confirm('現在の評価項目をテンプレートの内容で置き換えます。よろしいですか？')) return;
    App.state.items = tpl.items.map(it => ({id:App.genId('item'), left:it.left, right:it.right, showPerformer: it.showPerformer !== false, showListener: it.showListener !== false}));
    App.storage.set(App.pkey(App.state.currentProjectId,'items'), App.state.items);
    App.toast('テンプレートを適用しました');
    App.render();
  };

  App.State.deleteTemplate = function(tplId){
    if(!window.confirm('このテンプレートを削除しますか？')) return;
    App.state.templates = App.state.templates.filter(t => t.id !== tplId);
    App.storage.set('templates', App.state.templates);
    App.render();
  };

})(window.App);
