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

var noteSchema = new mongoose.Schema({
	username: { type: String, index: true, required: true },

	syncd: { type: Boolean, index: true, default: false, required: true },
	type: {type: String, index: true, default: "markdown", required: true},
	archive: { type: Boolean, index: true, default: false, required: true },
	star: { type: Boolean, index: true, default: false, required: true },
	title: { type: String, index: true, default: "", required: true },
	created: { type: Date, index: true, default: now, required: true },
	updated: { type: Date, index: true, default: now, required: true },
	
	content: { type: String, index: false, default: "" }, // storage markdown
	tags: { type: [String], index: true },
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


var tagSchema = new mongoose.Schema({
	username: { type: String, index: true, required: true },
	name: { type: String, index: true, required: true },

	guid: { type: String, index: true },
	syncd: { type: Boolean, index: true, default: false },
	parentGuid: { type: String, index: true },
	updateSequenceNum: { type: String, index: true},
});

var Note = db.model('Note', noteSchema);
var User = db.model('User', userSchema);
var Tag = db.model('Tag', tagSchema);

exports.Note = Note;
exports.User = User;
exports.Tag = Tag;

