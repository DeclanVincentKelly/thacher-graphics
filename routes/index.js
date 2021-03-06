var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var apiKey = new stormpath.ApiKey(
    process.env['STORMPATH_API_KEY_ID'],
    process.env['STORMPATH_API_KEY_SECRET']
);
var spClient = new stormpath.Client({
    apiKey: apiKey
});
var querystring = require('querystring');

router.get('/', function(req, res) {
    res.redirect('/graphs/main');
});

/*
router.get('/register', function(req, res) {
    res.render('register', {
        title: 'Register',
        error: req.flash('error')[0]
    });
});

function authenticateEmail(email) {
    return email.match("@thacher\.org$");
}


router.post('/register', function(req, res) {

    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var username = req.body.username;
    var password = req.body.password;


    if (!username || !password || !firstname || !lastname) {
        return res.render('register', {
            title: 'Register',
            error: 'All fields are required.'
        });
    }

    if(!authenticateEmail(username)) {
         return res.render('register', {
            title: 'Register',
            error: 'Must be a Thacher School email address.'
        });
    }

    var app = spClient.getApplication(process.env['STORMPATH_URL'], function(err, app) {
        if (err) throw err;

        app.createAccount({
            givenName: firstname,
            surname: lastname,
            username: username.split("@")[0],
            email: username,
            password: password,
        }, function(err, createdAccount) {
            if (err) {
                return res.render('register', {
                    'title': 'Register',
                    error: err.userMessage
                });
            } else {
                return res.redirect('/login?' + querystring.stringify({suc: '/graphs/main'}));
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

router.get('/change', function(req, res) {
    if (!req.user || req.user.status !== 'ENABLED') {
        return res.redirect('/login?' + querystring.stringify({
            suc: '/graphs/main'
        }));
    }

    spClient.getApplication(process.env['STORMPATH_URL'], function(err, app) {
        if (err) throw err;
        app.sendPasswordResetEmail(req.user.email, function(err, res) {
            if (err) throw err;
        });
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
            if (req.query.suc) {
                return res.redirect(req.query.suc);
            } else {
                return res.redirect('/graphs/main');
            }
        });
    })(req, res, next);
});

module.exports = router;
