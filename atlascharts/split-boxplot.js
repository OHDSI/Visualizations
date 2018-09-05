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

	class SplitBoxplot extends Boxplot {
	  render(data, target, w, h, chartOptions) {
	    // options
			const defaults = {
				boxHeight: 10, 
				valueFormatter: this.formatters.formatSI(3), 
				margins: {
		        top: 0,
		        right: 0,
		        bottom: 0,
		        left: 0,
		      }
			};
			
	    const options = this.getOptions(defaults, chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

			const valueFormatter = options.valueFormatter;
			
	    this.useTip(this.defaultTip, options);

			// assign a category if it is absent
			data.forEach(d => d.Category = d.Category || "Default");
			
	    let width = w - options.margins.left - options.margins.right;
	    let height = h - options.margins.top - options.margins.bottom;

			// the orientaiton of this plot is horizontal, where the x axis will contain the units in the distrubiton, and the y axis will be the different categories of data
			
	    // define the intial scale (range will be updated after we determine the final dimensions)

	    const x = d3.scaleLinear()
	      .range([0, width])
	      .domain([options.xMin || d3.min(data, d => Math.min(d.target.min, d.compare.min)), options.xMax || d3.max(data, d => Math.max(d.target.max, d.compare.max))]);
			
	    const y = d3.scaleBand()
	      .range([0, height])
	      .round(1.0 / data.length)
	      .domain(data.map(d => d.Category));			

	    const xAxis = d3.axisBottom()
	      .scale(x)
	      .tickFormat(options.yFormat)
	      .ticks(5);
			
	    const yAxis = d3.axisLeft()
	      .scale(y);


			let xAxisHeight = 0, xAxisWidth = xAxisHeight;
	    if (options.showXAxis) {
				// create temporary x axis
				const tempXAxis = svg.append('g').attr('class', 'axis');
				tempXAxis.call(xAxis);

				// update width & height based on temp xaxis dimension and remove
				xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
				xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
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
	    // reset axis ranges
	    x.range([0, width]);
	    y.range([height, 0]);

	    const boxHeight = options.boxHeight;
	    let boxOffset = (y.bandwidth() / 2) - (boxHeight / 2);
	    let whiskerHeight = boxHeight / 2;

	    const chart = svg.append('g')
	      .attr('transform', `translate(
	          ${options.margins.left + yAxisWidth},
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
			const topScale = d3.scaleLinear()
	      .range([boxHeight/2, 0])
	      .domain([0,boxHeight]);
			
			const bottomScale = d3.scaleLinear()
	      .range([0,boxHeight/2])
	      .domain([0,boxHeight]);			
			
			const bandWidth = y.bandwidth();

	    // for each g element (containing the boxplot render surface), draw the whiskers, bars and rects
	    boxplots.each(function (boxplotData) {
	      const boxplot = d3.select(this);
				
				const boxplotContainer = boxplot.append('g')
					.attr('transform', () => `translate(0, ${boxOffset})`);
				
				const targetBox = boxplotContainer.append('g')
					.datum( boxplotData.target)
					.attr('class', 'target');
				const compareBox = boxplotContainer.append('g')
					.datum(boxplotData.compare)
					.attr('class', 'compare')
					.attr('transform', () => `translate(0, ${boxHeight/2 + 2})`);
				
				let parts = [ 
					{ "boxPlotData": boxplotData.target, "boxplot": targetBox, boxScale: topScale},
					{ "boxPlotData": boxplotData.compare, "boxplot": compareBox, boxScale: bottomScale, "tipDirection": "s", tipOffset: [10,0]}
				];
				
				parts.forEach(part => {
					let d = part.boxPlotData;
					let boxplot = part.boxplot;
					let boxScale = part.boxScale;
					
					if (d.LIF != d.q1) { // draw whisker
						boxplot.append('line')
							.attr('class', 'bar')
							.attr('x1', x(d.LIF))
							.attr('y1', boxScale(0))
							.attr('x2', x(d.LIF))
							.attr('y2', boxScale(whiskerHeight));
						boxplot.append('line')
							.attr('class', 'whisker')
							.attr('x1', x(d.LIF))
							.attr('y1', boxScale(0))
							.attr('x2', x(d.q1))
							.attr('y2', boxScale(0));
					}

					boxplot.append('rect')
						.attr('class', 'box')
						.attr('x', x(d.q1))
						.attr('y', Math.min(boxScale(0), boxScale(boxHeight)))
						.attr('width', Math.max(1, x(d.q3) - x(d.q1)))
						.attr('height', Math.abs(boxScale(0) - boxScale(boxHeight)))
						.on('mouseover', d => self.tip.show({...d, tipDirection: part.tipDirection, tipOffset: part.tipOffset}, event.target))
						.on('mouseout', d => self.tip.hide(d, event.target));

					boxplot.append('line')
						.attr('class', 'median')
						.attr('x1', x(d.median))
						.attr('y1', boxScale(0))
						.attr('x2', x(d.median))
						.attr('y2', boxScale(boxHeight));

					if (d.UIF != d.q3) { // draw whisker
						boxplot.append('line')
							.attr('class', 'bar')
							.attr('x1', x(d.UIF))
							.attr('y1', boxScale(0))
							.attr('x2', x(d.UIF))
							.attr('y2', boxScale(whiskerHeight));
						boxplot.append('line')
							.attr('class', 'whisker')
							.attr('x1', x(d.q3))
							.attr('y1', boxScale(0))
							.attr('x2', x(d.UIF))
							.attr('y2', boxScale(0));
					}
					// to do: add max/min indicators					
				});
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
					.call(this.wrap, y.bandwidth() || y.range());
			}
			
	  }
	}
	
	return SplitBoxplot;
	
});
