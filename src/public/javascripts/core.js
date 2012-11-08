// version beta

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

/*

note:
updateSequenceNum

url: all has a hash indicator and starts with /
#/ latest notes
#/note/:_id
#/note/:_id/edit
#/tag/:_id
#/create

server API
/tags, get all tags, currently.
/notes?tag=abc&offset=&count=&words=
/notes/:_id POST, edit
/notes POST create

*/


$(function() {
	window.EVERPIECE = window.EVERPIECE || {};
	var e = window.EVERPIECE

	e.md = new Showdown.converter();

	// all data item has a last modified timestamp field.
	e.session = {};
	e.tags = {}; // _id as key => {_id: "", parent: "", name: "", desc: ""}
	e.notes = {}; // _id as key => {_id: "", tags:[tags _id list], content: "", contentHash: "", contentLength: ""};
	e.notes_tag = {}; // tag _id key => [notes _id list]
	e.notes_search = {}; 
	e.notes_general = {
		latest: [],
		latest_viewed: []
	};


	e.get_notes_list_tag = function(name) {
		name = encodeURIComponent(name);
		if( !e.notes_tag[name] )
			e.notes_tag[name] = [];
		return e.notes_tag[name];
	};

	e.get_notes_list_search = function( search ) {
		search = encodeURIComponent(search);
		if( !e.notes_search[search] )
			e.notes_search[search] = [];
		return e.notes_search[search];
	};

	e.get_note_markdown_html = function(markdown) {
		try {
			return e.md.makeHtml( markdown );
		} catch (e) {
			return "";
		}
	};

	e.get_session = function(callback) {
		$.ajax(root + "/status", {
			success: function(data) {
				if( data.username ) {
					e.session.username = data.username;
				}
				callback({});
			},
			error: function() {
				callback({
					error: "Ajax request error"
				});
			}
		});
	};

	e.update_tags = function(callback) {
		if( ! callback )
			callback = e.renderer;
		$.ajax(root + "/tags", {
			success: function(data, textStatus) {
				if( !data.error ) {
					for(var i = 0; i < data.items.length; i++) {
						e.tags[ data.items[i]._id ] = data.items[i];
						e.tags[ data.items[i]._id ].timespamp = (new Date).getTime();
					}
					callback({});
				} else {
					callback({
						error: data.error
					});
				}
			},
			error: function() {
				callback({
					error: "Ajax request error"
				});
			}
		});
	};

	e.get_note = function(id, callback) {
		if( ! callback )
			callback = e.renderer;
		$.ajax(root + "/notes/" + id, {
			success: function(data, textStatus) {
				if( !data.error ) {
					e.notes[data.item._id] = data.item;
					e.notes[data.item._id].timespamp = (new Date).getTime();
					callback({});
				} else {
					callback({
						error: data.error
					});
				}
			},
			error: function() {
				callback({
					error: "Ajax request error"
				});
			}
		});
	};

	e.update_notes_list = function(list, notes) {
		for(var i = 0; i < notes.length; i++) {
			var item = notes[i];
			for( var j = 0; j < item.tags.length; j++ ) {
				if( $.inArray( item._id, list) == -1 ) {
					list.push(item._id);
				}
			}
		}
	};

	e.update_notes = function(options, callback) {
		if( ! options )
			options = {};
		if( ! callback )
			callback = e.renderer;
		$.ajax(root + "/notes", {
			data: options,
			success: function(data, textStatus) {
				if( !data.error ) {
					for(var i = 0; i < data.items.length; i++) {
						var content = e.notes[ data.items[i]._id ] ? e.notes[ data.items[i]._id ].content : undefined;
						e.notes[ data.items[i]._id ] = data.items[i];
						if( e.notes[ data.items[i]._id ].content === undefined )
							e.notes[ data.items[i]._id ].content = content;

						e.notes[ data.items[i]._id ].timespamp = (new Date).getTime();
					}

					if( options.tag ) {
						for(var i = 0; i < data.items.length; i++) {
							var item = data.items[i];
							for( var j = 0; j < item.tags.length; j++ ) {
								var tagnoteslist = e.get_notes_list_tag( item.tags[j] );
								if( $.inArray( item._id, tagnoteslist) == -1 ) {
									tagnoteslist.push(item._id);
								}
							}
						}
					} else if ( options.s ) {
						var list = e.get_notes_list_search( options.s );
						list.length = 0;
						e.update_notes_list(list, data.items);
					} else {
						var list = e.notes_general["latest"];
						list.length = 0;
						e.update_notes_list(list, data.items);
					}

					callback({});
				} else {
					callback({
						error: data.error
					});
				}
			},
			error: function() {
				callback({
					error: "Ajax request error"
				});
			}
		});
	};

	e.parse_note_md = function(xml) {
		try {
			xmlDoc = $.parseXML( xml );
		} catch(e) {
			return false;
		}
		$container = $( xmlDoc ).find( "pre[style*=markdown]" );
		if( $container.length == 0 )
			return false;
		return $container.text();
	};

	e.make_note_xml =function(content) {
		var xml = "";

		xml += '<?xml version="1.0" encoding="UTF-8"?>';
		xml += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
		xml += '<en-note><pre style="_format: markdown"><![CDATA[';
		xml += content;
		xml += ']]></pre></en-note>';

		return xml;
	};

	e.create_or_update_note = function(note, callback_user) {
		if( !callback_user )
			var callback = e.renderer;
		else {
			var callback = function() {
				callback_user();
				e.renderer();
			}
		}
		//note.content = e.make_note_xml( note.content );

		if( note._id )
			var url = _l("/notes/" + note._id);
		else
			var url = _l("/notes");

		$.ajax(url, {
			dataType: "json",
			data: $.toJSON(note),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				e.notes[data.item._id] = data.item;
				e.notes[data.item._id].content = note.content;
				callback(data);
			},
			error: function(e) {
				callback({error: e});
			}
		});
	};

	// a partial reflesh event!
	//
	e.route = function(path) {
	    console.log("route ", path);
	    
	    var notes_list_main = $("#note-list");
	    var note = $("#note");
	    var match;

	    if( path == "/" ) {
	    	notes_list_main.attr("data-list", "latest");
	    	e.update_notes();
	    } else if( match = path.match(/^\/tag\/(.+)$/) ) {
	    	var tag = match[1];
	    	notes_list_main.attr("data-list", "tag");
	    	notes_list_main.attr("data-value", tag);
	    	e.update_notes({tag: tag});
	    } else if( match = path.match(/^\/search\/(.*)$/) ) {
	    	var search = match[1].trim();
	    	
	    	if( search != "" ) {
	    		notes_list_main.attr("data-list", "search");
	    		notes_list_main.attr("data-value", search);
	    		e.update_notes({s: search});
	    	} else {
	    		notes_list_main.attr("data-list", "latest");
	    		e.update_notes();
	    	}
	    }else if( match = path.match(/^\/notes\/(.+)$/) ) {
	    	var id = match[1];
	    	note.attr("data-id", id);
	    	e.get_note(id);
	    	$.address.value(path);
	    }

	    e.renderer();
	};

	// view layer
	var progress_link = function(event) {
		e.route( $(this).attr('href').replace(/^.*#/, '') );
    	event.preventDefault();
	};

	e.rebind_links = function() {
		$('a').each(function() {
			if( !$(this).attr("data-aready") ) {
    			$(this).attr("data-aready", 1);
    			$(this).click( progress_link );
    		}
		});
	};

	e.renderer_note = function(dom) {
		 // note
		var note = $(dom);
		var note_title = $(".note-title", note);
		var note_content = $(".note-content", note);
		var note_actions = $(".note-actions", note).hide();

	    var id = note.attr("data-id");
	    var title = "";
	    var content = "";
	    
	    if( id  ) {
	    	if ( e.notes[id] ) {
	    		title = escapeHtml( e.notes[id].title );
	    		if ( e.notes[id].content !== null ) {
	    			content = e.get_note_markdown_html( e.notes[id].content );
	    			note_actions.show();
	    		}
	    		else
	    			content = __("loading");
	    	}
	    	
	    }
	 
		note_title.html( title );
		note_content.html( content );
	};

	// renderer
	// some parts to renderer:
	/* 
	    Key notes:
	    use dom itself and "data-*" keys to storage metadata needed.
		1. notes list (left side)
		2. other meta data, such as tags
		3. current note content and body. actions area.
		4. Title.

		get server (and local) resources:

		tags (all got once)
		notes list (latest, latest viewed, tag, and arrange by other conditions, currently no paging);
		note content (by id)

	*/

	// accept a DOM object
	e.renderer_list = function(list_dom) {
		notes_list = $(list_dom);
		notes_list.empty();

	    var list = notes_list.attr("data-list");
	    var value = notes_list.attr("data-value");
	    
	    if( !list )
	    	return;

	    var note_list = [];

	    if( list == "latest" ) {
	    	note_list = e.notes_general["latest"];
	    } else if( list == "search" ) {
	    	note_list = e.get_notes_list_search( value );
	    } else if( list == "tag" ) { // tag
	    	note_list = e.get_notes_list_tag( value );
	    }

	    for(var i = 0; i < note_list.length; i++) {
	    	notes_list.append("<div class='note-list-item'></div>"
	    		+ "<a href='" + _l("/#/notes/" + note_list[i])  + "'>"
	    		+ ( e.notes[note_list[i]].title ? escapeHtml( e.notes[note_list[i]].title ) : "&nbsp;&nbsp;&nbsp;&nbsp;" )
	    		+ "</a>"
	    		+ "</div>");
	    }

	};

	e.renderer = function() {
		
		// tags
		var tags = $("#tags");
		//tags.empty();
		$("li", tags).remove();

		for(var id in e.tags) {
			if( e.tags.hasOwnProperty(id) )  {
				$("button", tags).before("<li ><a href='"
					+ root + "/#/tag/" + escapeHtml( e.tags[id].name ) + "'><i class='icon-tag'></i> " + escapeHtml( e.tags[id].name ) + "</a></li>");
			}
		}


		// notes list
		$(".note-list").each(function() {
			e.renderer_list(this);
		});

	    // note
	    e.renderer_note($("#note")[0]);

	    e.rebind_links();
	};

	


});


$(function() {
	var e = window.EVERPIECE;
	window.e = e; // = =

	$("#note-edit-content").keydown(function(e) {
		insertTab(this, e);
	});

	e.update_tags();
	$("#note-list").attr("data-list", "latest");
	$("#note-edit").hide();

	$.address.externalChange(function(event) {
		var path = event.path;
	    console.log("$.address.change ", path);
	    e.route( path );
	});

	$("#search").submit(function(event) {
		var words = $('input[name="words"]', this).val();
		e.route("/search/" + words);
		event.preventDefault();
	});

	$("#note .note-edit-link").click(function() {
		var id = $("#note").attr("data-id");
		$('#note-edit input[name="_id"]').val( id );
		$('#note-edit form input[name="title"]').val( e.notes[id].title);
		$('#note-edit form input[name="tags"]').val( e.notes[id].tags ? e.notes[id].tags.join(", ") : "");
		$('#note-edit form textarea[name="content"]').val( e.notes[id].content );

		$("#note-edit").show();
		$("#note").hide();
		$("#add-note-action").hide();
	});

	$("#add-note-action").click(function() {
		$("#note-edit").show();
		$("#note").hide();
		$("#add-note-action").hide();
	});

	$("#note-edit-save").click(function() {
		var note = $("#note-edit form").serializeObject();
		note.tags = note.tags.split(/[\s,]+/);

		e.create_or_update_note( note, e.update_tags );

		$("#note-edit").hide();
		$("#note").show();
		$("#add-note-action").show();
		$("#note-edit form input, #note-edit form textarea").val("");

		if( note._id ) {
			e.route("/notes/" + note._id);
		} else {
			e.route("/");
		}

	});

	$("#note-edit-discard").click(function() {
		$("#note-edit form input, #note-edit form textarea").val("");
		$("#note-edit").hide();
		$("#note").show();
		$("#add-note-action").show();
	});

	e.get_session(function() {
		if( e.session.username ) {
			$("#user").html(e.session.username);
			$("#user").attr("href", "/logout");
		} else {
			$("#user").html(__("login"));
			$("#user").attr("href", "/auth");
		}
	});


	e.renderer();

});

/*


	var socket = io.connect(root);
	socket.on('news', function (data) {
		console.log(data);
		socket.emit('my other event', { my: 'data' });
	});

*/