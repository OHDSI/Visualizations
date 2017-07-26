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

Authors: Christopher Knoll, Mark Valez, Sigfried Gold

*/

define(["jquery", "d3", "d3_tip"], function($, d3, d3_tip) {
	"use strict";

	function donut_defaultTooltip(labelAccessor, valueAccessor, percentageAccessor) {
		return function (d) {
			return labelAccessor(d) + ": " + valueAccessor(d) + " (" + percentageAccessor(d) + ")";
		};
	}
	
	var intFormat = d3.format("0,000");
	var formatpercent = d3.format('.1%');

	function donut() {

		this.render = function (data, target, w, h, options) {

			var defaults = {
				colors: d3.scale.category10(),
				margin: {
					top: 5,
					right: 75,
					bottom: 5,
					left: 10
				}
			};

			options = $.extend({}, defaults, options);

			var width = w - options.margin.left - options.margin.right,
				or = width / 2,
				ir = width / 6;

			var total = 0;
			data.forEach(function (d) {
				total += +d.value;
			});

			var tooltipBuilder = donut_defaultTooltip(function (d) {
				return d.data.label;
			}, function (d) {
				return intFormat(d.data.value);
			}, function (d) {
				return formatpercent(total !== 0 ? d.data.value / total : 0.0);
			});

			var chart = d3.select(target)
				.append("svg:svg")
				.data([data])
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');

			var tip = d3_tip()
				.attr('class', 'd3-tip')
				.direction('n')
				.offset(function () { 
					return [this.getBBox().height / 2,0]; 
				})
				.html(tooltipBuilder);
			chart.call(tip);

			if (data.length > 0) {
				var vis = chart.append("g")
					.attr("transform", "translate(" + or + "," + or + ")");

				var legend = chart.append("g")
					.attr("transform", "translate(" + (w - options.margin.right) + ",0)")
					.attr("class", "legend");

				var arc = d3.svg.arc()
					.innerRadius(ir)
					.outerRadius(or);

				var pie = d3.layout.pie() //this will create arc data for us given a list of values
					.value(function (d) {
						return d.value > 0 ? Math.max(d.value, total * 0.015) : 0; // we want slices to appear if they have data, so we return a minimum of 1.5% of the overall total if the datapoint has a value > 0.
					}); //we must tell it out to access the value of each element in our data array

				var arcs = vis.selectAll("g.slice") //this selects all <g> elements with class slice (there aren't any yet)
					.data(pie) //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
					.enter() //this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
					.append("svg:g") //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
					.attr("class", "slice"); //allow us to style things in the slices (like text)

				arcs.append("svg:path")
					.attr("fill", function (d) {
						return options.colors(d.data.id);
					}) //set the color for each slice to be chosen from the color function defined above
					.attr("stroke", "#fff")
					.attr("stroke-width", 2)
					.attr("title", function (d) {
						return d.label;
					})
					.on('mouseover', tip.show)
					.on('mouseout', tip.hide)
					.attr("d", arc); //this creates the actual SVG path using the associated data (pie) with the arc drawing function

				legend.selectAll('rect')
					.data(function (d) {
						return d;
					})
					.enter()
					.append("rect")
					.attr("x", 0)
					.attr("y", function (d, i) {
						return i * 15;
					})
					.attr("width", 10)
					.attr("height", 10)
					.style("fill", function (d) {
						return options.colors(d.id);
					});

				legend.selectAll('text')
					.data(function (d) {
						return d;
					})
					.enter()
					.append("text")
					.attr("x", 12)
					.attr("y", function (d, i) {
						return (i * 15) + 9;
					})
					.text(function (d) {
						return d.label;
					});
			} else {
				chart.append("text")
					.attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")")
					.style("text-anchor", "middle")
					.text("No Data");
			}

		};
	};

	return donut;
});



