var monk = require('monk');
var PORT = process.env.PORT || 8080;

//Setting up MongoDB
var mongo = monk('mongodb://takehome:takehome@cluster0-shard-00-00-tqwcb.mongodb.net:27017,cluster0-shard-00-01-tqwcb.mongodb.net:27017,cluster0-shard-00-02-tqwcb.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin');
var posts = mongo.collection('posts');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// usernames which are currently connected to the chat
var usernames = new Array;
var clients = [];

// console.log('begin user:='+usernames.length)

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    // console.log('a user connected');

    socket.on('adduser', function (name) {

        // we store the username in the socket session for this client
        socket.username = name;

        //unique username
        var check = usernames.indexOf(name);
        if (check != -1) {
            socket.emit('userexists');
            socket.username = 'unknown';
        }

        else {
            usernames.push(name);

            clients.push(socket.id);

            // echo globally (all clients) that a person has connected
            socket.emit('updatechat', 'SERVER', name + ' has connected');
            socket.broadcast.emit('updatechat', 'SERVER', name + ' has connected');
        }
    });


    //Read Database
    socket.on("readdb", function () {

        if (socket.id == clients[clients.length - 1]) {
            //get latest 10 records from the database
            posts.find({}, { "_id": 0, "user_name": 1, "msg": 1 }, function (err, detail) {
                if (err)
                    console.log(err);
                else {
                    var list = [];
                    var count = 0;
                    // var doc = detail.reverse();
                    list = detail;

                    //find length of the records
                    count = list.length;

                    //get data from database and display
                    for (var i = 0; i < count; i++) {
                        //update only recently connected client
                        io.sockets.connected[clients[clients.length - 1]].emit('chat message', list[i].user_name, list[i].msg);
                    }
                }
            });
        }
    });

    //disconnected
    socket.on('disconnect', function () {

        // remove the username from global usernames list
        if (socket.username != undefined) {
            usernames.pop(socket.username)
        }
        // console.log("Removed User: " + socket.username)
        // echo globally that this client has left
        if (socket.username != undefined) {
            socket.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
            socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        }

    });

    //chat
    socket.on('chat message', function (user_name, msg) {
        // posts.remove();
        var data = { user_name, msg };
        posts.insert(data);
        io.emit('chat message', user_name, msg);
    });
});


http.listen(8080, function () {
    console.log('listening on *:8080');
});
