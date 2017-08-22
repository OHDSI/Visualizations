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

define(["d3", "d3-tip", "chart"],
	function(d3, d3tip, Chart) {
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
	    const svg = this.createSvg(target, w, h);

	    const label = options.label;
	    const value = options.value;

	    let total = 0;
	    data.forEach((d) => {
	      total = total + d[value];
	    });

	    // axes
	    const x = d3.scaleBand()
	      .range([0, width])
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

	    var tip = d3tip()
	      .attr('class', 'd3-tip')
	      .offset([-10, 0])
	      .html(d => d.value)
	    svg.call(tip);

	    x.domain(data.map(d => d[label]));
	    y.domain([0, options.yMax || d3.max(data, d => d[value])]);

	    svg.append('g')
	      .attr('class', 'x axis')
	      .attr('transform', `translate(0, ${height + 1})`)
	      .call(xAxis)
	      .selectAll('.tick text')
	      .style('text-anchor', options.textAnchor)
	      .attr('transform', d => `rotate(${options.rotate})`);

	    svg.append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(0, 0)')
	      .call(yAxis);

	    if (options.wrap) {
	      svg.selectAll('.tick text')
	        .call(this.wrap, x.bandwidth());
	    }

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
	      .style('fill', d => options.colors[d[label]])
	      .on('mouseover', d => tip.show(d, event.target))
	      .on('mouseout', tip.hide)
	      .exit()
	      .remove();

	    if (options.showLabels) {
	      svg.selectAll('.barlabel')
	        .data(data)
	        .enter()
	        .append('text')
	        .attr('class', 'barlabel')
	        .text(d => this.formatters.formatpercent(d[value] / total))
	        .attr('x', d => x(d[label]) + x.rangeBand() / 2)
	        .attr('y', d => y(d[value]) - 3)
	        .attr('text-anchor', 'middle');
	    }
	  }
	}

	return BarChart;
});
