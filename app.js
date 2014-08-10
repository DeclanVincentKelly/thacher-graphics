var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var StormpathStrategy = require('passport-stormpath');
var session = require('express-session');
var flash = require('connect-flash');
var stormpath = require('stormpath');

var routes = require('./routes');
var graph = require('./routes/graph.js')
var app = express();
var strategy = new StormpathStrategy({
    apiKeyId: process.env["STORMPATH_API_KEY_ID"],
    apiKeySecret: process.env['STORMPATH_API_KEY_SECRET'],
    appHref: process.env["STORMPATH_URL"]
});
var apiKey = new stormpath.ApiKey(
    process.env['STORMPATH_API_KEY_ID'],
    process.env['STORMPATH_API_KEY_SECRET']
);
var spClient = new stormpath.Client({
    apiKey: apiKey
});
//'Finished requires'

//'Set up passport'
passport.use(strategy);
passport.serializeUser(strategy.serializeUser);
passport.deserializeUser(strategy.deserializeUser);

//'View engine setup'
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//'Middleware setup'
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.EXPRESS_SECRET, key: 'sid', cookie: {secure: false} }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash())
app.use(function(req, res, next) {
    if(req.user) {
        spClient.getAccount(req.user.href, function(err, acc) {
            acc.getGroups(function(err, groups) {
                req.user.groups = {};
                for(var i in groups.items)
                    req.user.groups[groups.items[i].name] = groups.items[i];
                next();
            });
        });
    } else {
        next();
    }
});

//'Route setup'
app.use('/', routes);
app.use('/graph', graph);

//'Catch 404 and forwarding to error handler'
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//'Error handlers'

//'Development error handler'
//'Will print stacktrace'
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

//'Production error handler'
//'No stacktraces leaked to user'
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
