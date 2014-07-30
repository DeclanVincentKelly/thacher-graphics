var express = require('express');
var router = express.Router();
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(
	process.env['NEO4J_URL'] ||
	process.env['GRAPHENEDB_URL'] ||
	'http://localhost:7474'
);
var querystring = require('querystring')

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
		return res.redirect('/login?' + querystring.stringify({
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

	db.getNodeById(Number(req.params.id), function(err, user) {
		if (err) throw err;
		user.getRelationshipNodes('RELATIONS_WITH', function(err, resR) {
			if (err) throw err;
			var reqRelations = [];

			for (var i in resR) {
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

router.get('/class/:year', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return res.redirect('/login?' + querystring.stringify({
			suc: '/graph' + req.path
		}));
	}

	var members = []

	var queryN = [
		'MATCH (n)',
		'WHERE n.year = { year }',
		'RETURN n'
	].join('\n');

	var years = [
		'MATCH (n)',
		'WHERE NOT n.year={ year }',
		'RETURN DISTINCT n.year AS y',
		'ORDER BY n.year'
	].join('\n');

	var params = {
		year: Number(req.params.year)
	}
	db.query(queryN, params, function(err, resN) {
		if (err) throw err;
		for (var i in resN) {
			members.push({
				id: resN[i]['n'].id,
				data: resN[i]['n'].data
			});
		}
		db.query(years, params, function(err, resY) {
			if (err) throw err;
			var oYear = [];
			for (var i in resY) {
				oYear.push(resY[i]['y']);
			}
			console.log(oYear);
			res.render('class', {
				title: "Class of " + req.params.year,
				user: req.user,
				year: Number(req.params.year),
				classMembers: members,
				otherYears: oYear
			});
		});
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

module.exports = router;
