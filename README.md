Visualizations
==============

[Under development]  Visualizations is a collection of JavaScript modules to support D3 visualizations in web-based applications

Getting Started
---------------

Clone a copy of the main repo by running:

```bash
git clone git://github.com/ohdsi/vizualizations
```

Point a local HTTP server to the root of the repository (IIS, Node Express, etc)

Open a browser to the examples under the /examples folder.

Developing and Debugging
------------------------

The examples are configured using RequireJS and reference CDN hosted libraries for D3, jQuery and others.  To run the examples, just open one of the examples, set braekpoints and edit-reload to see changes.

There are no development dependencies required for updating code, although npm is used to version and publish the package.


### Modules

The following plots are supported by the visualization library:

- line
- boxplot
- histogram
- barchart
- doughnut (piechart)
- areachart
- scatterplot
- zoomscatter
- trellisline
- treemap

