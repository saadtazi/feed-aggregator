
/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    faye = require('faye'),
    config = require('./config'),
    Poll = require('./model/feed-poll');

var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var articles = [],
    maxArticles = 20;

app.get('/', function(req, res){
  console.log("articles:: ", articles);
  res.render('index', { title: 'Feed Aggregator', articles: articles });
});

var server = http.createServer(app);
bayeux.attach(server);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


var poll = Poll(config.feeds, 1); // every 1 secs

poll.on('article', function(article) {
  articles.unshift(article);
  if (articles.length > maxArticles) {
    articles = articles.slice(0, maxArticles);
  }
  bayeux.getClient().publish('/article', article);
});

poll.on('error', function(err) {
  console.log('error::', err);
});

poll.start();

