//
// �p�Y���ŗL�X�N���v�g�� �A�ԑ����� renban.js v3.2.2
//
Puzzles.renban = function(){ };
Puzzles.renban.prototype = {
	setting : function(){
		// �O���[�o���ϐ��̏����ݒ�
		if(!k.qcols){ k.qcols = 6;}	// �Ֆʂ̉���
		if(!k.qrows){ k.qrows = 6;}	// �Ֆʂ̏c��
		k.irowake = 0;			// 0:�F�����ݒ薳�� 1:�F�������Ȃ� 2:�F��������

		k.iscross      = 0;		// 1:Cross������\�ȃp�Y��
		k.isborder     = 1;		// 1:Border/Line������\�ȃp�Y��
		k.isextendcell = 0;		// 1:��E�����ɃZ����p�ӂ���p�Y�� 2:�l���ɃZ����p�ӂ���p�Y��

		k.isoutsidecross  = 0;	// 1:�O�g���Cross�̔z�u������p�Y��
		k.isoutsideborder = 0;	// 1:�Ֆʂ̊O�g���border��ID��p�ӂ���
		k.isLineCross     = 0;	// 1:������������p�Y��
		k.isCenterLine    = 0;	// 1:�}�X�̐^�񒆂�ʂ�����񓚂Ƃ��ē��͂���p�Y��
		k.isborderAsLine  = 0;	// 1:���E����line�Ƃ��Ĉ���

		k.dispzero      = 0;	// 1:0��\�����邩�ǂ���
		k.isDispHatena  = 1;	// 1:qnum��-2�̂Ƃ��ɁH��\������
		k.isAnsNumber   = 1;	// 1:�񓚂ɐ�������͂���p�Y��
		k.isArrowNumber = 0;	// 1:������������͂���p�Y��
		k.isOneNumber   = 0;	// 1:�����̖��̐�����1��������p�Y��
		k.isDispNumUL   = 0;	// 1:�������}�X�ڂ̍���ɕ\������p�Y��(0�̓}�X�̒���)
		k.NumberWithMB  = 0;	// 1:�񓚂̐����Ɓ��~������p�Y��

		k.BlackCell     = 0;	// 1:���}�X����͂���p�Y��
		k.NumberIsWhite = 0;	// 1:�����̂���}�X�����}�X�ɂȂ�Ȃ��p�Y��
		k.RBBlackCell   = 0;	// 1:�A�����f�ւ̃p�Y��

		k.ispzprv3ONLY  = 1;	// 1:�ς��Ղ�v3�ɂ����Ȃ��p�Y��
		k.isKanpenExist = 0;	// 1:pencilbox/�J���y���ɂ���p�Y��

		k.fstruct = ["borderques", "cellqnum", "cellqanssub"];

		//k.def_csize = 36;
		//k.def_psize = 24;
		//k.area = { bcell:0, wcell:0, number:0};	// area�I�u�W�F�N�g�ŗ̈�𐶐�����

		base.setTitle("�A�ԑ���","Renban-Madoguchi");
			base.setExpression("�@�L�[�{�[�h��}�E�X�Ő��������͂ł��܂��B",
							   " It is available to input number by keybord or mouse");
		base.setFloatbgcolor("rgb(64, 64, 64)");
	},
	menufix : function(){
		if(k.callmode=="pmake"){ kp.defaultdisp = true;}
	},

	//---------------------------------------------------------
	//���͌n�֐��I�[�o�[���C�h
	input_init : function(){
		// �}�E�X���͌n
		mv.mousedown = function(x,y){
			if(k.mode==1) this.borderinput = this.inputborder(x,y);
			if(k.mode==3){
				if(!kp.enabled()){ this.inputqnum(x,y,99);}
				else{ kp.display(x,y);}
			}
		};
		mv.mouseup = function(x,y){
			if(this.notInputted()){
				if(k.mode==1){
					if(!kp.enabled()){ this.inputqnum(x,y,99);}
					else{ kp.display(x,y);}
				}
			}
		};
		mv.mousemove = function(x,y){
			if(k.mode==1 && this.btn.Left) this.inputborder(x,y);
		};

		// �L�[�{�[�h���͌n
		kc.keyinput = function(ca){
			if(this.moveTCell(ca)){ return;}
			this.key_inputqnum(ca,99);
		};

		kp.generate(0, true, true, '');
		kp.kpinput = function(ca){ kc.key_inputqnum(ca,99);};
	},

	//---------------------------------------------------------
	//�摜�\���n�֐��I�[�o�[���C�h
	graphic_init : function(){
		pc.gridcolor = pc.gridcolor_DLIGHT;

		pc.paint = function(x1,y1,x2,y2){
			this.flushCanvas(x1,y1,x2,y2);
		//	this.flushCanvasAll();

			this.drawErrorCells(x1,y1,x2,y2);

			this.drawGrid(x1,y1,x2,y2);

			this.drawNumbers(x1,y1,x2,y2);

			this.drawBorders(x1,y1,x2,y2);

			this.drawChassis(x1,y1,x2,y2);

			this.drawTCell(x1,y1,x2+1,y2+1);
		};

		// �G���[���ɐԂ��\���������̂ŏ㏑��
		pc.drawBorder1 = function(id,flag){
			g.fillStyle = this.BorderQuescolor;
			if(bd.ErB(id)===1){ g.fillStyle = this.errcolor1;}
			this.drawBorder1x(bd.border[id].cx,bd.border[id].cy,flag);
		};
	},

	//---------------------------------------------------------
	// URL�G���R�[�h/�f�R�[�h����
	encode_init : function(){
		enc.pzlimport = function(type, bstr){
			if(type==0 || type==1){
				bstr = this.decodeBorder(bstr);
				bstr = this.decodeNumber16(bstr);
			}
		};
		enc.pzlexport = function(type){
			if(type==0)     { document.urloutput.ta.value = this.getURLbase()+"?"+k.puzzleid+this.pzldata();}
			else if(type==3){ document.urloutput.ta.value = this.getURLbase()+"?m+"+k.puzzleid+this.pzldata();}
		};
		enc.pzldata = function(){
			return "/"+k.qcols+"/"+k.qrows+"/"+this.encodeBorder()+this.encodeNumber16();
		};
	},

	//---------------------------------------------------------
	// ���𔻒菈�����s��
	answer_init : function(){
		ans.checkAns = function(){

			var rinfo = area.getRoomInfo();
			if( !this.checkDifferentNumber(rinfo) ){
				this.setAlert('1�̕����ɓ������������������Ă��܂��B','A room has two or more same numbers.'); return false;
			}

			if( !this.checkNumbersInRoom(rinfo) ){
				this.setAlert('�����ɓ��鐔��������������܂���B','The numbers in the room are wrong.'); return false;
			}

			if( !this.checkBorderSideNumber() ){
				this.setAlert('�����̍������̊Ԃɂ�����̒����Ɠ���������܂���B','The differnece between two numbers is not equal to the length of the line between them.'); return false;
			}

			if( !this.checkAllCell(bd.noNum) ){
				this.setAlert('�����̓����Ă��Ȃ��}�X������܂��B','There is an empty cell.'); return false;
			}

			return true;
		};
		ans.check1st = function(){ return this.checkAllCell(bd.noNum);};

		ans.checkDifferentNumber = function(rinfo){
			for(var r=1;r<=rinfo.max;r++){
				var d = [], idlist = rinfo.room[r].idlist;
				for(var i=1;i<=99;i++){ d[i]=-1;}
				for(var i=0,len=idlist.length;i<len;i++){
					var val=bd.getNum(idlist[i]);
					if     (val===-1 || val===-2){ continue;}
					else if(d[val]===-1){ d[val] = idlist[i]; continue;}

					bd.sErC(idlist,1);
					return false;
				}
			}
			return true;
		};
		ans.checkNumbersInRoom = function(rinfo){
			for(var r=1;r<=rinfo.max;r++){
				var idlist = rinfo.room[r].idlist
				if(idlist.length<=1){ continue;}
				var max=-1, min=99, breakflag=false;
				for(var i=0,len=idlist.length;i<len;i++){
					var val=bd.getNum(idlist[i]);
					if(val===-1 || val===-2){ breakflag=true; break;}
					if(max<val){ max=val;}
					if(min>val){ min=val;}
				}
				if(breakflag){ break;}

				if(idlist.length !== (max-min)+1){
					bd.sErC(idlist,1);
					return false;
				}
			}
			return true;
		};

		ans.checkBorderSideNumber = function(){
			// ���̒������擾����
			var rdata = new AreaInfo();
			for(var i=0;i<bd.bdmax;i++){ rdata.id[i] = (bd.isBorder(i)?0:-1);}
			for(var i=0;i<bd.bdmax;i++){
				if(rdata.id[i]!==0){ continue;}
				var bx=bd.border[i].cx, by=bd.border[i].cy, idlist=[];
				while(1){
					var id = bd.bnum(bx,by);
					if(id===-1 || rdata.id[id]!==0){ break;}

					idlist.push(id);
					if(bx%2===1){ bx+=2;}else{ by+=2;}
				}
				rdata.max++;
				for(var n=0;n<idlist.length;n++){ rdata.id[idlist[n]]=rdata.max;}
				rdata.room[rdata.max] = {idlist:idlist};
			}

			// ���ۂɍ��𒲍�����
			for(var i=0;i<bd.bdmax;i++){
				if(rdata.id[i]===-1){ continue;}
				var cc1=bd.cc1(i), cc2=bd.cc2(i);	// cc1��cc2��-1�ɂ͂Ȃ�Ȃ�
				var val1=bd.getNum(cc1), val2=bd.getNum(cc2);
				if(val1<=0 || val2<=0){ continue;}

				if(Math.abs(val1-val2)!==rdata.room[rdata.id[i]].idlist.length){
					bd.sErC([cc1,cc2],1);
					bd.sErB(rdata.room[rdata.id[i]].idlist,1);
					return false;
				}
			}
			return true;
		};
	}
};