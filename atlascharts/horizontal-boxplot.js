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

define(["d3", "./boxplot"],
	function(d3, Boxplot) {
	"use strict";

	class HorizontalBoxplot extends Boxplot {
	  render(data, target, w, h, chartOptions) {
	    // options
		const defaults = {
			showXAxis: true,
			showMinMarkers: true,
			showMaxMarkers: true,
			boxHeight: 10,
			valueFormatter: this.formatters.formatSI(3),
			margins: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 4,
		  }
		};
			
	    const options = this.getOptions(defaults, chartOptions);

		let height = h < data.length * options.boxHeight ? data.length * options.boxHeight : h
	    // container
	    const svg = this.createSvg(target, w, height);

		const valueFormatter = options.valueFormatter;
			
	    this.useTip(this.defaultTip, options);

		// assign a category if it is absent
		data.forEach(d => d.Category = d.Category || "Default");

	    let width = w - options.margins.left - options.margins.right;
	    height = height - options.margins.top - options.margins.bottom;

		// the orientaiton of this plot is horizontal, where the x axis will contain the units in the distrubiton, and the y axis will be the different categories of data
			
	    // define the intial scale (range will be updated after we determine the final dimensions)

	    const x = d3.scaleLinear()
	      .range([0, width])
	      .domain([options.xMin || d3.min(data, d => d.min), options.xMax || d3.max(data, d => d.max)])
		  .nice();

	    const y = d3.scaleBand()
	      .range([0, height])
	      .round(1.0 / data.length)
	      .domain(data.map(d => d.Category))

	    const xAxis = d3.axisBottom()
	      .scale(x)
	      .tickFormat(valueFormatter)
			
	    const yAxis = d3.axisLeft()
	      .scale(y);

	  	const colors = d3.scaleOrdinal().domain(data.map(d => d.Category))
		  .range(["#ff9315", "#0d61ff", "gold", "blue", "green", "red", "black", "orange", "brown","grey", "slateblue", "grey1", "darkgreen" ])

		let xAxisHeight = 0, xAxisWidth = xAxisHeight;
	    if (options.showXAxis) {
			// create temporary x axis
			const tempXAxis = svg.append('g').attr('class', 'axis');
			tempXAxis.call(xAxis);

			// update width & height based on temp xaxis dimension and remove
			xAxisHeight = Math.round(tempXAxis.node().getBBox().height) + 2;
			xAxisWidth = Math.round(tempXAxis.node().getBBox().width) + 4;
			height -= xAxisHeight;
			width -= Math.max(0, (xAxisWidth - width)); // trim width if
			// xAxisWidth bleeds over the allocated width.
			tempXAxis.remove();
		}

		let yAxisWidth = 0;
	    if (options.showYAxis) {
			// create temporary y axis
			const tempYAxis = svg.append('g').attr('class', 'axis');
			tempYAxis.call(yAxis);

			// update height based on temp xaxis dimension and remove
			yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
			width -= yAxisWidth;
			tempYAxis.remove();
		}

	    const boxHeight = options.boxHeight;
	    let boxOffset = (y.bandwidth() / 2 - boxHeight/2 );
	    let whiskerHeight = boxHeight / 2;

		let endMarkerSize = whiskerHeight / 10;

		if (options.showMinMarkers) {
			if (endMarkerSize > yAxisWidth)
				width -= 2 * endMarkerSize - yAxisWidth; // subtract from width any endMarkerSize's exceess over the yAxis Width.
			else
				width -= endMarkerSize; // subtract only the right side's end-marker width.
		}
	    // reset axis ranges
	    x.range([0, width]);
	    y.range([height, 0]);
			
	    const chart = svg.append('g')
	      .attr('transform', `translate(
	          ${options.margins.left + Math.max(yAxisWidth, endMarkerSize)},
	          ${options.margins.top}
	        )`);
			
		// draw main box and whisker plots
	    const boxplots = chart.selectAll('.boxplot')
	      .data(data)
	      .enter().append('g')
	      .attr('class', 'boxplot')
	      .attr('transform', d => `translate(0, ${y(d.Category)})`);

	    const self = this;
			
		// set up scale for drawing box height
		const boxScale = d3.scaleLinear()
	    .range([boxHeight/2, 0])
	    .domain([0,boxHeight]);

	    // for each g element (containing the boxplot render surface), draw the whiskers, bars and rects
	    boxplots.each(function (boxplotData) {
	  		const boxplot = d3.select(this);
			const d = boxplotData;
			const boxplotContainer = boxplot.append('g')
				.attr('transform', () => `translate(0, ${boxOffset})`)
				.append('g')
				.datum( boxplotData)

			if (d.LIF != d.q1) { // draw whisker
				boxplotContainer.append('line')
					.attr('class', 'bar')
					.attr('x1', x(d.LIF))
					.attr('y1', boxScale(whiskerHeight * 1.5))
					.attr('x2', x(d.LIF))
					.attr('y2', boxScale(whiskerHeight * 0.5))
					.style("stroke", colors(d.Category));
				boxplotContainer.append('line')
					.attr('class', 'whisker')
					.attr('x1', x(d.LIF))
					.attr('y1', boxScale(whiskerHeight))
					.attr('x2', x(d.q1))
					.attr('y2', boxScale(whiskerHeight))
					.style("stroke", colors(d.Category));
			}

			boxplotContainer.append('rect')
				.attr('class', 'box')
				.attr('x', x(d.q1))
				.attr('y', Math.min(boxScale(0), boxScale(boxHeight)))
				.attr('width', Math.max(1, x(d.q3) - x(d.q1)))
				.attr('height', Math.abs(boxScale(0) - boxScale(boxHeight)))
				.style("fill", colors(d.Category))
				.style("stroke", colors(d.Category))
				.style("fill-opacity", 0.4)
				.on('mouseover', d => self.tip.show(d, event.target))
				.on('mouseout', d => self.tip.hide(d, event.target))

			boxplotContainer.append('line')
				.attr('class', 'median')
				.attr('x1', x(d.median))
				.attr('y1', boxScale(0))
				.attr('x2', x(d.median))
				.attr('y2', boxScale(boxHeight))
				.style("stroke", colors(d.Category));

				if (d.UIF != d.q3) { // draw whisker
					boxplotContainer.append('line')
						.attr('class', 'bar')
						.attr('x1', x(d.UIF))
						.attr('y1', boxScale(whiskerHeight * 1.5))
						.attr('x2', x(d.UIF))
						.attr('y2', boxScale(whiskerHeight * 0.5))
						.style("stroke", colors(d.Category));
					boxplotContainer.append('line')
						.attr('class', 'whisker')
						.attr('x1', x(d.q3))
						.attr('y1', boxScale(whiskerHeight))
						.attr('x2', x(d.UIF))
						.attr('y2', boxScale(whiskerHeight))
						.style("stroke", colors(d.Category));
				}

				if (options.showMinMarkers) {
					boxplotContainer.append('circle')
						.attr('cx', x(d.min))
						.attr('cy', boxScale(whiskerHeight))
						.attr('r', endMarkerSize)
						.style("fill", colors(d.Category))
						.style("stroke", colors(d.Category))
						.style("fill-opacity", 0.4);
				}

				if (options.showMaxMarkers) {
					boxplotContainer.append('circle')
						.attr('cx', x(d.max))
						.attr('cy', boxScale(whiskerHeight))
						.attr('r', endMarkerSize)
						.style("fill", colors(d.Category))
						.style("stroke", colors(d.Category))
						.style("fill-opacity", 0.4);
				}
		});

	    // draw x and y axis
		if (options.showXAxis) {
			chart.append('g')
				.attr('class', 'x axis')
				.attr('transform', `translate(0, ${height})`)
				.call(xAxis);
		}
			
		if (options.showYAxis) {
			chart.append('g')
				.attr('class', 'y axis')
				.attr('transform', `translate(0, 0)`)
				.call(yAxis)
				.selectAll('.tick text')
				.call(this.wrap, y.bandwidth() || y.range())
				.selectAll('.tick text tspan')
				.attr('x', -9)
		}
	  }
	}
	
	return HorizontalBoxplot;
	
});
