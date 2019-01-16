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

define(["d3", "./chart"], function (d3, Chart) {
	"use strict";

	class Aster extends Chart {
		render(data, target, w, h, chartOptions) {
			super.render(data, target, w, h, chartOptions);
			// options
			const options = this.getOptions({
				maxPercent: 100.0
			}, chartOptions);
			// container
			const svg = this.createSvg(target, w, h);

			const chart = svg.append("g")
				.attr('transform', `translate(${w / 2}, ${h / 2})`);

			// arc dimensions
			const radius = Math.min(w - 10, h - 10) / 2,
				innerRadius = 0.3 * radius;

			// linear scale
			const r = d3.scaleLinear()
				.domain([0, options.maxPercent])
				.range([innerRadius, radius]);

			const arc = d3.arc()
				.innerRadius(innerRadius)
				.outerRadius(d => r(d.data.percent));

			const outlineArc = d3.arc()
				.innerRadius(innerRadius)
				.outerRadius(radius);

			const arcRange = [0, 2 * Math.PI];

			const pie = d3.pie()
				.sort(null)
				.startAngle(arcRange[0])
				.endAngle(arcRange[1])
				.value(function (d) {
					return d.weight;
				});

			if (data.length > 1) {
				pie.padAngle(.01)
			}

			const path = chart.selectAll(".solidArc")
				.data(pie(data))
				.enter().append("path")
				.attr("fill", d => options.colors(d.data.id))
				.attr("class", "solidArc")
				//.attr("stroke", "gray")
				.attr("d", arc);

			const outerPath = chart.selectAll(".outlineArc")
				.data(pie(data))
				.enter().append("path")
				.attr("fill", "none")
				.attr("stroke", d => options.colors(d.data.id))
				.attr("class", "outlineArc")
				.attr("d", outlineArc);

			if (options.asterLabel) {
				svg.append("svg:text")
					.attr("class", "aster-label")
					.attr("dy", ".35em")
					.attr("text-anchor", "middle") // text-align: right
					.text(asterLabel());
			}

			//Wrapper for the grid & axes
			var axisGrid = chart.append("g").attr("class", "axisWrapper");
			const levels = Math.ceil(options.maxPercent / 25.0);

			for (var level = 1; level < levels; level++) {
				axisGrid.append("circle")
					.attr("class", "gridCircle")
					.attr("r", r(level * 25))
					.style("fill", "none")
					.style("stroke", "#c5c5c5")
					.style("stroke-width", 0.6);

				if (level % 2 == 1) {
					axisGrid.append("rect")
						.attr("x", -8)
						.attr("y", -r(level * 25) - 5)
						.attr("width", 20)
						.style("height", 10)
						.attr("fill", "#fff");

					axisGrid.append("text")
						.attr("class", "axisLabel")
						.attr("x", -6)
						.attr("y", -r(level * 25))
						.attr("dy",  ".4em")
						.style("font-size", "8px")
						.attr("fill", "#737373")
						.text(function (d, i) {
							return `${25 * level}%`
						});
				}
			}

			/*
			//Text indicating at what % each level is
			axisGrid.selectAll(".axisLabel")
				 .data(d3.range(1,(cfg.levels+1)).reverse())
				 .enter().append("text")
				 .attr("class", "axisLabel")
				 .attr("x", 4)
				 .attr("y", function(d){return -d*radius/cfg.levels;})
				 .attr("dy", "0.4em")
				 .style("font-size", "10px")
				 .attr("fill", "#737373")
				 .text(function(d,i) { return Format(maxValue * d/cfg.levels); });
		  */
		}
	}

	return Aster;

});