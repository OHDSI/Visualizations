define(function(require) {
	"use strict";
	
	var module = {
		version: "0.0.1"
	}
	
	var chart = require("./chart");
	var aster = require("./aster");
	var areachart = require("./areachart");
	var barchart = require("./barchart");
	var boxplot = require("./boxplot");
	var donut = require("./donut");
	var histogram = require("./histogram");
	var horizontalBoxplot = require("./horizontal-boxplot");
	var line = require("./line");
	var trellisline = require("./trellisline");
	var treemap = require("./treemap");
	var scatterplot = require("./scatterplot");
	var splitBoxplot = require("./split-boxplot");
	var sunburst = require("./sunburst");
	var util = require("./util");
	
	module.chart = chart;
	module.aster = aster;
	module.areachart = areachart;
	module.barchart = barchart;
	module.boxplot = boxplot;
	module.donut = donut;
	module.histogram = histogram;
	module.horizontalBoxplot = horizontalBoxplot;
	module.line = line;
	module.trellisline = trellisline;
	module.treemap = treemap;
	module.scatterplot = scatterplot;
	module.splitBoxplot = splitBoxplot;
	module.sunburst = sunburst;
	module.util = util;
	
	
	return module;
	
});
