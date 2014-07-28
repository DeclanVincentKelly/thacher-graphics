var express = require('express');
var router = express.Router();
var passport = require('passport');
var stormpath = require('stormpath');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
    process.env['NEO4J_URL'] ||
    process.env['GRAPHENEDB_URL'] ||
    'http://localhost:7474'
);


router.get('/', function(req, res) {
    res.redirect('/login');
});

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

    var apiKey = new stormpath.ApiKey(
        process.env['STORMPATH_API_KEY_ID'],
        process.env['STORMPATH_API_KEY_SECRET']
    );
    var spClient = new stormpath.Client({
        apiKey: apiKey
    });

    var app = spClient.getApplication(process.env['STORMPATH_APP_HREF'], function(err, app) {
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


router.get('/login', function(req, res) {
    res.render('login', {
        title: 'Login',
        error: req.flash('error')[0]
    });
});


router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});


router.post(
    '/login',
    passport.authenticate(
        'stormpath', {
            successRedirect: '/graph',
            failureRedirect: '/login',
            failureFlash: 'Invalid email or password.',
        }
    )
);

router.get('/graph', function(req, res) {
    if (!req.user || req.user.status !== 'ENABLED') {
        return res.redirect('/login');
    }

    res.render('graph', {
        title: 'Relation Graph',
        user: req.user,
    });
});

function getIndexForID(list, id) {
    for(var i in list) {
        if(list[i].id == id) {
            return list[i].index;
        }
    }
}

router.get('/graph/data', function(req, resp) {
    var jsonRes = {
        nodes: [],
        links: []
    };
    var nodeQ = [
        'MATCH (n)',
        'RETURN n'
    ].join('\n');

    var relQ = [
        'MATCH ()-[r]-()',
        'RETURN DISTINCT r'
    ].join('\n');

    var params = {};

    db.query(nodeQ, params, function(err, resN) {
        if (err) throw err;
        for (var i in resN) {
            jsonRes.nodes.push({
                index: Number(i),
                id: resN[i]['n'].id,
                data: resN[i]['n'].data,
            });
        }
        db.query(relQ, params, function(err, res) {
            if (err) throw err;
            for (var i in res) {
                jsonRes.links.push({
                    source: getIndexForID(jsonRes.nodes, res[i]['r'].start.id),
                    target: getIndexForID(jsonRes.nodes, res[i]['r'].end.id)
                });
            }
            resp.send(jsonRes);
        });
    });
});

router.get('/graph/data/:id', function(req, resp) {
    var jsonRes = {
        nodes: [],
        links: []
    };
    var query = [
        'MATCH (a)-[r]-(b)',
        'WHERE id(a)={ id }',
        'RETURN a,r,b'
    ].join('\n');

    var params = {
        id: Number(req.params.id)
    };

    db.query(query, params, function(err, res) {
        if (err) throw err;
        jsonRes.nodes.push({
                index: 0,
                id: res[0]['a'].id,
                data: res[0]['a'].data,
            });
        for (var i in res) {
            jsonRes.nodes.push({
                index: Number(i) + 1,
                id: res[i]['b'].id,
                data: res[i]['b'].data,
            });
            jsonRes.links.push({
                source: getIndexForID(jsonRes.nodes, res[i]['r'].start.id),
                target: getIndexForID(jsonRes.nodes, res[i]['r'].end.id),
            });
        }

        resp.send(jsonRes);
    });
});

router.get('/graph/users', function(req, res) {
    if (!req.user || req.user.status !== 'ENABLED') {
        return res.redirect('/login');
    }

    //TODO

});

router.get('/graph/users/:id', function(req, res) {
    /*if (!req.user || req.user.status !== 'ENABLED') {
        return res.redirect('/login');
    }*/

    db.getNodeById(Number(req.params.id), function(err, user) {
        if(err) throw err;
        user.getRelationshipNodes('RELATIONS_WITH', function(err, resR) {
            if(err) throw err;
            var reqRelations = [];

            for(var i in resR) {
                var temp = {
                    id: resR[i].id,
                    data: resR[i].data
                }

                reqRelations.push(temp);
            }

            res.render('user', {
                title: user.data.name,
                user: req.user,
                dataUser: {
                    id: user.id,
                    data: user.data
                },
                dataRelations: reqRelations
            });
        })
    });
});

module.exports = router;
