var Evernote = require('../libs/evernode').Evernote;
var config = require('../config');
var db = require("./db");

var Note = db.Note;
var User = db.User;
var Tag = db.Tag;

var evernote = new Evernote(
	config.evernote.api_key,
	config.evernote.api_secret,
	true
);

var add_tags = function(username, tags) {
	tags.forEach(function(name) {
		if( name != "" )
		Tag.findOne({username: username, name: name}, function(err, tag) {
			console.log("add_tags ", username, name, err, tag);
			if( !err && !tag ) {
				console.log("create_tag ", username, name);
				Tag.create(new Tag({
					username: username,
					name: name
				}), function(err, tag) {

				});
			}
		});	
	});
};

exports.auth = function(req, res){
	var evernote_callback = config.server_url + '/auth_callback';
	
	evernote.oAuth(evernote_callback).getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
		if (error)
			return res.send("Error getting OAuth request token : " + util.inspect(error), 500);
		req.session.oauthRequestToken = oauthToken;
   	 	res.redirect( evernote.oAuthRedirectUrl(oauthToken) );
	});
};

exports.auth_callback = function(req, res) {
	var evernote_callback = config.server_url +'/evernote/auth/callback';
		
	evernote.oAuth(evernote_callback).getOAuthAccessToken( req.session.oauthRequestToken, 
		req.session.oauthRequestTokenSecret, 
		req.query.oauth_verifier,
		function(err, authToken, accessTokenSecret, results) {

			if (err) return res.send("Error getting accessToken", 500);
			 
			evernote.getUser(authToken, function(err, edamUser) {
			
				if (err) return res.send("Error getting userInfo", 500);
				
				req.session.authToken = authToken;
				req.session.user = edamUser;
				
				res.redirect('/');
		});
  });
}

exports.index = function(req, res){
	res.render('index', {
		title: 'Ever Piece',
		root: config.server_url,
	});
};

exports.get_tags = function(req, res){

	var username = req.session.user.username;

	Tag.find({
		username: username
	}, '_id name', function(err, tags) {
		if( err )
			return res.send({error: err}, 200);
		return res.send({items: tags}, 200);
	});


	/*
	evernote.listTags(userInfo, function(err, tagList) {
    	if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		} else {
			return res.send({items: tagList}, 200);
		}
	});
	*/

};

exports.create_tag = function(req, res){
	
	if(!req.body) return res.send('Invalid content',400);

	var tag = req.body;
	var userInfo = req.session.user;
	
	evernote.createTag(userInfo, tag, function(err, tag) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err},403);
				return res.send({error: err},500);
		} 

		return res.send({item: tag}, 200);
	});

};

exports.keywords = function(req, res) {

};

exports.get_note = function(req, res){
	
	var user = req.session.user;
	var id = req.params.id;

	Note.findById(id, function(err, note) {
		if( err || !note || note.username != user.username ) {
			res.send({error: "not_fund"}, 200);
		} else {
			res.send({item: note}, 200);
		}
	});

	/*
	evernote.getNote(userInfo, guid, option, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
			return res.send({error: err}, 500);
		} 
		return res.send({item: note},200);
	});
	*/
};

exports.get_notes = function(req, res) {
	var username 	= req.session.user.username;
	var search 		= req.query.s || '';
	var skip 		= req.query.offset || 0;
	var limit 		= req.query.count || 50;
	var sortBy = req.query.sort || 'updated';
	var order = req.query.order || 'desc';
	var tag = req.query.tag || '';
	
	
	var conditions = {
		username: username
	};
	if( tag )
		conditions.tags = { $all: tag.split(/[\s,]+/) };

	var fields = '_id type tags archive star title updated created';

	var sort = {};
	sort[sortBy] = ( order == "desc" ) ? -1 : 1;
	var options = {
		skip: skip,
		limit: limit,
		sort: sort
	};

	Note.find(conditions, fields, options, function(err, notes) {
		if (err) {
			res.send({error: err}, 200);
		}
		return res.send({items: notes}, 200);
	});

	/*
	evernote.findNotes(userInfo,  words, { tag: tag, offset:offset, count:count, sortOrder:sortOrder, ascending:ascending }, function(err, noteList) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		} else {
			return res.send({items: noteList.notes}, 200);
		}
	});
	*/
};

exports.create_note = function(req, res) {
	
	if(!req.body)
		return res.send({error: 'Invalid content'}, 200);

	var username = req.session.user.username;
	var note = req.body;

	var create_note = new Note();
	create_note.title = note.title;
	create_note.content = note.content;
	create_note.username = username;
	create_note.syncd = false;
	if( note.tags instanceof Array )
		create_note.tags = note.tags;

	Note.create(create_note, function(err, note) {
		if (err) {
			res.send({error: err}, 200);
		}
		add_tags(note.username, note.tags);
		return res.send({item: note}, 200);
	});
	
	/*
	evernote.createNote(userInfo, note, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		}
		return res.send({item: note}, 200);
	});
	*/
};

exports.update_note = function(req, res) {
	
	if(!req.body)
		return res.send({error: 'Invalid content'},400);
	
	var username = req.session.user.username;
	var new_note = req.body;


	Note.findById(new_note._id, function(err, note) {
		if( err || !note ) {
			res.send({error: err}, 200);
		} else {
			if( note.username != username )
				res.send({error: "not_fund"}, 200);
			else {
				note.updated = new Date;
				note.title = new_note.title;
				note.content = new_note.content;
				note.updated = new Date;
				note.syncd = false;
				if( new_note.tags instanceof Array )
					note.tags = new_note.tags;

				note.save(function(err, saved_note) {
					if (err) {
						res.send({error: err}, 200);
					}
					add_tags(saved_note.username, saved_note.tags);
					return res.send({item: saved_note}, 200);
				});
			}
		}
	});

	/*
	evernote.updateNote(userInfo, note, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err},403);
				return res.send({error: err}, 500);
		}
		return res.send({item: note}, 200);
	});
	*/
};