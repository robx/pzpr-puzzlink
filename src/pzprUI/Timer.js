// Timer.js v3.4.0
(function(){

/* uiオブジェクト生成待ち */
if(!ui){ setTimeout(setTimeout(arguments.callee),15); return;}

/* タイマー割り込み間隔を短くするUA */
var slowUA = (pzprv3.browser.IE6 || pzprv3.browser.IE7 || pzprv3.browser.IE8);

//---------------------------------------------------------------------------
// ★Timerクラス  一般タイマー(経過時間の表示/自動正答判定用)
//---------------------------------------------------------------------------
ui.timer =
{
	/* メンバ変数 */
	TID           : null,					/* タイマーID */
	timerInterval : (!slowUA ? 100 : 200),	/* タイマー割り込み間隔 */

	current  : 0,		/* 現在のgetTime()取得値(ミリ秒) */

	/* 経過時間表示用変数 */
	bseconds : 0,		/* 前回ラベルに表示した時間(秒数) */
	timerEL  : null,	/* 経過時間表示用要素 */

	/* 自動正答判定用変数 */
	lastAnsCnt  : 0,	/* 前回正答判定した時の、OperationManagerに記録されてた問題/回答入力のカウント */
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
		this.TID = setInterval(function(){ self.update();}, this.timerInterval);
	},
	update : function(){
		this.current = pzprv3.util.currentTime();

		if(pzprv3.PLAYER){ this.updatetime();}
		if(ui.menu.getMenuConfig('autocheck')){ this.ACcheck();}
	},

	//---------------------------------------------------------------------------
	// tm.updatetime() 秒数の表示を行う
	// tm.label()      経過時間に表示する文字列を返す
	//---------------------------------------------------------------------------
	updatetime : function(){
		var seconds = (ui.puzzle.getTime()/1000)|0;
		if(this.bseconds == seconds){ return;}

		var hours   = (seconds/3600)|0;
		var minutes = ((seconds/60)|0) - hours*60;
		seconds = seconds - minutes*60 - hours*3600;

		if(minutes < 10) minutes = "0" + minutes;
		if(seconds < 10) seconds = "0" + seconds;

		this.timerEL.innerHTML = [this.label(), (!!hours?hours+":":""), minutes, ":", seconds].join('');

		this.bseconds = seconds;
	},
	label : function(){
		return ui.menu.selectStr("経過時間：","Time: ");
	},

	//---------------------------------------------------------------------------
	// tm.ACcheck()    自動正解判定を呼び出す
	//---------------------------------------------------------------------------
	ACcheck : function(){
		var o = ui.puzzle;
		if(this.current>this.nextACtime && this.lastAnsCnt != o.opemgr.anscount && o.playmode && !o.checker.inCheck){
			this.lastAnsCnt = o.opemgr.anscount;
			if(o.check(false)===0){
				o.mouse.mousereset();
				ui.menu.setMenuConfig('autocheck',false);
				ui.menu.alertStr("正解です！","Complete!");
				return;
			}

			this.worstACtime = Math.max(this.worstACtime, (pzprv3.util.currentTime()-this.current));
			this.nextACtime = this.current + (this.worstACtime<250 ? this.worstACtime*4+120 : this.worstACtime*2+620);
		}
	}
};

//---------------------------------------------------------------------------
// ★UndoTimerクラス   Undo/Redo用タイマー
//---------------------------------------------------------------------------
ui.undotimer =
{
	/* メンバ変数 */
	TID           : null,	/* タイマーID */
	timerInterval : (!slowUA ? 25 : 50),

	inUNDO        : false,	/* Undo実行中 */
	inREDO        : false,	/* Redo実行中 */

	/* Undo/Redo用変数 */
	undoWaitTime  : 300,	/* 1回目にwaitを多く入れるための値 */
	undoWaitCount : 0,

	//---------------------------------------------------------------------------
	// ut.reset()  タイマーをスタートする
	//---------------------------------------------------------------------------
	reset : function(){
		this.stop();
	},

	//---------------------------------------------------------------------------
	// ut.startUndo() Undo呼び出しを開始する
	// ut.startRedo() Redo呼び出しを開始する
	// ut.startProc() Undo/Redo呼び出しを開始する
	// 
	// ut.stop()      Undo/Redo呼び出しを終了する
	//---------------------------------------------------------------------------
	startUndo : function(){ if(!this.inUNDO){ this.inUNDO=true; this.startProc();}},
	startRedo : function(){ if(!this.inREDO){ this.inREDO=true; this.startProc();}},
	startProc : function(){
		this.undoWaitCount = this.undoWaitTime/this.timerInterval;
		if(!this.TID){
			var self = this;
			this.TID = setInterval(function(){ self.proc();}, this.timerInterval);
		}
		this.exec();
	},

	stop : function(){
		this.inUNDO = false;
		this.inREDO = false;

		if(!!this.TID){
			clearInterval(this.TID);
			this.TID = null;
		}
	},

	//---------------------------------------------------------------------------
	// ut.proc()  Undo/Redo呼び出しを実行する
	// ut.exec()  Undo/Redo関数を呼び出す
	//---------------------------------------------------------------------------
	proc : function(){
		if (!this.inUNDO && !this.inREDO){ this.stop();}
		else if(this.undoWaitCount>0){ this.undoWaitCount--;}
		else{ this.exec();}
	},
	exec : function(){
		var o = ui.puzzle, kc = o.key;
		if(!kc.isCTRL && !kc.isMETA)   { this.stop();}
		else if(this.inUNDO && !kc.isZ){ this.stop();}
		else if(this.inREDO && !kc.isY){ this.stop();}
		
		if(!!this.TID){
			if(this.inUNDO){
				if(!o.undo()){ this.stop();}
			}
			else if(this.inREDO){
				if(!o.redo()){ this.stop();}
			}
		}
	}
};

})();
