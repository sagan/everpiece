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
	username: { type: String, index: true },
	syncd: { type: Boolean, index: true, default: false },
	type: {type: String, index: true, default: "markdown"},
	tags: { type: [String], index: true },
	archive: { type: Boolean, index: true },
	star: { type: Boolean, index: true },

	guid: { type: String, index: true },
	title: { type: String, index: true },
	content: { type: String, index: false }, // storage markdown
	created: { type: Date, index: true, default: now },
	updated: { type: Date, index: true, default: now },
	updateSequenceNum: { type: Number, index: true },
	//tagGuids: { type: [String], index: true },
});

var userSchema =  new mongoose.Schema({
	username: { unique: true, type: String, index: true },
	notebookGuid: { type: String, index: true },
	token: { type: String, index: true },
	status: {type: String, index: true}, //"invalid", "disabled", "error", "normal" or ""
});


var tagSchema = new mongoose.Schema({
	username: { type: String, index: true },
	guid: { type: String, index: true },
	syncd: { type: Boolean, index: true, default: false },
	name: { type: String, index: true },
	parentGuid: { type: String, index: true },
	updateSequenceNum: { type: String, index: true},
});

var Note = db.model('Note', noteSchema);
var User = db.model('User', userSchema);
var Tag = db.model('Tag', tagSchema);

exports.Note = Note;
exports.User = User;
exports.Tag = Tag;

