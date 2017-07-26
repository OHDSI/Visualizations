/* 

Copyright 2017 Observational Health Data Sciences and Informatics

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Authors: Christopher Knoll

*/

define(["jquery", "d3", "d3_tip", "./util"], function($, d3, d3_tip, util) {
	"use strict";

	function barchart() {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				label: 'label',
				value: 'value',
				rotate: 0,
				colors: d3.scale.category10(),
				textAnchor: 'middle',
				showLabels: false
			};

			options = $.extend({}, defaults, options);

			var label = options.label;
			var value = options.value;


			var total = 0;
			for (var d = 0; d < data.length; d = d + 1) {
				total = total + data[d][value];
			}

			var margin = {
					top: 20,
					right: 10,
					bottom: 25,
					left: 10
				},
				width = w - margin.left - margin.right,
				height = h - margin.top - margin.bottom;

			var commaseparated = d3.format(',');
			var formatpercent = d3.format('.1%');

			var x = d3.scale.ordinal()
				.rangeRoundBands([0, width], (1.0 / data.length));

			var y = d3.scale.linear()
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.tickSize(2, 0)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var svg = d3.select(target).append("svg")
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.attr("class", "barchart");

			x.domain(data.map(function (d) {
				return d[label];
			}));
			y.domain([0, options.yMax || d3.max(data, function (d) {
				return d[value];
			})]);

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + (height + 1) + ")")
				.call(xAxis)
				.selectAll(".tick text")
				.style("text-anchor", options.textAnchor)
				.attr("transform", function (d) {
					return "rotate(" + options.rotate + ")";
				});

			if (options.wrap) {
				svg.selectAll(".tick text")
					.call(util.wrap, x.rangeBand());
			}

			svg.selectAll(".bar")
				.data(data)
				.enter().append("rect")
				.attr("class", "bar")
				.attr("x", function (d) {
					return x(d[label]);
				})
				.attr("width", x.rangeBand())
				.attr("y", function (d) {
					return y(d[value]);
				})
				.attr("height", function (d) {
					return height - y(d[value]);
				})
				.attr("title", function (d) {
					var temp_title = d[label] + ": " + commaseparated(d[value], ",");
					if (total > 0) {
						temp_title = temp_title + ' (' + formatpercent(d[value] / total) + ')';
					} else {
						temp_title = temp_title + ' (' + formatpercent(0) + ')';
					}
					return temp_title;
				})
				.style("fill", function (d) {
					return options.colors(d[label]);
				});

			if (options.showLabels) {
				svg.selectAll(".barlabel")
					.data(data)
					.enter()
					.append("text")
					.attr("class", "barlabel")
					.text(function (d) {
						return formatpercent(d[value] / total);
					})
					.attr("x", function (d) {
						return x(d[label]) + x.rangeBand() / 2;
					})
					.attr("y", function (d) {
						return y(d[value]) - 3;
					})
					.attr("text-anchor", "middle");
			}

			$(window).on("resize", {
					container: $(target),
					chart: $(target + " svg"),
					aspect: w / h
				},
				function (event) {
					var targetWidth = event.data.container.width();
					event.data.chart.attr("width", targetWidth);
					event.data.chart.attr("height", Math.round(targetWidth / event.data.aspect));
				}).trigger("resize");
		};
	};

	return barchart;
});
