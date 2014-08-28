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
var methodOverride = require('method-override');

var index = require('./routes');
var graphs = require('./routes/graph.js');
var pages = require('./routes/info-pages.js');
var data = require('./routes/general-data.js');

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

var sess = {
  secret: process.env.EXPRESS_SECRET,
  key: 'sid', 
  cookie: {}
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

//'Middleware setup'
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(function(req, res, next) {
    if(!req.session.groups && req.user) {
        spClient.getAccount(req.user.href, function(err, acc) {
            if(err) throw err;
            acc.getGroups(function(err, groups) {
                if(err) throw err;
                req.session.groups = {};
                for(var i in groups.items)
                    req.session.groups[groups.items[i].name] = true;
                next();
            });
        });
    } else if (!req.user || req.session.groups) {
        next();
    }
});

//'Route setup'
app.use('/', index);
app.use('/graphs', graphs);
app.use('/pages', pages);
app.use('/data', data);

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
            user: req.user,
            groups: req.session.groups,
            message: err.message,
            status: err.status,
            error: err
        });
    });
}

//'Production error handler'
//'No stacktraces leaked to user'
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        user: req.user,
        groups: req.session.groups,
        message: err.message,
        status: err.status,
        error: {}
    });
});


module.exports = app;
