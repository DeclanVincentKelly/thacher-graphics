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

router.get('/', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	res.render('graph', {
		title: 'Relation Graph',
		user: req.user,
	});
});

router.get('/data', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return resp.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

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

router.get('/data/users', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return resp.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	var jsonRes = [];
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
			var temp = {};
			temp['id'] = resN[i]['n'].id;
			for(var j in resN[i]['n'].data)
				temp[j] = resN[i]['n'].data[j];
			jsonRes.push(temp);
		}
		resp.send(jsonRes);
	});
});

router.post('/data/users', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}
	if (!req.user.groups.Mod) {
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

router.get('/data/users/:id', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	var jsonRes = {
		nodes: [],
		links: []
	};
	var query = [
		'MATCH (a:Student)',
		'WHERE id(a)={ id }',
		'OPTIONAL MATCH (a)-[r]-(b)',
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
			if (res[i]['b']) {
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
		}
		resp.send(jsonRes);
	});
});

router.get('/users/:id', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	res.render('user', {
		title: 'User Profile | Index ' + req.params.id,
		user: req.user,
		id: Number(req.params.id),
	});
});


router.get('/class/:year', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	res.render('class', {
		title: "Class of " + req.params.year,
		user: req.user,
		year: Number(req.params.year),
		otherYears: years.filter(function(elem) {
			return elem != Number(req.params.year)
		}),
	});

});

router.get('/data/class/:year', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	var jsonRes = {
		nodes: [],
		links: []
	};

	var queryN = [
		'MATCH (a)',
		'WHERE a.year = { year }',
		'OPTIONAL MATCH (a)-[r]-(b)',
		'WHERE b.year = { year }',
		'WITH a, collect(r) AS rels',
		'RETURN a, rels'
	].join('\n');


	var params = {
		year: Number(req.params.year)
	}

	db.query(queryN, params, function(err, resQ) {
		if (err) throw err;
		for (var i in resQ) {
			jsonRes.nodes.push({
				index: Number(i),
				id: resQ[i]['a'].id,
				data: resQ[i]['a'].data
			});
		}
		for (var i in resQ) {
			for (var j in resQ[i]['rels']) {
				jsonRes.links.push({
					source: getIndexForID(jsonRes.nodes, resQ[i]['rels'][j].start.id),
					target: getIndexForID(jsonRes.nodes, resQ[i]['rels'][j].end.id)
				});
			}
		}
		res.send(jsonRes);
	});
});

router.get('/data/search', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
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
