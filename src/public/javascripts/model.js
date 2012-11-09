$(function() {
	// a front end interface

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

	// mongoose style API ( e.g. all callback first paramater is error)
	// async, but functions are expected to return right away.
	// Objet Store
	// then internally sync with remote server.
	/*
		front end structure
			view abstract layer: html and view data.data access are sync. use them to renderering
			controller receive page events (mesages), then use model to fetch data and pass callback
				when data accessed, update view layer data and renderer
			model: data that persistently storage. all data access are async.
				but expected to finish  right now and internally sync with background
					sync abstrat layer: sync local database with server. continusly run in background.
					Read  (fetch from server) on need and idle (cache.)
					Write (push to server) when client side data changed immediatele. (use queue)

					When fetched new data from server, view data should be updated and re-renderer.
					event or callback ?


	*/

	var Note = function(note) {
		if( note ) {
			this._id = note._id;
			this.title = note.title;
			this.content = note.content;
			this.tags = note.tags;

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
	Note.remove = function(options, callback) {
		callback = callback || $.noop;
		return Note._noteStore.remove(options, callback);
	};




	// Only NoteStore should access the NoteSync.

	var NoteSync = {};
	NoteSync.queue = []; // {}
	NoteSync.init = function() {
		this.server = document.location.protocol + "//"
				+ document.location.host;
				+ document.location.pathname;
	};
	NoteSync.findById = function(id, callback) {
		$.ajax(this.server + "/notes/" + id, {
			success: function(data, textStatus) {
				callback(data.error, data.item);
			},
			error: function(e) {
				callback(e);
			}
		});
	};
	NoteSync.find = function(options, callback) {
		$.ajax(this.server + "/notes", {
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
		$.ajax(this.server + "/notes", {
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
		$.ajax(this.server + "/notes/" + note._id, {
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
	NoteSync.remove = function(options, callback) {
		if( typeof options == "string" && options != "" )
			options = {_id: options};

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
				if( !self.notes[note._id] || 
						( (self.notes[note._id].content === undefined ) ||
						note.updated != self.notes[note._id].updated )
				) {
					self.notes[note._id] = new Note(note);
					Note.update(note._id);
				}
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
					if( self.notes[ notes[i]._id ] && self.notes[ notes[i]._id ].content !== undefined )
						content = self.notes[ notes[i]._id ].content;
					self.notes[ notes[i]._id ] = new Note(notes[i]);
					if( content && ( self.notes[ notes[i]._id ].content === undefined ) )
						self.notes[ notes[i]._id ].content = content;

					self.notes_list[hash].push( notes[i]._id );
				}
				Note.update({type: "list", query: options});
			}
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
		callback(err, self.notes[note._id]);
	};
	NoteStoreMemory.prototype.remove = function(options, callback) {
		var self = this;
		NoteSync.remove(options, function(err) {
			callback( err );
		});
	};

	Note.init();
	NoteSync.init();
	window.Note = Note;

});