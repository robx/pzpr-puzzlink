// KeyInput.js v3.4.0
(function(){

var k = pzprv3.consts;

//---------------------------------------------------------------------------
// ★KeyEventクラス キーボード入力に関する情報の保持とイベント処理を扱う
//---------------------------------------------------------------------------
// パズル共通 キーボード入力部
// KeyEventクラスを定義
pzprv3.createCommonClass('KeyEvent',
{
	initialize : function(){
		this.cursor = this.owner.cursor;

		this.initialize_panel();
	},

	enablemake : false,
	enableplay : false,

	// const値
	KEYUP : 'up',
	KEYDN : 'down',
	KEYLT : 'left',
	KEYRT : 'right',

	//---------------------------------------------------------------------------
	// kc.keyreset()     キーボード入力に関する情報を初期化する
	// kc.isenablemode() 現在のモードでキー入力が有効か判定する
	//---------------------------------------------------------------------------
	keyreset : function(){
		this.isCTRL  = false;
		this.isMETA  = false;	// MacのCommandキーなど
		this.isALT   = false;	// ALTはメニュー用なので基本的に使わない
		this.isSHIFT = false;
		this.isZ = false;
		this.isX = false;
		this.isY = false;

		this.tcMoved = false;	// カーソル移動時にスクロールさせない
		this.prev = null;
	},
	isenablemode : function(){
		return ((this.owner.editmode&&this.enablemake)||(this.owner.playmode&&this.enableplay));
	},

	//---------------------------------------------------------------------------
	// kc.keydown()  キーを押した際のイベント共通処理
	// kc.keyup()    キーを離した際のイベント共通処理
	//---------------------------------------------------------------------------
	keydown : function(c){
		this.tcMoved = false;
		this.owner.opemgr.newOperation(true);
		if(!this.keydown_common(c)){
			if(!this.isenablemode()){ return true;}
			if(this.moveTarget(c)){
				return false;
			}
			else{
				if(c){ this.keyinput(c,0);}	// 各パズルのルーチンへ
			}
		}
		return true;
	},
	keyup : function(c){
		this.owner.opemgr.newOperation(false);
		if(!this.keyup_common(c)){
			if(c){ this.keyinput(c,1);}	// 各パズルのルーチンへ
		}
	},

	//---------------------------------------------------------------------------
	// kc.keyinput() キーを押した/離した際のイベント処理。各パズルのファイルでオーバーライドされる。
	//---------------------------------------------------------------------------
	// オーバーライド用
	keyinput : function(c,step){
		this.key_inputqnum(c); /* デフォルトはCell数字入力 */
	},

	//---------------------------------------------------------------------------
	// kc.keydown_common() キーを押した際のイベント共通処理(Undo,F2等)
	// kc.keyup_common()   キーを離した際のイベント共通処理(Undo等)
	//---------------------------------------------------------------------------
	keydown_common : function(c){
		var o = this.owner, ret = false;
		if(c==='z' && !this.isZ){ this.isZ=true;}
		if(c==='x' && !this.isX){ this.isX=true;}
		if(c==='y' && !this.isY){ this.isY=true;}

		if(c==='z' && (this.isCTRL || this.isMETA)){ ret = true;}
		if(c==='y' && (this.isCTRL || this.isMETA)){ ret = true;}

		if(c==='F2' && pzprv3.EDITOR){ // 112～123はF1～F12キー
			if     (o.editmode && !this.isSHIFT){ o.setConfig('mode',3); ret = true;}
			else if(o.playmode &&  this.isSHIFT){ o.setConfig('mode',1); ret = true;}
		}

		if(!this.isZ){ o.board.errclear();}
		if(pzprv3.debug.keydown(c)){ ret = true;}
		return ret;
	},
	keyup_common : function(c){
		var ret = false;
		if(c==='z' && this.isZ){ this.isZ=false;}
		if(c==='x' && this.isX){ this.isX=false;}
		if(c==='y' && this.isY){ this.isY=false;}

		if(c==='z' && (this.isCTRL || this.isMETA)){ ret = true;}
		if(c==='y' && (this.isCTRL || this.isMETA)){ ret = true;}
		return ret;
	},
	//---------------------------------------------------------------------------
	// kc.moveTarget()  キーボードからの入力対象を矢印キーで動かす
	// kc.moveTCell()   Cellのキーボードからの入力対象を矢印キーで動かす
	// kc.moveTCross()  Crossのキーボードからの入力対象を矢印キーで動かす
	// kc.moveTBorder() Borderのキーボードからの入力対象を矢印キーで動かす
	// kc.moveTC()      上記3つの関数の共通処理
	//---------------------------------------------------------------------------
	moveTarget  : function(ca){ return this.moveTCell(ca);},
	moveTCell   : function(ca){ return this.moveTC(ca,2);},
	moveTCross  : function(ca){ return this.moveTC(ca,2);},
	moveTBorder : function(ca){ return this.moveTC(ca,1);},
	moveTC : function(ca,mv){
		var tcp = this.cursor.getTCP(), dir = this.owner.board.BDIR;
		switch(ca){
			case this.KEYUP: if(tcp.by-mv>=this.cursor.miny){ dir = k.UP;} break;
			case this.KEYDN: if(tcp.by+mv<=this.cursor.maxy){ dir = k.DN;} break;
			case this.KEYLT: if(tcp.bx-mv>=this.cursor.minx){ dir = k.LT;} break;
			case this.KEYRT: if(tcp.bx+mv<=this.cursor.maxx){ dir = k.RT;} break;
			default: return false;
		}

		this.cursor.movedir_cursor(dir,mv);

		tcp.draw();
		this.cursor.getTCP().draw();
		this.tcMoved = true;

		return true;
	},

	//---------------------------------------------------------------------------
	// kc.key_inputcross() 上限maxまでの数字をCrossの問題データをして入力する(keydown時)
	//---------------------------------------------------------------------------
	key_inputcross : function(ca){
		var cross = this.cursor.getTXC();
		var max = cross.nummaxfunc(), val=-1;

		if('0'<=ca && ca<='9'){
			var num = parseInt(ca), cur = cross.getQnum();
			if(cur<=0 || cur*10+num>max){ cur=0;}
			val = cur*10+num;
			if(val>max){ return;}
		}
		else if(ca==='-'){ cross.setQnum(cross.getQnum()!==-2 ? -2 : -1);}
		else if(ca===' '){ cross.setQnum(-1);}
		else{ return;}

		cross.setQnum(val);
		cross.draw();
	},
	//---------------------------------------------------------------------------
	// kc.key_inputqnum() 上限maxまでの数字をCellの問題データをして入力する(keydown時)
	//---------------------------------------------------------------------------
	key_inputqnum : function(ca){
		var cell = this.cursor.getTCC();
		if(this.owner.editmode && this.owner.board.rooms.hastop){ cell = this.owner.board.rooms.getTopOfRoomByCell(cell);}

		if(this.key_inputqnum_main(cell,ca)){
			this.prev = cell;
			cell.draw();
		}
	},
	key_inputqnum_main : function(cell,ca){
		var max = cell.nummaxfunc(), min = cell.numminfunc(), val=-1;

		if('0'<=ca && ca<='9'){
			var num = parseInt(ca), cur = cell.getNum();
			if(cur<=0 || cur*10+num>max || this.prev!==cell){ cur=0;}
			val = cur*10+num;
			if(val>max || (min>0 && val===0)){ return false;}
		}
		else if(ca==='-') { val = ((this.owner.editmode&&!cell.disInputHatena)?-2:-1);}
		else if(ca===' ') { val = -1;}
		else if(ca==='s1'){ val = -2;}
		else if(ca==='s2'){ val = -3;}
		else{ return false;}

		cell.setNum(val);
		return true;
	},

	//---------------------------------------------------------------------------
	// kc.key_inputdirec()  四方向の矢印などを設定する
	//---------------------------------------------------------------------------
	key_inputdirec : function(ca){
		if(!this.isSHIFT){ return false;}

		var cell = this.cursor.getTCC(), pid = this.owner.pid;
		if(pid==="firefly" || pid==="snakes" || pid==="yajikazu" || pid==="yajirin"){
			if(cell.getQnum()===-1){ return false;}
		}

		var flag = true;
		switch(ca){
			case this.KEYUP: cell.setQdir(cell.getQdir()!==k.UP?k.UP:0); break;
			case this.KEYDN: cell.setQdir(cell.getQdir()!==k.DN?k.DN:0); break;
			case this.KEYLT: cell.setQdir(cell.getQdir()!==k.LT?k.LT:0); break;
			case this.KEYRT: cell.setQdir(cell.getQdir()!==k.RT?k.RT:0); break;
			default: flag = false;
		}

		if(flag){
			this.cursor.getTCP().draw();
			this.tcMoved = true;
		}
		return flag;
	},

	//---------------------------------------------------------------------------
	// kc.inputnumber51()  [＼]の数字等を入力する
	// kc.setnum51()      モード別に数字を設定する
	// kc.getnum51()      モード別に数字を取得する
	//---------------------------------------------------------------------------
	inputnumber51 : function(ca,max_obj){
		var tc = this.cursor;
		if(tc.chtarget(ca)){ return;}

		var obj = tc.getOBJ();
		var target = tc.detectTarget(obj);
		if(target===0 || (obj.iscellobj && obj.is51cell())){
			if(ca==='q' && !obj.isnull){
				if(obj.is51cell()){ obj.set51cell();}
				else              { obj.remove51cell();}
				tc.getTCP().draw();
				return;
			}
		}
		if(target==0){ return;}

		var def = this.owner.classes.Cell.prototype[(target===2?'qnum':'qdir')];
		var max = max_obj[target], val=def;

		if('0'<=ca && ca<='9'){
			var num=parseInt(ca), cur=this.getnum51(obj,target);
			if(cur<=0 || cur*10+num>max || this.prev!==(obj.iscellobj ? obj : null)){ cur=0;}
			val = cur*10+num;
			if(val>max){ return;}
		}
		else if(ca=='-' || ca==' '){ val=def;}
		else{ return;}

		this.setnum51(obj,target,val);
		this.prev = (obj.iscellobj ? obj : null);
		tc.getTCP().draw();
	},
	setnum51 : function(obj,target,val){
		(target==2 ? obj.setQnum(val) : obj.setQdir(val));
	},
	getnum51 : function(obj,target){
		return (target==2 ? this.owner.board.getQnum() : this.owner.board.getQdir());
	},

//---------------------------------------------------------------------------
// ★KeyPopupクラス マウスからキーボード入力する際のPopupウィンドウを管理する
//   ※KeyEventクラスと一緒にしました
//---------------------------------------------------------------------------
// キー入力用Popupウィンドウ

	initialize_panel : function(){
		this.haspanel = {	// 有効かどうか
			1 : (this.enablemake_p && pzprv3.EDITOR),
			3 : this.enableplay_p
		};
		this.element = null;				// キーポップアップのエレメント

		this.prefix;
		this.tdcolor = "black";
		this.imgCR = [1,1];		// img表示用画像の横×縦のサイズ

		this.imgs  = [];			// resize用

		this.basetmp   = null;
		this.clearflag = false;

		// ElementTemplate
		this.node_empty = pzprv3.createEL('div');
		this.node_empty.className = 'kpcell kpcellempty';
		pzprv3.unselectable(this.node_empty);
		
		this.node_div = pzprv3.createEL('div');
		this.node_div.className = 'kpcell kpcellvalid';
		pzprv3.unselectable(this.node_div);
		
		this.node_num = pzprv3.createEL('span');
		this.node_num.className = 'kpnum';
		pzprv3.unselectable(this.node_num);
		
		this.node_img = pzprv3.createEL('img');
		this.node_img.className = 'kpimg';
		pzprv3.unselectable(this.node_img);
	},

	enablemake_p : false,
	enableplay_p : false,
	paneltype    : 10,

	//---------------------------------------------------------------------------
	// kp.display()     キーポップアップを表示する
	//---------------------------------------------------------------------------
	display : function(){
		var mode = this.owner.getConfig('mode');
		if(this.element && this.haspanel[mode] && this.owner.getConfig('keypopup')){

			this.element.style.display = 'block';

			pzprv3.getEL('panelbase1').style.display = (mode==1?'block':'none');
			pzprv3.getEL('panelbase3').style.display = (mode==3?'block':'none');
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
		if(!this.haspanel[1] && !this.haspanel[3]){ return;}
		
		if(!this.element){
			this.element = this.makeKeyPopup();
		}
		
		if(this.enablemake_p && pzprv3.EDITOR){ this.createtable(1);}
		if(this.enableplay_p)                 { this.createtable(3);}
	},
	createtable : function(mode){
		this.prefix = ['kp',mode,'_'].join('');

		this.basetmp = pzprv3.getEL('panelbase'+mode);
		this.basetmp.innerHTML = '';

		this.generate(mode,this.paneltype);
	},

	//---------------------------------------------------------------------------
	// kp.makeKeyPopup() キーポップアップのパネルを作成する
	//---------------------------------------------------------------------------
	makeKeyPopup : function(){
		var keypopup, bar, _doc = document, o = this.owner;
		var rect = pzprv3.getRect(pzprv3.getEL('divques'));
		
		keypopup = _doc.createElement('div');
		keypopup.className = 'popup';
		keypopup.id = 'keypopup';
		keypopup.style.left   = (rect.left+48)+'px';
		keypopup.style.top    = (rect.top +48)+'px';
		keypopup.style.zIndex = 100;
		pzprv3.getEL("popup_parent").appendChild(keypopup);
		
		bar = _doc.createElement('div');
		bar.className = 'titlebar';
		bar.id = 'barkeypopup';
		bar.appendChild(_doc.createTextNode("panel"));
		pzprv3.unselectable(bar);
		keypopup.appendChild(bar);
		pzprv3.event.addMouseDownEvent(bar, pzprv3.ui.popupmgr, pzprv3.ui.popupmgr.titlebardown);
		pzprv3.event.addEvent(bar, 'dblclick', o, function(){ o.setConfig('keypopup',false)});
		
		var panel = _doc.createElement('div');
		panel.className = 'panelbase';
		panel.id = 'panelbase1';
		keypopup.appendChild(panel);
		
		panel = _doc.createElement('div');
		panel.className = 'panelbase';
		panel.id = 'panelbase3';
		keypopup.appendChild(panel);
		
		return keypopup;
	},

	//---------------------------------------------------------------------------
	// kp.generate()    キーポップアップのテーブルを作成する
	// kp.gentable4()   キーポップアップの0～4を入力できるテーブルを作成する
	// kp.gentable10()  キーポップアップの0～9を入力できるテーブルを作成する
	// kp.gentable51()  キーポップアップの[＼],0～9を入力できるテーブルを作成する
	//---------------------------------------------------------------------------
	generate : function(mode,type){
		if     (type===10){ this.gentable10(mode,type);}
		else if(type===51){ this.gentable51(mode,type);}
		else              { this.gentable4 (mode,type);} // 1,2,4の場合
	},
	gentable4 : function(mode,type){
		this.inputcol('num','knum0','0','0');
		this.inputcol('num','knum1','1','1');
		this.inputcol('num','knum2','2','2');
		this.inputcol('num','knum3','3','3');
		this.insertrow();
		this.inputcol('num','knum4','4','4');
		this.inputcol('empty','','','');
		this.inputcol('num','knum_',' ',' ');
		if     (type==1){ this.inputcol('num','knum.','-','?');}
		else if(type==2){ this.inputcol('num','knum.','-','■');}
		else if(type==4){ this.inputcol('num','knum.','-','○');}
		this.insertrow();
	},
	gentable10 : function(mode,type){
		this.inputcol('num','knum0','0','0');
		this.inputcol('num','knum1','1','1');
		this.inputcol('num','knum2','2','2');
		this.inputcol('num','knum3','3','3');
		this.insertrow();
		this.inputcol('num','knum4','4','4');
		this.inputcol('num','knum5','5','5');
		this.inputcol('num','knum6','6','6');
		this.inputcol('num','knum7','7','7');
		this.insertrow();
		this.inputcol('num','knum8','8','8');
		this.inputcol('num','knum9','9','9');
		this.inputcol('num','knum_',' ',' ');
		if(mode==1){ this.inputcol('num','knum.','-','?');}else{ this.inputcol('empty','','','');}
		this.insertrow();
	},
	gentable51 : function(mode,type){
		this.inputcol('image','knumq','q',[0,0]);
		this.inputcol('num','knum_',' ',' ');
		this.inputcol('num','knum1','1','1');
		this.inputcol('num','knum2','2','2');
		this.insertrow();
		this.inputcol('num','knum3','3','3');
		this.inputcol('num','knum4','4','4');
		this.inputcol('num','knum5','5','5');
		this.inputcol('num','knum6','6','6');
		this.insertrow();
		this.inputcol('num','knum7','7','7');
		this.inputcol('num','knum8','8','8');
		this.inputcol('num','knum9','9','9');
		this.inputcol('num','knum0','0','0');
		this.insertrow();
	},

	//---------------------------------------------------------------------------
	// kp.inputcol()  テーブルのセルを追加する
	// kp.insertrow() テーブルの行を追加する
	//---------------------------------------------------------------------------
	inputcol : function(type, id, ca, disp){
		var _div = null, _child = null, self = this;
		if(type!=='empty'){
			_div = this.node_div.cloneNode(false);
			_div.id = this.prefix+id;
			_div.onclick = function(){ self.keyinput(ca);};
		}
		else{ _div = this.node_empty.cloneNode(false);}

		if(type==='num'){
			_child = this.node_num.cloneNode(false);
			_child.id = this.prefix+id+"_s";
			_child.style.color = this.tdcolor;
			_child.innerHTML   = disp;
		}
		else if(type==='image'){
			_child = this.node_img.cloneNode(false);
			_child.id = this.prefix+id+"_i";
			_child.src = "./src/img/"+this.owner.pid+"_kp.gif";
			this.imgs.push({'el':_child, 'x':disp[0], 'y':disp[1]});
		}

		if(this.clearflag){ _div.style.clear='both'; this.clearflag=false;}
		if(!!_child){ _div.appendChild(_child);}
		this.basetmp.appendChild(_div);
	},
	insertrow : function(){
		this.clearflag = true;
	},

	//---------------------------------------------------------------------------
	// kp.resizepanel() キーポップアップのセルのサイズを変更する
	//---------------------------------------------------------------------------
	resizepanel : function(){
		var cellsize = Math.min(this.owner.painter.cw, 120);
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

		pzprv3.ui.modifyCSS({
			"div.kpcell" : { width:(""+dsize+"px"), height:(""+dsize+"px"), lineHeight:(""+dsize+"px")},
			"span.kpnum" : { fontSize:(""+tsize+"px")}
		});
	}
});

//---------------------------------------------------------------------------
// ★TargetCursorクラス キー入力のターゲットを保持する
//---------------------------------------------------------------------------

pzprv3.createCommonClass('TargetCursor',
{
	initialize : function(){
		// 現在入力ターゲットになっている場所(border座標系)
		this.pos = this.owner.newInstance('Address',[1,1]);

		// 有効な範囲(minx,miny)-(maxx,maxy)
		this.minx;
		this.miny;
		this.maxx;
		this.maxy;
	},

	crosstype : false,

	//---------------------------------------------------------------------------
	// tc.setminmax()  初期化時・モード変更時にプロパティを設定する
	// tc.initCursor() 初期化時にカーソルの位置を設定する
	// 
	// tc.adjust_init()       初期化時にカーソルの位置がおかしい場合に調整する
	// tc.adjust_modechange() モード変更時に位置がおかしい場合に調節する(オーバーライド用)
	//---------------------------------------------------------------------------
	setminmax : function(){
		var bd = this.owner.board, bm = (!this.crosstype?1:0);
		this.minx = bd.minbx + bm;
		this.miny = bd.minby + bm;
		this.maxx = bd.maxbx - bm;
		this.maxy = bd.maxby - bm;

		this.adjust_init();
	},
	initCursor : function(){
		if(this.crosstype){ this.pos = this.owner.newInstance('Address',[0,0]);}
		else              { this.pos = this.owner.newInstance('Address',[1,1]);}

		this.adjust_init();
	},

	adjust_init : function(){
		if(this.pos===(void 0)){ return;}
		if(this.pos.bx<this.minx){ this.pos.bx=this.minx;}
		if(this.pos.by<this.miny){ this.pos.by=this.miny;}
		if(this.pos.bx>this.maxx){ this.pos.bx=this.maxx;}
		if(this.pos.by>this.maxy){ this.pos.by=this.maxy;}
	},
	adjust_modechange : function(){ },

	//---------------------------------------------------------------------------
	// tc.movedir_cursor() ターゲットの位置を動かす
	//---------------------------------------------------------------------------
	movedir_cursor : function(dir,mv){
		this.pos.movedir(dir,mv);
	},

	//---------------------------------------------------------------------------
	// tc.getTCP() ターゲットの位置をAddressクラスのオブジェクトで取得する
	// tc.setTCP() ターゲットの位置をAddressクラスのオブジェクトで設定する
	// tc.getTCC() ターゲットの位置をCellのIDで取得する
	// tc.setTCC() ターゲットの位置をCellのIDで設定する
	// tc.getTXC() ターゲットの位置をCrossのIDで取得する
	// tc.setTXC() ターゲットの位置をCrossのIDで設定する
	// tc.getTBC() ターゲットの位置をBorderのIDで取得する
	// tc.setTBC() ターゲットの位置をBorderのIDで設定する
	// tc.getTEC() ターゲットの位置をEXCellのIDで取得する
	// tc.setTEC() ターゲットの位置をEXCellのIDで設定する
	// tc.getOBJ() ターゲットの位置をオブジェクトで取得する
	// tc.setOBJ() ターゲットの位置をオブジェクトで設定する
	//---------------------------------------------------------------------------
	getTCP : function(){ return this.pos.clone();},
	setTCP : function(pos){
		if(pos.bx<this.minx || this.maxx<pos.bx || pos.by<this.miny || this.maxy<pos.by){ return;}
		this.pos.set(pos);
	},

	getTCC : function(){ return this.pos.getc();},
	setTCC : function(cell){ this.pos.init(cell.bx,cell.by);},

	getTXC : function(){ return this.pos.getx();},
	setTXC : function(cross){ this.pos.init(cross.bx,cross.by);},

	getTBC : function(){ return this.pos.getb();},
	setTBC : function(border){ this.pos.init(border.bx,border.by);},

	getTEC : function(){ return this.pos.getex();},
	setTEC : function(excell){ this.pos.init(excell.bx,excell.by);},

	getOBJ : function(){ return this.owner.board.getobj(this.pos.bx, this.pos.by);},
	setOBJ : function(obj){
		if(obj.isnull){ return;}
		this.pos.init(obj.bx,obj.by);
	},

	//---------------------------------------------------------------------------
	// tc.chtarget()     SHIFTを押した時に[＼]の入力するところを選択する
	// tc.detectTarget() [＼]の右・下どちらに数字を入力するか判断する
	//---------------------------------------------------------------------------
	targetdir : 2,
	chtarget : function(ca){
		if(ca!='shift'){ return false;}
		if(this.targetdir==2){ this.targetdir=4;}
		else{ this.targetdir=2;}
		this.getTCC().draw();
		return true;
	},
	detectTarget : function(obj){
		var bd = this.owner.board;
		if(obj.isnull){ return 0;}
		else if(obj.iscellobj){
			if     (obj.ques!==51 || obj.id===bd.cellmax-1){ return 0;}
			else if((obj.rt().isnull || obj.rt().getQues()===51) &&
				    (obj.dn().isnull || obj.dn().getQues()===51)){ return 0;}
			else if(obj.rt().isnull || obj.rt().getQues()===51){ return 4;}
			else if(obj.dn().isnull || obj.dn().getQues()===51){ return 2;}
		}
		else if(obj.isexcellobj){
			if     (obj.id===bd.qcols+bd.qrows){ return 0;}
			else if((obj.by===-1 && obj.relcell(0,2).getQues()===51) ||
				    (obj.bx===-1 && obj.relcell(2,0).getQues()===51)){ return 0;}
			else if(obj.by===-1){ return 4;}
			else if(obj.bx===-1){ return 2;}
		}
		else{ return 0;}

		return this.targetdir;
	}
});

})();
