create table users (
id serial primary key,
name text,
password text,
email text
);

create table posts (
id serial primary key,
title text,
body text,
author integer references users                           );

create table comments (
id serial primary key,
body text,
author text,
postID integer references posts
);

insert into users (name, password, email) values (
'Thijs Tel',
'supergoodpass',
'thijstel@gmail.com'
);

insert into posts (title, body, author) values (
'First blog post',
'This is the first blog post, which will be used as a test.',
1
);

insert into comments (body, author, postID) values (
'Awesome post!',
'Commenter',
1
);