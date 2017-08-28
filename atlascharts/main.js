define(function(require) {
	"use strict";
	
	var module = {
		version: "0.0.1"
	}
	
	var areachart = require("areachart");
	var barchart = require("barchart");
	var boxplot = require("boxplot");
	var donut = require("donut");
	var histogram = require("histogram");
	var line = require("line");
	var trellisline = require("trellisline");
	var treemap = require("treemap");
	var scatterplot = require("scatterplot");
	var chart = require("chart");
	
	module.areachart = areachart;
	module.barchart = barchart;
	module.boxplot = boxplot;
	module.donut = donut;
	module.histogram = histogram;
	module.line = line;
	module.trellisline = trellisline;
	module.treemap = treemap;
	module.scatterplot = scatterplot;
	module.chart = chart;
	
	return module;
	
});
