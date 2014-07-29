var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var apiKey = new stormpath.ApiKey(
        process.env['STORMPATH_API_KEY_ID'],
        process.env['STORMPATH_API_KEY_SECRET']
    );
var spClient = new stormpath.Client({apiKey: apiKey});

router.get('/', function(req, res) {
    res.redirect('/graph');
});

/*
router.get('/register', function(req, res) {
    res.render('register', {
        title: 'Register',
        error: req.flash('error')[0]
    });
});


router.post('/register', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;


    if (!username || !password) {
        return res.render('register', {
            title: 'Register',
            error: 'Email and password required.'
        });
    }

    var app = spClient.getApplication(process.env['STORMPATH_URL'], function(err, app) {
        if (err) throw err;

        app.createAccount({
            givenName: 'John',
            surname: 'Smith',
            username: username,
            email: username,
            password: password,
        }, function(err, createdAccount) {
            if (err) {
                return res.render('register', {
                    'title': 'Register',
                    error: err.userMessage
                });
            } else {
                passport.authenticate('stormpath')(req, res, function() {
                    return res.redirect('/graph');
                });
            }
        });

    });

});
*/


router.get('/login', function(req, res) {
    res.render('login', {
        title: 'Login',
        error: req.flash('error')[0],
        query: req.query
    });
});


router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.post('/login', function(req, res, next) {
    passport.authenticate('stormpath', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid email or password');
            return res.redirect(req.originalUrl);
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            if(req.query.suc) {
                return res.redirect(req.query.suc);
            } else {
                return res.redirect('/graph');
            }
        });
    })(req, res, next);
});

module.exports = router;
