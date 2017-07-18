const d3selection = require('d3-selection');
const d3scale = require('d3-scale');
const d3tip = require('d3-tip');
const d3 = require('d3');
import Chart from './Chart';

class AreaChart extends Chart {
  render(data, target, w, h, chartOptions) {
    const options = this.getOptions(chartOptions);
    const chart = this.createSvg(target, width, height, options);

    const x = d3scale.scaleLinear()
      .domain(d3.extent(data, d => d.x))
      .range([0, width]);

    const y = d3scale.scaleLinear()
      .domain([0, d3.max(data, d => d.y)])
      .range([height, 0]);

    const xAxis = d3.axisBottom()
      .scale(x)
      .tickFormat(options.xFormat)
      .ticks(10);

    const yAxis = d3.axisLeft()
      .scale(y)
      .tickFormat(options.yFormat)
      .ticks(4);

    const area = d3.area()
      .x(d => x(d.x))
      .y0(height)
      .y1(d => y(d.y));

    const vis = chart.append('g')
      .attr('transform', `translate(${options.margins.left}, ${options.margins.top})`);

    vis.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('d', area);

    vis.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

    vis.append('g')
      .attr('class', 'y axis')
      .call(yAxis);
  }
}

export default AreaChart;
