// version beta

$(function() {
	window.EVERPIECE = window.EVERPIECE || {};
	var e = window.EVERPIECE


	// all data item has a last modified timestamp field.
	e.session = {};
	e.notes = {}; // 


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


	var button_edit_note = $("#edit-note-action");

	var set_height = function(e) {
		var body = $("body");
		var header = $("#header");
		var container = $("#container");
		var footer = $("#footer");
		var sidebar = $("#sidebar");
		var sidebar_meta = $("#sidebar-meta");
		var note_list = $("#note-list");
		var note_meta = $("#note .note-meta");
		var note_content = $("#note .note-content");

		container.height(body.height()
			- header.height()
			- footer.height());

		note_content.height(
			body.height()
			- header.height()
			- footer.height()
			- note_meta.height()
			- 10);
		note_list.height( 
			body.height()
			- header.height()
			- footer.height()
			- sidebar_meta.height()
			- 100);
	};
	
	set_height();
	$(window).resize(set_height);


	var note = new NoteView("note");
	var note_list = new NoteListView("note-list");
	var note_edit = new NoteEditView("note-edit");
	var tags = new TagsView("tags");


	Note.updated.add(function(event) {
		if( event && typeof event == "persistent" ) {
			if( note.attr("data-id") == event.tmpid ) {
				note.attr("data-id", event.id);
			}
		}
		note.render();
		note_list.render();
		tags.render();
	});

	note_list.on("click", function(id) {
		note.attr("data-id", id).render();
	});

	note_edit.on("discard", function() {
		note_edit.hide();
		note.show();
	}).on("loaded", function() {
		note_edit.show();
		note.hide();
	}).on("saved", function(id) {
		note.empty().attr("data-id", id).render().show();
		note_list.render();
		note_edit.hide();
	});

	tags.on("click", function(tagname) {
		note_list.attr("data-list", $.toJSON({tag: tagname})).render();
	});

	note.render();
	note_list.render();
	tags.render();
	note_edit.hide();


	$("#edit-note-action").click(function() {
		var id = note.attr("data-id");
		if( id ) {
			note_edit.load(id);
		}
	});

	$("#add-note-action").click(function() {
		note_edit.load().show();
		note.hide();
	});

	$('#title a').click(function() {
		note_list.attr("data-list", "").render();
	});

	$.address.externalChange(function(event) {
		var path = event.path;
	    console.log("$.address.change ", path);
	});

	$("#search").submit(function(event) {
		var words = $('input[name="words"]', this).val().trim();
		if( words )
			note_list.attr("data-list", $.toJSON({s: words})).render();
		else
			note_list.attr("data-list", "").render();
		event.preventDefault();
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


});

