
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');
var io = require('socket.io');

var coreModule = require('./modules/core');
var config = require('./config');
var app = express();


function auth(req, res, next) {
  var need_auth = false;

  if( !req.session.user || !req.session.user.username ) {
    if ( req.path.match(/^\/tags/)
      || req.path.match(/^\/notes/)
      ) {
      need_auth = true;
    }
  }

  if( ! need_auth ) {
    next();
  } else {
    res.send({
      "error": "need auth"
    }, 401);
  }
}

app.configure(function(){
  app.use(express.cookieParser()); // config.secret_key
  app.use(express.cookieSession({ secret: config.secret_key, cookie: { maxAge: 24 * 365 * 86400 }}));
  app.use(auth);

  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', coreModule.index);
app.all('/auth', coreModule.auth);
app.all('/auth_callback', coreModule.auth_callback);
app.get('/tags', coreModule.get_tags);
app.post('/tags', coreModule.create_tag);
app.get('/categories', coreModule.get_categories);
app.post('/categories', coreModule.create_category);
app.post('/categories/:id', coreModule.update_category);
app.get('/options', coreModule.get_options);
app.post('/options', coreModule.update_option);
app.get('/notes', coreModule.get_notes);
app.post('/notes', coreModule.create_note);
app.get('/notes/:id', coreModule.get_note);
app.post('/notes/:id', coreModule.update_note);


app.all('/logout', function(req, res){
  var callback = req.query.callback;
  req.session.authToken = null;
  req.session.user = null;
  res.redirect('/');
  //return res.send({});
});

app.get('/status', function(req, res){
  return res.send({
    username: req.session.user? req.session.user.username : null
  });
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
io = io.listen(server);


io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

