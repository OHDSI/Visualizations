const d3selection = require('d3-selection');
const d3tip = require('d3-tip');
const d3 = require('d3');
const d3shape = require('d3-shape');
const d3drag = require('d3-drag');
const numeral = require('numeral');
import Chart from './Chart';

class Donut extends Chart {
  static getFormatters() {
    return {
      formatpercent: d3.format('.1%'),
    };
  }

  render(data, target, w, h, chartOptions) {
    // options
    const options = this.getOptions(chartOptions);
    // container
    const svg = this.createSvg(target, w, h);    
    svg.data([data.data]);

    function dragstarted() {
      const legendContainer = d3.select(this);
      legendContainer.attr('initialX', event.x);
      legendContainer.attr('initialY', event.y);
    }

    function dragged() {
      const legendContainer = d3.select(this);
      const diffY = event.y - parseFloat(legendContainer.attr('initialY'));
      if (isNaN(diffY)) {
        return false;
      }
       legendContainer.attr('transform', `translate(
        ${parseFloat(legendContainer.attr('initialPositionX'))},
        ${parseFloat(legendContainer.attr('initialPositionY')) + diffY}
      )`);
    }

    function dragended() {
      const legendContainer = d3.select(this);
      legendContainer.transition()
        .duration(300)
        .attr('transform', `translate(
          ${legendContainer.attr('initialPositionX')},
          ${legendContainer.attr('initialPositionY')}
        )`);
    }

    let total = 0;
    data.data.forEach((d) => {
      total += +d;
    });

    const tooltipBuilder = Chart.donutDefaultTooltip(
      (d) => data.legend[d.index],
      (d) => numeral(d.value).format('0,0'), 
      (d) => Donut.getFormatters().formatpercent(total != 0 ? d.value / total : 0.0)
    );    

    const tip = d3tip()
      .attr('class', 'd3-tip')
      .direction('s')
      .offset([3, 0])
      .html(tooltipBuilder);
    svg.call(tip);

    if (data.data.length > 0) {
      const vis = svg
        .append('g')
        .attr('id', 'chart');

      // legend
      const drag = d3drag.drag()
        .on('drag', dragged)
        .on('start', dragstarted)
        .on('end', dragended);

      const legend = svg.append('g')
        .attr('class', 'legend')
        .call(drag);

      legend.selectAll('rect')
        .data(data.legend)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * 15)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', (d, index) => options.colors[index]);

      let legendWidth = 0;
      const textDisplace = 12;
      const legendItems = legend.selectAll('g.legend-item')
        .data(data.legend)
        .enter()
        .append('g')
        .attr('class', 'legend-item');

      legendItems
        .append('text')
        .attr('x', textDisplace)
        .attr('y', (d, i) => (i * 15) + 9)
        .text(d => d);

      legendItems
        .append('title')
        .attr('x', textDisplace)
        .attr('y', (d, i) => (i * 15) + 9)
        .text(d => d);

      legendItems.each(function() {
        const legendItemWidth = this.getBBox().width;
        if (legendItemWidth > legendWidth && legendWidth + legendItemWidth < w * 0.75) {
          legendWidth = legendItemWidth;
        }
      });

      legendWidth += textDisplace;
      legend
        .attr('transform', `translate(
            ${w - legendWidth - options.margins.right},
            ${options.margins.top}
          )`)
        .attr('initialPositionX', w - legendWidth - options.margins.right)
        .attr('initialPositionY', options.margins.top);
      vis
        .attr('transform', `translate(${(w - legendWidth) / 2}, ${h / 2})`);

      const or = Math.min(h, w-legendWidth) / 2 - options.margins.top;
      const ir = Math.min(h, w-legendWidth) / 6 - options.margins.top;

      const arc = d3shape.arc()
        .innerRadius(ir)
        .outerRadius(or);

      const pie = d3.pie() // this will create arc data for us given a list of values
        .value((d) => {
          return d > 0 ? Math.max(d, total * .015) : 0;
          // we want slices to appear if they have data, so we return a minimum of
          // 1.5% of the overall total if the datapoint has a value > 0.
        }); // we must tell it out to access the value of each element in our data array

      const arcs = vis.selectAll('g.slice') // this selects all <g> elements with class slice (there aren't any yet)
        .data(pie) // associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
        .enter() // this will create <g> elements for every 'extra' data element that should be associated with a selection. The result is creating a <g> for every object in the data array
        .append('g') // create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
        .attr('class', 'slice'); // allow us to style things in the slices (like text)

      arcs.append('path')
        .attr('fill', (d, index) => {
          return options.colors[index];
        }) // set the color for each slice to be chosen from the color function defined above
        .attr('stroke', '#fff')
        .attr('stroke-width', 5)
        .attr('title', d => d.label)
        .on('mouseover', d => tip.show(d, event.target))
        .on('mouseout', tip.hide)
        .attr('d', arc); // this creates the actual SVG path using the associated data (pie) with the arc drawing function

      
    } else {
      svg.append('text')
        .attr('transform', `translate(${w / 2}, ${h / 2})`)
        .style('text-anchor', 'middle')
        .text('No Data');
    }
  }
}

export default Donut;
