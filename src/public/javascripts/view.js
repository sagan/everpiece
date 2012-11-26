
// view layer

$(function(){
	var escapeHtml = window.escapeHtml;
	var md2Html = window.md2Html;
	var insertTab = window.insertTab;
	var moment = window.moment;
	

	var _id = 0;
	var id = function() {
		return "view-" + (++_id);
	};


	var time = function(t) {
		var now = moment(new Date);
		t = moment(t);

		if( now.format("YYYYMMDD") == t.format("YYYYMMDD") )
			return t.format("HH:mm");
		else if( now.format("YYYY") == t.format("YYYY") )
			return t.format("DD MMM");
		else
			return t.format("DD MMM, YYYY");
	};



	var View = {};
	View.create = function() {
		var v = function(options) {
			this._init(options);
			if( this.init )
				this.init();
		};
		$.extend(v.prototype, View);
		return v;
	};
	View._init = function(options) {
		if( !options )
			options = {};
		else if( typeof options == "string" )
			options = {id: options};

		if( options.el ) {
			this.el = options.el;
		} else {
			if( options.id ) {
				this.el = document.getElementById(options.id);
			} else {
				this.el = $('<div />')[0];
				this.el.setAttribute("id", id());
			}
		}
		this.$el = $(this.el);
		this.events = {};
	};
	View.on = function(name, func) {
		if( !this.events[name] )
			this.events[name] = $.Callbacks();
		this.events[name].add(func);
		return this;
	};
	View.off = function(name, func) {
		if( this.events[name] ) {
			this.events[name].remove(func);
		}
		return this;
	};
	View.fire = function(name, args) {
		if( this.events[name] )
			this.events[name].fire.call(this, args);
		return this;
	};
	View.attr = function() {
		var result = $.fn.attr.apply(this.$el, arguments);
		if( typeof arguments[0] == "string" && arguments.length == 1 )
			return result;
		else
			return this;
	};
	View.show = function() {
		this.$el.show();
		return this;
	};
	View.hide = function() {
		this.$el.hide();
		return this;
	};

	var NoteView = View.create();
	NoteView.prototype.empty = function() {
		$(".note-title", this.el).empty();
		$(".note-content", this.el).empty();
		this.attr("data-id", "");
		return this;
	};
	NoteView.prototype.render = function() {
		var self = this;
		var id = this.attr("data-id");
		if( id ) {
			Note.findById(id, function(error, note) {
	    		if( error || !note )
	    			return;
	    		var title = "";
	    		var content = "";
	    		var tags = "";
	    		console.log("renderer_note, got", note);

	    		title = escapeHtml( note.title );
	    		if ( note.content !== undefined ) {
	    			content = md2Html( note.content );
	    		}

	    		if( !note.tags || note.tags.length == 0 ) {
	    			tags = "No tags";
	    		} else {
	    			tags = "Tags: ";
	    			tags += escapeHtml(note.tags.join(", "));
	    		}

	    		$(".note-title", self.el).html( title );
	    		$(".note-updated", self.el).html( moment(note.updated).format("DD MMM, YYYY HH:mm:ss | ") );
	    		$(".note-tags", self.el).html(tags);
				$(".note-content", self.el).html( content );
	    	});
		}

		return this;
	};


	var NoteListView = View.create();
	NoteListView.prototype.bind = function() {
		var self = this;
		$(".note-list-item a", this.el).click(function(e) {
			self.fire("click", $(this).attr("data-id"));
			e.preventDefault();
		});

		return this;
	};
	NoteListView.prototype.render = function() {
		var self = this;

		var options = {};
	    var options_value = this.attr("data-list") || "" ;
	    if( options_value ) {
	    	try { // this fucking functin will throw a exception sometimes. 
	    		options = $.parseJSON( options_value );
	    	} catch(e) {}
	    }

	    Note.find(options, function(error, notes) {
	    	if( error )
	    		return;
	    	console.log("NoteListView find notes", options);
	    	self.$el.empty();
	    	for(var i = 0; i < notes.length; i++) {
	    		self.$el.append("<div class='note-list-item'>"
	    			+ "<a href='" + "#/notes/" + notes[i]._id  + "' "
	    			+ "data-id='" + notes[i]._id + "'" 
	    			+ ">"
	    			+ ( notes[i].title ? escapeHtml( notes[i].title ) : "&nbsp;&nbsp;&nbsp;&nbsp;" )
	    			+ "</a> <span class='note-updated'>" + time( notes[i].updated ) +"</span>"
	    			+ "</div>");
	    	}
	    	self.bind();
	    });

	    return this;
	};


	var TagsView = View.create();
	TagsView.prototype.bind = function() {
		var self = this;
		$("a", this.el).click(function(e) {
			self.fire("click", $(this).attr("data-name"));
			e.preventDefault();
		});

		return this;
	};
	TagsView.prototype.render = function() {
		var self = this;

		Tag.find(function(err, tags) {
			if( err )
				return;
			self.$el.empty();
			for(var id in tags) {
				if( tags.hasOwnProperty(id) )  {
					self.$el.append(
						"<li ><a "
						+ "data-name='"
						+ tags[id].name
						+ "' href='"
						+ "#/tag/"
						+ escapeHtml( tags[id].name )
						+ "'><i class='icon-tag'></i> " 
						+ escapeHtml( tags[id].name ) 
						+ "</a></li>");
				}
			}
			self.bind();
		});

		return this;
	};


	var NoteEditView = View.create();
	NoteEditView.prototype.init = function() {
		this.bind();
	};
	NoteEditView.prototype.bind = function() {
		var self = this;

		$('textarea[name="content"]', this.el).keydown(function(e) {
			insertTab(this, e);
		});

		$(".note-edit-save", this.el).click(function() {
			var note = $("form", self.el).serializeObject();

			note.tags = note.tags.trim();
			if( note.tags)
				note.tags = note.tags.split(/[\s,]+/);
			else
				note.tags = [];

			note = new Note(note);
			var saveCallback = function(e, saved_note) {
				if(e)
					self.fire("saveerror", note._id);
				else
					self.fire("saved", saved_note._id);
			};
			if( note._id ) {
				note.save(saveCallback);
			} else {
				Note.create(note, saveCallback);
			}
		});

		$(".note-edit-discard", this.el).click(function() {
			self.fire("discard", self.id());
			$("form input, form textarea", self.el).val("");
		});

		return this;
	};
	NoteEditView.prototype.id = function() {
		return $('form input[name="_id"]', this.el).val();
	};
	NoteEditView.prototype.load = function(id) {
		var self = this;
		$("form input, form textarea", self.el).val("");
		if( id )
			Note.findById(id, function(err, note) {
				if( err ) {
					self.fire("loaderror", id);
				} else {
					$('form input[name="_id"]', self.el).val( note._id );
					$('form input[name="title"]', self.el).val( note.title);
					$('form input[name="tags"]', self.el).val( note.tags ? note.tags.join(", ") : "");
					$('form textarea[name="content"]', self.el).val( note.content );
					self.fire("loaded", note._id);
				}
			});
		else {
			self.fire("loaded", "");
		}

		return this;
	};
	NoteEditView.prototype.render = function() {
		return this;
	};


	var TreeView = View.create();
	TreeView.prototype.bind = function() {
		var self = this;
		return this;
	};
	TreeView.prototype.init = function() {
		this.$el.dynatree({
			onActivate: function(node) {
        		// A DynaTreeNode object is passed to the activation handler
        		// Note: we also get this event, if persistence is on, and the page is reloaded.
       	 		//alert("You activated " + node.data.title);
      		},
			children: [
		        {title: "Item 1"},
		        {title: "Folder 2", isFolder: true, key: "folder2",
		          children: [
		            {title: "Sub-item 2.1"},
		            {title: "Sub-item 2.2"}
		          ]
		        },
		        {title: "Item 3"}
		      ]
		});
		this.bind();
		return this;
	};

	// just do it, withour consideration of performance now.
	TreeView.prototype.tags2tree = function(arry) {
		var roots = [], children = {};

		// find the top level nodes and hash the children based on parent
		for (var i = 0, len = arry.length; i < len; ++i) {
			var item = arry[i],
			pid = item.parent,
			p = encodeURIComponent(item.parent),
			target = !pid ? roots : (children[p] || (children[p] = []));

			target.push({ title: item.name });
		}

		// function to recursively build the tree
		var findChildren = function(parent) {
			if (children[ encodeURIComponent(parent.title) ]) {
				parent.children = children[ encodeURIComponent(parent.title) ];
				for (var i = 0, len = parent.children.length; i < len; ++i) {
					findChildren(parent.children[i]);
				}
        	}
		};

		// enumerate through to handle the case where there are multiple roots
		for (var i = 0, len = roots.length; i < len; ++i) {
			findChildren(roots[i]);
		}

		console.log("tag tree", roots);
    	return roots;
	};

	TreeView.prototype.render = function() {
		var self = this;

		Category.find(function(err, cats) {
			if( err )
				return;
			self.$el.dynatree("getRoot").removeChildren(); // chainable ?
			self.$el.dynatree("getRoot").addChild( self.tags2tree(tags) );
		});
		return this;
	};


	var AppView = View.create();
	AppView.prototype.render = function() {
		this.note.render();
		this.note_list.render();
		this.note_edit.hide();
		this.tags.render();
		this.tree.render();
	};

	AppView.prototype.event_resize = function(e) {
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


	AppView.prototype.bind = function() {
		var self = this;

		$.address.externalChange(function(event) {
			var path = event.path;
			console.log("$.address.change ", path);
		});

		$(window).resize(this.event_resize);


		Note.updated.add(function(event) {
			if( event && typeof event == "persistent" ) {
				if( self.note.attr("data-id") == event.tmpid ) {
					self.note.attr("data-id", event.id);
				}
			}
			self.note.render();
			self.note_list.render();
			self.tags.render();
			self.tree.render();
		});

		$("#title a", this.el).click(function() {
			self.note_list.attr("data-list", "").render();
		});

		$("#search", this.el).submit(function(event) {
			var words = $('input[name="words"]', this).val().trim();
			if( words )
				self.note_list.attr("data-list", $.toJSON({s: words})).render();
			else
				self.note_list.attr("data-list", "").render();
			event.preventDefault();
		});

		$("#edit-note-action", this.el).click(function() {
			var id = self.note.attr("data-id");
			if( id ) {
				self.note_edit.load(id);
			}
		});

		$("#add-note-action", this.el).click(function() {
			self.note_edit.load().show();
			self.note.hide();
		});

		this.note_list.on("click", function(id) {
			self.note.attr("data-id", id).render();
		});

		this.note_edit.on("discard", function() {
			self.note_edit.hide();
			self.note.show();
		}).on("loaded", function() {
			self.note_edit.show();
			self.note.hide();
		}).on("saved", function(id) {
			self.note.empty().attr("data-id", id).render().show();
			self.note_list.render();
			self.note_edit.hide();
		});

		this.tags.on("click", function(tagname) {
			self.note_list.attr("data-list", $.toJSON({tag: tagname})).render();
		});
	};
	AppView.prototype.init = function() {
		var self = this;
		this.note = new NoteView("note");
		this.note_list = new NoteListView("note-list");
		this.note_edit = new NoteEditView("note-edit");
		this.tags = new TagsView("tags");
		this.tree = new TreeView("tree");

		this.bind();
		this.event_resize();

		if( Session.username ) {
			$("#user").html(Session.username);
			$("#user").attr("href", "/logout");
		} else {
			$("#user").html(__("login"));
			$("#user").attr("href", "/auth");
		}
	};

	window.NoteView = NoteView;
	window.NoteListView = NoteListView;
	window.NoteEditView = NoteEditView;
	window.TagsView = TagsView;
	window.TreeView = TreeView;
	window.AppView = AppView;
});
