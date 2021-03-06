var config = require("../config");
var mongoose = require('mongoose')
var db = mongoose.createConnection(config.db_conn);

db.on('error', console.error.bind(console, 'connection error:'));

// sync with evernote notes.
// other attributes do not care

/*

Sync Schema: one-way
Local Databases only modified by this app. If Evernote does not contain the note. push it to it.
If Evernote has modified the note or delete it, push a new one to evernote.

client side use _id to identify and operate on notes.


When cient create a new or update a new, set syncd to false; when pushed to evernote. set it to true.
Will provide a check syncd notes periodly. (When user view the note?)
Only operate on a specified notebook.

note
tag
user

*/

var now = function() {
	return new Date;
};

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

// if String, required, it can not be null or empty.
var noteSchema = new mongoose.Schema({
	username: { type: String, index: true, required: true },
	synced: { type: Boolean, index: true, default: false, required: true },

	category: {type: ObjectId, index: true},
	type: {type: String, index: true, default: "markdown", required: true},
	archive: { type: Boolean, index: true, default: false, required: true },
	star: { type: Boolean, index: true, default: false, required: true },
	title: { type: String, index: true, default: "", required: true },
	created: { type: Date, index: true, default: now, required: true },
	updated: { type: Date, index: true, default: now, required: true },
	content: { type: String, index: false, default: "" }, // storage markdown
	tags: { type: [String], index: true, trim: true, validate:  [function(tags) {
		if( ! tags instanceof Array )
			return false;
		for(var i = 0; i < tags.length; i++) {
			if( !tags[i] )
				return false;
		}
		return true;
	}, 'invalid'] },
	
	guid: { type: String, index: true },
	updateSequenceNum: { type: Number, index: true },
	//tagGuids: { type: [String], index: true },
});

var userSchema =  new mongoose.Schema({
	username: { unique: true, type: String, index: true, required: true },
	notebookGuid: { type: String, index: true, required: true },

	token: { type: String, index: true, required: true, default: "" },
	status: { type: String, index: true, required: true, default: ""}, //"invalid", "disabled", "error", "normal" or ""
});

var optionSchema =  new mongoose.Schema({
	username: { unique: false, type: String, index: true, required: true },
	key: {type: String, index: true, trim: true, required: true},
	value: {type: Object, default: {}},
	updated: {type: Date, index: true, required: true, default: now}	
});


var tagSchema = new mongoose.Schema({
	username: { type: String, index: true, required: true },
	name: { type: String, index: true, required: true },
	parent: {type: String, index: true},
	guid: { type: String, index: true },
	syncd: { type: Boolean, index: true, default: false },
	parentGuid: { type: String, index: true },
	updateSequenceNum: { type: String, index: true},
});


var categorySchema = new mongoose.Schema({
	username: { type: String, index: true, required: true },
	name: {type: String, index: true, trim: true, required: true},
	parent: {type: ObjectId, index: true},
	desc: {type: String},
	updated: {type: Date, index: true, required: true, default: now}
});

var Note = db.model('Note', noteSchema);
var User = db.model('User', userSchema);
var Tag = db.model('Tag', tagSchema);
var Option = db.model("Option", optionSchema);
var Category = db.model("Category", categorySchema);

exports.Note = Note;
exports.User = User;
exports.Tag = Tag;
exports.Option = Option;
