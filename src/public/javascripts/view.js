
// view layer

$(function(){
	var escapeHtml = window.escapeHtml;
	var md2Html = window.md2Html;
	var insertTab = window.insertTab;
	

	var _id = 0;
	var id = function() {
		return "view-" + (++_id);
	}

	var View = {};
	View.create = function() {
		var v = function(options) {
			this._init(options);
			if( this.init )
				this.init();
		};
		$.extend(v.prototype, View);
		return v;
	}
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
		var id = this.attr("data-id");
		if( id ) {
			Note.findById(id, function(error, note) {
	    		if( error || !note )
	    			return;
	    		var title = "";
	    		var content = "";
	    		console.log("renderer_note, got", note);

	    		title = escapeHtml( note.title );
	    		if ( note.content !== undefined ) {
	    			content = md2Html( note.content );
	    		}

	    		$(".note-title", this.el).html( title );
				$(".note-content", this.el).html( content );
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
	    			+ "</a>"
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

	window.NoteView = NoteView;
	window.NoteListView = NoteListView;
	window.NoteEditView = NoteEditView;
	window.TagsView = TagsView;
});
