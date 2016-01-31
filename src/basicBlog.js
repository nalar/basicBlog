///////////////////////////////////////////////////////////////
// basicBlog - An easy to use, really simple, Blog app
///////////////////////////////////////////////////////////////
// Set the several requires
var express = require('express');
var session = require('express-session');
var sequelize = require('sequelize');
var jade = require('jade');
var pg = require('pg');
var bodyParser = require('body-parser');

///////////////////////////////////////////////////////////////
// Settings for express
app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'basicblogsecret'
}));
app.set('views', './src/views');
app.set('view engine', 'jade');

///////////////////////////////////////////////////////////////
// Settings for sequelize
var Sequelize = require('sequelize');
var sequelize = new Sequelize('postgres', process.env.PSQL_USERNAME, process.env.PSQL_PASSWORD, {
    host: 'localhost',
    dialect: 'postgres',
    define: {
        timestamps: false
    }
});

///////////////////////////////////////////////////////////////
// Define the different models for sequelize
// Message Model
var Post = sequelize.define('post', {
    title: Sequelize.TEXT,
    body: Sequelize.TEXT,
    author: Sequelize.INTEGER
});

// User Model
var User = sequelize.define('user', {
    name: Sequelize.TEXT,
    password: Sequelize.TEXT,
    email: Sequelize.TEXT
});

// Comment Model
var Comment = sequelize.define('comment', {
    body: Sequelize.TEXT,
    author: Sequelize.TEXT,
    postid: Sequelize.INTEGER
});

///////////////////////////////////////////////////////////////
// Define the GET routes
app.get('/', function(request, response) {
    // Get all the posts titles and authors
    // and pass them to the renderer


    Post.findAll().then(function(posts) {
        var data = posts.map(function(post) {
            return {
                title: post.dataValues.title,
                author: post.dataValues.author,
                postID: post.dataValues.id
            }
        })
        allPosts = data.reverse();
        response.render('index', {
            allPosts: allPosts,
            user: request.session.username,
            userid: request.session.userid
        });
    })
});

app.get('/manageposts', function(request, response) {
    // Get all the post titles and show them with options to
    // either add a post, remove a post and edit a post


    Post.findAll({where: {author: request.session.userid}}).then(function(posts) {
        var data = posts.map(function(post) {
            return {
                title: post.dataValues.title,
                author: post.dataValues.author,
                postID: post.dataValues.id
            }
        })
        allPosts = data.reverse();
        response.render('manageposts', {
            allPosts: allPosts,
            user: request.session.username,
            userid: request.session.userid
        });
    })
});

app.get('/manageusers', function(request, response) {

    User.findAll().then(function(users) {
        var data = users.map(function(user) {
            return {
                name: user.dataValues.name,
                email: user.dataValues.email,
                userID: user.dataValues.id
            }
        })
        allUsers = data.reverse();
        response.render('manageusers', {
            allUsers: allUsers,
            user: request.session.username,
            userid: request.session.userid
        });
    })
});

app.get('/singlepost/:postid', function(request, response) {

    var postID = request.params.postid;
    var row;
    Post.findById(postID).then(function(row) {
        Comment.findAll({
            where: {
                postid: postID
            }
        }).then(function(comments) {
            var data = comments.map(function(comment) {
                return {
                    body: comment.dataValues.body,
                    author: comment.dataValues.author
                }
            });
            allComments = data.reverse();
            response.render('singlepost', {
                postID: postID,
                post: row,
                allComments: allComments,
                user: request.session.username,
                userid: request.session.userid
            });
        });
    });
});

///////////////////////////////////////////////////////////////
// These two should be DELETEs instead of GETs
app.get('/removepost/:deleteid', function(request, response) {

    var deleteID = request.params.deleteid;
    // Destroy the given post ID
    Post.destroy({
        where: {
            id: deleteID
        }
    }).then(function() {
        response.redirect('/manageposts')
    })
});

app.get('/removeuser/:deleteid', function(request, response) {


    var deleteID = request.params.deleteid;

    User.destroy({
        where: {
            id: deleteID
        }
    }).then(function() {
        response.redirect('/manageusers')
    })
});

///////////////////////////////////////////////////////////////
// These dont work yet
app.get('/updatepost/:postid', function(request, response) {
    var postid = request.params.postid;
});

app.get('/updateuser/:userid', function(request, response) {
    var deleteID = request.params.userid;
});

///////////////////////////////////////////////////////////////
// Define the POST routes
app.post('/login', function(request, response) {
    User.findAll({
        where: {
            name: request.body.username
        }
    }).then(function(userData) {
        if (userData[0].password === request.body.userpass) {
            request.session.lastPage = 'login';
            request.session.userid = userData[0].id;
            request.session.username = userData[0].name;
            console.log('Succesfully logged in as: ' + userData[0].name);
            response.redirect('/')
        } else {
            console.log('Invalid password')
            response.redirect('/')
        }
    })
})

app.post('/logout', function(request, response) {
    request.session.destroy();
    response.redirect('/');
});


app.post('/addpost', function(request, response) {

    request.session.lastPage = 'addpost';

    // Define the several variables that make up the post
    postTitle = request.body.postTitle;
    postBody = request.body.postBody;
    postAuthor = request.body.postAuthor;

    // Create the post
    Post.create({
        title: postTitle,
        body: postBody,
        author: postAuthor
    }).then(function(newpost) {
        response.redirect('/singlepost/' + newpost.dataValues.id);
    });
});

app.post('/adduser', function(request, response) {

    request.session.lastPage = 'adduser';

    // Define the several variables that make up the user
    userName = request.body.userName;
    userPassword = request.body.userPassword;
    userEmail = request.body.userEmail;

    // Create the user
    User.create({
        name: userName,
        password: userPassword,
        email: userEmail
    }).then(function() {
        response.redirect('/manageusers');
    });
});

app.post('/addcomment', function(request, response) {

    request.session.lastPage = 'addcomment';

    // Define the variables that make up the comment
    commentBody = request.body.commentBody;
    commentAuthor = request.body.commentAuthor;
    commentPostID = request.body.commentPostID;

    // Create the comment
    Comment.create({
        body: commentBody,
        author: commentAuthor,
        postid: commentPostID
    }).then(function() {
        // Redirect to the singlepost page
        response.redirect('/singlepost/' + commentPostID);
    });

});

///////////////////////////////////////////////////////////////
// Start the server after syncing the database
sequelize.sync().then(function() {
    var server = app.listen(3000, function() {
        console.log('basicBlog running on localhost:' + server.address().port);
    });
});