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

define(["d3", "d3-scale", "./chart"],
	function(d3, d3scale, Chart) {
	"use strict";

	class BarChart extends Chart {
	  get formatters() {
	    return {
	      commaseparated: d3.format(','),
	      formatpercent: d3.format('.1%'),
	    };
	  }

	  render(data, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      label: 'label',
	      value: 'value',
	      rotate: 0,
	      textAnchor: 'middle',
	      showLabels: false,
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // conatainer
	    let svg = this.createSvg(target, w, h);

	    this.useTip((tip) => {
	      tip.attr('class', 'd3-tip')
	      .offset([-10, 0])
	      .html(d => d.value);
	    });

	    const label = options.label;
	    const value = options.value;

	    let total = 0;
	    data.forEach((d) => {
	      total = total + d[value];
	    });

	    let width = w - options.margins.left - options.margins.right;
	    let height = h - options.margins.top - options.margins.bottom;
			
	    // axes
	    const x = d3.scaleBand()
	      .range([0, width])
				.padding(.1)
	      .round(1.0 / data.length);

	    const y = d3scale.scaleLinear()
	      .range([height, 0]);

	    const xAxis = d3.axisBottom()
	      .scale(x)
	      .tickSize(2, 0);

	    const yAxis = d3.axisLeft()
	      .scale(y)
	      .tickFormat(options.yFormat)
	      .ticks(5);

	    x.domain(data.map(d => d[label]));
	    y.domain([0, options.yMax || d3.max(data, d => d[value])]);

	    // create temporary x axis
	    const tempXAxis = svg.append('g').attr('class', 'axis');
	    tempXAxis.call(xAxis);

	    // update width & height based on temp xaxis dimension and remove
	    const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	    const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	    height -= xAxisHeight;
	    width -= Math.max(0, (xAxisWidth - width)); // trim width if
	    // xAxisWidth bleeds over the allocated width.
	    tempXAxis.remove();

	    // create temporary y axis
	    const tempYAxis = svg.append('g').attr('class', 'axis');
	    tempYAxis.call(yAxis);

	    // update height based on temp xaxis dimension and remove
	    const yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
	    width -= yAxisWidth;
	    tempYAxis.remove();

	    // reset axis ranges
	    x.range([0, width]);
	    y.range([height, 0]);
			
			svg = svg.append('g')
	      .attr('transform', `translate(
	          ${options.margins.left + yAxisWidth},
	          ${options.margins.top}
	        )`);
			
	    svg.append('g')
	      .attr('class', 'x axis')
	      .attr('transform', `translate(0, ${height})`)
	      .call(xAxis)
	      .selectAll('.tick text')
	      .style('text-anchor', options.textAnchor)
	      .attr('transform', d => `rotate(${options.rotate})`);

	    if (options.wrap) {
	      svg.selectAll('.tick text')
	        .call(this.wrap, x.bandwidth());
	    }

	    svg.append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(0, 0)')
	      .call(yAxis);

	    svg.selectAll('.bar')
	      .data(data)
	      .enter()
	      .append('rect')
	      .attr('class', 'bar')
	      .attr('x', d => x(d[label]))
	      .attr('width', x.bandwidth())
	      .attr('y', d => y(d[value]))
	      .attr('height', d => height - y(d[value]))
	      .attr('title', (d) => {
	        let temp_title = `${d[label]}: ${this.formatters.commaseparated(d[value], ',')}`;
	        if (total > 0) {
	          temp_title += ` (${this.formatters.formatpercent(d[value] / total)})`;
	        } else {
	          temp_title += ` (${this.formatters.formatpercent(0)})`;
	        }
	        return temp_title;
	      })
	      .style('fill', d => options.colors(d[label]))
	      .on('mouseover', d => this.tip.show(d, event.target))
	      .on('mouseout', d => this.tip.hide(d, event.target))
	      .exit()
	      .remove();

	    if (options.showLabels) {
	      svg.selectAll('.barlabel')
	        .data(data)
	        .enter()
	        .append('text')
	        .attr('class', 'barlabel')
	        .text(d => this.formatters.formatpercent(d[value] / total))
	        .attr('x', d => x(d[label]) + x.bandwidth() / 2)
	        .attr('y', d => y(d[value]) - 3)
	        .attr('text-anchor', 'middle');
	    }
	  }
	}

	return BarChart;
});
