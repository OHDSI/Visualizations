const d3tip = require('d3-tip');
const d3 = require('d3');
import Chart from './Chart';

class Treemap extends Chart {
  static getFormatters() {
    return {
      format_pct: d3.format('.2%'),
      format_fixed: d3.format('.2f'),
      format_comma: d3.format(','),
    };
  }

  static render(data, target, w, h, chartOptions) {
    // options
    const options = this.getOptions(chartOptions);
    // container
    const svg = this.createSvg(target, w, h);

    const x = d3.scaleLinear().range([0, w]);
    const y = d3.scaleLinear().range([0, h]);

    d3.select(target).select('.treemap_zoomtarget').text('');
    let currentDepth = 0;

    const tip = d3tip()
      .attr('class', 'd3-tip')
      .direction(function(d) {
        const scaledWidth = x.domain()[1] === 1 ? w : x.domain()[1];
        if (d.x1 >= scaledWidth - scaledWidth / 10) {
          return 'w';
        } else if (d.x0 <= scaledWidth / 10) {
          return 'e';
        }
        return 'n';
      })
      .offset([3, 0])
      .html(d => `${options.gettitle(d.data)}<br/><br/>${options.getcontent(d.data)}`);

    const treemap = d3.treemap()
      .round(false)
      .size([w, h]);

    const hierarchy = d3.hierarchy(data, d => d.children)
      .sum(options.getsizevalue);
    const tree = treemap(hierarchy);

    function zoom(d, isAnimated = true) {
      const kx = w / (d.x1 - d.x0) || w;
      const ky = h / (d.y1 - d.y0) || h;
      if (d.x1 && d.y1) {
        x.domain([d.x0, d.x0 + (d.x1 - d.x0)]);
        y.domain([d.y0, d.y0 + (d.y1 - d.y0)]);
      } else {
        x.domain([0, w]);
        y.domain([0, h]);
      }

      const zoomtarget = d3.select(target).select('.treemap_zoomtarget');
      if (zoomtarget.size()) {
        if (d.data.name === 'root') {
          zoomtarget.text('');
        } else {
          const currentZoomcaption = zoomtarget.text();
          zoomtarget.text(`${currentZoomcaption} > ${d.data.name}`);
        }
      }

      // d3-selection have issues with .transision()
      let t = d3.select(target).selectAll('g.cell, .grouper');
      if (isAnimated) {
        t = t.transition()
        .duration(750);
      }
      t.attr('transform', с => `translate(${x(с.x0)}, ${y(с.y0)})`)
        .on('end', () => {
          svg.selectAll('.grouper')
            .attr('display', 'block');
        });

      // patched to prevent negative value assignment to width and height
      t.select('rect')
        .attr('width', c => Math.max(0, (kx * (c.x1 - c.x0)) - 1))
        .attr('height', c => Math.max(0, (ky * (c.y1 - c.y0)) - 1));

      if (event) {
        event.stopPropagation();
      }
      if (options.onZoom) {
        options.onZoom(d);
      }
    }

    function applyGroupers(groupingTarget) {
      const kx = w / (groupingTarget.x1 - groupingTarget.x0);
      const ky = h / (groupingTarget.y1 - groupingTarget.y0);

      const topNodes = tree.children
        .filter(d => d.parent === groupingTarget);

      svg.selectAll('.grouper')
        .remove();
      const groupers = svg.selectAll('.grouper')
        .data(topNodes)
        .enter()
        .append('g')
        .attr('class', 'grouper')
        .attr('transform', d => `translate(${(d.x0 + 1)}, ${(d.y0 + 1)})`)
        .attr('display', 'none');

      groupers.append('rect')
        .attr('width', d => Math.max(0, (kx * (d.x1 - d.x0)) - 1))
        .attr('height', d => Math.max(0, (ky * (d.y1 - d.y0)) - 1))
        .attr('title', d => d.name)
        .attr('id', d => d.id);
    }

    const nodes = tree.leaves()
      .filter(d => options.getsizevalue(d.data));

    const extent = d3.extent(nodes, d => options.getcolorvalue(d.data));
    const median = d3.median(nodes, d => options.getcolorvalue(d.data));

    let colorRange;
    if (options.getcolorrange) {
      colorRange = options.getcolorrange();
    } else {
      colorRange = ['#E4FF7A', '#FC7F00'];
    }

    let colorScale = [extent[0], median, extent[1]];
    if (options.getcolorscale) {
      colorScale = options.getcolorscale();
    }
    const color = d3.scaleLinear()
      .domain(colorScale)
      .range(colorRange);

    const cell = svg.selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${d.x0}, ${d.y0})`);

    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0 - 1))
      .attr('height', d => Math.max(0, d.y1 - d.y0 - 1))
      .attr('id', d => d.id)
      .style('fill', d => color(options.getcolorvalue(d.data)))
      .on('click', (d) => {
        if (options.useTip) {
          tip.hide();
        }
        if (event.altKey) {
          zoom(hierarchy);
          applyGroupers(hierarchy);
        } else if (event.ctrlKey) {
          let currentTarget = d;

          while (currentTarget.depth !== currentDepth + 1) {
            currentTarget = currentTarget.parent;
          }
          currentDepth = currentTarget.depth;
          if (currentTarget.children && currentTarget.children.length > 1) {
            applyGroupers(currentTarget);
            zoom(currentTarget);
          } else {
            currentDepth = 0;
            applyGroupers(hierarchy);
            zoom(hierarchy);
          }
        } else {
          options.onclick(d.data);
        }
      });

    if (options.useTip) {
      svg.call(tip);
      cell
        .on('mouseover', d => tip.show(d, event.target))
        .on('mouseout', d => tip.hide(d, event.target));
    } else {
      cell
        .attr('data-container', 'body')
        .attr('data-toggle', 'popover')
        .attr('data-trigger', 'hover')
        .attr('data-placement', 'top')
        .attr('data-html', true)
        .attr('data-title', d => options.gettitle(d.data))
        .attr('data-content', d => options.getcontent(d.data));
    }

    if (options.initialZoomedConcept) {
      applyGroupers(options.initialZoomedConcept);
      zoom(options.initialZoomedConcept, false);
    } else {
      applyGroupers(hierarchy);
    }
    svg
      .selectAll('.grouper')
      .attr('display', 'block');
  }

  static buildHierarchyFromJSON(data, threshold, leafNodeCreator) {
    let total = 0;

    const root = {
      name: 'root',
      children: [],
    };

    data.PERCENT_PERSONS.forEach((p) => {
      total += p;
    });

    data.CONCEPT_PATH.forEach((path, i) => {
      const parts = path.split('||');
      let currentNode = root;
      for (let j = 0; j < parts.length; j += 1) {
        const children = currentNode.children;
        const nodeName = parts[j];
        let childNode;
        if (j + 1 < parts.length) {
          // Not yet at the end of the path; move down the tree.
          let foundChild = false;
          children.forEach((child) => {
            if (child.name === nodeName) {
              childNode = child;
              foundChild = true;
            }
          });
          // If we don't already have a child node for this branch, create it.
          if (!foundChild) {
            childNode = {
              name: nodeName,
              children: [],
            };
            children.push(childNode);
          }
          currentNode = childNode;
        } else {
          // Reached the end of the path; create a leaf node.
          childNode = leafNodeCreator(nodeName, i, data);

          // we only include nodes with sufficient size in the treemap display
          // sufficient size is configurable in the calculation of threshold
          // which is a function of the number of pixels in the treemap display
          if ((data.PERCENT_PERSONS[i] / total) > threshold) {
            children.push(childNode);
          }
        }
      }
    });
    return root;
  }
}

export default Treemap;
