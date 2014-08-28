UserSelection = function() {

	var data = null;

	$.getJSON('/data/users', function(json) {
		data = json;
	});


	this.createSelection = function(config) {
		if (data || config.data) {
			var options = {
				parentID: config.parentID,
				toggleUser: ('toggleUser' in config) ? config.toggleUser : true,
				toggleYear: ('toggleYear' in config) ? config.toggleYear : true,
				toggleGender: ('toggleGender' in config) ? config.toggleGender : true,
				userMessage: config.userMessage ? config.userMessage : "Select a name",
				yearMessage: config.yearMessage ? config.yearMessage : "Refine search by grade",
				genderMessage: config.genderMessage ? config.genderMessage : "Refine search by gender",
				data: ('data' in config) ? config.data : data,
			}
			var people = crossfilter(options.data);
			if (options.toggleYear)
				var yearDim = people.dimension(function(d) {
					return d.year
				});
			if (options.toggleUser)
				var nameDim = people.dimension(function(d) {
					return d.name
				});
			if (options.toggleGender)
				var genderDim = people.dimension(function(d) {
					return d.gender
				});
			if (options.toggleUser)
				$(options.parentID + ' #select-user').select2({
					placeholder: options.userMessage,
					minimumInputLength: 0,
					query: function(query) {
						nameDim.filterFunction(function(d) {
							return (new RegExp(query.term, "ig")).test(d);
						})
						query.callback({
							more: false,
							results: nameDim.top(Infinity).reverse().map(function(d) {
								return {
									id: d.id,
									text: d.name
								};
							}),
						});
					}
				});
			if (options.toggleYear)
				$(options.parentID + ' #select-grade').select2({
					placeholder: options.yearMessage,
					allowClear: true,
					data: yearDim.group().all().map(function(e) {
						return {
							id: e.key,
							text: String(e.key)
						};
					}),
				})
				.on('select2-selecting', function(e) {
					yearDim.filter(e.val);
					$(options.parentID + '#select-user').select2('data', null);
				})
				.on('select2-removed', function(e) {
					yearDim.filterAll();
					$(options.parentID + '#select-user').select2('data', null);
				});
			if (options.toggleGender)
				$(options.parentID + ' #select-gender').select2({
					placeholder: options.genderMessage,
					allowClear: true,
					data: genderDim.group().all().map(function(e) {
						return {
							id: e.key,
							text: (e.key.substring(0, 1) + e.key.slice(1).toLowerCase())
						};
					}),
				})
				.on('select2-selecting', function(e) {
					genderDim.filter(e.val);
					$(options.parentID + '#select-user').select2('data', null);
				})
				.on('select2-removed', function(e) {
					gender.filterAll();
					$(options.parentID + '#select-user').select2('data', null);
				});

			this[options.parentID] = {
				people: people,
				dimensions: {}
			};

			if (options.toggleGender) {
				this[options.parentID].dimensions.genderDim = genderDim;
			}

			if (options.toggleYear) {
				this[options.parentID].dimensions.yearDim = yearDim;
			}

			if (options.toggleUser) {
				this[options.parentID].dimensions.nameDim = nameDim;
			}
		} else {
			var inst = this;
			var id = config.parentID + "_dataTimer";
			function waitForData () {
				if(data) {
					clearInterval(window[id]);
					inst.createSelection(config);
					return;
				}
			}

			window[id] = setInterval(waitForData, 1000)
		}
	}
}
