///////////////////////////////////////////////////////////////
// basicBlog - An easy to use, really simple, Blog app
///////////////////////////////////////////////////////////////
// Set the several requires
var express = require('express');
var sequelize = require('sequelize');
var jade = require('jade');
var pg = require('pg');
var bodyParser = require('body-parser');
//var cookieParser = require('cookie-parser');
//https://github.com/expressjs/session

///////////////////////////////////////////////////////////////
// Settings for express
app = express();
app.use(bodyParser.urlencoded({
    extended: true
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
        console.log(allPosts);
        response.render('index', {
            allPosts: allPosts
        });
    })
});

app.get('/manageposts', function(request, response) {
    // Get all the post titles and show them with options to
    // either add a post, remove a post and edit a post
    Post.findAll().then(function(posts) {
        var data = posts.map(function(post) {
            return {
                title: post.dataValues.title,
                author: post.dataValues.author,
                postID: post.dataValues.id
            }
        })
        allPosts = data.reverse();
        response.render('manageposts', {
            allPosts: allPosts
        });
    })
});

app.get('/manageusers', function(request, response) {
    // User.name
    // User.ID
    response.render('manageusers');
});

app.get('/singlepost/:postid', function(request, response) {
    // Comment where comment.postID equals postid
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
            console.log(data);
            response.render('singlepost', {
            	postID: postID,
                post: row,
                allComments: allComments
            });
        });
    });
});


///////////////////////////////////////////////////////////////
// Define the POST routes
app.post('/addpost', function(request, response) {
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
        response.redirect('/singlepost/'+newpost.dataValues.id);
    });    
});

app.post('/removepost', function(request, response) {
    // Destroy the given postID
    Post.destroy();
    // Redirect to post management
    response.redirect('/manageposts')
});

app.post('/adduser', function(request, response) {
    // Define the several variables that make up the user
    userName = request.body.userName;
    userPassword = request.body.userPassword;
    userEmail = request.body.userEmail;

    // Create the user
    User.create({
        name: userName,
        password: userPassword,
        email: userEmail
    });

    // Redirect to the user management
    response.redirect('/manageusers');
});

app.post('/removeuser', function(request, response) {
    // Destroy the given userID
    User.destroy()

    // Redirect back to the user management
    response.redirect('/manageusers');
});

app.post('/addcomment', function(request, response) {
    // Define the variables that make up the comment
    commentBody = request.body.commentBody;
    commentAuthor = request.body.commentAuthor;
    commentPostID = request.body.commentPostID;

    // Create the comment
    Comment.create({
        body: commentBody,
        author: commentAuthor,
        postid: commentPostID
    }).then(function(){
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