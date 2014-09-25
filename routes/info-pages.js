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
			suc: '/pages' + req.path
		}
	));
}

router.get('/users/:id', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}

	res.render('user', {
		title: 'User Profile | Index ' + req.params.id,
		user: req.user,
		groups: req.session.groups,
		id: Number(req.params.id),
	});
});

router.get('/users/:id/data', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
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

router.get('/class/:year', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}

	res.render('class', {
		title: "Class of " + req.params.year,
		user: req.user,
		groups: req.session.groups,
		year: Number(req.params.year),
		otherYears: years,
	});

});

router.get('/class/:year/data', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
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

module.exports = router;