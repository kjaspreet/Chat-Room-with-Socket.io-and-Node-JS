var express = require('express');
var monk =  require('monk')
var ent = require('ent');
var compression = require('compression');

var PORT = process.env.PORT || 8080;

//Setting up MongoDB
var mongo = monk('mongodb://takehome:takehome@cluster0-shard-00-00-tqwcb.mongodb.net:27017,cluster0-shard-00-01-tqwcb.mongodb.net:27017,cluster0-shard-00-02-tqwcb.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin');
var posts = mongo.collection('posts');

//Setting up express
var app = express();
var server = require('http').Server(app);

//Using bzip compression
app.use(compression());

app.use(express.static(__dirname + '/public'))

	.get('/', function(req, res) {
		posts.find(function(error, results) {
			console.log(results);
			res.render('index.ejs', {posts: results});
		});
	});

var io = require('socket.io').listen(server);

io.sockets.on('connection', function(socket) {

	socket.on('new-user', function(pseudo) {
		socket.pseudo = pseudo;
		socket.broadcast.emit('new-user', ent.encode(pseudo));
	});

	socket.on('message', function(message) {
		var content = {
					pseudo: ent.encode(socket.pseudo),
					message: ent.encode(message)
				};
		socket.broadcast.emit('message', content);
		posts.insert(content);
	});
});

console.log("Chat Room at http://localhost:" + PORT);
server.listen(PORT);