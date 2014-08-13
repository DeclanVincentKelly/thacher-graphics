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
