
// model layer

$(function() {

	var server = document.location.protocol + "//"
			+ document.location.host;
			+ document.location.pathname;

	// tools functions
	var random_string = function(length) {
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');

		if (! length) {
			//length = Math.floor(Math.random() * chars.length);
			length = 32; // make sure unique
		}

		var str = '';
		for (var i = 0; i < length; i++) {
			str += chars[Math.floor(Math.random() * chars.length)];
		}
		return str;
	}

	var Note = function(note) {
		if( note ) {
			this._id = note._id;
			this.title = note.title;
			this.content = note.content;
			this.updated = note.updated;
			this.tags = note.tags;
			this.category = note.category;
			// client private attrs:
			// _clientStatus: "new", "updated"
		}
	};
	Note.prototype.save = function(callback) {
		callback = callback || $.noop;
		return Note._noteStore.save(this, callback);
	};
	
	Note.prototype.valid = function() { // for new created item
		return true;
	};
	Note.update = function(arg) {
		if( !Note.updating ) {
			Note.updating = true;
			Note.updated.fire(arg);
			Note.updating = false;
		}
	};
	Note.updated = $.Callbacks();
	Note.updating = false;

	Note.init = function() {
		Note._noteStore = new NoteStoreMemory();
	};
	Note.synced = function() {
		return Note._noteStore.synced();
	};
	Note.findById = function(id, callback) {
		callback = callback || $.noop;
		return Note._noteStore.findById(id, callback);
	};
	Note.find = function(options, callback) {
		callback = callback || $.noop;
		return Note._noteStore.find(options, callback);
	};
	Note.create = function(note, callback) {
		callback = callback || $.noop;
		return Note._noteStore.create(note, callback);
	};
	Note.remove = function(id, callback) {
		callback = callback || $.noop;
		return Note._noteStore.remove(id, callback);
	};


	// Only NoteStore should access the NoteSync.

	var NoteSync = {};
	NoteSync.queue = []; // {}
	NoteSync.findById = function(id, callback) {
		$.ajax(server + "/notes/" + id, {
			success: function(data, textStatus) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	NoteSync.find = function(options, callback) {
		$.ajax(server + "/notes", {
			data: options,
			success: function(data, textStatus) {
				callback(data.error, data.items);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	NoteSync.create = function(note, callback) {
		$.ajax(server + "/notes", {
			dataType: "json",
			data: $.toJSON(note),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	NoteSync.update = function(note, callback) {
		$.ajax(server + "/notes/" + note._id, {
			dataType: "json",
			data: $.toJSON(note),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	NoteSync.remove = function(id, callback) {
		callback({error: "Not Implemented"});
	};


	var NoteStoreMemory = function() {
		this.notes = {};
		this.notes_tmp = {};
		this.notes_list = {};
	};
	NoteStoreMemory.prototype.synced = function() {
		return true;
	};
	// read: find, findById. cache
	NoteStoreMemory.prototype.findById = function(id, callback) {
		var self = this;
		callback(null, self.notes[id]);

		if( !Note.updating )
		NoteSync.findById(id, function(err, note) {
			if( !err && note ) {
				self.notes[note._id] = new Note(note);
				Note.update(note._id);
			}
		});
		
	};

	/*
	  options: {
		tag: ""
		s: "",
		offset:0,
		count: 50,
		sort: "updated",
		order: "desc"
	  }

	*/
	NoteStoreMemory.prototype.get_query = function(options) {
		if( !options )
			options = {};
		var formal_query = {
			tag: options.tag,
			s: options.s,
			sort: options.sort,
			order: options.order,
			offset: options.offset,
			count: options.count
		};
		
		return formal_query;
	};
	NoteStoreMemory.prototype.find = function(options, callback) {
		var self = this;
		options = self.get_query( options );
		hash = encodeURIComponent( $.param(options) );
		if( !this.notes_list[hash] )
			this.notes_list[hash] = [];

		if( !Note.updating )
		NoteSync.find(options, function(err, notes) {
			if( ! err ) {
				self.notes_list[hash].length = 0;
				for(var i = 0; i < notes.length; i++) {
					var content = undefined;
					var id = notes[i]._id;

					if( self.notes[ id ] && (self.notes[ id ].content !== undefined) )
						content = self.notes[ id ].content;
					
					self.notes[ id ] = new Note(notes[i]);

					if( ( content !== undefined )
						&& ( self.notes[ id ].content === undefined  )
					)
						self.notes[ id ].content = content;
		
					self.notes_list[hash].push( id );
				}
			}
			Note.update({type: "list", query: options});
		});

		var notes = [];
		for( var i = 0; i < this.notes_list[hash].length; i++ )
			notes.push(this.notes[ this.notes_list[hash][i] ]);

		callback(null, notes);
		
	};

	// write: create, save, remove.
	NoteStoreMemory.prototype.create = function(note, callback) {
		var self = this;

		var tmpid = "tmp-" + random_string(32);
		note._id = tmpid;
		note._clientStatus = "new";
		self.notes_tmp[tmpid] = note;
		
		callback(null, self.notes_tmp[tmpid]);

		if( !Note.updating )
		NoteSync.create(note, function(err, note) {
			if( !err ) {
				self.notes[note._id] = new Note(note);
				Note.update({event: "persistent", tmpid: tmpid, id: note._id});
				delete self.notes_tmp[tmpid];
			}
			callback(err, note ? self.notes[note._id] : null);
		});
		
	};
	NoteStoreMemory.prototype.save = function(note, callback) {
		var self = this;
		self.notes[note._id] = note;
		self.notes[note._id]._clientStatus = "updated";

		if( !Note.updating )
		NoteSync.update(note, function(err, note) {
			if( !err ) {
				self.notes[note._id] = new Note(note);
				Note.update(note._id);
			}
		});
		callback(null, self.notes[note._id]);
	};
	NoteStoreMemory.prototype.remove = function(id, callback) {
		var self = this;
		NoteSync.remove(id, function(err) {
			callback( err );
		});
	};


	var Tag = function(tag) {
		if( tag ) {
			this.name = tag.name;
			this.parent = tag.parent;
		}
	};
	Tag.update = function(arg) {
		if( !Tag.updating ) {
			Tag.updating = true;
			Tag.updated.fire(arg);
			Tag.updating = false;
		}
	};
	Tag.updated = $.Callbacks();
	Tag.updating = false;
	Tag.init = function() {
		Tag._tagStore = new TagStoreMemory();
	};
	Tag.synced = function() {
		return Tag._tagStore.synced();
	};
	Tag.find = function(callback) {
		callback = callback || $.noop;
		return Tag._tagStore.find(callback);
	};
	var TagSync = {};
	TagSync.find = function(callback) {
		$.ajax(server + "/tags", {
			success: function(data, textStatus) {
				callback(data.error, data.items);
			},
			error: function(e) {
				callback(e);
			}
		});
	};

	var TagStoreMemory = function() {
		this.tags = [];
	};
	TagStoreMemory.prototype.synced = function() {
		return true;
	};
	TagStoreMemory.prototype.find = function(callback) {
		var self = this;
		callback(null, self.tags);

		if( !Tag.updating )
		TagSync.find(function(err, tags) {
			if( !err ) {
				self.tags = tags;
				Tag.update();
			}
		});
		
	};



	var Category = function(category) {
		if( category ) {
			this.name = category.name;
			this.parent = category.parent;
			this.desc = category.desc;
		}
	};
	Category.prototype.save = function(callback) {
		callback = callback || $.noop;
		return Category._categoryStore.save(this, callback);
	};

	Category.update = function(arg) {
		if( !Category.updating ) {
			Category.updating = true;
			Category.updated.fire(arg);
			Category.updating = false;
		}
	};
	Category.updated = $.Callbacks();
	Category.updating = false;
	Category.init = function() {
		Category._categoryStore = new CategoryStoreMemory();
	};
	Category.synced = function() {
		return Category._categoryStore.synced();
	};
	Category.create = function(category, callback) {
		callback = callback || $.noop;
		return Category._categoryStore.create(category, callback);
	};
	Category.find = function(callback) {
		callback = callback || $.noop;
		return Category._categoryStore.find(callback);
	};
	var CategorySync = {};
	CategorySync.find = function(callback) {
		$.ajax(server + "/categories", {
			success: function(data, textStatus) {
				callback(data.error, data.items);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	CategorySync.create = function(category, callback) {
		$.ajax(server + "/categories", {
			dataType: "json",
			data: $.toJSON(note),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	CategorySync.update = function(category, callback) {
		$.ajax(server + "/categories/" + category._id, {
			dataType: "json",
			data: $.toJSON(category),
			type: "POST",
			contentType: "application/json; charset=utf-8",
			success: function(data) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};

	var CategoryStoreMemory = function() {
		this.categories = [];
	};
	CategoryStoreMemory.prototype.synced = function() {
		return true;
	};
	CategoryStoreMemory.prototype.find = function(callback) {
		var self = this;
		callback(null, this.categories);

		if( !Category.updating )
		CategorySync.find(function(err, categories) {
			if( !err ) {
				self.categories = categories;
				Category.update();
			}
		});
		
	};
	CategoryStoreMemory.prototype.create = function(category, callback) {
		var self = this;

		var tmpid = "tmp-" + random_string(32);
		category._id = tmpid;
		category._clientStatus = "new";
		self.categories_tmp[tmpid] = category;
		
		callback(null, self.categories_tmp[tmpid]);

		if( !Category.updating )
		CategorySync.create(category, function(err, category) {
			if( !err ) {
				self.categories[category._id] = new Category(category);
				Category.update({event: "persistent", tmpid: tmpid, id: category._id});
				delete self.categories_tmp[tmpid];
			}
			callback(err, category ? self.categories[category._id] : null);
		});
		
	};
	CategoryStoreMemory.prototype.save = function(category, callback) {
		var self = this;
		self.categories[category._id] = category;
		self.categories[category._id]._clientStatus = "updated";

		if( !Category.updating )
		CategorySync.update(category, function(err, category) {
			if( !err ) {
				self.categories[category._id] = new Category(category);
				Category.update(category._id);
			}
		});
		callback(null, self.categories[category._id]);
	};
	

	Note.init();
	Tag.init();
	Category.init();

	window.Note = Note;
	window.Tag = Tag;
	window.Category = Category;

});