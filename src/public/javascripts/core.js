// version beta


String.prototype.format = function() {
    var args = arguments;

    return this.replace(/\{(\d+)\}/g, function() {
        return args[arguments[1]];
    });
};

// Returns '2 + -1 = 1'.
'{0} + {1} = {2}'.format(2, -1, 1);

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
						e.notes[ data.items[i].guid ] = data.items[i];
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

	e.route = function(event) {

	};

	// view layer
	e.rebindLinks = function() {
		$('a').each(function() {
			if( !$(this).attr("data-aready") ) {
    			$(this).attr("data-aready", 1);
    			$(this).click( function() {
    				$.address.value( $(this).attr('href').replace(/^.*#/, '') );
    			})
    		}
		});
	};

	// renderer
	// some parts to renderer:
	/*
		1. notes list (left side)
		2. other meta data, such as tags
		3. current note content and body. actions area.
		4. Title.

		get server (and local) resources:

		tags (all got once)
		notes list (latest, latest viewed, tag, and arrange by other conditions, currently no paging);
		note content (by id)

	*/
	e.renderer = function() {
		var notes_list = $("#note-list").empty();
	    var list = $("#note-list").attr("data-list");
	    
	    if( list == "latest" ) {
			for(var i = 0; i < e.general_notes["latest"].length; i++) {
	    		notes_list.append("<div class='note-list-item'></div>"
	    			+ "<a href='>" + _l("/#/notes/" + e.general_notes["latest"][i])  + "'>"
	    			+ e.notes[e.general_notes["latest"][i]].title
	    			+ "</a>"
	    			+ "</div>");
	    	}
	    	e.rebindLinks();
	    } else if( list != undefined && list != "" ) { // tag
	    	if( !e.tag_notes[list] )
	    		e.tag_notes[list] = [];
			for(var i = 0; i < e.tag_notes[list].length; i++) {
	    		notes_list.append("<div class='note-list-item'></div>"
	    			+ "<a href='" + _l("/#/notes/" + e.tag_notes[list][i])  + "'>"
	    			+ e.notes[e.tag_notes[list][i]].title
	    			+ "</a>"
	    			+ "</div>");
	    	}
	    	e.rebindLinks();
	    }

	    var id =$("#note").attr("data-id");
	    var title = "";
	    var content = "";

	    if( id  ) {
	    	content = __("loading");
	    	if ( e.notes[id] && e.notes[id].title )
	    		title = e.notes[id].title;
	    	if ( e.notes[id] && e.notes[id].content )
	    		content = e.notes[id].content;
	    }

	    $("#note .note-title").html( title );
	    $("#note .note-content").html( content );

		
	};

	
});


$(function() {
	var e = window.EVERPIECE;

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


	e.getSession(function() {
		if( e.session.username ) {
			$("#user").html(e.session.username);
			$("#user").attr("href", "/logout");
		} else {
			$("#user").html(__("login"));
			$("#user").attr("href", "/auth");
		}
	});

	e.update_tags(function() {
		var tags = $("#tags");
		tags.empty();
		for(var taguid in e.tags) {
			if( e.tags.hasOwnProperty(taguid) )  {
				tags.append("<li><a href='" + root + "/#tag/" + taguid + "'>" + e.tags[taguid].name + "</a></li>");
			}
		}
		e.rebindLinks();
	});

	$("#note-list").attr("data-list", "latest");
	e.renderer();

});

/*


	var socket = io.connect(root);
	socket.on('news', function (data) {
		console.log(data);
		socket.emit('my other event', { my: 'data' });
	});

*/