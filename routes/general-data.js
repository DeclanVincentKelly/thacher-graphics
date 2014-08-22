var express = require('express');
var router = express.Router();
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
	process.env['NEO4J_URL'] ||
	process.env['GRAPHENEDB_URL'] ||
	'http://localhost:7474'
);
var querystring = require('querystring');

var years = [2013, 2014, 2015, 2016, 2017, 2018]

function getIndexForID(list, id) {
	for (var i in list) {
		if (list[i].id == id) {
			return list[i].index;
		}
	}
}

function loginRedirect(req, res) {
	return res.redirect('/login?' + querystring.stringify(
		{
			suc: '/data' + req.path
		}
	));
}

router.get('/users', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}

	var jsonRes = [];
	var nodeQ = [
		'MATCH (n)',
		'RETURN n'
	].join('\n');

	var params = {};

	db.query(nodeQ, params, function(err, resN) {
		if (err) throw err;
		for (var i in resN) {
			var temp = {};
			temp['id'] = resN[i]['n'].id;
			for(var j in resN[i]['n'].data)
				temp[j] = resN[i]['n'].data[j];
			jsonRes.push(temp);
		}
		resp.send(jsonRes);
	});
});

router.get('/users/name', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}
	var results = [];
	var query = [
		'MATCH n',
		'RETURN DISTINCT n.name AS v',
		'ORDER BY v ASC'
	].join('\n')
	var params = {};

	db.query(query, params, function(err, res) {
		if(err) throw err;

		for(var i in res) {
			results.push(Number(res[i]['v']));
		}
		resp.send(results);
	})
});

router.get('/users/year', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}
	var results = [];
	var query = [
		'MATCH n',
		'RETURN DISTINCT n.year AS v',
		'ORDER BY v ASC'
	].join('\n')
	var params = {};

	db.query(query, params, function(err, res) {
		if(err) throw err;

		for(var i in res) {
			results.push(Number(res[i]['v']));
		}
		resp.send(results);
	})
});

router.get('/users/gender', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}
	var results = [];
	var query = [
		'MATCH n',
		'RETURN DISTINCT n.gender AS v',
		'ORDER BY v ASC'
	].join('\n')
	var params = {};

	db.query(query, params, function(err, res) {
		if(err) throw err;

		for(var i in res) {
			results.push(Number(res[i]['v']));
		}
		resp.send(results);
	})
});

router.post('/users', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}
	if (!req.session.groups.Mod) {
		return res.send(401);
	}

	for(var i in req.body)
		req.body[i] = Number(req.body[i]);

	var query = [
		'MATCH (a), (b)',
		'WHERE id(a) = { a } AND id(b) = { b }',
		'MERGE (a)-[r:RELATIONS_WITH]->(b)',
		'ON CREATE SET r.added_by = { added_by }'
	].join('\n')

	var params = req.body;
	params['added_by'] = req.user.username;

	db.query(query, params, function(err, result) {
		if(err) throw err;

		return res.send(200);
	});
});

router.get('/search', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}

	var query = [
		'MATCH (n)',
		'WHERE id(n) = { excludeID }',
		'WITH n',
		'MATCH (a)',
		'WHERE NOT a = n',
		'AND NOT (a)--(n)',
		'AND a.name =~ { nameRegex }',
		'RETURN a'
	]

	var params = {
		excludeID: Number(req.query.excludeID),
		nameRegex: ".*" + req.query.query + ".*"
	}

	if (req.query.gRefine) {
		params['matchGender'] = req.query.gRefine;
		query.splice(7, 0, 'AND a.gender = { matchGender }')
	}

	if (req.query.yRefine) {
		params['matchYear'] = Number(req.query.yRefine);
		query.splice(7, 0, 'AND a.year = { matchYear }')
	}

	query = query.join('\n');

	db.query(query, params, function(err, resN) {
		jsonRes = [];
		if (err) throw err;
		for (var i in resN)
			jsonRes.push(resN[i]['a'].data)

		return res.send(jsonRes);
	});

});

module.exports = router;