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
var bcrypt = require('bcrypt');
var sassMiddleware = require('node-sass-middleware');
var path = require('path');

///////////////////////////////////////////////////////////////
// Settings for express
app = express();
app.use(sassMiddleware({
  src: './src/sass',
  dest: './src/views',
  debug: true,
  outputStyle: 'compressed'
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'basicblogsecret',
    resave: true,
    saveUninitialized: false
}));
app.use(express.static(__dirname + '/views'));
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
    }).then(User.findAll().then(function(users) {
        var data = users.map(function(user) {
            return {
                name: user.dataValues.name,
                userID: user.dataValues.id
            }
        })
        allUsers = data;
    }).then(function() {
        for (post in allPosts) {
            for (user in allUsers) {
                if (allPosts[post].author === allUsers[user].userID) {
                    allPosts[post].authorname = allUsers[user].name
                }
            }
        }
    }).then(function() {
        response.render('index', {
            allPosts: allPosts,
            user: request.session.username,
            userid: request.session.userid
        });
    }));
});

app.get('/singlepost/:postid', function(request, response) {
    if (request.session.userid != undefined) {
        var postID = request.params.postid;
        Post.findById(postID)
            .then(function(post) {
                User.findAll().then(function(users) {
                    var data = users.map(function(user) {
                        return {
                            name: user.dataValues.name,
                            userID: user.dataValues.id
                        }
                    })
                    allUsers = data;
                })
                    .then(function() {
                        for (user in allUsers) {
                            if (allUsers[user].userID === post.author) {
                                post.authorname = allUsers[user].name;
                            }
                        }
                    })
                    .then(Comment.findAll({
                            where: {
                                postid: postID
                            }
                        })
                        .then(function(comments) {
                            var data = comments.map(function(comment) {
                                return {
                                    body: comment.dataValues.body,
                                    author: comment.dataValues.author
                                }
                            });
                            allComments = data.reverse();
                        })
                        .then(function() {
                            response.render('singlepost', {
                                postID: postID,
                                post: post,
                                allComments: allComments,
                                user: request.session.username,
                                userid: request.session.userid
                            });
                        }));
            })
    } else {
        response.redirect('/');
    }
});

app.get('/manageposts', function(request, response) {
    // Get all the post titles and show them with options to
    // either add a post, remove a post and edit a post
    if (request.session.userid != undefined) {
        Post.findAll({
            where: {
                author: request.session.userid
            }
        }).then(function(posts) {
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
    } else {
        response.redirect('/');
    }
});

app.get('/editpost/:postid', function(request, response) {
    var postid = request.params.postid;
    if (request.session.userid != undefined) {
        Post.findById(postid).then(function(post) {
            if (request.session.userid === post.author) {
                response.render('editpost', {
                    post: post,
                    user: request.session.username,
                    userid: request.session.userid
                })
            } else {
                response.redict('/manageposts')
            }
        })
    } else {
        response.redirect('/manageposts')
    }
});

app.get('/edituser/:userid', function(request, response) {
    if (request.session.userid != undefined) {
        User.findById(request.params.userid).then(function(usertoedit) {
            if (request.session.userid === usertoedit.id) {
                response.render('edituser', {
                    usertoedit: usertoedit,
                    user: request.session.username
                })
            } else {
                response.redirect('/manageusers')
            }
        })
    } else {
        response.redirect('/manageusers')
    }
});

app.get('/manageusers', function(request, response) {
    if (request.session.userid != undefined) {
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
    } else {
        response.redirect('/');
    }
});

///////////////////////////////////////////////////////////////
// These two should be DELETEs instead of GETs
app.get('/removepost/:deleteid', function(request, response) {
    var deleteID = request.params.deleteid;
    // Destroy the given post ID
    Post.findById(deleteID).then(function(post) {
        if (post.author === request.session.userid || request.session.userid === 1) {
            Comment.destroy({
                where: {
                    postid: deleteID
                }
            }).then(function() {
                Post.destroy({
                    where: {
                        id: deleteID
                    }
                })
            }).then(function() {
                response.redirect('/manageposts')
            })
        } else {
            console.log('Not the original author of the post!')
            response.redirect('/manageposts')
        }
    })
});

app.get('/removeuser/:deleteid', function(request, response) {

    var deleteID = request.params.deleteid;
    if (deleteID === request.session.userid || request.session.userid === 1) {
        User.destroy({
            where: {
                id: deleteID
            }
        }).then(function() {
            response.redirect('/manageusers')
        })
    } else {
        console.log('Not allowed')
        response.redirect('/manageusers')
    }

});

///////////////////////////////////////////////////////////////
// Edit posts and users
app.post('/editpost/', function(request, response) {
    Post.findById(request.body.postID).then(function(post) {
        post.updateAttributes({
            title: request.body.postTitle,
            body: request.body.postBody,
            author: request.session.userid
        }).then(
            response.redirect('/singlepost/' + request.body.postID)
        )
    })
});

app.post('/edituser/', function(request, response) {
    User.findById(request.body.userID).then(function(usertoedit) {
        usertoedit.updateAttributes({
            name: request.body.userName,
            password: request.body.userPassword,
            email: request.body.userEmail
        }).then(
            response.redirect('/manageusers')
        )
    })
});

///////////////////////////////////////////////////////////////
// Define the POST routes
app.post('/login', function(request, response) {
    User.findOne({
        where: {
            name: request.body.username
        }
    }).then(function(user) {
        if(user != null){
                bcrypt.compare(user.password, request.body.userpass, function(err, res) {
                    request.session.lastPage = 'login';
                    request.session.userid = user.id;
                    request.session.username = user.name;
                    console.log('Succesfully logged in as: ' + user.name);
                    response.redirect('/')
                })
            } else{
                response.send('Unknown username or invalid password!')
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
    userEmail = request.body.userEmail;

    bcrypt.hash(request.body.userPassword, 8, function(err, hash) {
        userPassword = hash;
        // Create the user
        User.create({
            name: userName,
            password: userPassword,
            email: userEmail
        }).then(function() {
            response.redirect('/manageusers');
        });
    })
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