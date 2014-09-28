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
			suc: '/graphs' + req.path
		}
	));
}

router.get('/main', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}
	res.render('main', {
		title: 'Main Graph',
		user: req.user,
		groups: req.session.groups
	});
});

router.get('/main/data', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
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

router.get('/hive', function(req, res) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
	}

	res.render('hive', {
		title: 'Hive Graph',
		user: req.user,
		groups: req.session.groups
	});
});

router.get('/hive/data', function(req, resp) {
	if (!req.user || req.user.status !== 'ENABLED') {
		return loginRedirect(req, res);
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

module.exports = router;
