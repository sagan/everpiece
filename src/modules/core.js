var Evernote = require('../libs/evernode').Evernote;
var config = require('../config');

var evernote = new Evernote(
	config.evernote.api_key,
	config.evernote.api_secret,
	true
);

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

	var userInfo = req.session.user;
	
	evernote.listTags(userInfo, function(err, tagList) {
    	if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		} else {
			return res.send({items: tagList}, 200);
		}
	});

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
	
	var userInfo = req.session.user;
	var guid = req.params.guid;
	var option = req.query;

	evernote.getNote(userInfo, guid, option, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
			return res.send({error: err}, 500);
		} 
		return res.send({item: note},200);
	});
};

exports.get_notes = function(req, res) {
	var userInfo 	= req.session.user;
	var offset 		= req.query.offset || 0;
	var count 		= req.query.count || 50;
	var words 		= req.query.words || '';
	var sortOrder = req.query.sortOrder || 'UPDATED';
	var ascending = req.query.ascending || false;
	var tag = req.query.tag || '';

	evernote.findNotes(userInfo,  words, { tag: tag, offset:offset, count:count, sortOrder:sortOrder, ascending:ascending }, function(err, noteList) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		} else {
			return res.send({items: noteList.notes}, 200);
		}
	});
};

exports.create_note = function(req, res) {
	
	if(!req.body)
		return res.send({error: 'Invalid content'}, 400);

	var note = req.body;
	var userInfo = req.session.user;
	
	evernote.createNote(userInfo, note, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err}, 403);
				return res.send({error: err}, 500);
		}
		return res.send({item: note}, 200);
	});
};

exports.update_note = function(req, res) {
	
	if(!req.body)
		return res.send({error: 'Invalid content'},400);
	
	var userInfo = req.session.user;
	var guid = req.params.guid;
	var option = req.query;

	evernote.getNote(userInfo, guid, option, function(err, note) {
		if (err) {
			if(err == 'EDAMUserException') return res.send({error: err},403);
				return res.send({error: err}, 500);
		}
		return res.send({item: note}, 200);
	});
};