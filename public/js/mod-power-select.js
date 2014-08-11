searchUser = function(parentID) {
	$.getJSON('/graph/data/users', function(data) {
		var people = crossfilter(data);
		var yearDim = people.dimension(function(d) {
			return d.year
		});
		var nameDim = people.dimension(function(d) {
			return d.name
		});
		var genderDim = people.dimension(function(d) {
			return d.gender
		});

		$(parentID + ' #select-user').select2({
			placeholder: 'Select a name',
			minimumInputLength: 0,
			query: function(query) {
				nameDim.filterFunction(function(d) {
					return (new RegExp(query.term)).test(d);
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

		$(parentID + ' #select-grade').select2({
			placeholder: 'Refine search by grade',
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
				$('#select-user').select2('data', null);
			})
			.on('select2-removed', function(e) {
				yearDim.filterAll();
				$('#select-user').select2('data', null);
			});

		$(parentID + ' #select-gender').select2({
			placeholder: 'Refine search by gender',
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
				$('#select-user').select2('data', null);
			})
			.on('select2-removed', function(e) {
				gender.filterAll();
				$('#select-user').select2('data', null);
			});
	});
}
