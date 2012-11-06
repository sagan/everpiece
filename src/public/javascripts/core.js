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
#/note/:guid
#/note/:guid/edit
#/tag/:guid
#/create

server API
/tags, get all tags, currently.
/notes?tag=abc&offset=&count=&words=
/notes/:guid POST, edit
/notes POST create

*/

var EVERPIECE = {};
$(function() {
	var e = window.EVERPIECE;

	e.md = new Showdown.converter();

	// all data item has a last modified timestamp field.
	e.session = {};
	e.tags = {}; // guid as key => {guid: "", parent: "", name: "", desc: ""}
	e.notes = {}; // guid as key => {guid: "", tags:[tags guid list], content: "", contentHash: "", contentLength: ""};
	e.tag_notes = {}; // tag guid key => [notes guid list]
	e.general_notes = {
		latest: [],
		latest_viewed: []
	};

	e.getSession = function(callback) {
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
						e.tags[ data.items[i].guid ] = data.items[i];
						e.tags[ data.items[i].guid ].timespamp = (new Date).getTime();
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
					e.notes[data.item.guid] = data.item;
					e.notes[data.item.guid].timespamp = (new Date).getTime();
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
						var content = null;
						if( e.notes[ data.items[i].guid ] && e.notes[ data.items[i].guid ].content !== null) {
							content = e.notes[ data.items[i].guid ].content;
						}
						e.notes[ data.items[i].guid ] = data.items[i];
						if( content !== null && e.notes[ data.items[i].guid ].content === null )
							e.notes[ data.items[i].guid ].content = content;

						e.notes[ data.items[i].guid ].timespamp = (new Date).getTime();
					}

					if( options.tag ) {
						if( !e.tag_notes[options.tag] )
							e.tag_notes[options.tag] = [];
						for(var i = 0; i < data.items.length; i++) {
							var item = data.items[i];
							for( var j = 0; j < item.tagGuids.length; j++ ) {
								if( $.inArray( item.guid, e.tag_notes[item.tagGuids[j]]) == -1 ) {
									e.tag_notes[item.tagGuids[j]].push(item.guid);
								}
							}
						}
					} else {
						e.general_notes["latest"] = [];
						for(var i = 0; i < data.items.length; i++) {
							var item = data.items[i];
							//if( $.inArray( item.guid, e.general_notes["latest"]) == -1 ) {
								e.general_notes["latest"].push(item.guid);
							//}
						}
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

	e.create_or_update_note = function(note, callback) {
		if( !callback )
			callback = e.renderer;
		note.content = e.make_note_xml( note.content );

		if( note.guid )
			var url = _l("/notes/" + note.guid);
		else
			var url = _l("/notes");

		$.ajax(url, {
			dataType: "json",
			data: $.toJSON(note),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				e.notes[data.item.guid] = data.item;
				e.notes[data.item.guid].content = note.content;
				callback(data);
			},
			error: function(e) {
				callback({error: e});
			}
		});
	};

	e.route = function(event) {

	};

	// view layer
	e.rebind_links = function() {
		$('a').address(function() {  
    		return $(this).attr('href').replace(/^.*#/, '');  
		});
		/*   
		$('a').each(function() {
			if( !$(this).attr("data-aready") ) {
    			$(this).attr("data-aready", 1);
    			$(this).click( function() {
    				$.address.value( $(this).attr('href').replace(/^.*#/, '') );
    			})
    		}
		});
		*/
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
	    		title = e.notes[id].title;
	    		if ( e.notes[id].content !== null ) {
	    			var markdown = e.parse_note_md( e.notes[id].content );
	    			if( markdown !== false ) {
	    				content = e.md.makeHtml(markdown);
	    				note_actions.show();
	    			} else {
	    				content = e.notes[id].content;
	    			}
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
	    
	    if( list == undefined)
	    	return;

	    if( list == "latest" ) {
			for(var i = 0; i < e.general_notes["latest"].length; i++) {
	    		notes_list.append("<div class='note-list-item'></div>"
	    			+ "<a href='" + _l("/#/notes/" + e.general_notes["latest"][i])  + "'>"
	    			+ e.notes[e.general_notes["latest"][i]].title
	    			+ "</a>"
	    			+ "</div>");
	    	}
	    } else if( list == "search" ) {

	    } else if( list != "" ) { // tag
	    	if( !e.tag_notes[list] )
	    		e.tag_notes[list] = [];
			for(var i = 0; i < e.tag_notes[list].length; i++) {
	    		notes_list.append("<div class='note-list-item'></div>"
	    			+ "<a href='" + _l("/#/notes/" + e.tag_notes[list][i])  + "'>"
	    			+ e.notes[e.tag_notes[list][i]].title
	    			+ "</a>"
	    			+ "</div>");
	    	}
	    }
	};

	e.renderer = function() {
		
		// tags
		var tags = $("#tags");
		//tags.empty();
		$("li", tags).remove();

		for(var taguid in e.tags) {
			if( e.tags.hasOwnProperty(taguid) )  {
				$("button", tags).before("<li ><a href='"
					+ root + "/#tag/" + taguid + "'><i class='icon-tag'></i> " + e.tags[taguid].name + "</a></li>");
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
	window.e = e;

	$("#note-edit-content").keydown(function(e) {
		insertTab(this, e);
	});

	e.update_tags();
	$("#note-list").attr("data-list", "latest");
	$("#note-edit").hide();

	$.address.change(function(event) {
		var path = event.path;
	    console.log("$.address.change ", path);
	    var match;

	    if( path == "/" ) {
	    	$("#note-list").attr("data-list", "latest");
	    	e.update_notes();
	    } else if( match = path.match(/^\/tag\/(.+)$/) ) {
	    	var tag = match[1];
	    	$("#note-list").attr("data-list", tag);
	    	e.update_notes({tag: tag});
	    }  else if( match = path.match(/^\/notes\/(.+)$/) ) {
	    	var id = match[1];
	    	$("#note").attr("data-id", id);
	    	e.get_note(id);
	    }

	    e.renderer();
	});

	$("#search").submit(function(e) {
		var words = $('input[name="words"]', this).val();

		if( words != "" && words != $.address.value() ) {
			$.address.value("/search/" + words);
			$("#note-list").attr("data-list", "search");
			$("#note-list").attr("data-list-keyword", words);
			e.renderer();
		}
		e.preventDefault();
	});

	$("#note .note-edit-link").click(function() {
		var id = $("#note").attr("data-id");
		$('#note-edit input[name="guid"]').val( id );
		$('#note-edit form input[name="title"]').val( e.notes[id].title);
		$('#note-edit form textarea[name="content"]').val( e.parse_note_md( e.notes[id].content ) );

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
		e.create_or_update_note( $("#note-edit form").serializeObject());
		$("#note-edit").hide();
		$("#note").show();
		$("#add-note-action").show();
		$("#note-edit form input, #note-edit form textarea").val("");

	});

	$("#note-edit-discard").click(function() {
		$("#note-edit form input, #note-edit form textarea").val("");
		$("#note-edit").hide();
		$("#note").show();
		$("#add-note-action").show();
	});

	e.getSession(function() {
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