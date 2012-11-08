if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
}

// return a IDBOpenDBRequest Object, has a error attr
// request.result is an instance of IDBDatabase
var request = window.indexedDB.open("MyTestDatabase", 11);


var debug = function(event) {
	console.log(event.type, this, event);
};


request.onerror = function(event) {
  // Do something with request.errorCode!
   //alert("Why didn't you allow my web app to use IndexedDB?!");
};

//event has a "type" attr values "success" or "error"
//However you already know the type
request.onsuccess = function(event) {
  // Do something with request.result!
	var db = this.result;


//error events bubble.
// Error events are targeted at the request that generated the error,
// then the event bubbles to the transaction
// and then finally to the database object
	db.onerror = function(event) {
		// Generic error handler for all errors targeted at this database's
		// requests!
		console.log("Database error: " + event.target.errorCode, event);
	};
};



//This versionchange transaction is created when a database is opened for the first time
// or when the specified version number is greater than the version number 
//of the database that is currently persisted.

// in a transaction
request.onupgradeneeded = function(event) {
	const customerData = [
		{ ssn: "abcd", name: "Donna", age: 32, email: "donna1@home.org" }
	];

	
    var db = this.result;
    var transaction = this.transaction;

    event: newVersion, oldVersion
    console.log("onupgradeneeded", this, event, db);

  	var objectStore;
  	try {
  		objectStore = db.createObjectStore("customers", { keyPath: "ssn" });
  	} catch(e) { //e.name ConstraintError
  		if( e.name == "ConstraintError") {
  			objectStore = transaction.objectStore("customers");
  		}
  	}

  	return;

  	/*
	if( db.objectStoreNames.length == 0)
		var objectStore = db.createObjectStore("customers", { keyPath: "ssn" });
	else
		var objectStore = db.objectStoreNames[0];
	// DOMString name, any keyPath, optional IDBIndexParameters optionalParameters
	objectStore.createIndex("name", "name", { unique: false });
	objectStore.createIndex("email", "email", { unique: true });
	for (var i in customerData) {
		//objectStore.add(customerData[i]);
	}
	*/
};


$(function() {
	// a front end interface

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
				(but expected to finish right now)
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
		}
	};
	Note.prototype.save = function(callback) {
		return Note._noteStore.save(this, callback);
	};
	
	Note.prototype.valid = function(callback) { // for new created item
		return true;
	};
	Note.updated = $.Callbacks();
	Note.init = function() {
		Note._noteStore = new NoteStoreMemory();
	};
	Note.synced = function() {
		return Note._noteStore.synced();
	};
	Note.findById = function(id, callback) {
		return Note._noteStore.findById(id, callback);
	};
	Note.find = function(options, callback) {
		return Note._noteStore.find(options, callback);
	};
	Note.create = function(note, callback) {
		return Note._noteStore.create(note, callback);
	};
	Note.remove = function(options, callback) {
		return Note._noteStore.remove(options, callback);
	};




	// Only NoteStore should access the NoteSync.

	var NoteSync = {};
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
		this.nodes_list = {};
	};
	NoteStoreMemory.prototype.synced = function() {
		return true;
	};
	// read: find, findById. cache
	NoteStoreMemory.prototype.findById = function(id, callback) {
		var self = this;
		NoteSync.findById(id, function(err, note) {
			if( !err && note ) {
				if( !self.notes[note._id] || note.updated != self.notes[note._id].updated ) {
					self.notes[note._id] = new Note(note);
					Note.updated.fire(note._id);
				}
			}
		});
		callback(null, self.notes[id]);
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
		if( !this.nodes_list[hash] )
			this.nodes_list[hash] = [];
		NoteSync.find(options, function(err, notes) {
			if( ! err ) {
				self.nodes_list[hash].length = 0;
				for(var i = 0; i < notes.length; i++) {
					self.nodes_list[hash].push( notes[i]._id );
				}
				Note.updated.fire({type: "list", query: options});
			}
		});
		callback(null, this.nodes_list[hash]);
	};
	// write: create, save, remove. do not cache
	NoteStoreMemory.prototype.create = function(note, callback) {
		var self = this;
		NoteSync.create(note, function(err, note) {
			if( !err ) {
				self.notes[note._id] = new Note(note);
				Note.updated.fire(note._id);
			}
			callback(err, note ? self.notes[note._id] : null);
		});
		
	};
	NoteStoreMemory.prototype.save = function(note, callback) {
		var self = this;
		self.notes[note._id] = note;
		NoteSync.save(note, function(err, note) {
			if( !err ) {
				self.notes[note._id] = new Note(note);
			}
			callback(err, note ? self.notes[note._id] : null);
		});
	};
	NoteStoreMemory.prototype.remove = function(options, callback) {
		var self = this;
		NoteSync.remove(options, function(err) {
			callback( err );
		});
	};


});


/*

database
version: status of stores and indexes

object store: key->value (Object)
	The object store can optionally have a key generator and a key path.
	If the object store has a key path, it is using in-line keys;
	otherwise, it is using out-of-line keys.

in-line key
    A key that is stored as part of the stored value. It is found using a key path.
    An in-line key can be generated using a generator. 
    After the key has been generated, it can then be stored in the value using the key path 
    or it can also be used as a key.
out-of-line key
    A key that is stored separately from the value being stored.

	 The key must be of a data type that has a number that is greater than the one before it
	The key can be string and integer and array. must be able to numberied (comparable) ?
	key generator provided by browser. If manully set key, you are able to get object by key

index
	on value object properties


IDBTransaction
transactions: readwrite, readonly, and versionchange

scope
    The set of object stores and indexes to which a transaction applies
*/