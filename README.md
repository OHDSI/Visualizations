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
- trellisline
- treemap

Changelog
---------

### Part 1

1. Added the existing charting library as a single file to the repository.
2. Created a few examples to demonstrate the libary use.

### Part 2

1. Refactored library into individual module files, which are wrapped together in a package.
2. Added additional examples for the remaining plots. Scatterplot was not included.
3. Although crossfilter and ohdsi.util are still in the repository, these are no longer dependencies for the refactored charts.
4. A few bugfixes were made while creating some of the examples.  Issues still remain related to tooltips.

