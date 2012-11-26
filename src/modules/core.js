var Evernote = require('../libs/evernode').Evernote;
var config = require('../config');
var db = require("./db");

var Note = db.Note;
var User = db.User;
var Tag = db.Tag;
var Option = db.Option;
var Category = db.Category;

var evernote = new Evernote(
	config.evernote.api_key,
	config.evernote.api_secret,
	true
);

var escape_regexp = function(str) {
    return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

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

var trim_note_fields = function(note) {
	note.username = undefined;
	note.synced = undefined;
	note.guid = undefined;
	note.updateSequenceNum = undefined;
}

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
	}, '_id name parent', function(err, tags) {
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
	var fields = 'username _id type tags archive star title content updated created';

	Note.findById(id, fields, function(err, note) {
		if( err || !note || note.username != user.username ) {
			res.send({error: "not_fund"}, 200);
		} else {
			note.username = undefined;
			console.log("note ", note);
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
	if( search )
		conditions.title = { $regex: search, $options: 'i' };

	var fields = '_id type tags category archive star title updated created';

	var sort = {};
	sort[sortBy] = ( order == "desc" ) ? -1 : 1;
	var options = {
		skip: skip,
		limit: limit,
		sort: sort
	};

	Note.find(conditions, fields, options, function(err, notes) {
		if (err) 																																									{
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

exports.get_options = function(req, res) {
	var username = req.session.user.username;

	Option.find({
		username: username
	}, 'key value updated', function(err, options) {
		if( err )
			return res.send({error: err}, 200);
		return res.send({items: options}, 200);
	});
};

exports.get_categories = function(req, res) {
	var username = req.session.user.username;

	Category.find({
		username: username
	}, '_id name desc parent updated', function(err, items) {
		if( err )
			return res.send({error: err}, 200);
		return res.send({items: items}, 200);
	});
};

exports.create_category = function(req, res) {
	if(!req.body)
		return res.send({error: 'Invalid content'}, 200);

	var username = req.session.user.username;
	var cat = req.body;
	cat.username = username;
	cat.updated = new Date;

	Category.create(cat, function(err, item) {
		if( err )
			return res.send({error: err}, 200);
		return res.send({items: item}, 200);
	});
};

exports.update_category = function(req, res) {

	var username = req.session.user.username;
	var cat = req.body;

	if( !cat )
		return res.send({error: 'Invalid content'}, 200);

	cat._id = req.params.id;
	if( !cat._id )
		return res.send({error: 'Invalid Paramaters'}, 200);

	var new_cat = new Category;
	new_cat.username = username;
	new_cat._id = cat._id;
	new_cat.updated = new Date;
	new_cat.name = cat.name;
	new_cat.desc = cat.desc;
	new_cat.parent = cat.parent;

	new_cat.save(function(err, item) {
		if( err )
			return res.send({error: err}, 200);
		return res.send({items: item}, 200);
	});
};


exports.update_option = function(req, res) {
	if(!req.body)
		return res.send({error: 'Invalid content'}, 200);

	var username = req.session.user.username;
	var new_option = req.body;
	new_option.key = option.key.trim();
	if( !new_option.key )
		return res.send({error: "invalid"}, 200);

	Option.findOne({key: new_option.key, username: username}, function(error, option) {
		if( error || !option ) { // not found, create
			var o = new Option();
			o.key = new_option.key;
			o.value = new_option.value;
			o.username = username;
			o.updated = new Date;

			Option.create(o, function(err, co) {
				if( err )
					return res.send({error: 'Error create'}, 200);
				return res.send({item: co}, 200);
			});
		} else { // found, update
			option.value = new_option.value;
			option.updated = new Date;

			option.save(function(err, uo) {
				if( err )
					return res.send({error: 'Error update'}, 200);
				return res.send({item: uo}, 200);
			});
		}
	});
};

exports.create_note = function(req, res) {
	
	if(!req.body)
		return res.send({error: 'Invalid content'}, 200);

	var username = req.session.user.username;
	var note = req.body;

	var create_note = new Note();
	create_note.title = note.title || "";
	create_note.content = note.content || "";
	create_note.category = note.category;
	create_note.username = username;
	create_note.syncd = false;
	var now = new Date;
	create_note.created = now;
	create_note.updated = now;

	if( note.tags instanceof Array )
		create_note.tags = note.tags;

	Note.create(create_note, function(err, note) {
		if (err) {
			return res.send({error: err}, 200);
		}
		add_tags(note.username, note.tags);

		trim_note_fields( note );

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
		return res.send({error: 'Invalid content'}, 200);

	var id = req.params.id;	
	var username = req.session.user.username;
	var new_note = req.body;

	new_note._id = id;
	if( !new_note._id )
		return res.send({error: 'Invalid Paramaters'}, 200);	


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
				note.category = new_note.category;
				note.updated = new Date;
				note.syncd = false;
				if( new_note.tags instanceof Array )
					note.tags = new_note.tags;

				note.save(function(err, saved_note) {
					if (err) {
						res.send({error: err}, 200);
					}
					add_tags(saved_note.username, saved_note.tags);
					trim_note_fields( saved_note );
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