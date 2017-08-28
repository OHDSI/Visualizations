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

define(["d3", "d3-tip", "d3-scale", "d3-shape", "chart", "get"],
	function(d3, d3tip, d3scale, d3shape, Chart, get) {
	"use strict";

	class Trellisline extends Chart {
	  render(dataByTrellis, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      trellisSet: d3.keys(dataByTrellis),
	      xFormat: d3.format('d'),
	      yFormat: d3.format('d'),
	      interpolate: d3.curveLinear,
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    function mouseover() {
	      gTrellis.selectAll('.g-end').style('display', 'none');
	      gTrellis.selectAll('.g-value').style('display', null);
	      mousemove.call(this);
	    }

	    function mousemove() {
	      const date = seriesScale.invert(d3.mouse(event.target)[0]);
	      gTrellis.selectAll('.g-label-value.g-start').call(valueLabel, date);
	      gTrellis.selectAll('.g-label-year.g-start').call(yearLabel, date);
	      gTrellis.selectAll('.g-value').attr('transform', function (d) {
	        const s = d.values;
	        if (s) {
	          const v = s[bisect(s, date, 0, s.length - 1)];
	          const yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP) ? v.Y_PREVALENCE_1000PP : v.yPrevalence1000Pp;
	          if (v && v.date) {
	            return 'translate(' + seriesScale(v.date) + ',' + yScale(yValue) + ')';
	          } else {
	            return 'translate(0,0);';
	          }
	        }
	      });
	    }

	    function mouseout() {
	      gTrellis.selectAll('.g-end').style('display', null);
	      gTrellis.selectAll('.g-label-value.g-start').call(valueLabel, minDate);
	      gTrellis.selectAll('.g-label-year.g-start').call(yearLabel, minDate);
	      gTrellis.selectAll('.g-label-year.g-end').call(yearLabel, maxDate);
	      gTrellis.selectAll('.g-value').style('display', 'none');
	    }

	    function valueLabel(text, date) {
	      const offsetScale = d3.scaleLinear().domain(seriesScale.range());

	      text.each(function(d) {
	        const text = d3.select(this);
	        const s = d.values;
	        const i = bisect(s, date, 0, s.length - 1);
	        const j = Math.round(i / (s.length - 1) * (s.length - 12));
	        const v = s[i];
	        if (v && v.date) {
	          const x = seriesScale(v.date);
	          text.attr('dy', null).attr('y', -4);
	          var yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP)
	            ? v.Y_PREVALENCE_1000PP
	            : v.yPrevalence1000Pp;
	          text.text(options.yFormat(yValue))
	            .attr('transform', `translate(
	                ${offsetScale.range([0, trellisScale.bandwidth() - this.getComputedTextLength()])(x)},
	                ${yScale(d3.max(s.slice(j, j + 12), d => yValue))}
	              )`
	            );
	        }
	      });
	    }

	    function yearLabel(text, date) {
	      const offsetScale = d3.scaleLinear().domain(seriesScale.range());
	      // derive the x vale by using the first trellis/series set of values.
	      // All series are assumed to contain the same domain of X values.
	      const s = get(dataByTrellis, '[0].values[0].values', []),
	        v = s[bisect(s, date, 0, s.length - 1)];
	      if (v && v.date) {
	        const x = seriesScale(v.date);
	        text.each(function (d) {
	          d3.select(this)
	            .text(v.date.getFullYear())
	            .attr('transform', `translate(
	              ${offsetScale.range([0, trellisScale.bandwidth() - this.getComputedTextLength()])(x)},
	              ${height + 6}
	              )`
	            )
	            .style('display', null);
	        });
	      }
	    }

	    function renderLegend(g) {
	      let offset = 0;
	      options.colors.domain().forEach((d) => {
	        const legendItem = g.append('g').attr('class', 'trellisLegend');
	        const legendText = legendItem.append('text')
	          .text(d);
	        const textBBox = legendItem.node().getBBox();
	        legendText
	          .attr('x', 12)
	          .attr('y', textBBox.height);
	        legendItem.append('line')
	          .attr('x1', 0)
	          .attr('y1', 10)
	          .attr('x2', 10)
	          .attr('y2', 10)
	          .style('stroke', () => options.colors(d));
	        legendItem.attr('transform', `translate(${offset}, 0)`);
	        offset += legendItem.node().getBBox().width + 5;
	      });
	    }

	    const bisect = d3.bisector(d => d.date).left;
	    const minDate = d3.min(dataByTrellis, trellis =>
	      d3.min(trellis.values, series =>
	        d3.min(series.values, d =>
	          d.date
	        )
	      )
	    );
	    const maxDate = d3.max(dataByTrellis, trellis =>
	      d3.max(trellis.values, series =>
	        d3.max(series.values, d =>
	          d.date
	        )
	      )
	    );

	    const minY = d3.min(dataByTrellis, trellis =>
	      d3.min(trellis.values, series =>
	        d3.min(series.values, d =>
	          (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	            ? d.Y_PREVALENCE_1000PP
	            : d.yPrevalence1000Pp
	        )
	      )
	    );
	    const maxY = d3.max(dataByTrellis, trellis =>
	      d3.max(trellis.values, series =>
	        d3.max(series.values, d =>
	          (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	            ? d.Y_PREVALENCE_1000PP
	            : d.yPrevalence1000Pp
	        )
	      )
	    );

	    let seriesLabel;
	    let seriesLabelHeight = 0;
	    if (options.seriesLabel) {
	      seriesLabel = svg.append('g');
	      seriesLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .attr('dy', '.79em')
	        .text(options.seriesLabel);
	      if (seriesLabelHeight = seriesLabel.node()) {
	        seriesLabelHeight = seriesLabel.node().getBBox().height + 10;
	      }
	    }

	    let trellisLabel;
	    let trellisLabelHeight = 0;
	    if (options.trellisLabel) {
	      trellisLabel = svg.append('g');
	      trellisLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .attr('dy', '.79em')
	        .text(options.trellisLabel);
	      trellisLabelHeight = trellisLabel.node().getBBox().height + 10;
	    }

	    // simulate a single trellis heading
	    let trellisHeading;
	    let trellisHeadingHeight = 0;
	    trellisHeading = svg.append('g')
	      .attr('class', 'g-label-trellis');
	    trellisHeading.append('text')
	      .text(options.trellisSet.join(''));
	    trellisHeadingHeight = trellisHeading.node().getBBox().height + 10;
	    trellisHeading.remove();

	    let yAxisLabel;
	    let yAxisLabelWidth = 0;
	    if (options.yLabel) {
	      yAxisLabel = svg.append('g');
	      yAxisLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .text(options.yLabel);
	      yAxisLabelWidth = yAxisLabel.node().getBBox().height + 4;
	    }

	    // calculate an intial width and height that does not take into account the tick text dimensions
	    let width = w - options.margins.left - yAxisLabelWidth - options.margins.right;
	    let height = h - options.margins.top - trellisLabelHeight - trellisHeadingHeight- seriesLabelHeight - options.margins.bottom*2;

	    const trellisScale = d3scale.scaleBand()
	      .domain(options.trellisSet)
	      .range([0, width])
	      .paddingOuter(0.2)
	      .paddingInner(0.25);

	    const seriesScale = d3.scaleTime()
	      .domain([minDate, maxDate])
	      .range([0, trellisScale.bandwidth()]);

	    const yScale = d3.scaleLinear()
	      .domain([minY, maxY])
	      .range([height, 0]);

	    const yAxis = d3.axisLeft()
	      .scale(yScale)
	      .tickFormat(options.yFormat)
	      .ticks(4);

	    // create temporary x axis
	    const xAxis = d3.axisBottom()
	      .scale(seriesScale);

	    const tempXAxis = svg
	      .append('g')
	      .attr('class', 'axis');
	    tempXAxis.call(xAxis);

	    // update width & height based on temp xaxis dimension and remove
	    const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	    const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	    height -= xAxisHeight;
	    // trim width if xAxisWidth bleeds over the allocated width.
	    width -= Math.max(0, (xAxisWidth - width));
	    tempXAxis.remove();

	    // create temporary y axis
	    const tempYAxis = svg.append('g').attr('class', 'axis');
	    tempYAxis.call(yAxis);

	    // update width based on temp yaxis dimension and remove
	    const yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
	    width -= yAxisWidth;
	    tempYAxis.remove();

	    // reset axis ranges
	    trellisScale
	      .range([0, width])
	      .paddingOuter(0.2)
	      .paddingInner(0.25);
	    seriesScale.range([0, trellisScale.bandwidth()]);
	    yScale.range([height, 0]);


	    if (options.trellisLabel) {
	      trellisLabel.attr('transform', `translate(
	        ${(width / 2) + options.margins.left},
	        ${options.margins.top}
	      )`);
	    }

	    if (options.seriesLabel) {
	      seriesLabel.attr('transform', `translate(
	        ${(width / 2) + options.margins.left},
	        ${trellisLabelHeight + height + xAxisHeight + seriesLabelHeight + options.margins.top*2}
	      )`);
	    }

	    if (options.yLabel) {
	      yAxisLabel.attr('transform', `translate(
	        ${options.margins.left},
	        ${(height / 2) + trellisLabelHeight + trellisHeadingHeight}
	      )`);
	      yAxisLabel.select('text')
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 0)
	        .attr('x', 0)
	        .attr('dy', '1em');
	    }

	    const seriesLine = d3shape.line()
	      .x(d => seriesScale(d.date))
	      .y(d => yScale((d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	          ? d.Y_PREVALENCE_1000PP
	          : d.yPrevalence1000Pp)
	      )
	      .curve(options.interpolate);

	    // when using d3selection.select instead of d3.select, d3.mouse will have a bug with undefined event
	    const vis = d3.select(svg.node()).append('g')
	      .attr('transform', d =>
	        `translate(
	        ${yAxisLabelWidth + yAxisWidth + options.margins.left},
	        ${trellisLabelHeight}
	      )`
	      );

	    const gTrellis = vis.selectAll('.g-trellis')
	      .data(trellisScale.domain())
	      .enter()
	      .append('g')
	      .attr('class', 'g-trellis')
	      .attr('transform', d =>
	        `translate(${trellisScale(d)}, ${trellisHeadingHeight})`
	      );

	    const seriesGuideXAxis = d3.axisBottom()
	      .scale(seriesScale)
	      .tickFormat('')
	      .tickSize(-height);

	    const seriesGuideYAxis = d3.axisLeft()
	      .scale(yScale)
	      .tickFormat('')
	      .tickSize(-trellisScale.bandwidth())
	      .ticks(8);

	    gTrellis.append('g')
	      .attr('class', 'x-guide')
	      .attr('transform', `translate(0, ${height})`)
	      .call(seriesGuideXAxis);

	    gTrellis.append('g')
	      .attr('class', 'y-guide')
	      .call(seriesGuideYAxis);

	    const gSeries = gTrellis.selectAll('.g-series')
	      .data((trellis) => {
	        const seriesData = dataByTrellis.filter(e => e.key === trellis);
	        if (seriesData.length > 0)
	          return seriesData[0].values;
	        else
	          return [];
	      })
	      .enter()
	      .append('g')
	      .attr('class', 'g-series lineplot');

	    gSeries.append('path')
	      .attr('class', 'line')
	      .attr('d', d =>
	        seriesLine(d.values.sort((a, b) =>
	          d3.ascending(a.date, b.date)
	        ))
	      )
	      .style('stroke', d => options.colors(d.key));

	    gSeries.append('circle')
	      .attr('class', 'g-value')
	      .attr('transform', (d) => {
	        const v = d.values;
	        if (v
	          && v[v.length - 1]
	          && v[v.length - 1].date
	          && v[v.length - 1]
	          && (v[v.length - 1].Y_PREVALENCE_1000PP || v[v.length - 1].yPrevalence1000Pp)) {
	          const yValue = (v[v.length - 1].Y_PREVALENCE_1000PP === 0 || v[v.length - 1].Y_PREVALENCE_1000PP)
	            ? v[v.length - 1].Y_PREVALENCE_1000PP
	            : v[v.length - 1].yPrevalence1000Pp;
	          return `translate(${seriesScale(v[v.length - 1].date)}, ${yScale(yValue)})`;
	        }
	        return 'translate(0, 0)';
	      })
	      .attr('r', 2.5)
	      .style('display', 'none');

	    gSeries.append('text')
	      .attr('class', 'g-label-value g-start')
	      .call(valueLabel, minDate);

	    gSeries.append('text')
	      .attr('class', 'g-label-value g-end')
	      .call(valueLabel, maxDate);

	    gTrellis.append('text')
	      .attr('class', 'g-label-year g-start')
	      .attr('dy', '.71em')
	      .call(yearLabel, minDate);

	    gTrellis.append('text')
	      .attr('class', 'g-label-year g-end')
	      .attr('dy', '.71em')
	      .call(yearLabel, maxDate);

	    gTrellis.append('g')
	      .attr('class', 'x axis')
	      .append('line')
	      .attr('x2', trellisScale.bandwidth())
	      .attr('y1', yScale(minY))
	      .attr('y2', yScale(minY));

	    gTrellis.append('g')
	      .attr('class', 'g-label-trellis')
	      .attr('transform', d =>
	        `translate(${trellisScale.bandwidth() / 2}, 0)`
	      )
	      .append('text')
	      .attr('dy', '-1em')
	      .style('text-anchor', 'middle')
	      .text(d => d);

	    gTrellis.append('rect')
	      .attr('class', 'g-overlay')
	      .attr('x', -4)
	      .attr('width', trellisScale.bandwidth() + 8)
	      .attr('height', height + 18)
	      .on('mouseover', mouseover)
	      .on('mousemove', mousemove)
	      .on('mouseout', mouseout);

	    d3.select(gTrellis.nodes()[0]).append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(-4,0)')
	      .call(yAxis);

	    const legendContainer = svg.append('g')
	      .attr('transform', `translate(${options.margins.left}, ${options.margins.top})`);
	    legendContainer.call(renderLegend);
	  }
	}
	
	return Trellisline;
	
});
