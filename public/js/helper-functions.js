var waitForFinalEvent = (function() {
	var timers = {};
	return function(callback, ms, uniqueId) {
		if (uniqueId) {
			uniqueId = "Don't call this twice without a uniqueId";
		}
		if (timers[uniqueId]) {
			clearTimeout(timers[uniqueId]);
		}
		timers[uniqueId] = setTimeout(callback, ms);
	};
})();

Object.defineProperty(String.prototype, "supplant", {
	value: function(o) {
		return this.replace(/{([^{}]*)}/g,
			function(a, b) {
				var r = o[b];
				return typeof r === 'string' || typeof r === 'number' ? r : a;
			}
		);
	},
	enumerable: false
});

Object.defineProperty(Array.prototype, "clear", {
	value: function() {
		while (this.length > 0) {
			this.pop();
		}
	},
	enumerable: false
});

computeNeighbors = function(nodes, links) {
	_.each(nodes, function(element) {
		element.neighbors = [];
	})
	_.each(links, function(element, index, list) {
		nodes[element.source.index].neighbors.push(element.target.index);
		nodes[element.target.index].neighbors.push(element.source.index);
	})
}

dijkstra = function(nodes, source, target) {
	var distance = {},
		previous = {},
		Q = {},
		lastSize = 0;
	distance[source.index] = 0;
	_.each(nodes, function(d) {
		if (d.index != source.index) {
			distance[d.index] = Infinity;
			previous[d.index] = null;
		}
		Q[d.index] = d;
	});

	while (_.keys(Q).length > 0) {
		var u = _.min(Q, function(d) {
			return distance[d.index];
		});
		if (target && u.index == target.index) {
			return {
				dist: distance,
				prev: previous
			};
		}
		delete Q[u.index];

		var neigh = _(u.neighbors).map(function(d) {
			return nodes[d];
		}).filter(function(d) {
			return _.contains(Q, d);
		}).value();
		_.each(neigh, function(v) {
			var alt = distance[u.index] + 1;
			if (alt < distance[v.index]) {
				distance[v.index] = alt;
				previous[v.index] = u;
			}
		});
		if (lastSize != _.keys(Q).length)
			lastSize = _.keys(Q).length;
		else
			return {
				dist: distance,
				prev: previous
			};

	}

	return {
		dist: distance,
		prev: previous
	};
}

readDijkstra = function(target, previous) {
	console.log(previous);
	var S = [];
	var u = target;
	while (previous[u.index]) {
		S.push(u);
		u = previous[u.index];
	}

	return S;
}
