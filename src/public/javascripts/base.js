// insertTab version 1.0
// http://pallieter.org/Projects/insertTab/
function insertTab(o, e) {
	var kC = e.keyCode ? e.keyCode : e.charCode ? e.charCode : e.which;
	if (kC == 9 && !e.shiftKey && !e.ctrlKey && !e.altKey)
	{
		var oS = o.scrollTop;
		if (o.setSelectionRange)
		{
			var sS = o.selectionStart;
			var sE = o.selectionEnd;
			o.value = o.value.substring(0, sS) + "\t" + o.value.substr(sE);
			o.setSelectionRange(sS + 1, sS + 1);
			o.focus();
		}
		else if (o.createTextRange)
		{
			document.selection.createRange().text = "\t";
			e.returnValue = false;
		}
		o.scrollTop = oS;
		if (e.preventDefault)
		{
			e.preventDefault();
		}
		return false;
	}
	return true;
}

var _entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

function escapeHtml(string) {
	// or return $('<div/>').text(string).html();
	return String(string).replace(/[&<>"'\/]/g, function (s) {
		return _entityMap[s];
	});
}

var _md = new Showdown.converter();
function md2Html(markdown) {
	try {
		return _md.makeHtml( markdown );
	} catch (e) {
		return "";
	}
};

$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

// Usage:
// '{0} + {1} = {2}'.format(2, -1, 1);
// Returns '2 + -1 = 1'.
String.prototype.format = function() {
    var args = arguments;

    return this.replace(/\{(\d+)\}/g, function() {
        return args[arguments[1]];
    });
};

// index used start from {1}
function __(key) {
	if( msgs[key] ) {
		return String.prototype.format.apply(msgs[key], arguments);
	} else {
		return key;
	}
}

function _l(path) {
	return root + path;
};