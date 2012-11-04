
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


function authMiddleware (req, res, next) {
  var need_auth = false;

  if( ! req.session.user ) {
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
  app.use(express.cookieParser(config.secret_key));
  //app.use(express.session());
  app.use(express.cookieSession());
  app.use(authMiddleware);

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

