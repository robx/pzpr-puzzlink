
/* jshint node: true */

exports.files = [
	"common/intro",
	"ui/Boot",
	"ui/UI",
	"ui/Event",
	"ui/Listener",
	"ui/MenuConfig",
	"ui/Misc",
	"ui/MenuArea",
	"ui/PopupMenu",
	"ui/ToolArea",
	"ui/Notify",
	"ui/KeyPopup",
	"ui/Timer",
	"common/outro"
].map(function(mod){ return "src/js/"+mod+".js";});
