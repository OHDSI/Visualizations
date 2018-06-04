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

Running the Optimizer and Publishing to NPM Registry
----------------------------------------------------

### Build Steps

In order to minify/optimize the javascript libarry, you will need to perform an npm install:

```bash
npm install
```

The package.json file contans scripts to build the files. To run the build scripts, execute:

```bash
npm run build
```

This will build and minify the library. To files will be generated in dist: atlascharts.js and atlascharts.min.js. The min.js file is the concatinated libary that has been run throguh the google closure compiler.

### Publishing 

After new commits are added to master, and the libary is ready for a new version to be published to the NPM registry, the following commands will increment the version and publish to the NPM registry:

```bash
npm version --no-git-tag-version [{verson number} | major | minor | patch] # use major or minor based on the type of change for this relase.
npm publish --access public # this is a scoped package to @ohdsi and therefore must specify that this should publish public.
```
Note the ```--no-git-tag-version``` indicates that the npm should not create a git tag.  Tagging versions happens during release time out of github.



Libary Contents
---------------

### Modules

The following plots are supported by the visualization library:

- aster
- line
- boxplot
- histogram
- barchart
- doughnut (piechart)
- areachart
- trellisline
- treemap

