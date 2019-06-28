/*!
 * @license
 * 
 * pzprv3-ui.js v0.0.1
 *  https://bitbucket.org/sabo2/pzprv3
 * 
 * This script includes candle.js, see below
 *  https://bitbucket.org/sabo2/candle
 * 
 * Copyright 2009-2019 robx
 * 
 * This script is released under the MIT license. Please see below.
 *  http://www.opensource.org/licenses/mit-license.php
 * 
 * Date: 2019-06-28
 */
// intro.js

(function(){

// Boot.js v3.4.0
/* jshint latedef:false */
/* global ui:false, ActiveXObject:false */

(function(){
/********************************/
/* 初期化時のみ使用するルーチン */
/********************************/

var require_accesslog = true;
var onload_pzl = null;
var onload_option = {};

//---------------------------------------------------------------------------
// ★boot() window.onload直後の処理
//---------------------------------------------------------------------------
pzpr.on('load', function boot(){
	if(importData() && includeDebugFile()){ startPuzzle();}
	else{ setTimeout(boot,0);}
});

function importData(){
	if(!onload_pzl){
		/* 1) 盤面複製・index.htmlからのファイル入力/Database入力か */
		/* 2) URL(?以降)をチェック */
		onload_pzl = (importFileData() || importURL());
		
		/* 指定されたパズルがない場合はさようなら～ */
		if(!onload_pzl || !onload_pzl.pid){ failOpen();}
	}
	
	return true;
}

function failOpen(){
	if(!!ui.puzzle && !!ui.puzzle.pid){ return;}
	var title2 = document.getElementById('title2');
	if(!!title2){ title2.innerHTML = "Fail to import puzzle data or URL.";}
	document.getElementById('menupanel').innerHTML = '';
	//throw new Error("No Include Puzzle Data Exception");
}

function includeDebugFile(){
	var pid = onload_pzl.pid, result = true;
	
	/* 必要な場合、テスト用ファイルのinclude         */
	/* importURL()後でないと必要かどうか判定できない */
	if(ui.debugmode){
		if(!ui.debug){
			result = false;
		}
		else if(!ui.debug.urls){
			ui.debug.includeDebugScript("for_test.js");
			result = false;
		}
		else if(!ui.debug.urls[pid]){
			ui.debug.includeDebugScript("test_"+pid+".js");
			result = false;
		}
	}
	
	return result;
}

function startPuzzle(){
	var pzl = onload_pzl, pid = pzl.pid;
	if(ui.debugmode){ onload_option.mode = 'play';}
	
	/* IE SVGのtextLengthがうまく指定できていないので回避策を追加 */
	if((function(ua){ return ua.match(/MSIE/) || (ua.match(/AppleWebKit/) && ua.match(/Edge/));})(navigator.userAgent)){
		onload_option.graphic = 'canvas';
	}
	
	/* パズルオブジェクトの作成 */
	var element = document.getElementById('divques');
	var puzzle = ui.puzzle = new pzpr.Puzzle(element, onload_option);
	pzpr.connectKeyEvents(puzzle);
	
	/* パズルオブジェクト作成〜open()間に呼ぶ */
	ui.event.onload_func();
	
	// 単体初期化処理のルーチンへ
	var callback = null;
	if(!ui.debugmode){ callback = accesslog;}
	else{ puzzle.once('ready', function(puzzle){ ui.menuconfig.set('autocheck', true);});}
	if(!ui.debugmode && require_accesslog && onload_option.type!=='player'){ puzzle.once('ready', countpid);}
	puzzle.once('fail-open', failOpen);
	puzzle.open((!ui.debugmode || !!pzl.qdata) ? pzl : pid+"/"+ui.debug.urls[pid], callback);
	
	return true;
}

//---------------------------------------------------------------------------
// ★importURL() 初期化時にURLを解析し、パズルの種類・エディタ/player判定を行う
//---------------------------------------------------------------------------
function importURL(){
	/* index.htmlからURLが入力されたかチェック */
	var search = getStorageData('pzprv3_urldata', 'urldata');
	if(!!search){ require_accesslog = false;}  /* index.htmlからのURL読み込み時はアクセスログをとらない */
	
	/* index.htmlからURLが入力されていない場合は現在のURLの?以降をとってくる */
	search = search || location.search;
	if(!search){ return null;}
	
	/* 一旦先頭の?記号を取り除く */
	if(search.charAt(0)==="?"){ search = search.substr(1);}
	
	while(search.match(/^(\w+)\=(\w+)\&(.*)/)){
		onload_option[RegExp.$1] = RegExp.$2;
		search = RegExp.$3;
	}
	
	// エディタモードかplayerモードか、等を判定する
	if(search==="test"){ search = 'country_test';}
	
	var startmode = '';
	if     (search.match(/_test/)){ startmode = 'EDITOR'; ui.debugmode = true;}
	else if(search.match(/^m\+/)) { startmode = 'EDITOR';}
	else if(search.match(/_edit/)){ startmode = 'EDITOR';}
	else if(search.match(/_play/)){ startmode = 'PLAYER';}
	if(!require_accesslog){ startmode = 'EDITOR';}  /* index.htmlからの読み込み時はEDITORにする */

	search=search.replace(/^m\+/,'');
	search=search.replace(/(_test|_edit|_play)/,'');

	var pzl = pzpr.parser.parseURL(search);

	startmode = startmode || (!pzl.body ? 'EDITOR' : 'PLAYER');
	if(startmode==='PLAYER'){ onload_option.type = 'player';}

	return pzl;
}

//---------------------------------------------------------------------------
// ★importFileData() 初期化時にファイルデータの読み込みを行う
//---------------------------------------------------------------------------
function importFileData(){
	/* index.htmlや盤面の複製等でファイルorブラウザ保存データが入力されたかチェック */
	var fstr = getStorageData('pzprv3_filedata', 'filedata');
	if(!fstr){ return null;}

	var pzl = pzpr.parser.parseFile(fstr, '');
	if(!pzl){ return null;}

	require_accesslog = false;
	
	return pzl;
}

//---------------------------------------------------------------------------
// ★getStorageData() localStorageやsesseionStorageのデータを読み込む
//---------------------------------------------------------------------------
function getStorageData(key, key2){
	// 移し変える処理
	var str = localStorage[key];
	if(typeof str==="string"){
		delete localStorage[key];
		sessionStorage[key2] = str;
	}

	str = sessionStorage[key2];
	return (typeof str==="string" ? str : null);
}

//---------------------------------------------------------------------------
// ★countpid() エディタとして開いた回数をログする
//---------------------------------------------------------------------------
function countpid(puzzle){
	var counts = JSON.parse(localStorage['pzprv3_index:ranking']||'{}');
	
	// パズルの開いた数を記録
	var count = counts.count || {};
	var cnt = count[puzzle.pid] || 0;
	count[puzzle.pid] = cnt + 1;
	
	// 最新10パズルを記録
	var recent = counts.recent || [];
	if(recent.indexOf(puzzle.pid)>=0){ recent.splice(recent.indexOf(puzzle.pid),1);}
	recent.unshift(puzzle.pid);
	if(recent.length>10){ recent.pop();}
	
	localStorage['pzprv3_index:ranking'] = JSON.stringify({count:count,recent:recent});
}

//---------------------------------------------------------------------------
// ★accesslog() playerのアクセスログをとる
//---------------------------------------------------------------------------
function accesslog(puzzle){
	if(!puzzle.playeronly || !onload_pzl.pid || !require_accesslog){ return;}

	if(document.domain!=='indi.s58.xrea.com' &&
	   document.domain!=='pzprv3.sakura.ne.jp' &&
	   !document.domain.match(/(dev\.)?pzv\.jp/)){ return;}

	var refer = document.referrer;
	if(refer.match(/http\:\/\/[\w\.]*pzv\.jp/)){ return;}

	refer = refer.replace(/\?/g,"%3f").replace(/\&/g,"%26")
				 .replace(/\=/g,"%3d").replace(/\//g,"%2f");

	// 送信
	var xmlhttp = false;
	if(typeof ActiveXObject !== "undefined"){
		try { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");}
		catch (e) { xmlhttp = false;}
	}
	if(!xmlhttp && typeof XMLHttpRequest !== "undefined") {
		xmlhttp = new XMLHttpRequest();
	}
	if(xmlhttp){
		var data = [
			("scr="     + "pzprv3"),
			("pid="     + onload_pzl.pid),
			("referer=" + refer),
			("pzldata=" + onload_pzl.qdata)
		].join('&');

		xmlhttp.open("POST", "./record.cgi");
		xmlhttp.onreadystatechange = function(){};
		xmlhttp.setRequestHeader("Content-Type" , "application/x-www-form-urlencoded");
		xmlhttp.send(data);
	}
}

})();

// UI.js v3.4.0
/* global pzpr:false, ui:false, File:false */
/* exported ui, _doc, getEL, createEL */

/* ui.js Locals */
var _doc = document;
function getEL(id){ return _doc.getElementById(id);}
function createEL(tagName){ return _doc.createElement(tagName);}

//---------------------------------------------------------------------------
// ★uiオブジェクト UserInterface側のオブジェクト
//---------------------------------------------------------------------------
/* extern */
window.ui = {
	version : '0.0.1',

	/* このサイトで使用するパズルのオブジェクト */
	puzzle    : null,
	
	/* どの種類のパズルのメニューを表示しているか */
	currentpid : '',
	
	/* メンバオブジェクト */
	event     : null,
	menuconfig: null,
	menuarea  : null,
	toolarea  : null,
	popupmgr  : null,
	keypopup  : null,
	timer     : null,
	
	debugmode : false,
	
	enableGetText   : false,	// FileReader APIの旧仕様でファイルが読めるか
	enableReadText  : false,	// HTML5 FileReader APIでファイルが読めるか
	reader : null,				// FileReaderオブジェクト
	
	enableSaveImage : false,	// 画像保存が可能か
	enableImageType : {},		// 保存可能な画像形式
	
	enableSaveBlob  : false,	// saveBlobが使用できるか

	callbackComplete : null,

	//---------------------------------------------------------------------------
	// ui.displayAll()     全てのメニュー、ボタン、ラベルに対して文字列を設定する
	// ui.setdisplay()     個別のメニュー、ボタン、ラベルに対して文字列を設定する
	//---------------------------------------------------------------------------
	displayAll : function(){
		ui.menuarea.display();
		ui.toolarea.display();
		ui.popupmgr.translate();
		ui.misc.displayDesign();
	},
	setdisplay : function(idname){
		ui.menuarea.setdisplay(idname);
		ui.toolarea.setdisplay(idname);
	},

	//---------------------------------------------------------------------------
	// ui.customAttr()   エレメントのカスタムattributeの値を返す
	//---------------------------------------------------------------------------
	customAttr : function(el, name){
		var value = "";
		if(el.dataset!==void 0){ value = el.dataset[name];}
		/* IE10, Firefox5, Chrome7, Safari5.1以下のフォールバック */
		else{
			var lowername = "data-";
			for(var i=0;i<name.length;i++){
				var ch = name[i] || name.charAt(i);
				lowername += ((ch>="A" && ch<="Z") ? ("-" + ch.toLowerCase()) : ch);
			}
			value = el[lowername] || el.getAttribute(lowername) || "";
		}
		return value;
	},

	//----------------------------------------------------------------------
	// ui.windowWidth()   ウィンドウの幅を返す
	//----------------------------------------------------------------------
	windowWidth : function(){
		return ((window.innerHeight!==void 0) ? window.innerWidth : _doc.body.clientWidth);
	},

	//---------------------------------------------------------------------------
	// ui.adjustcellsize()  resizeイベント時に、pc.cw, pc.chのサイズを(自動)調節する
	// ui.getBoardPadding() Canvasと境界線の周りの間にあるpaddingのサイズを求めます
	//---------------------------------------------------------------------------
	adjustcellsize : function(){
		var puzzle = ui.puzzle, pc = puzzle.painter;
		var cols = pc.getCanvasCols() + ui.getBoardPadding()*2;
		var wwidth = ui.windowWidth()-6, mwidth;	//  margin/borderがあるので、適当に引いておく
		var uiconf = ui.menuconfig;

		var cellsize, cellsizeval = uiconf.get('cellsizeval');
		var cr = {base:1.0,limit:0.40}, ws = {base:0.80,limit:0.96}, ci=[];
		ci[0] = (wwidth*ws.base )/(cellsizeval*cr.base );
		ci[1] = (wwidth*ws.limit)/(cellsizeval*cr.base );
		ci[2] = (wwidth*ws.limit)/(cellsizeval*cr.limit);

		// 横幅いっぱいに広げたい場合
		if(uiconf.get('fullwidth')){
			mwidth = wwidth*0.98;
			cellsize = (mwidth*0.92)/cols;
		}
		// 縮小が必要ない場合
		else if(!uiconf.get('adjsize') || cols < ci[0]){
			mwidth = wwidth*ws.base-4;
			cellsize = cellsizeval*cr.base;
		}
		// ひとまずセルのサイズを変えずにmainの幅を調節する場合
		else if(cols < ci[1]){
			cellsize = cellsizeval*cr.base;
			mwidth = cellsize*cols;
		}
		// base～limit間でサイズを自動調節する場合
		else if(cols < ci[2]){
			mwidth = wwidth*ws.limit-4;
			cellsize = mwidth/cols; // 外枠ぎりぎりにする
		}
		// 自動調整の下限値を超える場合
		else{
			cellsize = cellsizeval*cr.limit;
			mwidth = cellsize*cols;
		}

		// mainのサイズ変更
		if(!pc.outputImage){
			getEL('main').style.width = ''+(mwidth|0)+'px';
		}

		puzzle.setCanvasSizeByCellSize(cellsize);
	},
	getBoardPadding : function(){
		var puzzle = ui.puzzle, padding = 0;
		switch(puzzle.pid){
			case 'firefly': case 'hashikake': case 'wblink':
			case 'ichimaga': case 'ichimagam': case 'ichimagax':
				padding = 0.30; break;
			
			case 'kouchoku': case 'gokigen': case 'wagiri': case 'creek':
				padding = 0.20; break;
			
			case 'slither': case 'bag': case 'mejilink':
				padding = 0.15; break;
			
			case 'kinkonkan': case 'building': case 'easyasabc': case 'box':
				padding = 0.05; break;
			
			case 'bosanowa':
				padding = (ui.menuconfig.get('disptype_bosanowa')!==2?0.50:0.05); break;
			
			default: padding = 0.50; break;
		}
		if(ui.menuconfig.get('fullwidth')){ padding = 0;}
		return padding;
	},

	//--------------------------------------------------------------------------------
	// ui.selectStr()  現在の言語に応じた文字列を返す
	//--------------------------------------------------------------------------------
	selectStr : function(strJP, strEN){
		if(!strEN){ return strJP;}
		return (pzpr.lang==='ja' ? strJP : strEN);
	},

	//---------------------------------------------------------------------------
	// ui.getCurrentConfigList() 現在のパズルで有効な設定と設定値を返す
	//---------------------------------------------------------------------------
	getCurrentConfigList : function(){
		return ui.menuconfig.getList();
	},

	//----------------------------------------------------------------------
	// ui.initFileReadMethod() ファイルアクセス関連の処理の初期化を行う
	//----------------------------------------------------------------------
	initFileReadMethod : function(){
		// File Reader (あれば)の初期化処理
		if(typeof FileReader !== 'undefined'){
			this.reader = new FileReader();
			this.reader.onload = function(e){ ui.puzzle.open(e.target.result);};
			this.enableReadText = true;
		}
		else{
			this.reader = null;
			this.enableGetText = (typeof FileList !== 'undefined' && typeof File.prototype.getAsText !== 'undefined');
		}
	},

	//----------------------------------------------------------------------
	// ui.initImageSaveMethod() 画像保存関連の処理の初期化を行う
	//----------------------------------------------------------------------
	initImageSaveMethod : function(puzzle){
		if(!!pzpr.Candle.enable.canvas && !!_doc.createElement('canvas').toDataURL){
			this.enableImageType.png = true;
			
			var canvas = _doc.createElement('canvas');
			canvas.width = canvas.height = 1;
			if(canvas.toDataURL('image/gif').match('image/gif'))  { this.enableImageType.gif = true;}
			if(canvas.toDataURL('image/jpeg').match('image/jpeg')){ this.enableImageType.jpeg = true;}
			if(canvas.toDataURL('image/webp').match('image/webp')){ this.enableImageType.webp = true;}
		}
		if(!!pzpr.Candle.enable.svg && !!window.btoa){
			this.enableImageType.svg = true;
		}
		if(!!this.enableImageType.png || !!this.enableImageType.svg){
			this.enableSaveImage = true;
		}
		
		this.enableSaveBlob = (!!window.navigator.saveBlob);
	}
};

// Event.js v3.4.0
/* global ui:false, _doc:false */

//---------------------------------------------------------------------------
// ★UIEventsクラス イベント設定の管理を行う
//---------------------------------------------------------------------------
// メニュー描画/取得/html表示系
ui.event =
{
	resizetimer : null,	// resizeタイマー

	removers : [],

	//----------------------------------------------------------------------
	// event.addEvent()        addEventListener(など)を呼び出す
	//----------------------------------------------------------------------
	addEvent : function(el, event, self, callback, capt){
		this.removers.push( pzpr.util.addEvent(el, event, self, callback, !!capt) );
	},

	//----------------------------------------------------------------------
	// event.removeAllEvents() addEventで登録されたイベントを削除する
	//----------------------------------------------------------------------
	removeAllEvents : function(){
		this.removers.forEach(function(remover){ remover();});
		this.removers=[];
	},

	//---------------------------------------------------------------------------
	// event.setWindowEvents()  マウス入力、キー入力以外のイベントの設定を行う
	//---------------------------------------------------------------------------
	setWindowEvents : function(){
		// File API＋Drag&Drop APIの設定
		if(!!ui.reader){
			var DDhandler = function(e){
				ui.reader.readAsText(e.dataTransfer.files[0]);
				e.preventDefault();
				e.stopPropagation();
			};
			this.addEvent(window, 'dragover', this, function(e){ e.preventDefault();}, true);
			this.addEvent(window, 'drop', this, DDhandler, true);
		}

		// onBlurにイベントを割り当てる
		this.addEvent(_doc, 'blur', this, this.onblur_func);

		// onresizeイベントを割り当てる
		var evname = (!pzpr.env.OS.iOS ? 'resize' : 'orientationchange');
		this.addEvent(window, evname, this, this.onresize_func);

		// onbeforeunloadイベントを割り当てる
		this.addEvent(window, 'beforeunload', this, this.onbeforeunload_func);

		// onunloadイベントを割り当てる
		this.addEvent(window, 'unload', this, this.onunload_func);

		// エラー表示を消去する
		this.addEvent(document.getElementById('quesboard'), 'mousedown', this, function(e){
			ui.puzzle.errclear();
			e.stopPropagation();
		});
	},

	//---------------------------------------------------------------------------
	// event.onload_func()   ウィンドウを開いた時に呼ばれる関数
	// event.onunload_func() ウィンドウをクローズする前に呼ばれる関数
	//---------------------------------------------------------------------------
	onload_func : function(){
		ui.initFileReadMethod();
		
		ui.menuconfig.restore();
		
		ui.listener.setListeners(ui.puzzle);
		
		if(pzpr.env.OS.Android){
			ui.misc.modifyCSS({'body, .btn':{fontFamily:'Verdana, Arial, sans-serif'}});
		}
	},
	onunload_func : function(){
		ui.menuconfig.save();
	},

	//---------------------------------------------------------------------------
	// event.onresize_func() ウィンドウリサイズ時に呼ばれる関数
	// event.onblur_func()   ウィンドウからフォーカスが離れた時に呼ばれる関数
	// event.onbeforeunload_func()  ウィンドウをクローズする前に呼ばれる関数
	//---------------------------------------------------------------------------
	onresize_func : function(){
		if(this.resizetimer){ clearTimeout(this.resizetimer);}
		this.resizetimer = setTimeout(function(){ ui.adjustcellsize();},250);
	},
	onblur_func : function(){
		ui.puzzle.key.keyreset();
		ui.puzzle.mouse.mousereset();
	},
	onbeforeunload_func : function(e){
		if(ui.puzzle.playeronly || !ui.puzzle.ismodified()){ return;}
		
		var msg = ui.selectStr("盤面が更新されています", "The board is edited.");
		e.returnValue = msg;
		return msg;
	}
};

// Listener.js v3.4.1
/* global ui:false */

//---------------------------------------------------------------------------
// ★UIListener Puzzleに付加するListenerイベント設定の管理を行う
//  注意：execListenerで呼び出される関数は、thisがui.listenerになっていません
//---------------------------------------------------------------------------
ui.listener =
{
	//---------------------------------------------------------------------------
	// listener.setListeners()  PuzzleのListenerを登録する
	//---------------------------------------------------------------------------
	setListeners : function(puzzle){
		puzzle.once('ready',  this.onFirstReady);
		puzzle.on('ready',    this.onReady);
		
		puzzle.on('key',      this.onKeyInput);
		puzzle.on('mouse',    this.onMouseInput);
		puzzle.on('history',  this.onHistoryChange);
		puzzle.on('trial',    this.onTrialModeChange);
		puzzle.on('mode',     this.onModeChange);
		
		puzzle.on('adjust',     this.onAdjust);
		puzzle.on('resize',     this.onResize);
	},

	//---------------------------------------------------------------------------
	// listener.onFirstReady() 初回のパズル読み込み完了時に呼び出される関数
	// listener.onReady()  パズル読み込み完了時に呼び出される関数
	//---------------------------------------------------------------------------
	onFirstReady : function(puzzle){
		ui.initImageSaveMethod(puzzle);
	},
	onReady : function(puzzle){
		/* パズルの種類が同じならMenuArea等の再設定は行わない */
		if(ui.currentpid !== puzzle.pid){
			/* 以前設定済みのイベントを削除する */
			ui.event.removeAllEvents();
			
			/* menuareaより先に キーポップアップを作成する必要がある */
			ui.keypopup.create();
			
			/* メニュー用の設定を消去・再設定する */
			ui.menuarea.reset();
			ui.toolarea.reset();
			ui.popupmgr.reset();
			ui.notify.reset();
			ui.misc.displayDesign();
			
			/* Windowへのイベント設定 */
			ui.event.setWindowEvents();
		}
		
		ui.menuconfig.sync();
		ui.menuconfig.set('autocheck_once', ui.menuconfig.get('autocheck'));
		ui.currentpid = puzzle.pid;
		
		ui.adjustcellsize();
		ui.keypopup.display();
		
		ui.timer.reset();					/* タイマーリセット(最後) */
	},

	//---------------------------------------------------------------------------
	// listener.onKeyInput()    キー入力時に呼び出される関数 (return false = 処理をキャンセル)
	// listener.onMouseInput()  盤面へのマウス入力時に呼び出される関数 (return false = 処理をキャンセル)
	//---------------------------------------------------------------------------
	onKeyInput : function(puzzle, c){
		var kc = puzzle.key, ut = ui.undotimer, result = true;
		if(kc.keydown){
			/* TimerでUndo/Redoする */
			if(c==='ctrl+z' || c==='meta+z'){ ut.startKeyUndo(); result = false;}
			if(c==='ctrl+y' || c==='meta+y'){ ut.startKeyRedo(); result = false;}

			/* F2で回答モード Shift+F2で問題作成モード */
			if(!puzzle.playeronly){
				if     (puzzle.editmode && c==='F2'      ){ ui.menuconfig.set("mode", puzzle.MODE_PLAYER); result = false;}
				else if(puzzle.playmode && c==='shift+F2'){ ui.menuconfig.set("mode", puzzle.MODE_EDITOR); result = false;}
			}

			/* デバッグ用ルーチンを通す */
			if(ui.debug.keydown(c)){ result = false;}
		}
		else if(kc.keyup){
			/* TimerのUndo/Redoを停止する */
			if(c==='ctrl+z' || c==='meta+z'){ ut.stopKeyUndo(); result = false;}
			if(c==='ctrl+y' || c==='meta+y'){ ut.stopKeyRedo(); result = false;}
		}
		
		if(!kc.isCTRL && !kc.isMETA){ ut.reset();}
		else if(!kc.isZ){ ut.stopKeyUndo();}
		else if(!kc.isY){ ut.stopKeyRedo();}
		
		kc.cancelEvent = !result;
	},
	onMouseInput : function(puzzle){
		var mv = puzzle.mouse, result = true;
		if(mv.mousestart && mv.btn==='middle'){ /* 中ボタン */
			ui.menuconfig.set('mode', puzzle.playmode ? 'edit' : 'play');
			mv.mousereset();
			result = false;
		}
		else if(ui.puzzle.pid === "goishi"){
			if(mv.mousestart && ui.puzzle.playmode){
				if(mv.btn==='left'){
					var cell = mv.getcell();
					if(cell.isnull || !cell.isStone() || cell.anum!==-1){
						ui.undotimer.startAnswerRedo();
						result = false;
					}
				}
				else if(mv.btn==='right'){
					ui.undotimer.startAnswerUndo();
					result = false;
				}
			}
			else if(mv.mouseend){
				ui.undotimer.stop();
				result = false;
			}
		}
		
		mv.cancelEvent = !result;
	},

	//---------------------------------------------------------------------------
	// listener.onHistoryChange() 履歴変更時に呼び出される関数
	// listener.onTrialModeChange() 仮置きモード変更時に呼び出される関数
	// listener.onModeChange()      Mode変更時に呼び出される関数
	//---------------------------------------------------------------------------
	onHistoryChange : function(puzzle){
		if(!!ui.currentpid){
			ui.setdisplay("operation");
		}
	},
	onTrialModeChange : function(puzzle, trialstage){
		if(!!ui.currentpid){
			ui.setdisplay("trialmode");
		}
	},
	onModeChange : function(puzzle){
		ui.menuconfig.list.mode.val = (ui.puzzle.playmode ? 'play' : 'edit');
		ui.setdisplay('mode');
		ui.menuconfig.set('inputmode', ui.puzzle.mouse.inputMode);
		
		ui.setdisplay('keypopup');
		ui.setdisplay('bgcolor');
		ui.setdisplay('passallcell');
		ui.keypopup.display();
	},

	//---------------------------------------------------------------------------
	// listener.onAdjust()  盤面の大きさが変わったときの処理を呼び出す
	//---------------------------------------------------------------------------
	onAdjust : function(puzzle){
		ui.adjustcellsize();
	},

	//---------------------------------------------------------------------------
	// listener.onResize()  canvasのサイズを変更したときの処理を呼び出す
	//---------------------------------------------------------------------------
	onResize : function(puzzle){
		var pc = puzzle.painter, cellsize = Math.min(pc.cw, pc.ch);
		var val = (ui.getBoardPadding()*cellsize)|0, valTop = val;
		if(puzzle.pid==='starbattle'||puzzle.pid==='easyasabc'){
			valTop = ((0.05*cellsize)|0)+'px';
		}
		puzzle.canvas.parentNode.style.padding = val+'px';
		puzzle.canvas.parentNode.style.paddingTop = valTop+'px';
		
		ui.keypopup.resizepanel();
	}
};

// MenuConfig.js v3.4.1
/* global pzpr:false, ui:false, JSON:false */

(function(){
//---------------------------------------------------------------------------
// ★MenuConfigクラス UI側の設定値を管理する
//---------------------------------------------------------------------------
var Config = pzpr.Puzzle.prototype.Config.prototype;

// メニュー描画/取得/html表示系
// Menuクラス
ui.menuconfig = {

	list : null,			// MenuConfigの設定内容を保持する

	//---------------------------------------------------------------------------
	// menuconfig.init()  MenuConfigの初期化を行う
	// menuconfig.add()   初期化時に設定を追加する
	//---------------------------------------------------------------------------
	init : function(){
		this.list = {};
		
		this.add('autocheck',      ui.puzzle.playeronly);					/* 正解自動判定機能 */
		this.add('autocheck_once', ui.puzzle.playeronly, {volatile:true});	/* 正解自動判定機能 */
		
		this.add('keypopup', false);						/* キーポップアップ (数字などのパネル入力) */

		this.add('adjsize', true);							/* 自動横幅調節 */
		this.add('cellsizeval', (ui.windowWidth()<=960?36:48));	/* セルのサイズ設定用 */
		this.add('fullwidth', (ui.windowWidth()<600));		/* キャンバスを横幅いっぱいに広げる */
		
		this.add('toolarea', true);							/* ツールエリアの表示 */
		
		this.add('inputmode', 'auto', {volatile:true});		/* inputMode */
		
		this.add('lrinvert', false, {volatile:true});		/* マウスの左右ボタンを反転する設定 */
		
		this.add('language', pzpr.lang, {option:['en','ja']});	/* 言語設定 */

		/* puzzle.configを一括で扱うため登録 */
		for(var name in ui.puzzle.config.list){
			var item = ui.puzzle.config.list[name], extoption = {puzzle:true};
			if(!!item.option){ extoption.option = item.option;}
			this.add(name, item.defval, extoption);
		}
		this.add('mode', (!ui.puzzle.playmode?'edit':'play'), {option:['edit','play'], puzzle:true});
	},
	add : function(name, defvalue, extoption){
		Config.add.call(this, name, defvalue, extoption);
		if(!!extoption && extoption.puzzle){
			var item = this.list[name];
			item.volatile = item.puzzle = true;
		}
	},

	//---------------------------------------------------------------------------
	// menuconfig.sync()  URL形式などによって変化する可能性がある設定値を同期する
	//---------------------------------------------------------------------------
	sync : function(){
		var idname = null;
		switch(ui.puzzle.pid){
			case 'yajirin':   idname = 'disptype_yajilin';   break;
			case 'pipelinkr': idname = 'disptype_pipelinkr'; break;
			case 'bosanowa':  idname = 'disptype_bosanowa';  break;
		}
		if(!!idname){ this.set(idname, ui.puzzle.getConfig(idname));}
		
		this.set('lrinvert', ui.puzzle.mouse.inversion);
		this.set('autocmp',  ui.puzzle.getConfig('autocmp'));
		this.set('autoerr',  ui.puzzle.getConfig('autoerr'));
	},

	//---------------------------------------------------------------------------
	// menuconfig.getCurrentName()  指定されたidを現在使用している名前に変換する
	//---------------------------------------------------------------------------
	getCurrentName : Config.getCurrentName,
	getNormalizedName : Config.getNormalizedName,

	//---------------------------------------------------------------------------
	// menuconfig.get()  各フラグの設定値を返す
	// menuconfig.get()  各フラグの設定値を返す
	// menuconfig.reset() 各フラグの設定値を初期化する
	//---------------------------------------------------------------------------
	get : Config.get,
	set : function(argname, newval){
		var names = this.getNormalizedName(argname), idname = names.name;
		if(!this.list[idname]){ return;}
		if(idname==='mode'){ ui.puzzle.setMode(newval); newval = (!ui.puzzle.playmode?'edit':'play');}
		else if(idname==='inputmode'){ ui.puzzle.mouse.setInputMode(newval); newval = ui.puzzle.mouse.inputMode;}
		
		newval = this.setproper(names, newval);
		
		if(idname==='language'){ pzpr.lang = newval;}
		else if(this.list[idname].puzzle){ ui.puzzle.setConfig(argname, newval);}
		
		this.configevent(idname,newval);
	},
	reset : Config.reset,

	//---------------------------------------------------------------------------
	// menuconfig.restore()  保存された各種設定値を元に戻す
	// menuconfig.save()     各種設定値を保存する
	//---------------------------------------------------------------------------
	restore : function(){
		/* 設定が保存されている場合は元に戻す */
		ui.puzzle.config.init();
		this.init();
		var json_puzzle = localStorage['pzprv3_config:puzzle'];
		var json_menu   = localStorage['pzprv3_config:ui'];
		if(!!json_puzzle){ this.setAll(JSON.parse(json_puzzle));}
		if(!!json_menu)  { this.setAll(JSON.parse(json_menu));}
	},
	save : function(){
		localStorage['pzprv3_config:puzzle'] = JSON.stringify(ui.puzzle.saveConfig());
		localStorage['pzprv3_config:ui']     = JSON.stringify(this.getAll());
	},

	//---------------------------------------------------------------------------
	// menuconfig.getList()  現在有効な設定値のリストを返す
	//---------------------------------------------------------------------------
	getList : Config.getList,
	getexec : function(name){
		if(!this.list[name]){ return false;}
		if(name==='mode'){ return !ui.puzzle.playeronly;}
		else if(this.list[name].puzzle){ return ui.puzzle.validConfig(name);}
		return true;
	},

	//---------------------------------------------------------------------------
	// menuconfig.getAll()  全フラグの設定値を返す
	// menuconfig.setAll()  全フラグの設定値を設定する
	//---------------------------------------------------------------------------
	getAll : Config.getAll,
	setAll : function(setting){
		for(var key in setting){ this.set(key,setting[key]);}
		this.list.autocheck_once.val = this.list.autocheck.val;
	},

	//---------------------------------------------------------------------------
	// menuconfig.setproper()    設定値の型を正しいものに変換して設定変更する
	// menuconfig.valid()        設定値が有効なパズルかどうかを返す
	//---------------------------------------------------------------------------
	setproper : Config.setproper,
	valid : function(idname){
		if(!this.list[idname]){ return false;}
		if(idname==="keypopup"){ return (ui.keypopup.paneltype[1]!==0 || ui.keypopup.paneltype[3]!==0);}
		else if(idname==='mode'){ return !ui.puzzle.playeronly;}
		else if(idname==='inputmode'){ return (ui.puzzle.mouse.getInputModeList('play').length>1 || (!ui.puzzle.playeronly && ui.puzzle.mouse.getInputModeList('edit').length>1));}
		else if(this.list[idname].puzzle){ return ui.puzzle.validConfig(idname);}
		return true;
	},

	//---------------------------------------------------------------------------
	// config.configevent()  設定変更時の動作を記述する (modeはlistener.onModeChangeで変更)
	//---------------------------------------------------------------------------
	configevent : function(idname, newval){
		if(!ui.menuarea.menuitem){ return;}
		ui.setdisplay(idname);
		switch(idname){
		case 'keypopup':
			ui.keypopup.display();
			break;
			
		case 'adjsize': case 'cellsizeval': case 'fullwidth':
			ui.adjustcellsize();
			break;
			
		case 'autocheck':
			this.list.autocheck_once.val = newval;
			break;
		
		case 'language':
			ui.displayAll();
			break;
		
		case 'lrinvert':
			ui.puzzle.mouse.setInversion(newval);
			break;
		}
	}
};

})();
// Misc.js v3.4.1
/* jshint latedef:false */
/* global ui:false, _doc:false */

//---------------------------------------------------------------------------
// ★Miscクラス html表示系 (Menu, Button以外)の制御を行う
//---------------------------------------------------------------------------
ui.misc = {
	//---------------------------------------------------------------------------
	// misc.displayDesign()  背景画像とかtitle・背景画像・html表示の設定
	// misc.bgimage()        背景画像を返す
	//---------------------------------------------------------------------------
	displayDesign : function(){
		var pid = ui.puzzle.pid;
		var pinfo = pzpr.variety(pid);
		var title = ui.selectStr(pinfo.ja, pinfo.en);
		title += (ui.puzzle.playeronly ? " player" : ui.selectStr(" エディタ"," editor"));
		title += ui.selectStr(" - ぱずぷれv3"," - PUZ-PRE v3");

		_doc.title = title;
		var titleEL = _doc.getElementById('title2');
		titleEL.innerHTML = title;

		_doc.body.style.backgroundImage = "url("+this.bgimage(pid)+")";
	},
	bgimage : function(pid){
		return toBGimage(pid);
	},

	//--------------------------------------------------------------------------------
	// misc.modifyCSS()   スタイルシートの中身を変更する
	//--------------------------------------------------------------------------------
	modifyCSS : function(input){
		var sheet = _doc.styleSheets[0];
		var rules = sheet.cssRules;
		if(rules===null){} // Chromeでローカルファイルを開くとおかしくなるので、とりあえず何もしないようにします
		else if(!this.modifyCSS_sub(rules, input)){
			var sel = ''; for(sel in input){ break;}
			sheet.insertRule(""+sel+" {}", rules.length);
			rules = sheet.cssRules;
			this.modifyCSS_sub(rules, input);
		}
	},
	modifyCSS_sub : function(rules, input){
		var modified = false;
		for(var i=0,len=rules.length;i<len;i++){
			var rule = rules[i];
			if(!rule.selectorText){ continue;}
			var pps = input[rule.selectorText];
			if(!!pps){
				for(var p in pps){ if(!!pps[p]){ rule.style[p]=pps[p];}}
				modified = true;
			}
		}
		return modified;
	},

	//--------------------------------------------------------------------------------
	// misc.walker()        DOMツリーをたどる
	// misc.displayByPid()  要素のdata-pid, autocmp-typeカスタム属性によって表示するしないを切り替える
	//--------------------------------------------------------------------------------
	walker : function(parent, func){
		var els = [parent.firstChild];
		while(els.length>0){
			var el = els.pop();
			func(el);
			if(!!el.nextSibling){ els.push(el.nextSibling);}
			if(el.nodeType===1 && el.childNodes.length>0){ els.push(el.firstChild);}
		}
	},
	displayByPid : function(parent){
		ui.misc.walker(parent, function(el){
			if(el.nodeType===1){
				var disppid = ui.customAttr(el,"dispPid");
				if(!!disppid){ el.style.display = (pzpr.util.checkpid(disppid, ui.puzzle.pid) ? "" : "none");}
				var autocmp = ui.customAttr(el,"autocmpType");
				if(!!autocmp){ el.style.display = (ui.puzzle.painter.autocmp===autocmp ? "" : "none");}
			}
		});
	}
};

function toBGimage(pid){
	var header;
	var data = {
	/* カラーパレットが2色時のHeader(途中まで), 16×16サイズのData Block(途中から) */
	aho       :['ICAgKCgoC','I4Qdp3vJDxwMtNorV85sQ6RwWhhiZPNF57Q+3udgcjWmLVMAADs='],
	amibo     :['P/AwP///y','HoRjqQvI36AKtNrrolx5Hz+BXjeKX4KlVWmSmyt1BQA7'],
	ayeheya   :['P/ow////y','F4SPGJEN66KctNoGaZ5b9guGIsdoZVUAADs='],
	bag       :['P+vg///wC','JYRjl4DbmlqYtNr3mFs67g+FYiZd5uSlYjdyJNim56mytv3CeQEAOw=='],
	barns     :['MDAwID//y','JQyCqZa369hTDtg7cYxT+r51zUVyWSMiYbqKJZl65tOCqDHjZQEAOw=='],
	bdblock   :['Dn/pP///y','IoyPqQHb+lJE81RzmdsMeI994EKWJsVJKQqtlouFovydSgEAOw=='],
	bonsan    :['P//wMD/wC','JoSPicGqcWCSgBpbJWa81zlR4hNizomeHMh+1wZ2MtssrTmmmVQAADs='],
	box       :['ICAgKCgoC','IgyOCaadxpyKEkHqKH5tLxmEondg5MeBU2WyKziGakfPRwEAOw=='],
	cbblock   :['P/QQf///y','H4wDp3vJj+BzUlEIst784rp4lSiRH9igKdNpk2qYRwEAOw=='],
	chocona   :['P/AwP///y','IIyPGcDtD1BUM1WpVr6HG69R2yiWFnmamNqh0Ntk8iwXADs='],
	cojun     :['MD//////y','I4wfgMvKD+Jrcp6IrcF18ux9DiWOSNldaJqspgu28AZndVYAADs='],
	country   :['P/Gif///y','IISPGZFtDKB7SDZL78RYna6BjhhO1WdG3siubWZC5FkAADs='],
	creek     :['AD//8H+/y','JIQfGces2tyD8RkrU16XboBVExd1YTmSjXWa5NlirTsjU/k1BQA7'],
	factors   :['AD//////y','IISPqcsWHxp4iKq4cGXayd5dWwN+SXigqHeBawpJ8pwUADs='],
	fillmat   :['P//wLP/gS','JoSDAam2yh6SM9pbE4UaT3d0HrWRmDOiXMZ+oLfG5cjIMAnOIlsAADs='],
	fillomino :['ODg4P///y','I4QPgcvKn4KU0DhbE7qP3wl608FtDVRq3bkuYZillYxmLlQAADs='],
	firefly   :['ID/gP//wC','JISDpqvRzNySME2EMaAHzuddXEiWlVVSYxRl7riCsqeaG2orBQA7'],
	fivecells :['MD/wP///y','IwyOmWbqDaCLCgY7T5NT8vV02fdpYpVRSAmqZ4S145rS7FMAADs='],
	fourcells :['MD/wP///y','JoSPELeZrdxjoUJbmTYQ3T1xoEdh1gh+jhqtaZlxGOqK0nvL5o4VADs='],
	goishi    :['P/zwf///y','JoSPiRHK2UA0cU5JVz5V79stFzUq5oly5eOBG8a9sAu/4QetZXoUADs='],
	gokigen   :['OD/g////y','HYQPgafbvlKUMD42r9HbZg9W4oh9IdmZaLpSLZcUADs='],
	hakoiri   :['MD//////y','KISPicEa+UyUYE5KLcSVY81FVyc1JYMq6oKm6zgu2zur8Eoesd6aSgEAOw=='],
	hanare    :['AD//////y','FYSPqcvtDyMMdNLqLm46WC+F4kgmBQA7'],
	hashikake :['P///8DAwC','JoQflse829qLMlhLVYQuw8s5F+JtpTJSIKm2UgaAGBxrdI3TU1MAADs='],
	hebi      :['ID/gMD/wC','FISPqcvtD1WYtM6Is96825pcHVQAADs='],
	herugolf  :['MD//+H//y','I4SPiRHqwJ6KcrV6KIbXdqNlITeNo3Q+zMo67Ou+ayx/G1IAADs='],
	heyabon   :['P//wMD/wC','LYyPacDtH9p5LgJ7IYt4V559Clh9Idad0kJ57caimmex7nqNUN2lti8JvSaAAgA7'],
	heyawake  :['MD/wP///y','F4SPGJEN66KctNoGaZ5b9guGIsdoZVUAADs='],
	hitori    :['P//QP///y','H4SPFhvpwNpDcVJ2lz11Q+x1HgduonVOZ/qwjpvASAEAOw=='],
	icebarn   :['EH9/////y','F4SPqcvt3wJEcpp6g95cW/yAjmiV5nkWADs='],
	icelom    :['EH9/////y','GYSPqcvdAYOblMl1UU7b9PN9XkWSkVimaQEAOw=='],
	icelom2   :['H///////y','G4SPqcvNEQxsMVX71MWue7SBWjZyywSg38o2BQA7'],
	ichimaga  :['ODg4P///y','IIyPGcDtfZ4EUdmLzWRxQ+1kovh0HgVO42qhy+nCHBsUADs='],
	ichimagam :['ODg4P///y','F4yPGcDtD6NTtFojs3639w1m3kiW5lUAADs='],
	ichimagax :['ODg4P///y','HkSOicDtDyNUtNHKltzcXXsloNKVm2aEqHqYbsQuBQA7'],
	juosan    :['Pjzu9/bqC','H4SPEMm43R5MUoWLZZ1mcz+BIDRGHHU6ToYdJfOiZwEAOw=='],
	kaero     :['P/A/////y','KIyPecDtbUB4dE5JIbtSxa1VISaC5sOlmXo6LImOnCt77BxjuPhlbgEAOw=='],
	kazunori  :['KD/wND/4C', 'IwyOqaaN7BqMKdiL86xU9vVx4bEtFklBRglcj4a1T0qe9AgUADs='],
	kakuro    :['ICAgP///y','F4SPqcut4V5McJ5qAbZ79vg5YTNmZlYAADs='],
	kakuru    :['MD/wP///y','HYSPqcut4QA8c1Vq2ZWu7vxpERYmXmeKz6oaJVUAADs='],
	kinkonkan :['P//gP///y','JoSDAanmrKBbsDaL7ctoUuwdjBhSWxdyHod+bObCZyetiVuOo1MAADs='],
	kouchoku  :['ODg4P///y','IIwDp3vJbxxccqraMKK6xX4BYDh+0SRSTLparevBsVwVADs='],
	kramma    :['ID/gMD/wC','IISPGJFt6xqMitEzL8hv+Q+G4idZGkehkeqwpdbBj7wVADs='],
	kramman   :['ID/gMD/wC','GYSPqcvtj4IMb85mbcy8+7xxGOho0ImmaQEAOw=='],
	kurochute :['PDw8ODg4C','IYSPFpGty9yBUD5qb9QVrER1GTaSUvWdadqILCKW2UzTBQA7'],
	kurodoko  :['ICAgMDAwC','H4SPiRHqDaAzMk66Lraa1g6GIhNCn1Kd2aGubUKKSAEAOw=='],
	kurotto   :['MDAwODg4C','KYxvoKuIzNKSD8gWMM2T12t5h+ZAncOZaoiu6LZFYtyRmGyHuPqmUF8AADs='],
	kusabi    :['MD/wP///y','I4SPqZvh/06QaxoLMMK80uuBYvaRY3eWW6mxqjuuJwQx9r0UADs='],
	lightup   :['MD//////y','IIRvgcvKDxycNAY5r6a6I99t2xdijVeN1bqYHJvA0VMAADs='],
	lits      :['ICAgKCgoC','IYQRqXmNq9yBUT7alr1wU2Z9gfeRWFiip6RNKfs6otkdBQA7'],
	lookair   :['AD//6D//y','GoSPqcsa/5qBUdIgwc07+w92jciQi+lQYFYAADs='],
	loopsp    :['P+AgP/Pgy','KYwPeLtpzoCcVDb1Mg7QQb55T9VVGrOBaPqhHomY6iyG2EfCa7dep1EAADs='],
	loute     :['IH/gf///y','IYyPaaDB+lJE89TVrssZ+Ph5zUiWG8ShqpSyK9V9Vmg2BQA7'],
	makaro    :['NnZ2e3t7S','I0xgmYDqytpzUa6K7cl1wuh9lnZ93siEompwoOhSHTuz26kUADs='],
	mashu     :['P/AwP///y','JoR/kRntvYxCFExb6b0ZS/Y4kdeRXLaVViqFJ1vCndw+oziP+QcUADs='],
	mejilink  :['NDQ0P///y','JoxheZrI4VhUE9iLc5ztQc8tz9ZBpPiN4Kq2hwZbpcTS7lk1zlYAADs='],
	minarism  :['AD//4H+/y','HYyPqcutAKN8DNBlU75oa/6FoOF141EG0po67vsWADs='],
	mochikoro :['AAAAICAgC','IYwDqXmNq9yBUT7alr1wU2Z9gPeRWFiip6RNKfs6otkdBQA7'],
	mochinyoro:['MDAwKCgoC','FoSPqct9AaOctNqLs4au+29s4kiWUwEAOw=='],
	nagare    :['N/Z/+7r/y','H4SPEJtt7FqItFo678t3ceWF4iGWIWim6sqirbtubQEAOw=='],
	nagenawa  :['ACAgACeoC','JYSPacHdCgKUiiaL8NFrO7eF3RiJJWml5geS2QRX8TWxDITnegEAOw=='],
	nanro     :['MD//+H//y','IIQfGcet2+KLUlFnL8rs+Q+G4khOWKJtaAqYqavBlwwUADs='],
	nawabari  :['MD//////y','IwRihsnK2xI88dnqJM68zhl9G6V5wYmmagc24vZisavWKYsVADs='],
	norinori  :['P/d1MDAwC','I4QfGcet2+KLUlFn8USvJ+Z5YLgZogZdZqYCpfpeMTVXX1MAADs='],
	numlin    :['MDAwP///y','JYyBaJG6Cx6UhzIbacuszaphYkhKG+SVD7eOJpZ2yXepdGuDRgEAOw=='],
	nuribou   :['KCgoICAgC','JYQRGYfKug58TlYzbaJbR3w1HTiKn8mdGamGK+ql6Uu7dlnjYQEAOw=='],
	nurikabe  :['P+hof/R0S','FoSPqcvtD1eY1NHa7rSaX49F4kiWTAEAOw=='],
	nurimaze  :['MD/wP/0/y','I4Qfp4u8aYKcs0WnINBYc+dRlIVtZHeCiMh6JfO9MSitbTwbBQA7'],
	paintarea :['P//wMD/wC','JowDCYfKug58TlYzbaJbR3w1HTiKn8lBZ5oxpOp6rTurIXvL+TsXADs='],
	pipelink  :['ID/gM//gy','Kkxgqae4bYCcjs6YaoaY9a99BxWRz4mmi1VeW+d44Px6cWXhrHzG/OMoAAA7'],
	pipelinkr :['ID//8D//y','Kkxgqae4bYCcjs6YaoaY9a99BxWRz4mmi1VeW+d44Px6cWXhrHzG/OMoAAA7'],
	rectslider:['MDAwODg4C','IIxvoKuIzNyBa1Jqb5RB8359mseRkumMG6gCGSSGpSwVADs='],
	reflect   :['MDAwP///y','HoyPqcvtCMAzMb5aWw5YbfpxVtKJEoONWrhO7gsnBQA7'],
	renban    :['ID/gP//wC','JoRjeZrI4FhUM9h7F4yzPfh1mkRp2MmF6iOCLIVaZvrWpF16bnwVADs='],
	ringring  :['KCgoMDAwC','JwRiqae4bYKctDr3Isw63dp1VsgcYCmeWDmirLpx6/p81n1xJL04BQA7'],
	ripple    :['AD//////y','IIyBYJG6jRg8sNqLs97RyvZMnxNGo3liKce2XkuBVVAAADs='],
	roma      :['P/wwf///y','IoSPqXvBGtxrcZpYJ85sc+hJYLiE2Ggm5oas7OWeQMzSWwEAOw=='],
	sashigane :['IH/gf///y','HYyPqcsBrcBrskp4LjZz+79p2NQxZRkhaOp4IhgUADs='],
	shakashaka:['AAAAICAgC','IoSPqRe7AR2CVAKKHd5q++l9VxgaJMecTXJqoltZ4ypfSwEAOw=='],
	shikaku   :['ICAgMDAwC','HoSPGcm43YKctMoIcVab9/N8QPiRjoVe4riyq7kFBQA7'],
	shimaguni :['P//wMD/wC','G4yPqavgDx2KFMwKL5as+w+GBqVtJXZWqcgeBQA7'],
	shugaku   :['AAAQAAAgC','JoRvoauIzNyBSyYaXp37Nv55GTiKGnWWQESmbguLrISp6ezUFlAAADs='],
	shwolf    :['ID/gMD/wC','IQyOiQas6RqcytlXsY569RaE4vhx5Zedx5WulKuamNwFBQA7'],
	slalom    :['ID//////y','IIwPecsJDIOLcNJlr3FP76yBF+d9SkmipydSbbWOsVEAADs='],
	slither   :['AAAAP///y','F4yPqcutAF5MULqLs978Vjohnxh2ZlYAADs='],
	sudoku    :['P//wP///y','HoRvgcvKDxxccp5qY0bY9hiE4khCn7ldabJq6/l8BQA7'],
	sukoro    :['MDAwODg4C','JYyPoMin39KDMUwa76p2crd9HGaQF0hpQHeqrOe671p6KEOKSAEAOw=='],
	tapa      :['P+hof/R0S','IISPqRAdm9yDR9LqrjY2ZvYhXSd+JNZs2gmxi6vAqlEAADs='],
	tasquare  :['ICAgGBgYC','IYxvoKuIzNyBSyYKbMDZcv15HPaMzWR2l1mmFcrCYzsfBQA7'],
	tatamibari:['LP/gf///y','HYSPqaHA2x6SM9pETzbbwY9dFTiG5lmmzcq2rlIAADs='],
	tateyoko  :['P/AwP///y','H4RjqQvI3+BzJ9hLqUx6R8+BXreRkoZhofiJJvROSgEAOw=='],
	tawa      :['MDAwODg4C','GIR/gcud3hRccj57Mai6+8lZIeiNkOlwBQA7'],
	tentaisho :['IWL/X23/y','KASCYcum+5qDUx6mYtPZ3u19VZhooVWeBzJK5WNCr7jNsfOyXq6mQAEAOw=='],
	tilepaint :['KCgoICAgC','JowDCYfKug58TlYzbaJbR3w1HTiKn8lBZ5oxpOp6rTurIXvL+TsXADs='],
	toichika  :['ID/gP///y','IoSPqRvsGlqSJlp6adXAwreE4nhwooeYWWlW6ZpObfeRYQEAOw=='],
	triplace  :['MD/wP///y','JgyOCXas6dxrKNiLb51xv0593lJhI6ig0jlCZQabEzuHZH0v8V4AADs='],
	usotatami :['MD/wP//wC','KIQTppqcvc6BMKIKsIuZN10hjDdZnkguKNeV2ri+pQquKi2l9nulQAEAOw=='],
	wagiri    :['P/rw////y','IIQPEci42dgzs1Ua77na7ShBoNR1YpilKmqtrOd+MVUAADs='],
	yajikazu  :['P/B/f///y','HoSPEMm5DZ8JtNoKmcyTo+1loBh25YVSX3mMnMsyBQA7'],
	yajirin   :['MD/wP///y','HISDicas2tpL0c1Qs968nwuGl0eWHqihmVqxRgEAOw=='],
	yajitatami:['MD/wP//wC','J4wPeRvpj9SbwLhG4WV8aZkpWBVWFkh1HHSSZTuGY7ypXYnSE/y2BQA7'],
	yosenabe  :['ODg/////y','JIwDd6nGjdqD0VFZr5qg+4ltGgiKJkWO4bJ8nVhCT8yeq20dBQA7'],

	/* カラーパレットが3-4色時のHeader(途中まで), 16×16サイズのData Block(途中から) */
	bosanowa  :['P/AwP/hw////////y','LowtAst5l1gTL6Q4r968e5VR0CUBToVJ55NOlQWqIhsvGv3l+j22/FgyzYAlRwEAOw=='],
	dosufuwa  :['JmZmbKysszMzP///y','KUyAYMuW3lhCMJ6plMXZXu59TyiSpIAKZmqoXoq2L6y6EV3PeLifbFAAADs='],
	sukororoom:['NDQ0ODg4PDw8P///y','NIwfgqebBqJpS8X7nL0g18B1FNJgHukkwsqu6ZiioISYmzljN51LewfhZHBBICw2aSmXggIAOw=='],
	view      :['MD/wP//wP///////y','LoQtEst5l1gTDykZXNq8+99hThWJFHlJ41OqJ5tOFdDKaAbmOnebc71YQWJBSgEAOw=='],
	wblink    :['NDQ0ODg4Pj4+P///y','LoQdIct5l1gLDykpXNq8+99hThWJFHlJ41OqJ5tOFdDKaAbmOnebc71YQWJBSgEAOw==']
	}[pid];

	/* 無い場合はimage.gifを返します */
	if(!data){ data=['MD/wPD/8C','KYQTpogKnFxbMDpa7W18yjhp1yGO1OidW5mSKFuaTyy585t0ctZ+EFAAADs='];}

	if(data[0].length<=10){ header='R0lGODdhEAAQAIAAA';}
	else                  { header='R0lGODdhEAAQAKEAA';}

	return "data:image/gif;base64,"+header+data[0]+'wAAAAAEAAQAAAC'+data[1];
}

// MenuArea.js v3.4.0
/* global ui:false, getEL:false, _doc:false */

// メニュー描画/取得/html表示系
ui.menuarea = {
	captions : [],				// 言語指定を切り替えた際のキャプションを保持する
	menuitem : null,			// メニューの設定切り替え用エレメント等を保持する
	nohover : false,			// :hover擬似クラスを使用しないでhover表示する
	
	//---------------------------------------------------------------------------
	// menuarea.reset()  メニュー、サブメニュー、フロートメニューの初期設定を行う
	//---------------------------------------------------------------------------
	reset : function(){
		this.createMenu();
		
		this.display();
	},

	//---------------------------------------------------------------------------
	// menuarea.createMenu()  メニューの初期設定を行う
	//---------------------------------------------------------------------------
	createMenu : function(){
		if(this.menuitem===null){
			this.modifySelector();
			
			this.menuitem = {};
			this.walkElement(getEL("menupanel"));
		}
		ui.misc.displayByPid(getEL("menupanel"));
		this.stopHovering();
	},

	//---------------------------------------------------------------------------
	// menuarea.walkElement()  エレメントを探索して領域の初期設定を行う
	//---------------------------------------------------------------------------
	walkElement : function(parent){
		var menuarea = this;
		function menufactory(role){
			return function(e){ menuarea[role](e); if(menuarea.nohover){ e.preventDefault(); e.stopPropagation();}};
		}
		function addmenuevent(el,type,role){
			var func = (typeof role==='function' ? role : menufactory(role));
			pzpr.util.addEvent(el, type, menuarea, func);
		}
		ui.misc.walker(parent, function(el){
			if(el.nodeType===1 && el.nodeName==="LI"){
				var setevent = false;
				var idname = ui.customAttr(el,"config");
				if(!!idname){
					menuarea.menuitem[idname] = {el:el};
					if(el.className==="check"){
						addmenuevent(el, "mousedown", "checkclick");
						setevent = true;
					}
				}
				var value = ui.customAttr(el,"value");
				if(!!value){
					var parent = el.parentNode.parentNode, idname = ui.customAttr(parent,"config");
					var item = menuarea.menuitem[idname];
					if(!item.children){ item.children=[];}
					item.children.push(el);
					
					addmenuevent(el, "mousedown", "childclick");
					setevent = true;
				}
				
				var role = ui.customAttr(el,"menuExec");
				if(!!role){
					addmenuevent(el, "mousedown", role);
					setevent = true;
				}
				role = ui.customAttr(el,"pressExec");
				if(!!role){
					var roles = role.split(/,/);
					addmenuevent(el, "mousedown", roles[0]);
					if(!!role[1]){
						addmenuevent(el, "mouseup", roles[1]);
						addmenuevent(el, "mouseleave", roles[1]);
						addmenuevent(el, "touchcancel", roles[1]);
					}
					setevent = true;
				}
				role = ui.customAttr(el,"popup");
				if(!!role){
					addmenuevent(el, "mousedown", "disppopup");
					setevent = true;
				}
				
				if(!setevent){
					if(!menuarea.nohover || !el.querySelector("menu")){
						addmenuevent(el, "mousedown", function(e){ e.preventDefault();});
					}
					else{
						addmenuevent(el, "mousedown", function(e){ menuarea.showHovering(e,el); e.preventDefault(); e.stopPropagation();});
					}
				}
				var link = ui.customAttr(el,"pidlink");
				if(!!link){
					el.firstChild.setAttribute("href", link+ui.puzzle.pid);
				}
			}
			else if(el.nodeType===1 && el.nodeName==="MENU"){
				var label = el.getAttribute("label");
				if(!!label && label.match(/^__(.+)__(.+)__$/)){
					menuarea.captions.push({menu:el, str_jp:RegExp.$1, str_en:RegExp.$2});
					if(menuarea.nohover){
						addmenuevent(el, "mousedown", function(e){ e.stopPropagation();});
					}
				}
			}
			else if(el.nodeType===3){
				if(el.data.match(/^__(.+)__(.+)__$/)){
					menuarea.captions.push({textnode:el, str_jp:RegExp.$1, str_en:RegExp.$2});
				}
			}
		});
	},

	//--------------------------------------------------------------------------------
	// menuarea.modifySelector()  MenuAreaに関するCSSセレクタテキストを変更する (Android向け)
	//--------------------------------------------------------------------------------
	modifySelector : function(){
		/* Android 4.0, iOS5.1以上向け処理です */
		if(!pzpr.env.OS.mobile || !getEL("menupanel").classList){ return;}
		var sheet = _doc.styleSheets[0];
		var rules = sheet.cssRules || sheet.rules;
		if(rules===null){} // Chromeでローカルファイルを開くとおかしくなるので、とりあえず何もしないようにします
		
		for(var i=0,len=rules.length;i<len;i++){
			var rule = rules[i];
			if(!rule.selectorText){ continue;}
			if(rule.selectorText.match(/\#menupanel.+\:hover.*/)){
				sheet.insertRule(rule.cssText.replace(":hover",".hovering"), i);
				sheet.deleteRule(i+1);
			}
		}
		this.nohover = true;
	},
	
	//--------------------------------------------------------------------------------
	// menuarea.showHovering()  MenuAreaのポップアップを表示する (Android向け)
	// menuarea.stopHovering()  MenuAreaのポップアップを消去する (Android向け)
	//--------------------------------------------------------------------------------
	showHovering : function(e,el0){
		if(!this.nohover){ return;}
		el0.classList.toggle("hovering");
		ui.misc.walker(getEL("menupanel"), function(el){
			if(el.nodeType===1 && !!el.classList && !el.contains(el0)){ el.classList.remove("hovering");}
		});
	},
	stopHovering : function(){
		if(!this.nohover){ return;}
		ui.misc.walker(getEL("menupanel"), function(el){
			if(el.nodeType===1 && !!el.classList){ el.classList.remove("hovering");}
		});
	},
	
	//---------------------------------------------------------------------------
	// menuarea.display()    全てのメニューに対して文字列を設定する
	// menuarea.setdisplay() サブメニューに表示する文字列を個別に設定する
	//---------------------------------------------------------------------------
	display : function(){
		getEL('menupanel').style.display = "";
		
		getEL("menu_imagesave").className = (ui.enableSaveImage ? "" : "disabled");
		getEL("menu_subclear").style.display  = (!ui.puzzle.board.disable_subclear ? "" : "none");
		
		var EDITOR = !ui.puzzle.playeronly;
		getEL("menu_newboard").style.display  = (EDITOR ? "" : "none");
		getEL("menu_urloutput").style.display = (EDITOR ? "" : "none");
		getEL("menu_metadata").style.display  = (EDITOR ? "" : "none");
		getEL("menu_adjust").style.display    = (EDITOR ? "" : "none");
		getEL("menu_turnflip").style.display  = (EDITOR ? "" : "none");
		getEL("menu_sep_edit1").style.display = (EDITOR ? "" : "none");
		
		for(var idname in this.menuitem){ this.setdisplay(idname);}
		this.setdisplay("operation");
		this.setdisplay("trialmode");
		this.setdisplay("toolarea");
		
		/* キャプションの設定 */
		for(var i=0;i<this.captions.length;i++){
			var obj = this.captions[i];
			if(!!obj.textnode) { obj.textnode.data = ui.selectStr(obj.str_jp, obj.str_en);}
			else if(!!obj.menu){ obj.menu.setAttribute("label", ui.selectStr(obj.str_jp, obj.str_en));}
		}
	},
	setdisplay : function(idname){
		if(idname==="operation"){
			var opemgr = ui.puzzle.opemgr;
			getEL('menu_oldest').className = (opemgr.enableUndo ? "" : "disabled");
			getEL('menu_undo').className   = (opemgr.enableUndo ? "" : "disabled");
			getEL('menu_redo').className   = (opemgr.enableRedo ? "" : "disabled");
			getEL('menu_latest').className = (opemgr.enableRedo ? "" : "disabled");
		}
		else if(idname==='trialmode'){
			var trialstage = ui.puzzle.board.trialstage;
			getEL('menu_trialenter').className         = ((trialstage===0) ? '' : 'disabled');
			getEL('menu_trialenter').nextSibling.nextSibling.style.display = ((trialstage>0) ? '' : 'none'); // hr tag
			getEL('menu_trialaccept').style.display    = ((trialstage>0) ? '' : 'none');
			getEL('menu_trialreject').style.display    = ((trialstage===1)? '' : 'none');
			getEL('menu_trialreject2').style.display   = ((trialstage>1) ? '' : 'none');
			getEL('menu_trialrejectall').style.display = ((trialstage>1) ? '' : 'none');
			getEL('menu_trialenter2').style.display    = ((trialstage>0) ? '' : 'none');
		}
		else if(idname==="toolarea"){
			var str;
			if(!ui.menuconfig.get("toolarea")){ str = ui.selectStr("ツールエリアを表示","Show tool area");}
			else                              { str = ui.selectStr("ツールエリアを隠す","Hide tool area");}
			getEL('menu_toolarea').childNodes[0].data = str;
		}
		else if(this.menuitem===null || !this.menuitem[idname]){
			/* DO NOTHING */
		}
		else if(ui.menuconfig.valid(idname)){
			var menuitem = this.menuitem[idname];
			menuitem.el.style.display = "";
			
			/* セレクタ部の設定を行う */
			if(!!menuitem.children){
				var children = menuitem.children;
				var validval = (idname==='inputmode' ? ui.puzzle.mouse.getInputModeList() : null);
				for(var i=0;i<children.length;i++){
					var child = children[i], value = ui.customAttr(child,"value"), selected = (value===""+ui.menuconfig.get(idname));
					child.className = (selected ? "checked" : "");
					child.style.display = ((validval===null || validval.indexOf(value)>=0) ? '' : 'none');
				}
			}
			/* Check部の表記の変更 */
			else if(!!menuitem.el){
				var cname = (ui.menuconfig.get(idname) ? "checked" : "check");
				var disabled = null;
				if(idname==="passallcell"){ disabled = !ui.puzzle.editmode;}
				if(disabled===true){ cname += " disabled";}
				
				menuitem.el.className = cname;
			}
		}
		else if(!!this.menuitem[idname]){
			this.menuitem[idname].el.style.display = "none";
		}
	},

	//---------------------------------------------------------------------------
	// menuarea.checkclick()   メニューから設定値の入力があった時、設定を変更する
	// menuarea.childclick()   メニューから設定値の入力があった時、設定を変更する
	//---------------------------------------------------------------------------
	checkclick : function(e){
		var el = e.target;
		if(el.nodeName==="SPAN"){ el = el.parentNode;}
		if(el.className.match(/disabled/)){ return;}
		
		var idname = ui.customAttr(el,"config");
		ui.menuconfig.set(idname, !ui.menuconfig.get(idname));
	},
	childclick : function(e){
		var el = e.target;
		if(el.nodeName==="SPAN"){ el = el.parentNode;}
		
		var parent = el.parentNode.parentNode;
		ui.menuconfig.set(ui.customAttr(parent,"config"), ui.customAttr(el,"value"));
	},

	//---------------------------------------------------------------------------
	// メニューがクリックされた時の動作を呼び出す
	//---------------------------------------------------------------------------
	// submenuから呼び出される関数たち
	anscheck : function(){ this.answercheck();},
	undo     : function(){ ui.undotimer.startButtonUndo();},
	undostop : function(){ ui.undotimer.stopButtonUndo();},
	undoall  : function(){ ui.puzzle.undoall();},
	redo     : function(){ ui.undotimer.startButtonRedo();},
	redostop : function(){ ui.undotimer.stopButtonRedo();},
	redoall  : function(){ ui.puzzle.redoall();},
	ansclear : function(){ this.ACconfirm();},
	subclear : function(){ this.ASconfirm();},
	dropblocks  : function(){ ui.puzzle.board.operate('drop');},
	raiseblocks : function(){ ui.puzzle.board.operate('raise');},
	resetblocks : function(){ ui.puzzle.board.operate('resetpos');},
	showgatenum : function(){ ui.puzzle.board.operate('showgatenumber');},
	hidegatenum : function(){ ui.puzzle.board.operate('hidegatenumber');},
	enterTrial         : function(){ if(ui.puzzle.board.trialstage===0){ ui.puzzle.enterTrial();}},
	enterFurtherTrial  : function(){ ui.puzzle.enterTrial();},
	acceptTrial        : function(){ ui.puzzle.acceptTrial();},
	rejectTrial        : function(){ ui.puzzle.rejectTrial();},
	rejectCurrentTrial : function(){ ui.puzzle.rejectCurrentTrial();},
	duplicate: function(){ this.duplicate_board();},
	toolarea : function(){
		ui.menuconfig.set("toolarea", !ui.menuconfig.get("toolarea"));
		ui.displayAll();
	},
	repaint : function(){ ui.puzzle.redraw(true);},
	disppopup : function(e){
		var el = e.target;
		if(el.nodeName==="SPAN"){ el = el.parentNode;}
		if(el.className!=="disabled"){
			var idname = ui.customAttr(el,"popup");
			if(idname==='database'){
				if(pzpr.util.currentTime() > parseInt(localStorage['pzprv3_storage:warning-time'] || 0) + 43200000){ // 12hours
					ui.notify.alert("ブラウザのデータクリア等で意図せずデータが消えることありますので、長期保存に使用しないでください",
									"Don't use this for long-term use as these data will be cleared unexpectedly due to browser's cache clear etc.");
					localStorage['pzprv3_storage:warning-time'] = pzpr.util.currentTime();
				}
			}
			if(!pzpr.env.OS.mobile){
				var pos = pzpr.util.getPagePos(e);
				ui.popupmgr.open(idname, pos.px-8, pos.py-8);
			}
			else{
				var rect = pzpr.util.getRect(getEL("menupanel"));
				ui.popupmgr.open(idname, 8, rect.bottom+8);
			}
			this.stopHovering();
		}
	},
	dispdebug : function(){
		ui.popupmgr.open("debug", 0, 0);
		this.stopHovering();
	},

	//------------------------------------------------------------------------------
	// menuarea.duplicate_board() 盤面の複製を行う => 受取はBoot.jsのimportFileData()
	//------------------------------------------------------------------------------
	duplicate_board : function(){
		if(getEL("menu_duplicate").className==="disabled"){ return;}
		var filestr = ui.puzzle.getFileData(pzpr.parser.FILE_PZPR, {history:true});
		var url = './p?'+ui.puzzle.pid+(ui.puzzle.playeronly?"_play":"");
		if(!pzpr.env.browser.Presto){
			var old = sessionStorage['filedata'];
			sessionStorage['filedata'] = filestr;
			window.open(url,'');
			if(!!old){ sessionStorage['filedata'] = old;}
			else     { delete sessionStorage['filedata'];}
		}
		else{
			localStorage['pzprv3_filedata'] = filestr;
			window.open(url,'');
		}
		this.stopHovering();
	},

	//------------------------------------------------------------------------------
	// menuarea.answercheck()「正答判定」ボタンを押したときの処理
	// menuarea.ACconfirm()  「解答消去」ボタンを押したときの処理
	// menuarea.ASconfirm()  「補助消去」ボタンを押したときの処理
	//------------------------------------------------------------------------------
	answercheck : function(){
		var check = ui.puzzle.check(true);
		if(check.complete){
			ui.timer.stop();
			if(ui.callbackComplete){
				ui.callbackComplete(ui.puzzle, check);
			}
		}
		var str = "", texts = check.text.split(/\n/);
		for(var i=0;i<texts.length;i++){ str += "<div style=\"margin-bottom:6pt;\">"+texts[i]+"</div>";}
		this.stopHovering();
		ui.notify.alert(str);
	},
	ACconfirm : function(){
		this.stopHovering();
		ui.notify.confirm("解答を消去しますか？","Do you want to erase the Answer?", function(){ ui.puzzle.ansclear();});
	},
	ASconfirm : function(){
		this.stopHovering();
		ui.notify.confirm("補助記号を消去しますか？","Do you want to erase the auxiliary marks?", function(){ ui.puzzle.subclear();});
	}
};

// Menu.js v3.4.0
/* global ui:false, _doc:false, getEL:false */

//---------------------------------------------------------------------------
// ★PopupManagerクラス ポップアップメニューを管理します
//---------------------------------------------------------------------------
ui.popupmgr =
{
	popup     : null,	/* 表示中のポップアップメニュー */
	
	popups    : {},		/* 管理しているポップアップメニューのオブジェクト一覧 */
	
	movingpop : null,	/* 移動中のポップアップメニュー */
	offset : {px:0, py:0},	/* 移動中ポップアップメニューのページ左上からの位置 */
	
	//---------------------------------------------------------------------------
	// popupmgr.reset()      ポップアップメニューの設定をクリアする
	// popupmgr.setEvents()  ポップアップメニュー(タイトルバー)のイベントを設定する
	//---------------------------------------------------------------------------
	reset : function(){
		/* イベントを割り当てる */
		this.setEvents();
		
		/* Captionを設定する */
		this.translate();
	},
	
	setEvents : function(){
		ui.event.addEvent(_doc, "mousemove", this, this.titlebarmove);
		ui.event.addEvent(_doc, "mouseup",   this, this.titlebarup);
	},

	//---------------------------------------------------------------------------
	// popupmgr.translate()  言語切り替え時にキャプションを変更する
	//---------------------------------------------------------------------------
	translate : function(){
		for(var name in this.popups){ this.popups[name].translate();}
	},

	//---------------------------------------------------------------------------
	// popupmgr.addpopup()   ポップアップメニューを追加する
	//---------------------------------------------------------------------------
	addpopup : function(idname, proto){
		var NewPopup = {}, template = this.popups.template || {};
		for(var name in template){ NewPopup[name] = template[name];}
		for(var name in proto)   { NewPopup[name] = proto[name];}
		this.popups[idname] = NewPopup;
	},

	//---------------------------------------------------------------------------
	// popupmgr.open()  ポップアップメニューを開く
	//---------------------------------------------------------------------------
	open : function(idname, px, py){
		var target = this.popups[idname] || null;
		if(target!==null){
			/* 表示しているウィンドウがある場合は閉じる */
			if(!target.multipopup && !!this.popup){ this.popup.close();}
			
			/* ポップアップメニューを表示する */
			target.show(px, py);
			return true;
		}
		return false;
	},

	//---------------------------------------------------------------------------
	// popupmgr.titlebardown()  タイトルバーをクリックしたときの動作を行う(タイトルバーにbind)
	// popupmgr.titlebarup()    タイトルバーでボタンを離したときの動作を行う(documentにbind)
	// popupmgr.titlebarmove()  タイトルバーからマウスを動かしたときポップアップメニューを動かす(documentにbind)
	//---------------------------------------------------------------------------
	titlebardown : function(e){
		var popel = e.target.parentNode;
		var pos = pzpr.util.getPagePos(e);
		this.movingpop = popel;
		this.offset.px = pos.px - parseInt(popel.style.left,10);
		this.offset.py = pos.py - parseInt(popel.style.top,10);
		ui.event.enableMouse = false;
		e.preventDefault();
		e.stopPropagation();
	},
	titlebarup : function(e){
		var popel = this.movingpop;
		if(!!popel){
			this.movingpop = null;
			ui.event.enableMouse = true;
		}
	},
	titlebarmove : function(e){
		var popel = this.movingpop;
		if(!!popel){
			var pos = pzpr.util.getPagePos(e);
			popel.style.left = pos.px - this.offset.px + 'px';
			popel.style.top  = pos.py - this.offset.py + 'px';
			e.preventDefault();
		}
	}
};

//---------------------------------------------------------------------------
// ★PopupMenuクラス ポップアップメニューを作成表示するベースのオブジェクトです
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('template',
{
	formname : '',
	multipopup : false,
	pid : '',

	init : function(){ // 初回1回のみ呼び出される
		this.form      = document[this.formname];
		this.pop       = this.form.parentNode;
		this.titlebar  = this.pop.querySelector('.titlebar') || null;
		if(!!this.titlebar){
			pzpr.util.unselectable(this.titlebar);
			pzpr.util.addEvent(this.titlebar, "mousedown", ui.popupmgr, ui.popupmgr.titlebardown);
		}
		pzpr.util.addEvent(this.form, "submit", this, function(e){ e.preventDefault();});

		this.walkCaption(this.pop);
		this.translate();

		this.walkEvent(this.pop);
	},
	reset : function(){ // パズルの種類が変わったら呼び出される
	},

	translate : function(){
		if(!this.captions){ return;}
		for(var i=0;i<this.captions.length;i++){
			var obj  = this.captions[i];
			var text = ui.selectStr(obj.str_jp, obj.str_en);
			if   (!!obj.textnode){ obj.textnode.data = text;}
			else if(!!obj.button){ obj.button.value  = text;}
		}
	},

	walkCaption : function(parent){
		var popup = this;
		this.captions  = [];
		ui.misc.walker(parent, function(el){
			if(el.nodeType===3 && el.data.match(/^__(.+)__(.+)__$/)){
				popup.captions.push({textnode:el, str_jp:RegExp.$1, str_en:RegExp.$2});
			}
		});
	},
	walkEvent : function(parent){
		var popup = this;
		function eventfactory(role){
			return function(e){ popup[role](e); if(e.type!=='click'){ e.preventDefault(); e.stopPropagation();}};
		}
		ui.misc.walker(parent, function(el){
			if(el.nodeType!==1){ return;}
			var role = ui.customAttr(el,"buttonExec");
			if(!!role){
				pzpr.util.addEvent(el, (!pzpr.env.API.touchevent ? "click" : "mousedown"), popup, eventfactory(role));
			}
			role = ui.customAttr(el,"changeExec");
			if(!!role){
				pzpr.util.addEvent(el, "change", popup, eventfactory(role));
			}
		});
	},

	show : function(px,py){ // 表示するたびに呼び出される
		if(!this.pop){ this.init();}
		if(this.pid!==ui.puzzle.pid){
			this.pid = ui.puzzle.pid;
			this.reset();
		}
		
		this.pop.style.left = px + 'px';
		this.pop.style.top  = py + 'px';
		this.pop.style.display = 'inline';
		if(!this.multipopup){
			ui.popupmgr.popup = this;
		}
	},
	close : function(){
		this.pop.style.display = "none";
		if(!this.multipopup){
			ui.popupmgr.popup = null;
		}
		
		ui.puzzle.key.enableKey = true;
		ui.puzzle.mouse.enableMouse = true;
	}
});

//---------------------------------------------------------------------------
// ★Popup_NewBoardクラス 新規盤面作成のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('newboard',
{
	formname : 'newboard',
	
	reset : function(){
		ui.misc.displayByPid(this.pop);
		if(this.pid!=='tawa'){ return;}
		for(var i=0;i<=3;i++){
			var _div = getEL("nb_shape_"+i), _img = _div.children[0];
			_img.src = "data:image/gif;base64,R0lGODdhgAAgAKEBAAAAAP//AP//////ACwAAAAAgAAgAAAC/pSPqcvtD6OctNqLs968+98A4kiWJvmcquisrtm+MpAAwY0Hdn7vPN1aAGstXs+oQw6FyqZxKfDlpDhqLyXMhpw/ZfHJndbCVW9QATWkEdYk+Pntvn/j+dQc0hK39jKcLxcoxkZ29JeHpsfUZ0gHeMeoUyfo54i4h7lI2TjI0PaJp1boZumpeLCGOvoZB7kpyTbzIiTrglY7o4Yrc8l2irYamjiciar2G4VM7Lus6fpcdVZ8PLxmrTyd3AwcydprvK19HZ6aPf5YCX31TW3ezuwOcQ7vGXyIPA+e/w6ORZ5ir9S/gfu0ZRt4UFU3YfHiFSyoaxeMWxJLUKx4IiLGZIn96HX8iNBjQ5EG8Zkk+dDfyJAgS7Lkxy9lOJTYXMK0ibOlTJ0n2eEs97OnUJ40X668SfRo0ZU7SS51erOp0XxSkSaFGtTo1a0bUcSo9bVr2I0gypo9izat2rVs27p9Czfu2QIAOw==";
			_img.style.clip = "rect(0px,"+((i+1)*32)+"px,"+32+"px,"+(i*32)+"px)";
		}
	},
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		ui.puzzle.key.enableKey = false;
		
		switch(ui.puzzle.pid){
			case 'sudoku': this.setsize_sudoku(); break;
			case 'tawa':   this.setsize_tawa();   break;
			default:       this.setsize();        break;
		}
	},

	//---------------------------------------------------------------------------
	// setsize()   盤面のサイズをセットする
	// getsize()   盤面のサイズを取得する
	//---------------------------------------------------------------------------
	setsize : function(){
		var bd = ui.puzzle.board;
		this.form.col.value=''+bd.cols;
		this.form.row.value=''+bd.rows;
	},
	getsize : function(){
		var col = this.form.col.value|0;
		var row = this.form.row.value|0;
		return ((!!col && !!row) ? {col:col, row:row} : null);
	},

	//---------------------------------------------------------------------------
	// setsize_sudoku()   盤面のサイズをセットする (数独向け)
	// getsize_sudoku()   盤面のサイズを取得する (数独向け)
	//---------------------------------------------------------------------------
	setsize_sudoku : function(){
		for(var i=0;i<4;i++){ getEL("nb_size_sudoku_"+i).checked = '';}
		switch(ui.puzzle.board.cols){
			case 16: getEL("nb_size_sudoku_2").checked = true; break;
			case 25: getEL("nb_size_sudoku_3").checked = true; break;
			case  4: getEL("nb_size_sudoku_0").checked = true; break;
			case  6: getEL("nb_size_sudoku_4").checked = true; break;
			default: getEL("nb_size_sudoku_1").checked = true; break;
		}
	},
	getsize_sudoku : function(){
		var col, row;
		if     (getEL("nb_size_sudoku_2").checked){ col=row=16;}
		else if(getEL("nb_size_sudoku_3").checked){ col=row=25;}
		else if(getEL("nb_size_sudoku_0").checked){ col=row= 4;}
		else if(getEL("nb_size_sudoku_4").checked){ col=row= 6;}
		else                                      { col=row= 9;}
		return {col:col, row:row};
	},

	//---------------------------------------------------------------------------
	// setsize_tawa()   盤面のサイズをセットする (たわむれんが向け)
	// getsize_tawa()   盤面のサイズを取得する (たわむれんが向け)
	//---------------------------------------------------------------------------
	setsize_tawa : function(){
		/* タテヨコのサイズ指定部分 */
		var bd = ui.puzzle.board, col = bd.cols, row = bd.rows, shape = bd.shape;
		
		if(shape===3){ col++;}
		this.form.col.value=''+col;
		this.form.row.value=''+row;
		
		/* たわむレンガの形状指定ルーチン */
		this.setshape(shape);
	},
	getsize_tawa : function(){
		var col = this.form.col.value|0;
		var row = this.form.row.value|0;
		if(!col || !row){ return null;}
		
		var shape = this.getshape();
		if(!isNaN(shape) && !(col===1 && (shape===0||shape===3))){
			if(shape===3){ col--;}
		}
		else{ return null;}
		
		return {col:col, row:row, shape:shape};
	},

	//---------------------------------------------------------------------------
	// setshape()   たわむれんの形状から形状指定ボタンの初期値をセットする
	// getshape()   たわむれんがのどの形状が指定されか取得する
	// clickshape() たわむれんがの形状指定ボタンを押した時の処理を行う
	// setshapeidx() たわむれんがの形状指定ボタンに背景色を設定する
	// getshapeidx() たわむれんがの形状指定ボタン背景色からインデックスを取得する
	//---------------------------------------------------------------------------
	setshape : function(shape){
		this.setshapeidx([0,2,3,1][shape]);
	},
	getshape : function(){
		var idx = this.getshapeidx();
		return (idx!==null ? [0,3,1,2][idx] : null);
	},
	clickshape : function(e){
		this.setshapeidx(+e.target.parentNode.id.charAt(9));
	},

	setshapeidx : function(idx){
		for(var i=0;i<=3;i++){
			getEL("nb_shape_"+i).style.backgroundColor = (i===idx?'red':'');
		}
	},
	getshapeidx : function(){
		for(var i=0;i<=3;i++){
			if(getEL("nb_shape_"+i).style.backgroundColor==='red'){ return i;}
		}
		return null;
	},

	//---------------------------------------------------------------------------
	// execute() 新規盤面を作成するボタンを押したときの処理を行う
	//---------------------------------------------------------------------------
	execute : function(){
		var pid = ui.puzzle.pid;
		var obj;
		switch(pid){
			case 'sudoku': obj = this.getsize_sudoku(); break;
			case 'tawa':   obj = this.getsize_tawa();   break;
			default:       obj = this.getsize();        break;
		}
		
		this.close();
		if(!!obj){
			var url = pid+'/'+obj.col+'/'+obj.row;
			if(pid==='tawa'){ url += ('/'+obj.shape);}
			ui.puzzle.open(url);
		}
	}
});

//---------------------------------------------------------------------------
// ★Popup_URLInputクラス URL入力のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('urlinput',
{
	formname : 'urlinput',
	
	//------------------------------------------------------------------------------
	// urlinput() URLを入力する
	//------------------------------------------------------------------------------
	urlinput : function(){
		this.close();
		ui.puzzle.open(this.form.ta.value.replace(/\n/g,""));
	}
});

//---------------------------------------------------------------------------
// ★Popup_URLOutputクラス URL出力のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('urloutput',
{
	formname : 'urloutput',
	
	reset : function(px,py){
		var form = this.form, pid = ui.puzzle.pid, exists = pzpr.variety(pid).exists;
		form.ta.value = '';
		// form.pzprapp.style.display = form.pzprapp.nextSibling.style.display = (exists.pzprapp ? "" : "none");
		form.kanpen.style.display  = form.kanpen.nextSibling.style.display  = (exists.kanpen ? "" : "none");
		form.heyaapp.style.display = form.heyaapp.nextSibling.style.display = ((pid==="heyawake") ? "" : "none");
	},
	
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		this.reset(px,py);
	},

	//------------------------------------------------------------------------------
	// urloutput() URLを出力する
	// openurl()   「このURLを開く」を実行する
	//------------------------------------------------------------------------------
	urloutput : function(e){
		var url = '', parser = pzpr.parser;
		switch(e.target.name){
			case "pzprv3":     url = ui.puzzle.getURL(parser.URL_PZPRV3);  break;
			// case "pzprapp": url = ui.puzzle.getURL(parser.URL_PZPRAPP); break;
			case "kanpen":     url = ui.puzzle.getURL(parser.URL_KANPEN);  break;
			case "pzprv3e":    url = ui.puzzle.getURL(parser.URL_PZPRV3).replace(/\?(\w+)/,"?$1_edit"); break;
			case "heyaapp":    url = ui.puzzle.getURL(parser.URL_HEYAAPP); break;
		}
		this.form.ta.value = url;
	},
	openurl : function(e){
		if(this.form.ta.value!==''){
			window.open(this.form.ta.value, '', '');
		}
	}
});

//---------------------------------------------------------------------------
// ★Popup_FileOpenクラス ファイル入力のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('fileopen',
{
	formname : 'fileform',
	
	init : function(){
		ui.popupmgr.popups.template.init.call(this);
	},
	
	//------------------------------------------------------------------------------
	// fileopen()  ファイルを開く
	//------------------------------------------------------------------------------
	fileopen : function(e){
		var fileEL = this.form.filebox;
		if(!!ui.reader || ui.enableGetText){
			var fitem = fileEL.files[0];
			if(!fitem){ return;}
			
			if(!!ui.reader){ ui.reader.readAsText(fitem);}
			else           { ui.puzzle.open(fitem.getAsText(''));}
		}
		this.form.reset();
		this.close();
	}
});

//---------------------------------------------------------------------------
// ★Popup_FileSaveクラス ファイル出力のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('filesave',
{
	formname : 'filesave',
	anchor : null,
	init : function(){
		ui.popupmgr.popups.template.init.call(this);
		
		this.anchor = ((!ui.enableSaveBlob && pzpr.env.API.anchor_download) ? getEL("saveanchor") : null);
	},
	reset : function(){
		/* ファイル形式選択オプション */
		var ispencilbox = pzpr.variety(ui.puzzle.pid).exists.pencilbox;
		this.form.filetype.options[1].disabled = !ispencilbox;
		this.form.filetype.options[2].disabled = !ispencilbox;
	},
	/* オーバーライド */
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		
		this.form.filename.value = ui.puzzle.pid + '.txt';
		this.changefilename();
		
		ui.puzzle.key.enableKey = false;
	},
	close : function(){
		if(!!this.filesaveurl){ URL.revokeObjectURL(this.filesaveurl);}
		
		ui.popupmgr.popups.template.close.call(this);
	},
	changefilename : function(){
		var filetype = this.form.filetype.value;
		var filename = this.form.filename.value.replace('.xml','').replace('.txt','');
		var ext = (filetype!=='filesave4'?'.txt':'.xml');
		var pinfo = pzpr.variety(filename);
		if(pinfo.pid===ui.puzzle.pid){
			if(filetype==='filesave'||filetype==='filesave3'){
				filename = pinfo.urlid;
			}
			else{
				filename = pinfo.kanpenid;
			}
		}
		this.form.filename.value = filename + ext;
	},
	
	//------------------------------------------------------------------------------
	// filesave()  ファイルを保存する
	//------------------------------------------------------------------------------
	filesaveurl : null,
	filesave : function(){
		var form = this.form;
		var filename = form.filename.value;
		var prohibit = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
		for(var i=0;i<prohibit.length;i++){
			if(filename.indexOf(prohibit[i])!==-1){ ui.notify.alert('ファイル名として使用できない文字が含まれています。'); return;}
		}

		var parser = pzpr.parser, filetype = parser.FILE_PZPR, option = {};
		switch(form.filetype.value){
			case 'filesave2': filetype = parser.FILE_PBOX; break;
			case 'filesave4': filetype = parser.FILE_PBOX_XML; break;
			case 'filesave3': filetype = parser.FILE_PZPR; option.history = true; break;
		}

		var blob = null, filedata = null;
		if(ui.enableSaveBlob || !!this.anchor){
			blob = new Blob([ui.puzzle.getFileData(filetype, option)], {type:'text/plain'});
		}
		else{
			filedata = ui.puzzle.getFileData(filetype, option);
		}

		if(ui.enableSaveBlob){
			navigator.saveBlob(blob, filename);
			this.close();
		}
		else if(!!this.anchor){
			if(!!this.filesaveurl){ URL.revokeObjectURL(this.filesaveurl);}
			this.filesaveurl = URL.createObjectURL(blob);
			this.anchor.href = this.filesaveurl;
			this.anchor.download = filename;
			this.anchor.click();
		}
		else{
			form.ques.value = filedata;
			form.operation.value = (form.filetype.value!=='filesave4' ? 'save' : 'savexml');
			form.submit();
			this.close();
		}

		ui.puzzle.saved();
	}
});

//---------------------------------------------------------------------------
// ★Popup_ImageSaveクラス 画像出力のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('imagesave',
{
	formname : 'imagesave',
	anchor : null,
	showsize : null,
	init : function(){
		ui.popupmgr.popups.template.init.call(this);
		
		this.anchor = ((!ui.enableSaveBlob && pzpr.env.API.anchor_download) ? getEL("saveanchor") : null);
		this.showsize = getEL("showsize");
		
		/* ファイル形式選択オプション */
		var filetype = this.form.filetype, options = filetype.options;
		for(var i=0;i<options.length;i++){
			var option = options[i];
			if(!ui.enableImageType[option.value]){ filetype.removeChild(option); i--;}
		}
	},
	
	/* オーバーライド */
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		
		ui.puzzle.key.enableKey = false;
		ui.puzzle.mouse.enableMouse = false;
		
		this.form.filename.value = pzpr.variety(ui.puzzle.pid).urlid+".png";
		this.form.cellsize.value = ui.menuconfig.get('cellsizeval');
		
		this.changefilename();
		this.estimatesize();
	},
	close : function(){
		if(!!this.saveimageurl){ URL.revokeObjectURL(this.saveimageurl);}
		
		ui.puzzle.setCanvasSize();
		ui.popupmgr.popups.template.close.call(this);
	},
	
	changefilename : function(){
		var filename = this.form.filename.value.replace(/\.\w{3,4}$/,'.');
		this.form.filename.value = filename + this.form.filetype.value;
	},
	estimatesize : function(){
		var cellsize = +this.form.cellsize.value;
		var width  = (+cellsize * ui.puzzle.painter.getCanvasCols())|0;
		var height = (+cellsize * ui.puzzle.painter.getCanvasRows())|0;
		this.showsize.replaceChild(_doc.createTextNode(width+" x "+height), this.showsize.firstChild);
	},
	
	//------------------------------------------------------------------------------
	// saveimage()    画像をダウンロードする
	// submitimage() "画像をダウンロード"の処理ルーチン
	// saveimage()   "画像をダウンロード"の処理ルーチン (IE10用)
 	//------------------------------------------------------------------------------
	saveimageurl : null,
	saveimage : function(){
		/* ファイル名チェックルーチン */
		var form = this.form;
		var filename = form.filename.value;
		var prohibit = ['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
		for(var i=0;i<prohibit.length;i++){
			if(filename.indexOf(prohibit[i])!==-1){ ui.notify.alert('ファイル名として使用できない文字が含まれています。'); return;}
		}

		/* 画像出力ルーチン */
		var option = {cellsize:+this.form.cellsize.value};
		if(this.form.transparent.checked){ option.bgcolor = '';}
		var type = form.filetype.value;

		try{
			if(ui.enableSaveBlob || !!this.anchor){
				ui.puzzle.toBlob(function(blob){
					/* 出力された画像の保存ルーチン */
					if(ui.enableSaveBlob){
						navigator.saveBlob(blob, filename);
						this.close();
					}
					else{
						if(!!this.filesaveurl){ URL.revokeObjectURL(this.filesaveurl);}
						this.filesaveurl = URL.createObjectURL(blob);
						this.anchor.href = this.filesaveurl;
						this.anchor.download = filename;
						this.anchor.click();
						this.close();
					}
				}.bind(this), type, 1.0, option);
			}
			else{
				/* 出力された画像の保存ルーチン */
				form.urlstr.value = ui.puzzle.toDataURL(type, 1.0, option).replace(/data:.*;base64,/, '');
				form.submit();
				this.close();
			}
		}
		catch(e){
			ui.notify.alert('画像の出力に失敗しました','Fail to Output the Image');
		}
	},
	
 	//------------------------------------------------------------------------------
	// openimage()   "別ウィンドウで開く"の処理ルーチン
	//------------------------------------------------------------------------------
	openimage : function(){
		/* 画像出力ルーチン */
		var option = {cellsize:+this.form.cellsize.value};
		if(this.form.transparent.checked){ option.bgcolor = '';}
		var type = this.form.filetype.value;
		var IEkei = navigator.userAgent.match(/(Trident|Edge)\//);
		
		var dataurl = "";
		try{
			if(!IEkei || type!=='svg'){
				dataurl = ui.puzzle.toDataURL(type, 1.0, option);
			}
			else{
				dataurl = ui.puzzle.toBuffer('svg', option);
			}
		}
		catch(e){
			ui.notify.alert('画像の出力に失敗しました','Fail to Output the Image');
		}
		if(!dataurl){ /* No Data URL */ return;}
		
		/* 出力された画像を開くルーチン */
		function writeContent(blob){
			var filename = this.form.filename.value;
			var cdoc = window.open('', '', '').document;
			cdoc.open();
			cdoc.writeln("<!DOCTYPE html>\n<HTML LANG=\"ja\">\n<HEAD>");
			cdoc.writeln("<META CHARSET=\"utf-8\">");
			cdoc.writeln("<TITLE>ぱずぷれv3<\/TITLE>\n<\/HEAD><BODY>");
			if(!!blob){
				cdoc.writeln("<img src=\"", dataurl, "\"><br>\n");
				cdoc.writeln("<a href=\"", cdoc.defaultView.URL.createObjectURL(blob), "\" download=\"", filename, "\">Download ", filename, "</a>");
			}
			else if(!IEkei || type!=='svg'){
				cdoc.writeln("<img src=\"", dataurl, "\">");
			}
			else{
				cdoc.writeln(dataurl.replace(/^<\?.+?\?>/,''));
			}
			cdoc.writeln("<\/BODY>\n<\/HTML>");
			cdoc.close();
		}
		if(pzpr.env.API.anchor_download){
			// ChromeでDataURLが直接開けない対策
			ui.puzzle.toBlob(writeContent.bind(this), type, 1.0, option);
		}
		else{
			writeContent(null);
		}
	}
});

//---------------------------------------------------------------------------
// ★Popup_Adjustクラス 盤面の調整のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('adjust',
{
	formname : 'adjust',
	
	adjust : function(e){
		ui.puzzle.board.operate(e.target.name);
	}
});

//---------------------------------------------------------------------------
// ★Popup_TurnFlipクラス 回転・反転のポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('turnflip',
{
	formname : 'turnflip',
	
	reset : function(){
		this.form.turnl.disabled = (ui.puzzle.pid==='tawa');
		this.form.turnr.disabled = (ui.puzzle.pid==='tawa');
	},
	
	adjust : function(e){
		ui.puzzle.board.operate(e.target.name);
	}
});

//---------------------------------------------------------------------------
// ★Popup_Metadataクラス メタデータの設定・表示を行うメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('metadata',
{
	formname : 'metadata',
	
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		
		var form = this.form;
		var puzzle = ui.puzzle, bd = puzzle.board, meta = puzzle.metadata;
		getEL("metadata_variety").innerHTML = pzpr.variety(puzzle.pid)[pzpr.lang] + "&nbsp;" + bd.cols+"×"+bd.rows;
		form.author.value  = meta.author;
		form.source.value  = meta.source;
		form.hard.value    = meta.hard;
		form.comment.value = meta.comment;
	},

	save : function(){
		var form = this.form;
		var puzzle = ui.puzzle, meta = puzzle.metadata;
		meta.author  = form.author.value;
		meta.source  = form.source.value;
		meta.hard    = form.hard.value;
		meta.comment = form.comment.value;
		this.close();
	}
});

//---------------------------------------------------------------------------
// ★Popup_Colorsクラス 色の選択を行うメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('colors',
{
	formname : 'colors',
	colorElement : true,
	
	init : function(){
		ui.popupmgr.popups.template.init.call(this);
		
		ui.misc.walker(this.form, function(el){
			var target = ui.customAttr(el.parentNode,"colorTarget") || '';
			if(el.nodeName==="INPUT" && el.getAttribute("type")==="color"){
				if(el.type!=="color"){ this.colorElement = false;}
				el.addEventListener('change', function(e){ this.setcolor(e, target);}.bind(this), false);
			}
			if(el.nodeName==="BUTTON"){
				el.addEventListener('mousedown', function(e){ this.clearcolor(e, target);}.bind(this), false);
			}
		}.bind(this));
	},
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		this.refresh();
	},

	//------------------------------------------------------------------------------
	// refresh()    フォームに表示される色を再設定する
	//------------------------------------------------------------------------------
	refresh : function(name){
		ui.misc.walker(this.form, function(el){
			if(el.nodeName==="INPUT" && el.getAttribute("type")==="color"){
				var target = ui.customAttr(el.parentNode,"colorTarget") || '';
				if(!!target && (!name || name===target)){
					el.value = this.getdefaultcolor(target);
				}
			}
		}.bind(this));
	},
	getdefaultcolor : function(name){
		var color = '';
		if(name!=='bgcolor'){
			color = pzpr.Candle.parse(ui.puzzle.painter[name]);
		}
		else{
			color = ui.menuconfig.get("color_"+name);
		}
		if(this.colorElement){
			switch(color){
				case 'black': color = '#000000'; break;
				case 'white': color = '#ffffff'; break;
			}
		}
		return color;
	},
	getnamedcolor : function(rgbcolor){
		var color = rgbcolor;
		if(this.colorElement){
			switch(rgbcolor.toLowerCase()){
				case '#000000': color = 'black'; break;
				case '#ffffff': color = 'white'; break;
			}
		}
		return color;
	},
	
	//------------------------------------------------------------------------------
	// setcolor()   色を設定する
	// clearcolor() 色の設定をクリアする
	//------------------------------------------------------------------------------
	setcolor : function(e, name){
		ui.menuconfig.set("color_"+name, this.getnamedcolor(e.target.value));
	},
	clearcolor : function(e, name){
		ui.menuconfig.reset("color_"+name);
		this.refresh(name);
	}
});

//---------------------------------------------------------------------------
// ★Popup_DispSizeクラス サイズの変更を行うポップアップメニューを作成したり表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('dispsize',
{
	formname : 'dispsize',
	
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		
		this.form.cellsize.value = ui.menuconfig.get('cellsizeval');
		ui.puzzle.key.enableKey = false;
	},
	
	//------------------------------------------------------------------------------
	// changesize()  Canvasでのマス目の表示サイズを変更する
	//------------------------------------------------------------------------------
	changesize : function(e){
		var csize = this.form.cellsize.value|0;
		if(csize>0){ ui.menuconfig.set('cellsizeval', csize);}
		this.close();
	}
});

//---------------------------------------------------------------------------
// ★Popup_Creditクラス Creditやバージョン情報を表示します
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('credit',
{
	formname : 'credit',

	init : function(){
		ui.popupmgr.popups.template.init.call(this);
		
		getEL('pzprversion').innerHTML = pzpr.version;
		getEL("menualltest").style.display = (!ui.debugmode ? "none" : "");
	},
	debugalltest : function(){
		ui.debug.all_test();
		this.close();
	}
});

// ToolArea.js v3.4.0
/* global ui:false, getEL:false */

// メニュー描画/取得/html表示系
// toolareaオブジェクト
ui.toolarea = {
	items : null,		// ツールパネルのエレメント等を保持する
	captions : [],		// 言語指定を切り替えた際のキャプションを保持する

	//---------------------------------------------------------------------------
	// toolarea.reset()  ツールパネル・ボタン領域の初期設定を行う
	//---------------------------------------------------------------------------
	reset : function(){
		if(this.items===null){
			this.items = {};
			this.walkElement(getEL("usepanel"));
			this.walkElement(getEL("checkpanel"));
			this.walkElement(getEL('btnarea'));
		}
		ui.misc.displayByPid(getEL("checkpanel"));
		ui.misc.displayByPid(getEL("btnarea"));
		
		this.display();
	},

	//---------------------------------------------------------------------------
	// toolarea.walkElement()  エレメントを探索して領域の初期設定を行う
	//---------------------------------------------------------------------------
	walkElement : function(parent){
		var toolarea = this;
		function btnfactory(role){
			return function(e){ toolarea[role](e); if(e.type!=='click'){ e.preventDefault(); e.stopPropagation();}};
		}
		function addbtnevent(el,type,role){ pzpr.util.addEvent(el, type, toolarea, btnfactory(role));}
		ui.misc.walker(parent, function(el){
			if(el.nodeType===1){
				/* ツールパネル領域 */
				if(el.className==="config"){
					toolarea.items[ui.customAttr(el,"config")] = {el:el};
				}
				else if(el.className.match(/child/)){
					var parent = el.parentNode.parentNode, idname = ui.customAttr(parent,"config");
					var item = toolarea.items[idname];
					if(!item.children){ item.children=[];}
					item.children.push(el);
					
					addbtnevent(el, "mousedown", "toolclick");
				}
				else if(el.nodeName==="INPUT" && el.type==="checkbox"){
					var parent = el.parentNode, idname = ui.customAttr(parent,"config");
					if(!idname){ return;}
					toolarea.items[idname].checkbox=el;
					
					addbtnevent(el, "click", "toolclick");
				}
				
				/* ボタン領域 */
				var role = ui.customAttr(el,"buttonExec");
				if(!!role){
					addbtnevent(el, (!pzpr.env.API.touchevent ? "click" : "mousedown"), role);
				}
				role = ui.customAttr(el,"pressExec");
				if(!!role){
					var roles = role.split(/,/);
					addbtnevent(el, "mousedown", roles[0]);
					if(!!role[1]){
						addbtnevent(el, "mouseup", roles[1]);
						addbtnevent(el, "mouseleave", roles[1]);
						addbtnevent(el, "touchcancel", roles[1]);
					}
				}
			}
			else if(el.nodeType===3){
				if(el.data.match(/^__(.+)__(.+)__$/)){
					toolarea.captions.push({textnode:el, str_jp:RegExp.$1, str_en:RegExp.$2});
				}
			}
		});
	},
	
	//---------------------------------------------------------------------------
	// toolarea.display()    全てのラベルに対して文字列を設定する
	// toolarea.setdisplay() 管理パネルに表示する文字列を個別に設定する
	//---------------------------------------------------------------------------
	display : function(){
		/* ツールパネル領域 */
		/* -------------- */
		var mandisp  = (ui.menuconfig.get("toolarea") ? 'block' : 'none');
		getEL('usepanel').style.display = mandisp;
		getEL('checkpanel').style.display = mandisp;
		/* 経過時間の表示/非表示設定 */
		getEL('separator2').style.display = (ui.puzzle.playeronly ? "" : "none");
		getEL('timerpanel').style.display = (ui.puzzle.playeronly ? "block" : "none");
		
		for(var idname in this.items){ this.setdisplay(idname);}
		
		/* ボタン領域 */
		/* --------- */
		getEL('btnarea').style.display = "";
		pzpr.util.unselectable(getEL('btnarea'));
		
		this.setdisplay("operation");
		getEL('btnclear2').style.display  = (!ui.puzzle.board.disable_subclear ? "" : "none");
		getEL('btncircle').style.display  = (ui.puzzle.pid==='pipelinkr' ? "" : "none");
		getEL('btncolor').style.display   = (ui.puzzle.pid==='tentaisho' ? "" : "none");
		/* ボタンエリアの色分けボタンは、ツールパネル領域が消えている時に表示 */
		getEL('btnirowake').style.display = ((ui.puzzle.painter.irowake && !ui.menuconfig.get("toolarea")) ? "" : "none");
		getEL('btnirowakeblk').style.display = ((ui.puzzle.painter.irowakeblk && !ui.menuconfig.get("toolarea")) ? "" : "none");
		this.setdisplay("trialmode");
		
		/* 共通：キャプションの設定 */
		/* --------------------- */
		for(var i=0;i<this.captions.length;i++){
			var obj = this.captions[i];
			obj.textnode.data = ui.selectStr(obj.str_jp, obj.str_en);
		}
	},
	setdisplay : function(idname){
		if(idname==="operation"){
			var opemgr = ui.puzzle.opemgr;
			getEL('btnundo').style.color = (!opemgr.enableUndo ? 'silver' : '');
			getEL('btnredo').style.color = (!opemgr.enableRedo ? 'silver' : '');
		}
		else if(idname==="trialmode"){
			var trialstage = ui.puzzle.board.trialstage;
			getEL('btntrial').style.color       = ((trialstage>0) ? 'silver' : '');
			getEL('btntrialarea').style.display = ((trialstage>0) ? 'block' : 'none');
			
			getEL('btntrialr').style.display  = ((trialstage<=1) ? '' : 'none');
			getEL('btntrialr2').style.display = ((trialstage>1)  ? '' : 'none');
			getEL('btntrialra').style.display = ((trialstage>1)  ? '' : 'none');
		}
		else if(this.items===null || !this.items[idname]){
			/* DO NOTHING */
		}
		else if(ui.menuconfig.valid(idname)){
			var toolitem = this.items[idname];
			toolitem.el.style.display = "";
			
			/* 子要素の設定を行う */
			if(!!toolitem.children){
				var children = toolitem.children;
				var validval = (idname==='inputmode' ? ui.puzzle.mouse.getInputModeList() : null);
				for(var i=0;i<children.length;i++){
					var child = children[i], value = ui.customAttr(child,"value"), selected = (value===""+ui.menuconfig.get(idname));
					child.className = (selected ? "child childsel" : "child");
					child.style.display = ((validval===null || validval.indexOf(value)>=0) ? '' : 'none');
				}
				
				var disabled = null;
				if(idname==="inputmode"){ disabled = (validval.length===1);}
				if(disabled!==null){ toolitem.el.className = (!disabled ? "" : "disabled");}
			}
			/* チェックボックスの表記の設定 */
			else if(!!toolitem.checkbox){
				var check = toolitem.checkbox;
				if(!!check){ check.checked = ui.menuconfig.get(idname);}
				
				var disabled = null;
				if(idname==="keypopup"){ disabled = !ui.keypopup.paneltype[ui.puzzle.editmode?1:3];}
				if(idname==="bgcolor") { disabled = ui.puzzle.editmode;}
				if(idname==="passallcell"){ disabled = !ui.puzzle.editmode;}
				if(disabled!==null){ toolitem.checkbox.disabled = (!disabled ? "" : "true");}
			}
			
			if((idname==="disptype_pipelinkr") && !!getEL('btncircle')){
				getEL('btncircle').innerHTML = ((ui.menuconfig.get(idname)===1)?"○":"■");
			}
		}
		else if(!!this.items[idname]){
			this.items[idname].el.style.display = "none";
		}
	},

	//---------------------------------------------------------------------------
	// toolarea.toolclick()   ツールパネルの入力があった時、設定を変更する
	//---------------------------------------------------------------------------
	toolclick : function(e){
		var el = e.target, parent = el.parentNode;
		var idname = ui.customAttr(parent,"config")||ui.customAttr(parent.parentNode,"config"), value;
		if(!!this.items[idname].checkbox){ value = !!el.checked;}
		else                             { value = ui.customAttr(el,"value");}
		ui.menuconfig.set(idname, value);
	},

	//---------------------------------------------------------------------------
	// Canvas下にあるボタンが押された/放された時の動作
	//---------------------------------------------------------------------------
	answercheck : function(){ ui.menuarea.answercheck();},
	undo     : function(){ ui.undotimer.startButtonUndo();},
	undostop : function(){ ui.undotimer.stopButtonUndo();},
	redo     : function(){ ui.undotimer.startButtonRedo();},
	redostop : function(){ ui.undotimer.stopButtonRedo();},
	ansclear : function(){ ui.menuarea.ACconfirm();},
	subclear : function(){ ui.menuarea.ASconfirm();},
	irowake  : function(){ ui.puzzle.irowake();},
	encolorall : function(){ ui.puzzle.board.encolorall();}, /* 天体ショーのボタン */
	dropblocks : function(){ ui.puzzle.board.operate('drop');},
	resetblocks: function(){ ui.puzzle.board.operate('resetpos');},
	showgatenum: function(){ ui.puzzle.board.operate('showgatenumber');},
	hidegatenum: function(){ ui.puzzle.board.operate('hidegatenumber');},
	enterTrial : function(){ if(ui.puzzle.board.trialstage===0){ ui.puzzle.enterTrial();}},
	enterFurtherTrial : function(){ ui.puzzle.enterTrial();},
	acceptTrial : function(){ ui.puzzle.acceptTrial();},
	rejectTrial : function(){ ui.puzzle.rejectTrial();},
	rejectCurrentTrial : function(){ ui.puzzle.rejectCurrentTrial();},

	//---------------------------------------------------------------------------
	// toolarea.toggledisp()   帰ってきたパイプリンクでアイスと○などの表示切り替え時の処理を行う
	//---------------------------------------------------------------------------
	toggledisp : function(){
		var current = ui.menuconfig.get('disptype_pipelinkr');
		ui.menuconfig.set('disptype_pipelinkr', (current===1?2:1));
	}
};

// Notify.js v3.5.0
/* global ui:false, getEL:false */

//---------------------------------------------------------------------------
// ★Notifyクラス alert, confirm関連を管理します
//---------------------------------------------------------------------------
ui.notify =
{
	onconfirm : null,
	
	//---------------------------------------------------------------------------
	// notify.reset()      Notificationの設定を初期化する
	//---------------------------------------------------------------------------
	reset : function(){
		/* イベントを割り当てる */
		this.walkElement(getEL("notifies"));
	},
	
	//---------------------------------------------------------------------------
	// notify.walkElement()  エレメントを探索して領域の初期設定を行う
	//---------------------------------------------------------------------------
	walkElement : function(parent){
		var notify = this;
		ui.misc.walker(parent, function(el){
			if(el.nodeType===1){
				/* ボタン領域 */
				var role = ui.customAttr(el,"buttonExec");
				if(!!role){
					pzpr.util.addEvent(el, (!pzpr.env.API.touchevent ? "click" : "mousedown"), notify, notify[role]);
				}
				
				/* タイトルバーでボックスを動かす設定 */
				if(el.className==='titlebar'){
					pzpr.util.addEvent(el, "mousedown", ui.popupmgr, ui.popupmgr.titlebardown);
				}
			}
		});
	},

	//--------------------------------------------------------------------------------
	// ui.alert()   現在の言語に応じたダイアログを表示する
	// ui.confirm() 現在の言語に応じた選択ダイアログを表示し、結果を返す
	// ui.setVerticalPosition() 指定したエレメントの盾位置を画面中央に設定して表示する
	//--------------------------------------------------------------------------------
	alert : function(strJP, strEN){
		getEL('notification').innerHTML = ui.selectStr(strJP, strEN);
		this.setVerticalPosition(getEL('assertbox'));
	},
	confirm : function(strJP, strEN, func){
		getEL('confirmcaption').innerHTML = ui.selectStr(strJP, strEN);
		this.setVerticalPosition(getEL('confirmbox'));
		this.onconfirm = func;
	},
	setVerticalPosition : function(el){
		var elbg = getEL("notifybg");
		elbg.style.display = "block";
		el.style.display = 'inline-block';
		
		/* innerHeightがIE8以下にないので、代わりに背景要素の高さ(height=100%), 幅を取得します */
		var rect = pzpr.util.getRect(el), rectbg = pzpr.util.getRect(elbg);
		el.style.top  = ((rectbg.height - rect.height) / 2) + "px";
		el.style.left = ((rectbg.width -  rect.width ) / 2) + "px";
	},

	//---------------------------------------------------------------------------
	// notify.closealert()  alertを非表示に戻す
	//---------------------------------------------------------------------------
	closealert : function(e){
		getEL('assertbox').style.display = 'none';
		getEL("notifybg").style.display = "none";
		e.preventDefault();
		e.stopPropagation();
	},

	//---------------------------------------------------------------------------
	// notify.confirmtrue()  confirmでOKが押された時の処理を記入する
	// notify.confirmfalse() confirmでCancelが押されたときの処理を記入する
	//---------------------------------------------------------------------------
	confirmtrue : function(e){
		if(!!this.onconfirm){ this.onconfirm();}
		this.onconfirm = null;
		this.confirmfalse(e);
	},
	confirmfalse : function(e){
		getEL('confirmbox').style.display = 'none';
		getEL("notifybg").style.display = "none";
		e.preventDefault();
		e.stopPropagation();
	}
};

// KeyPopup.js v3.4.0
/* global ui:false, createEL:false, getEL:false */

//---------------------------------------------------------------------------
// ★KeyPopupクラス マウスからキーボード入力する際のPopupウィンドウを管理する
//---------------------------------------------------------------------------
// キー入力用Popupウィンドウ
ui.keypopup =
{
	/* メンバ変数 */
	paneltype : {1:0, 3:0},	/* パネルのタイプ */
	element : null,			/* キーポップアップのエレメント */

	tdcolor : "black",	/* 文字の色 */
	imgCR : [1,1],		/* img表示用画像の横×縦のサイズ */

	imgs  : [],			/* resize用 */

	basepanel : null,
	clearflag : false,

	/* どの文字配置を作成するかのテーブル */
	type : {
		slither    : [3,0],
		nawabari   : [4,0],
		fourcells  : [4,0],
		fivecells  : [4,0],
		fillmat    : [4,0],
		paintarea  : [4,0],
		lightup    : [4,0],
		shakashaka : [4,0],
		gokigen    : [4,0],
		wagiri     : [4,0],
		shugaku    : [4,0],
		creek      : [4,0],
		ichimaga   : [4,0],
		ichimagam  : [4,0],
		ichimagax  : [4,0],
		sukoro     : [4,4],
		sukororoom : [4,4],
		lookair    : [5,0],
		tawa       : [6,0],
		hashikake  : [8,0],
		tapa       : [8,0],
		amibo      : [10,0],
		bag        : [10,0],
		bdblock    : [10,0],
		country    : [10,0],
		usotatami  : [10,0],
		heyawake   : [10,0],
		ayeheya    : [10,0],
		kurodoko   : [10,0],
		nagenawa   : [10,0],
		ringring   : [10,0],
		numlin     : [10,0],
		nurikabe   : [10,0],
		nuribou    : [10,0],
		mochikoro  : [10,0],
		mochinyoro : [10,0],
		shikaku    : [10,0],
		aho        : [10,0],
		shimaguni  : [10,0],
		chocona    : [10,0],
		yajitatami : [10,0],
		tasquare   : [10,0],
		kurotto    : [10,0],
		bonsan     : [10,0],
		heyabon    : [10,0],
		rectslider : [10,0],
		satogaeri  : [10,0],
		yosenabe   : [10,0],
		herugolf   : [10,0],
		firefly    : [10,0],
		tateyoko   : [10,0],
		factors    : [10,10],
		fillomino  : [10,10],
		renban     : [10,10],
		ripple     : [10,10],
		cojun      : [10,10],
		makaro     : [10,10],
		sudoku     : [10,10],
		nanro      : [10,10],
		view       : [10,10],
		kakuru     : [10,10],
		kazunori   : [10,10],
		building   : [10,10],
		kropki     : [10,10],
		tilepaint  : [51,0],
		triplace   : [51,0],
		kakuro     : [51,10],
		
		slalom     : [101,0],
		reflect    : [102,0],
		pipelink   : [111,0],
		pipelinkr  : [111,0],
		loopsp     : [111,0],
		tatamibari : [112,0],
		hakoiri    : [113,113],
		kusabi     : [114,0]
	},

	//---------------------------------------------------------------------------
	// kp.display()     キーポップアップを表示する
	//---------------------------------------------------------------------------
	display : function(){
		var mode = ui.puzzle.editmode?1:3;
		if(this.element && !!this.paneltype[mode] && ui.menuconfig.get('keypopup')){

			this.element.style.display = 'block';

			getEL('panelbase1').style.display = (mode===1?'block':'none');
			getEL('panelbase3').style.display = (mode===3?'block':'none');
		}
		else if(!!this.element){
			this.element.style.display = 'none';
		}
	},

	//---------------------------------------------------------------------------
	// kp.create()      キーポップアップを生成して初期化する
	// kp.createtable() キーポップアップのポップアップを作成する
	//---------------------------------------------------------------------------
	create : function(){
		if(!!this.element){
			getEL('panelbase1').innerHTML = '';
			getEL('panelbase3').innerHTML = '';
		}
		
		this.imgs = [];			// resize用
		
		var type = this.type[ui.puzzle.pid];
		if(!type){ type=[0,0];}
		
		this.paneltype = { 1:(!ui.puzzle.playeronly?type[0]:0), 3:(type[1])};
		if(!this.paneltype[1] && !this.paneltype[3]){ return;}
		
		if(!this.element){
			var rect = pzpr.util.getRect(getEL('divques'));
			this.element = getEL('keypopup');
			this.element.style.left = (rect.left+48)+'px';
			this.element.style.top  = (rect.top +48)+'px';
			pzpr.util.unselectable(this.element);
		}
		
		if(this.paneltype[1]!==0){ this.createtable(1);}
		if(this.paneltype[3]!==0){ this.createtable(3);}
		
		this.resizepanel();
		
		var bar = getEL('barkeypopup');
		ui.event.addEvent(bar, "mousedown", ui.popupmgr, ui.popupmgr.titlebardown);
		ui.event.addEvent(bar, 'dblclick', ui.menuconfig, function(){ this.set('keypopup',false);});
	},
	createtable : function(mode,type){
		this.basepanel = getEL('panelbase'+mode);
		this.basepanel.innerHTML = '';
		
		this.tdcolor = (mode===3 ? ui.puzzle.painter.fontAnscolor : "black");

		this.generate(mode);
	},

	//---------------------------------------------------------------------------
	// kp.generate()    キーポップアップのテーブルを作成する
	// kp.gentable4()   キーポップアップの0～4を入力できるテーブルを作成する
	// kp.gentable10()  キーポップアップの0～9を入力できるテーブルを作成する
	// kp.gentable51()  キーポップアップの[＼],0～9を入力できるテーブルを作成する
	//---------------------------------------------------------------------------
	generate : function(mode){
		var type = this.paneltype[mode];
		if     (type===4) { this.gentable4 (mode);}
		else if(type===10){ this.gentable10(mode);}
		else if(type===51){ this.gentable51(mode);}

		else if(type===3) { this.gentable3(mode);}
		else if(type===5) { this.gentable5(mode);}
		else if(type===6) { this.gentable6(mode);}
		else if(type===8) { this.gentable8(mode);}

		else if(type===101){ this.generate_slalom(mode);}
		else if(type===102){ this.generate_reflect(mode);}
		else if(type===111){ this.generate_pipelink(mode);}
		else if(type===112){ this.generate_tatamibari(mode);}
		else if(type===113){ this.generate_hakoiri(mode);}
		else if(type===114){ this.generate_kusabi(mode);}
	},
	gentable4 : function(mode){
		var pid = ui.puzzle.pid, itemlist = ['1','2','3','4'];
		if((mode===3)&&(pid==='sukoro'||pid==='sukororoom')){
			var mbcolor = ui.puzzle.painter.mbcolor;
			itemlist.push(
				['q',{text:'○',color:mbcolor}],
				['w',{text:'×',color:mbcolor}],
				' ',null
			);
		}
		else{
			var cap = '?';
			if(ui.puzzle.painter.hideHatena){
				switch(pid){
					case 'lightup': case 'shakashaka':                           cap='■'; break;
					case 'gokigen': case 'wagiri': case 'shugaku': case 'creek': cap='○'; break;
				}
			}
			itemlist.push('0',null,' ',['-',cap]);
		}
		this.generate_main(itemlist,4);
	},
	gentable10 : function(mode){
		var pid = ui.puzzle.pid, itemlist = [];
		if((mode===3)&&(ui.puzzle.klass.Cell.prototype.numberWithMB)){
			var mbcolor = ui.puzzle.painter.mbcolor;
			itemlist.push(
				['q',{text:'○',color:mbcolor}],
				['w',{text:'×',color:mbcolor}],
				' ',null
			);
		}
		if((mode===1)&&(pid==='kakuru'||pid==='tateyoko')){
			itemlist.push(['q1','■'],['w2','□'],' ',['-','?']);
		}
		
		itemlist.push('0','1','2','3','4','5','6','7','8','9');
		itemlist.push(((mode===1)||(!ui.puzzle.klass.Cell.prototype.numberWithMB)) ? ' ' : null);
		
		var cap = null;
		if((mode===3)||(pid==='kakuru'||pid==='tateyoko')){
		}
		else if(!ui.puzzle.painter.hideHatena){
			cap = '?';
		}
		else if(pid==='tasquare'){
			cap = '□';
		}
		else if(pid==='rectslider'){
			cap = '■';
		}
		else if(pid==='kurotto'||pid==='bonsan'||pid==='satogaeri'||pid==='heyabon'||pid==='yosenabe'||pid==='herugolf'||pid==='kazunori'){
			cap = '○';
		}
		if(cap!==null){ itemlist.push(['-',cap]);}
		this.generate_main(itemlist,4);
	},
	gentable51 : function(mode){
		this.generate_main([['q',{image:0}],' ','1','2','3','4','5','6','7','8','9','0'],4);
	},

	//---------------------------------------------------------------------------
	// kp.gentable3()  キーポップアップの0～4を入力できるテーブルを作成する
	// kp.gentable5()  キーポップアップの0～5を入力できるテーブルを作成する
	// kp.gentable6()  キーポップアップの0～6を入力できるテーブルを作成する
	// kp.gentable8()  キーポップアップの0～8を入力できるテーブルを作成する
	//---------------------------------------------------------------------------
	gentable3 : function(mode){
		this.generate_main(['1','2','3','0',' ',['-','?']],3);
	},
	gentable5: function(mode){
		this.generate_main(['1','2','3','4','5',null,'0',' ',['-','?']],3);
	},
	gentable6 : function(mode){
		this.generate_main(['1','2','3','4','5','6','0',' ',['-','?']],3);
	},
	gentable8 : function(mode){
		if(ui.puzzle.pid!=='tapa'){
			this.generate_main(['1','2','3','4','5','6','7','8',' ',['-','○']],4);
		}
		else{
			this.generate_main(['1','2','3','4','5','6','7','8','0',' ',['-','?']],4);
		}
	},

	//---------------------------------------------------------------------------
	// kp.generate_slalom()     スラローム用のテーブルを作成する
	// kp.generate_reflect()    リフレクトリンク用のテーブルを作成する
	//---------------------------------------------------------------------------
	generate_slalom : function(mode){
		this.imgCR = [4,1];
		this.generate_main([
			['q',{image:0}],
			['s',{image:1}],
			['w',{image:2}],
			['e',{image:3}],
			['r',' '],
			'1','2','3','4','5',
			'6','7','8','9','0',
			'-',' '
		],5);
	},
	generate_reflect : function(mode){
		this.imgCR = [4,1];
		this.generate_main([
			['q',{image:0}],
			['w',{image:1}],
			['e',{image:2}],
			['r',{image:3}],
			['t','╋'],['y',' '],
			'1','2','3','4','5','6',
			'7','8','9','0','-'
		],6);
	},

	//---------------------------------------------------------------------------
	// kp.generate_pipelink()   パイプリンク、帰ってきたパイプリンク、環状線スペシャル用のテーブルを作成する
	// kp.generate_tatamibari() タタミバリ用のテーブルを作成する
	// kp.generate_hakoiri()    はこいり○△□用のテーブルを作成する
	// kp.generate_kusabi()     クサビリンク用のテーブルを作成する
	//---------------------------------------------------------------------------
	generate_pipelink : function(mode){
		var pid = ui.puzzle.pid, itemlist = [];
		itemlist.push(
			['q','╋'],['w','┃'],['e','━'],['r',' '],(pid!=='loopsp'?['-','?']:null),
			['a','┗'],['s','┛'],['d','┓'],['f','┏']
		);
		if     (pid==='pipelink') { itemlist.push(null);}
		else if(pid==='pipelinkr'){ itemlist.push(['1','○']);}
		else if(pid==='loopsp')   { itemlist.push(['-','○']);}
		
		if(pid==='loopsp'){
			itemlist.push('1','2','3','4','5','6','7','8','9','0');
		}
		this.generate_main(itemlist,5);
	},
	generate_tatamibari : function(mode){
		this.generate_main([['q','╋'],['w','┃'],['e','━'],['r',' '],['-','?']],3);
	},
	generate_hakoiri : function(mode){
		this.generate_main([
			['1','○'],['2','△'],['3','□'],
			['4',{text:(mode===1?'?':'・'), color:(mode===3?"rgb(255, 96, 191)":"")}],' '
		],3);
	},
	generate_kusabi : function(mode){
		this.generate_main([['1','同'],['2','短'],['3','長'],['-','○'],' '],3);
	},

	generate_main : function(list, split){
		for(var i=0; i<list.length; i++){
			this.inputcol(list[i]);
			if((i+1)%split===0){ this.insertrow();}
		}
		if(i%split!==0){ this.insertrow();}
	},

	//---------------------------------------------------------------------------
	// kp.inputcol()  テーブルのセルを追加する
	// kp.insertrow() テーブルの行を追加する
	//---------------------------------------------------------------------------
	inputcol : function(item){
		var type = "num", ca, disp, color = this.tdcolor;
		if(!item){ type = "empty";}
		else{
			if(typeof item==="string"){ ca = disp = item;}
			else if(typeof item[1]==="string"){ ca = item[0]; disp = item[1];}
			else if(!!item[1].text) { ca = item[0]; disp = item[1].text; color = item[1].color;}
			else if(item[1].image!==void 0){ ca = item[0]; disp = item[1].image; type = "image";}
		}
		
		var _div = null, _child = null;
		if(type!=='empty'){
			_div = createEL('div');
			_div.className = 'kpcell kpcellvalid';
			_div.onclick = function(e){ e.preventDefault();};
			ui.event.addEvent(_div, "mousedown", ui.puzzle, function(e){ this.key.keyevent(ca,0); e.preventDefault(); e.stopPropagation();});
			pzpr.util.unselectable(_div);
		}
		else{
			_div = createEL('div');
			_div.className = 'kpcell kpcellempty';
			pzpr.util.unselectable(_div);
		}

		if(type==='num'){
			_child = createEL('span');
			_child.className   = 'kpnum';
			_child.style.color = color;
			_child.innerHTML   = disp;
			pzpr.util.unselectable(_child);
		}
		else if(type==='image'){
			_child = createEL('img');
			_child.className = 'kpimg';
			var pid = ui.puzzle.pid;
			_child.src = "data:image/gif;base64,"+this.dataurl[!!this.dataurl[pid] ? pid : 'shitappa'];
			pzpr.util.unselectable(_child);
			var x = disp%this.imgCR[0], y = (disp-x)/this.imgCR[1];
			this.imgs.push({'el':_child, 'x':x, 'y':y});
		}

		if(this.clearflag){ _div.style.clear='both'; this.clearflag=false;}
		if(!!_child){ _div.appendChild(_child);}
		this.basepanel.appendChild(_div);
	},
	insertrow : function(){
		this.clearflag = true;
	},

	//---------------------------------------------------------------------------
	// kp.resizepanel() キーポップアップのセルのサイズを変更する
	//---------------------------------------------------------------------------
	resizepanel : function(){
		var cellsize = Math.min(ui.puzzle.painter.cw, 120);
		if(cellsize<20){ cellsize=20;}

		var dsize = (cellsize*0.90)|0, tsize = (cellsize*0.70)|0;
		for(var i=0,len=this.imgs.length;i<len;i++){
			var obj = this.imgs[i], img=obj.el;
			img.style.width  = ""+(dsize*this.imgCR[0])+"px";
			img.style.height = ""+(dsize*this.imgCR[1])+"px";
			img.style.clip   = "rect("+(dsize*obj.y+1)+"px,"+(dsize*(obj.x+1))+"px,"+(dsize*(obj.y+1))+"px,"+(dsize*obj.x+1)+"px)";
			img.style.top    = "-"+(obj.y*dsize)+"px";
			img.style.left   = "-"+(obj.x*dsize)+"px";
		}

		ui.misc.modifyCSS({
			"div.kpcell" : { width:(""+dsize+"px"), height:(""+dsize+"px"), lineHeight:(""+dsize+"px")},
			"span.kpnum" : { fontSize:(""+tsize+"px")}
		});
	},

	dataurl : {
		slalom   : "R0lGODlhAAFAAMIEAAICAmBgYJ+fn///////AP//AP//AP//ACH5BAEKAAQALAAAAAAAAUAAAAP+OLrc/jDKSau9OOvNu/9gKI5kaZ5oqq5s675wLM90bd94ru+24AdAH68BKBqHNqNyyWw6n9DSD2oMCHhMZI3K7XqLI0Hgq7TmstoZec0GhMTt8jW5TKvj+OhnnFfOaWh2MH2EdR0ChUtmd0qCMYmJHXxOQFZ/P5OUjEeOL5CFHJmKfxFTmp2oIZ+EG6JVpBVwTQGptR2rfRquAIsbiLO2wRi4eRm7tB+yS7DCzQ7EeBi/yyO7zCiBziTQcRfTfiWuyCzZ2iLcbReu1yDrLeXmIOhsFt9F7CGu74bx5/NkFkSNO2EPAL4R8Prd+vclFpODbxKWkKhQA8OGFAS2EAX+UR6/ih4ueqFQsGPEMiCDieySUZGLkilrreTSEpwLjjFTzaRCweULewNz2tmpR4JPTyhTUBQ6geiTCUBjiFKxlGkEp06gUoMxVelHqxawNpmAE4Y9kxyqevw4dkFbt+XeQhBbtezPrSfUfpDLN67fr8/oNpLQ1SxeE3pDZuv7Ve4Ax4EFgyF8uMVZr4MxZ368+O9mzoCJSJ5cqjILeyAZb3bMuupo0hAucw3tTDUnBa0bu36tNemLwmCRvHbT1Lflo8GHDO9JG0XU5MJ5kzWdwm7e5tBFjyaJXAVMzbCzX5Ve3OaK5+CJizdKnrLx9GgXfl4fWbJD6iQ0rkgMfXmvBX0pfEcVdvT5x113+SF43Xz0MWBgTeYliF+DgLTH3IShMBEUhTc8eCCGxjQRH4fkWAjhe744MSKJ+5l4YoQhisjiDh4GRMmKBRmx4lq3zQiafa08YQlUu+goA3/J1agOFUH44CQQXOyoCoHrKelNkXj08giV4lkpTSJaHslldl5Kg2UXYW4SHotlapAjk1Iu2KOPVplCyZB05pmDk0Lo6eefgAYq6KCEFmrooSwkAAA7",
		reflect  : "R0lGODlhAAFAAIABAAAAAP///yH5BAEKAAEALAAAAAAAAUAAAAL+jI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6bgD8H/A9AMSi8YhMKpdJCPMJjSKdQiCOGJFqt9Mh96vNYq22ogSMflLT7OPZTJ4ZJ+362GGv0+dxmHufh7YW+EXR1cdy+EbINcgoVdGEqCJp+BjmdRlloTSJ0smpCeUoWmlp6hmyhFHKRNoKFwqaCuLKCqvIgJt7OkvLoZaxy4c3fHcx+ruRLGz8WrrMrCxrq+GciQu8OR25HZ2N3dqByS3m/S0eLuqxVf7si76ufvnR6K7bXp9eDK2ff4+gUK1+/DSpEggwCEJ/9OYFEiEIYMSDDQsyGpHmXkb+jBUbGOQ4URmbEh3xXSTRZlpKkict2jGhh1ZMlg8dbqQ50tPLE4Tegfm0s0+eFDVd3oQ5NE5RnkE9NkWaFEhPSjOdriQ6lUdLrDmN2qOaNcejFlethuQatsxYskdN/mS7Vm3cRGcXtAU7V4Y8F3UV9EWb9wVBvgvdkiO8V/BgxIcNn2P8EXJJycG8rtILi3JgzfDsNlacecWuGp/9QqIxDO8+OY89S8M8mmls0q9dV0N9DWVu2rcd84KdGmTwG5XNosJtrArD4cQvW1YuN/nA5NCj/7G8g3qseLuvHDf9m7d2bdqrN79u/JjY8uq7sZeK3jF89ubNvZ/fHnx+7/Q96z9nrtV2bpHRn4A2SUfgfgEpyF+BiziolH8HMNgghP8hqJQTCW3IYYcefghiiCKOSGKJJp6IYooqrlhOAQA7",
		shitappa : "R0lGODlhQABAAIABAAAAAP//ACH5BAEKAAEALAAAAABAAEAAAAL6jI+py+0Po5y02ouz3rz7DwHiSJbmiaZnqLbuW7LwTMdPjdcyCUb8veo5fkOUsEFEjgK2YyLJ+DWdBuiCOHVaFcmscPtcIrwg8Fh8Rn/VUXbVvIG/RW13R860z+k9PJys4ad3AIghyFc0aHEI4IMnwQj5uEMpqWjZCIToeFmZmDlRyAmqtIlJWhG5OMnVyRrWeeUaW2c66nkhKmvbykuhC4u6K7xKm+ebRlyMHIwb+Kh6F12qbCg3La2InY28za3s/T3sXGYV7pF1jt41y7yOpv5hEy/PQ18f9Ek1fF8OnAPwxY6ABP8VPMgIYcF9DBs6fAgxosSJFBMUAAA7"
	}
};

// DataBase.js v3.4.0
/* global ui:false, createEL:false, getEL:false, JSON:false */

//---------------------------------------------------------------------------
// ★ProblemDataクラス データベースに保存する1つのデータを保持する
//---------------------------------------------------------------------------
ui.ProblemData = function(){
	this.id = null;
	this.pdata = '';
	this.time = 0;

	if(arguments.length>0){ this.parse(arguments[0]);}
};
ui.ProblemData.prototype =
{
	updatePuzzleData : function(id){
		var puzzle = ui.puzzle, bd = puzzle.board;
		this.id = id;
		this.pdata = puzzle.getFileData(pzpr.parser.FILE_PZPR).replace(/\r?\n/g,"/");
		this.time = (pzpr.util.currentTime()/1000)|0;
		this.pid = puzzle.pid;
		this.col = bd.cols;
		this.row = bd.rows;
	},
	updateMetaData : function(){
		var metadata = new pzpr.MetaData(), form = document.database;
		metadata.comment = form.comtext.value;
		metadata.hard    = form.hard.value;
		metadata.author  = form.author.value;
		metadata.source  = form.source.value;
		var pzl = pzpr.parser(this.pdata);
		pzl.metadata.update(metadata);
		this.pdata = pzl.generate();
		return metadata;
	},
	getFileData : function(){
		return this.pdata.replace(/\//g,"\n");
	},
	toString : function(){
		var data = { id:this.id, pdata:this.pdata, time:this.time};
		return JSON.stringify(data);
	},
	parse : function(str){
		if(str===(void 0)){ this.id=null; return this;}
		var data = JSON.parse(str);
		for(var key in data){ this[key]=data[key];}
		var pzl = pzpr.parser(this.pdata);
		this.pid = pzl.pid;
		this.col = pzl.cols;
		this.row = pzl.rows;
		return this;
	}
};

//---------------------------------------------------------------------------
// ★Popup_DataBaseクラス データベース用ポップアップメニューの作成を行う
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('database',
{
	formname : 'database',
	
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,px,py);
		ui.database.openDialog();
	},
	close : function(){
		ui.database.closeDialog();
		ui.popupmgr.popups.template.close.call(this);
	},

	//---------------------------------------------------------------------------
	// database_handler() データベースmanagerへ処理を渡します
	//---------------------------------------------------------------------------
	database_handler : function(e){
		ui.database.clickHandler(e.target.name);
	}
});

//---------------------------------------------------------------------------
// ★DataBaseManagerクラス Web Storage用 データベースの設定・管理を行う
//---------------------------------------------------------------------------
ui.database = {
	dbh    : null,	// データベースハンドラ

	DBsid  : -1,	// 現在選択されているリスト中のID
	DBlist : [],	// 現在一覧にある問題のリスト

	sync   : false,	// 一覧がDataBaseのデータと合っているかどうかを表す

	update : function(){ ui.database.updateDialog();},

//	storageType : {},

	//---------------------------------------------------------------------------
	// dbm.openDialog()   データベースダイアログが開いた時の処理
	// dbm.closeDialog()  データベースダイアログが閉じた時の処理
	//---------------------------------------------------------------------------
	openDialog : function(){
		// データベースを開く
		this.dbh = new ui.DataBaseHandler_LS(this);
		this.sync = false;
		this.dbh.convert();
		this.dbh.importDBlist();
	},
	closeDialog : function(){
		this.DBlist = [];
	},

//	//---------------------------------------------------------------------------
//	// dbm.checkStorageType()  使用できるStorageの種類を取得
//	//---------------------------------------------------------------------------
//	checkStorageType : function(){
//		this.storageType = (function(){
//			var val = 0x00;
//			try{ if(!!window.sessionStorage){ val |= 0x10;}}catch(e){}
//			try{ if(!!window.localStorage)  { val |= 0x08;}}catch(e){}
//			try{ if(!!window.indexedDB)     { val |= 0x04;}}catch(e){}
//			try{ if(!!window.openDatabase){ // Opera10.50対策
//				var dbtmp = openDatabase('pzprv3_manage', '1.0', 'manager', 1024*1024*5);	// Chrome3対策
//				if(!!dbtmp){ val |= 0x02;}
//			}}catch(e){}
//			
//			// Firefox 8.0より前はローカルだとデータベース系は使えない
//			var Gecko = (UA.indexOf('Gecko')>-1 && UA.indexOf('KHTML')===-1);
//			var Gecko7orOlder = (Gecko && UA.match(/rv\:(\d+\.\d+)/) && +RegExp.$1<8.0); /* Firefox8.0よりも前 */
//			if(Gecko7orOlder && !location.hostname){ val = 0;}
//			
//			return {
//				session : !!(val & 0x10),
//				localST : !!(val & 0x08),
//				WebIDB  : !!(val & 0x04),
//				WebSQL  : !!(val & 0x02)
//			};
//		})();
//	}

	//---------------------------------------------------------------------------
	// dbm.clickHandler()  フォーム上のボタンが押された時、各関数にジャンプする
	//---------------------------------------------------------------------------
	clickHandler : function(name){
		if(this.sync===false){ return;}
		switch(name){
			case 'sorts'   : this.displayDataTableList();	// breakがないのはわざとです
			/* falls through */
			case 'datalist': this.selectDataTable(); break;
			case 'tableup' : this.upDataTable();     break;
			case 'tabledn' : this.downDataTable();   break;
			case 'open'    : this.openDataTable();   break;
			case 'save'    : this.saveDataTable();   break;
			case 'overwrite' : this.saveDataTable(); break;
			case 'updateinfo': this.updateInfo();    break;
			case 'del'     : this.deleteDataTable(); break;
		}
	},

	//---------------------------------------------------------------------------
	// dbm.getDataID()    選択中データの(this.DBlistのkeyとなる)IDを取得する
	// dbm.updateDialog() 管理テーブル情報やダイアログの表示を更新する
	//---------------------------------------------------------------------------
	getDataID : function(){
		/* jshint eqeqeq:false */
		var val = document.database.datalist.value;
		if(val!=="new" && val!==""){
			for(var i=0;i<this.DBlist.length;i++){
				if(this.DBlist[i].id==val){ return i;}
			}
		}
		return -1;
	},
	updateDialog : function(){
		this.dbh.updateManageData();
		this.displayDataTableList();
		this.selectDataTable();
		this.sync = true;
	},

	//---------------------------------------------------------------------------
	// dbm.displayDataTableList() 保存しているデータの一覧を表示する
	// dbm.appendNewOption()      option要素を生成する
	// dbm.getRowString()         1データから文字列を生成する
	// dbm.dateString()           時刻の文字列を生成する
	//---------------------------------------------------------------------------
	displayDataTableList : function(){
		switch(document.database.sorts.value){
			case 'idlist' : this.DBlist = this.DBlist.sort(function(a,b){ return (a.id-b.id);}); break;
			case 'newsave': this.DBlist = this.DBlist.sort(function(a,b){ return (b.time-a.time || a.id-b.id);}); break;
			case 'oldsave': this.DBlist = this.DBlist.sort(function(a,b){ return (a.time-b.time || a.id-b.id);}); break;
			case 'size'   : this.DBlist = this.DBlist.sort(function(a,b){ return (a.col-b.col || a.row-b.row || a.id-b.id);}); break;
		}

		document.database.datalist.innerHTML = "";
		for(var i=0;i<this.DBlist.length;i++){
			var row = this.DBlist[i];
			if(!!row){ this.appendNewOption(row.id, this.getRowString(row));}
		}
		this.appendNewOption(-1, ui.selectStr("&nbsp;&lt;新しく保存する&gt;","&nbsp;&lt;New Save&gt;"));
	},
	appendNewOption : function(id, str){
		/* jshint eqeqeq:false */
		var opt = createEL('option');
		opt.setAttribute('value', (id!=-1 ? id : "new"));
		opt.innerHTML = str;
		if(this.DBsid==id){ opt.setAttribute('selected', "selected");}

		document.database.datalist.appendChild(opt);
	},
	getRowString : function(row){
		var str = "";
		str += ((row.id<10?"&nbsp;":"")+row.id+" :&nbsp;");
		str += (pzpr.variety(row.pid)[pzpr.lang]+"&nbsp;");
		str += (""+row.col+"×"+row.row+" &nbsp;");
		str += (pzpr.parser(row.pdata).metadata.hard+"&nbsp;");
		str += ("("+this.dateString(row.time*1000)+")");
		return str;
	},
	dateString : function(time){
		function ni(num){ return (num<10?"0":"")+num;}
		var date = new Date();
		date.setTime(time);
		return (ni(date.getFullYear()%100)+"/"+ni(date.getMonth()+1)+"/"+ni(date.getDate())+ " " +
				ni(date.getHours()) + ":" + ni(date.getMinutes()));
	},

	//---------------------------------------------------------------------------
	// dbm.selectDataTable() データを選択して、コメントなどを表示する
	//---------------------------------------------------------------------------
	selectDataTable : function(){
		var selected = this.getDataID(), form = document.database, item, metadata;
		if(selected>=0){
			item = this.DBlist[selected];
			metadata = pzpr.parser(item.pdata).metadata;
			getEL("database_cand").innerHTML = "";
		}
		else{
			item = new ui.ProblemData();
			item.updatePuzzleData(-1);
			metadata = ui.puzzle.metadata;
			getEL("database_cand").innerHTML = ui.selectStr("(新規保存)", "(Candidate)");
		}
		form.comtext.value = ""+metadata.comment;
		form.hard.value    = ""+metadata.hard;
		form.author.value  = ""+metadata.author;
		form.source.value  = ""+metadata.source;
		getEL("database_info").innerHTML = pzpr.variety(item.pid)[pzpr.lang] + "&nbsp;" + item.col+"×"+item.row +
										   "&nbsp;&nbsp;&nbsp;(" + this.dateString(item.time*1000) + ")";

		var sid = this.DBsid = +item.id; /* selected id */
		var sortbyid = (form.sorts.value==='idlist');
		form.tableup.disabled = (!sortbyid || sid===-1 || sid===1);
		form.tabledn.disabled = (!sortbyid || sid===-1 || sid===this.DBlist.length);
		form.updateinfo.disabled = (sid===-1);
		form.open.style.color = (sid===-1 ? "silver" : "");
		form.del.style.color  = (sid===-1 ? "silver" : "");
		form.save.style.display      = (sid===-1 ? "" : "none");
		form.overwrite.style.display = (sid===-1 ? "none" : "");
	},

	//---------------------------------------------------------------------------
	// dbm.upDataTable()      データの一覧での位置をひとつ上にする
	// dbm.downDataTable()    データの一覧での位置をひとつ下にする
	// dbm.convertDataTable() データの一覧での位置を入れ替える
	//---------------------------------------------------------------------------
	upDataTable : function(){
		var selected = this.getDataID();
		if(selected===-1 || selected===0){ return;}
		this.convertDataTable(selected, selected-1);
	},
	downDataTable : function(){
		var selected = this.getDataID();
		if(selected===-1 || selected===this.DBlist.length-1){ return;}
		this.convertDataTable(selected, selected+1);
	},
	convertDataTable : function(sid, tid){
		this.DBsid = this.DBlist[tid].id;

		/* idプロパティ以外を入れ替える */
		var id = this.DBlist[sid].id;
		this.DBlist[sid].id = this.DBlist[tid].id;
		this.DBlist[tid].id = id;
		var row = this.DBlist[sid];
		this.DBlist[sid] = this.DBlist[tid];
		this.DBlist[tid] = row;

		this.sync = false;
		this.dbh.saveItem(sid, tid);
	},

	//---------------------------------------------------------------------------
	// dbm.openDataTable()  データの盤面に読み込む
	// dbm.saveDataTable()  データの盤面を保存/上書きする
	//---------------------------------------------------------------------------
	openDataTable : function(){
		var id = this.getDataID(); if(id===-1){ return;}
		var filestr = this.DBlist[id].getFileData();
		ui.notify.confirm("このデータを読み込みますか？ (現在の盤面は破棄されます)",
						  "Recover selected data? (Current board is erased)",
						  function(){ ui.puzzle.open(filestr);});
	},
	saveDataTable : function(){
		var id = this.getDataID(), dbm = this;
		function refresh(){
			var list = dbm.DBlist, item = list[id];
			if(id===-1){ /* newSave */
				id = list.length;
				item = list[id] = new ui.ProblemData();
			}
			item.updatePuzzleData(id+1);
			var metadata = item.updateMetaData();
			ui.puzzle.metadata.update(metadata);
			dbm.DBsid = item.id;
			
			dbm.sync = false;
			dbm.dbh.saveItem(id);
		}
		
		if(id===-1){ refresh();}
		else       { ui.notify.confirm("このデータに上書きしますか？","Overwrite selected data?", refresh);}
	},

	//---------------------------------------------------------------------------
	// dbm.editComment()   データのコメントを更新する
	//---------------------------------------------------------------------------
	updateInfo : function(){
		var id = this.getDataID(); if(id===-1){ return;}

		this.DBlist[id].updateMetaData();

		this.sync = false;
		this.dbh.saveItem(id);
	},

	//---------------------------------------------------------------------------
	// dbm.deleteDataTable() 選択している盤面データを削除する
	//---------------------------------------------------------------------------
	deleteDataTable : function(){
		var id = this.getDataID(), dbm = this; if(id===-1){ return;}
		ui.notify.confirm("このデータを完全に削除しますか？","Delete selected data?", function(){
			var list = dbm.DBlist, sID = list[id].id, max = list.length;
			for(var i=sID-1;i<max-1;i++){ list[i] = list[i+1]; list[i].id--;}
			list.pop();

			dbm.sync = false;
			dbm.dbh.deleteItem(sID, max);
		});
	}
};

//---------------------------------------------------------------------------
// ★DataBaseHandler_LSクラス Web localStorage用 データベースハンドラ
//---------------------------------------------------------------------------
ui.DataBaseHandler_LS = function(parent){
	this.pheader = 'pzprv3_storage:data:';
	this.parent = parent;
	this.currentVersion = localStorage['pzprv3_storage:version'] || '0';

	this.createManageDataTable();
	this.createDataBase();
};
ui.DataBaseHandler_LS.prototype =
{
	//---------------------------------------------------------------------------
	// dbm.dbh.importDBlist()  DataBaseからDBlistを作成する
	//---------------------------------------------------------------------------
	importDBlist : function(){
		this.parent.DBlist = [];
		for(var i=1;true;i++){
			var row = new ui.ProblemData(localStorage[this.pheader+i]);
			if(row.id===null){ break;}
			this.parent.DBlist.push(row);
		}
		this.parent.update();
	},

	//---------------------------------------------------------------------------
	// dbm.dbh.createManageDataTable() 管理情報テーブルを作成する(消去はなし)
	// dbm.dbh.updateManageData()      管理情報レコードを更新する
	//---------------------------------------------------------------------------
	createManageDataTable : function(){
		localStorage['pzprv3_storage:version'] = '3.0';
	},
	updateManageData : function(){
		localStorage['pzprv3_storage:count'] = this.parent.DBlist.length;
		localStorage['pzprv3_storage:time']  = (pzpr.util.currentTime()/1000)|0;
	},

	//---------------------------------------------------------------------------
	// dbm.dbh.createDataBase()     テーブルを作成する
	//---------------------------------------------------------------------------
	createDataBase : function(){
	},

	//---------------------------------------------------------------------------
	// dbm.dbh.saveItem() databaseの指定されたIDを保存する
	//---------------------------------------------------------------------------
	saveItem : function(){
		var args = arguments;
		for(var i=0;i<args.length;i++){
			var item = this.parent.DBlist[args[i]];
			localStorage[this.pheader+item.id] = item.toString();
		}
		this.parent.update();
	},

	//---------------------------------------------------------------------------
	// dbm.dbh.deleteItem() 選択している盤面データを削除する
	//---------------------------------------------------------------------------
	deleteItem : function(sID, max){
		for(var i=+sID;i<max;i++){
			var data = new ui.ProblemData(localStorage[this.pheader+(i+1)]);
			data.id--;
			localStorage[this.pheader+i] = data.toString();
		}
		localStorage.removeItem(this.pheader+max);
		this.parent.update();
	},

	//---------------------------------------------------------------------------
	// dbm.dbh.convert() データ形式をコンバート
	//---------------------------------------------------------------------------
	convert : function(){
		if(!!localStorage['pzprv3_manage']) { this.convertfrom1();}
		else if(this.currentVersion==='2.0'){ this.convertfrom2();}
		this.currentVersion = '3.0';
	},
	hardstr : [
		{ja:'−'      , en:'-'     },
		{ja:'らくらく', en:'Easy'  },
		{ja:'おてごろ', en:'Normal'},
		{ja:'たいへん', en:'Hard'  },
		{ja:'アゼン'  , en:'Expert'}
	],
	convertfrom2 : function(){
		/* jshint eqeqeq:false */
		for(var i=1;true;i++){
			var item = new ui.ProblemData(localStorage[this.pheader+i]);
			if(item.id===null){ break;}
			var pzl = pzpr.parser(item.pdata);
			if(item.hard!='0'){ pzl.metadata.hard    = this.hardstr[item.hard][pzpr.lang];}
			if(!!item.comment){ pzl.metadata.comment = item.comment;}
			item.pdata = pzl.generate();
			localStorage[this.pheader+i] = item.toString();
		}
	},
	convertfrom1 : function(){
		var keys=['id', 'col', 'row', 'hard', 'pdata', 'time', 'comment'];

		var timemax=0, countall=0;
		delete localStorage['pzprv3_manage'];
		delete localStorage['pzprv3_manage:manage'];

		var puzzles = [];
		for(var pid in pzpr.variety.info){ // いらないのもあるけど、問題ないのでOK
			if(!localStorage['pzprv3_'+pid]){ continue;}
			var mheader = 'pzprv3_manage:manage!'+pid+'!';
			var count = localStorage[mheader+'count'];
			var ptime = localStorage[mheader+'time'];
			delete localStorage[mheader+'count'];
			delete localStorage[mheader+'time'];

			if(ptime > timemax){ ptime = timemax;}
			countall += count;

			delete localStorage['pzprv3_'+pid];
			delete localStorage['pzprv3_'+pid+':puzdata'];
			for(var i=0;i<count;i++){
				var pheader = 'pzprv3_'+pid+':puzdata!'+(i+1)+'!';
				var row = new ui.ProblemData();
				for(var c=0;c<7;c++){
					row[keys[c]] = localStorage[pheader+keys[c]];
					delete localStorage[pheader+keys[c]];
				}
				var pzl = pzpr.parser(row.pdata);
				pzl.metadata.hard    = this.hardstr[row.hard][pzpr.lang];
				pzl.metadata.comment = row.comment;
				row.pdata = pzl.generate();
				delete row.hard;
				delete row.comment;
				delete row.col;
				delete row.row;
				puzzles.push(row);
			}
		}

		puzzles.sort(function(a,b){ return (a.time-b.time || a.id-b.id);});
		localStorage['pzprv3_storage:version'] = '3.0';
		localStorage['pzprv3_storage:count'] = puzzles.length;
		localStorage['pzprv3_storage:time']  = (pzpr.util.currentTime()/1000)|0;
		for(var i=0;i<puzzles.length;i++){
			puzzles[i].id = (i+1);
			localStorage['pzprv3_storage:data:'+(i+1)] = puzzles[i].toString();
		}
	}
};

// Timer.js v3.4.0
/* global ui:false */

(function(){

//---------------------------------------------------------------------------
// ★Timerクラス  一般タイマー(経過時間の表示/自動正答判定用)
//---------------------------------------------------------------------------
var timerInterval = 100;					/* タイマー割り込み間隔 */

ui.timer =
{
	/* メンバ変数 */
	TID      : null,					/* タイマーID */
	current  : 0,		/* 現在のgetTime()取得値(ミリ秒) */

	/* 経過時間表示用変数 */
	bseconds : 0,		/* 前回ラベルに表示した時間(秒数) */
	timerEL  : null,	/* 経過時間表示用要素 */

	/* 自動正答判定用変数 */
	worstACtime : 0,	/* 正答判定にかかった時間の最悪値(ミリ秒) */
	nextACtime  : 0,	/* 次に自動正答判定ルーチンに入ることが可能になる時間 */

	//---------------------------------------------------------------------------
	// tm.reset()      タイマーのカウントを0にして、スタートする
	// tm.start()      update()関数を200ms間隔で呼び出す
	// tm.update()     200ms単位で呼び出される関数
	//---------------------------------------------------------------------------
	reset : function(){
		this.worstACtime = 0;
		this.timerEL = document.getElementById('timerpanel');
		this.timerEL.innerHTML = this.label()+"00:00";

		clearInterval(this.TID);
		this.start();
	},
	start : function(){
		var self = this;
		this.TID = setInterval(function(){ self.update();}, timerInterval);
	},
	stop : function(){
		clearInterval(this.TID);
	},
	update : function(){
		this.current = pzpr.util.currentTime();

		if(ui.puzzle.playeronly){ this.updatetime();}
		if(ui.menuconfig.get('autocheck_once') && !ui.debug.alltimer){ this.ACcheck();}
	},

	//---------------------------------------------------------------------------
	// tm.updatetime() 秒数の表示を行う
	// tm.label()      経過時間に表示する文字列を返す
	//---------------------------------------------------------------------------
	updatetime : function(){
		var seconds = (ui.puzzle.getTime()/1000)|0;
		if(this.bseconds === seconds){ return;}

		var hours   = (seconds/3600)|0;
		var minutes = ((seconds/60)|0) - hours*60;
		seconds = seconds - minutes*60 - hours*3600;

		if(minutes < 10){ minutes = "0" + minutes;}
		if(seconds < 10){ seconds = "0" + seconds;}

		this.timerEL.innerHTML = [this.label(), (!!hours?hours+":":""), minutes, ":", seconds].join('');

		this.bseconds = seconds;
	},
	label : function(){
		return ui.selectStr("経過時間：","Time: ");
	},

	//---------------------------------------------------------------------------
	// tm.ACcheck()    自動正解判定を呼び出す
	//---------------------------------------------------------------------------
	ACcheck : function(){
		var puzzle = ui.puzzle;
		if(this.current>this.nextACtime && puzzle.playmode && !puzzle.checker.inCheck && puzzle.board.trialstage===0){
			var check = puzzle.check(false);
			if(check.complete){
				ui.timer.stop();
				puzzle.mouse.mousereset();
				ui.menuconfig.set('autocheck_once',false);
				if(ui.callbackComplete){
					ui.callbackComplete(puzzle, check);
				}
				ui.notify.alert("正解です！","Complete!");
				return;
			}

			this.worstACtime = Math.max(this.worstACtime, (pzpr.util.currentTime()-this.current));
			this.nextACtime = this.current + (this.worstACtime<250 ? this.worstACtime*4+120 : this.worstACtime*2+620);
		}
	}
};

//---------------------------------------------------------------------------
// ★UndoTimerクラス   Undo/Redo用タイマー
//---------------------------------------------------------------------------
var KeyUndo = 1,
	ButtonUndo = 2,
	AnswerUndo = 4,
	undoTimerInterval = 25,		/* タイマー割り込み間隔 */
	execWaitTime      = 300;	/* 1回目にwaitを多く入れるための値 */

ui.undotimer = {
	/* メンバ変数 */
	TID    : null,	/* タイマーID */
	
	/* bit1:button bit0:key */
	inUNDO : 0,	/* Undo実行中 */
	inREDO : 0,	/* Redo実行中 */

	//---------------------------------------------------------------------------
	// ut.reset()  タイマーをスタートする
	//---------------------------------------------------------------------------
	reset : function(){
		this.stop();
	},

	//---------------------------------------------------------------------------
	// ut.startKeyUndo() キー入力によるUndoを開始する
	// ut.startKeyRedo() キー入力によるRedoを開始する
	// ut.startButtonUndo() ボタンによるUndoを開始する
	// ut.startButtonRedo() ボタンによるRedoを開始する
	// ut.startAnswerUndo() 碁石ひろい用のマウスによるUndoを開始する
	// ut.startAnswerRedo() 碁石ひろい用のマウスによるRedoを開始する
	//---------------------------------------------------------------------------
	startKeyUndo    : function(){ this.startUndo(KeyUndo);},
	startKeyRedo    : function(){ this.startRedo(KeyUndo);},
	startButtonUndo : function(){ this.startUndo(ButtonUndo);},
	startButtonRedo : function(){ this.startRedo(ButtonUndo);},
	startAnswerUndo : function(){ this.startUndo(AnswerUndo);},
	startAnswerRedo : function(){ this.startRedo(AnswerUndo);},

	//---------------------------------------------------------------------------
	// ut.stopKeyUndo() キー入力によるUndoを停止する
	// ut.stopKeyRedo() キー入力によるRedoを停止する
	// ut.stopButtonUndo() ボタンによるUndoを停止する
	// ut.stopButtonRedo() ボタンによるRedoを停止する
	// ut.startAnswerUndo() 碁石ひろい用のマウスによるUndoを停止する
	// ut.startAnswerRedo() 碁石ひろい用のマウスによるRedoを停止する
	//---------------------------------------------------------------------------
	stopKeyUndo    : function(){ this.stopUndo(KeyUndo);},
	stopKeyRedo    : function(){ this.stopRedo(KeyUndo);},
	stopButtonUndo : function(){ this.stopUndo(ButtonUndo);},
	stopButtonRedo : function(){ this.stopRedo(ButtonUndo);},
	/* stopAnswerUndo : function(){ this.stopUndo(AnswerUndo);}, */
	/* stopAnswerRedo : function(){ this.stopRedo(AnswerUndo);}, */

	//---------------------------------------------------------------------------
	// ut.startUndo() Undo開始共通処理
	// ut.startRedo() Redo開始共通処理
	// ut.stopUndo() Undo停止共通処理
	// ut.stopRedo() Redo停止共通処理
	//---------------------------------------------------------------------------
	startUndo : function(bit){ if(!(this.inUNDO & bit)){ this.inUNDO |=  bit; this.proc();}},
	startRedo : function(bit){ if(!(this.inREDO & bit)){ this.inREDO |=  bit; this.proc();}},
	stopUndo  : function(bit){ if(  this.inUNDO & bit ){ this.inUNDO &= ~bit; this.proc();}},
	stopRedo  : function(bit){ if(  this.inREDO & bit ){ this.inREDO &= ~bit; this.proc();}},

	//---------------------------------------------------------------------------
	// ut.start() Undo/Redo呼び出しを開始する
	// ut.stop()  Undo/Redo呼び出しを終了する
	//---------------------------------------------------------------------------
	start : function(){
		var self = this;
		function handler(){ self.proc();}
		function inithandler(){
			clearInterval(self.TID);
			self.TID = setInterval(handler, undoTimerInterval);
		}
		this.TID = setInterval(inithandler, execWaitTime);
		this.exec();
	},
	stop : function(){
		this.inUNDO = 0;
		this.inREDO = 0;
		
		clearInterval(this.TID);
		this.TID = null;
	},

	//---------------------------------------------------------------------------
	// ut.proc()  Undo/Redo呼び出しを実行する
	// ut.exec()  Undo/Redo関数を呼び出す
	//---------------------------------------------------------------------------
	proc : function(){
		if     (!!(this.inUNDO | this.inREDO) &&  !this.TID){ this.start();}
		else if( !(this.inUNDO | this.inREDO) && !!this.TID){ this.stop();}
		else if(!!this.TID){ this.exec();}
	},
	exec : function(){
		if(!this.checknextprop()){ this.stop();}
		else if(this.inUNDO){ ui.puzzle.undo();}
		else if(this.inREDO){ ui.puzzle.redo();}
	},

	//---------------------------------------------------------------------------
	// ut.checknextprop()  次にUndo/Redoができるかどうかの判定を行う
	//---------------------------------------------------------------------------
	checknextprop : function(){
		var opemgr = ui.puzzle.opemgr;
		var isenable = ((this.inUNDO && opemgr.enableUndo) || (this.inREDO && opemgr.enableRedo));
		if(isenable && ui.puzzle.pid==="goishi"){
			if(this.inUNDO===AnswerUndo){
				var nextopes = opemgr.ope[opemgr.position-1];
				isenable = (nextopes[nextopes.length-1].property==='anum');
			}
			else if(this.inREDO===AnswerUndo){
				var nextopes = opemgr.ope[opemgr.position];
				isenable = (nextopes[0].property==='anum');
			}
		}
		return isenable;
	}
};

})();

// Debug.js v3.4.0
/* jshint devel:true */
/* global ui:false */

//---------------------------------------------------------------------------
// ★Popup_Debugクラス  poptest関連のポップアップメニュー表示用
//---------------------------------------------------------------------------
ui.popupmgr.addpopup('debug',
{
	formname : 'debug',
	multipopup : true,
	
	init : function(){
		ui.popupmgr.popups.template.init.call(this);
		if(!ui.debugmode){
			var form = this.form;
			form.starttest.style.display = "none";
			form.all_test.style.display = "none";
			form.loadperf.style.display = "none";
			form.inputcheck_popup.style.display = "none";
		}
	},
	handler : function(e){
		ui.debug[e.target.name]();
	},
	
	show : function(px,py){
		ui.popupmgr.popups.template.show.call(this,40,80);
	}
});

//---------------------------------------------------------------------------
// ★Debugクラス  poptest関連の実行関数など
//---------------------------------------------------------------------------
ui.debug =
{
	extend : function(proto){
		for(var name in proto){ this[name] = proto[name];}
	},

	// debugmode===true時はオーバーライドされます
	keydown : function(ca){
		if(ca==='alt+p'){ this.disppoptest();}
		else{ return false;}
		
		ui.puzzle.key.cancelEvent = true;	/* カーソルを移動させない */
	},
	disppoptest : function(){
		ui.popupmgr.popups.debug.show();
	},

	filesave : function(){
		this.setTA(ui.puzzle.getFileData(pzpr.parser.FILE_PZPR, {history:true}));
	},
	filesave_pencilbox : function(){
		if(pzpr.variety(ui.puzzle.pid).exists.pencilbox){
			this.setTA(ui.puzzle.getFileData(pzpr.parser.FILE_PBOX));
		}
		else{
			this.setTA("");
		}
	},
	filesave_pencilbox_xml : function(){
		if(pzpr.variety(ui.puzzle.pid).exists.pencilbox){
			this.setTA(ui.puzzle.getFileData(pzpr.parser.FILE_PBOX_XML).replace(/\>/g,'>\n'));
		}
		else{
			this.setTA("");
		}
	},

	fileopen : function(){
		ui.puzzle.open(this.getTA());
	},

	erasetext : function(){
		this.setTA('');
	},

	perfeval : function(){
		var ans = ui.puzzle.checker;
		this.timeeval("正答判定", function(){ ans.resetCache(); ans.checkAns();});
	},
	painteval : function(){
		this.timeeval("描画時間", function(){ ui.puzzle.redraw();});
	},
	resizeeval : function(){
		this.timeeval("resize描画", function(){ ui.puzzle.redraw(true);});
	},
	searcheval : function(){
		var graph = ui.puzzle.board.linegraph;
		graph.rebuild();
		var nodes = [];
		for(var i=0;i<graph.components.length;i++){
			nodes = nodes.concat(graph.components[i].nodes);
		}
		this.timeeval("search linemgr", function(){
			graph.components = [];
			graph.modifyNodes = nodes;
			graph.searchGraph();
		});
	},
	rebuildeval : function(){
		var graph = ui.puzzle.board.linegraph;
		this.timeeval("reset linemgr", function(){ graph.rebuild();});
	},
	timeeval : function(text,func){
		var count=0, old = pzpr.util.currentTime();
		while(pzpr.util.currentTime() - old < 3000){
			count++;

			func();
		}
		var time = pzpr.util.currentTime() - old;
		this.addTA(text+" ave. "+(time/count)+"ms");
	},

	dispdatabase : function(){
		var text = "";
		for(var i=0;i<localStorage.length;i++){
			var key = localStorage.key(i);
			if(key.match(/^pzprv3/)){
				text += (""+key+" "+localStorage[key]+"\n");
			}
		}
		this.setTA(text);
	},

	getTA : function(){ return document.getElementById('testarea').value;},
	setTA : function(str){ document.getElementById('testarea').value  = str;},
	addTA : function(str){
		if(!!window.console){ console.log(str);}
		document.getElementById('testarea').value += (str+"\n");
	},

	includeDebugScript : function(filename){
		if(!!this.includedScript[filename]){ return;}
		var _script = document.createElement('script');
		_script.type = 'text/javascript';
		_script.src = pzpr.util.getpath()+'../../tests/script/'+filename;
		document.getElementsByTagName('head')[0].appendChild(_script);
		this.includedScript[filename] = true;
	},
	includedScript : {}
};

// outro.js

})();

//# sourceMappingURL=pzprv3-ui.concat.js.map