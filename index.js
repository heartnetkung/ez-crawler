const Crawler = require("crawler");
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const url = require('url');


var cache = {};
var count = 1;
var countWhenDone = 0;
var visitedUrl = new Set();


(function CacheHandling() {
	try {
		cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache.json'), 'utf8'));
	} catch (e) {}
	var start = Date.now();

	const exitHandler = function(options, err) {
		fs.writeFileSync(path.join(__dirname, 'cache.json'), JSON.stringify(cache, null, 2));
		console.log('execution time: ' + Math.floor((Date.now() - start) / 1000) + 's');
		if (err) console.log(err.stack);
		if (options.exit) process.exit();
	}

	process.on('exit', exitHandler.bind(null, { cleanup: true }));
	process.on('SIGINT', exitHandler.bind(null, { exit: true }));
	process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
})();


exports.crawl = function(options, handler) {
	if (!options.initUrl)
		throw new Error('missing initUrl');
	if (!options.contentRipper)
		throw new Error('missing contentRipper');
	if (!options.dataUrlFilter)
		throw new Error('missing urlFilter');

	var maxConnections = options.maxConnections || 10;
	var maxPages = options.maxPages || 50;
	var initUrl = options.initUrl;
	var contentRipper = options.contentRipper;

	var dataUrlFilter = options.dataUrlFilter
	if (options.dataUrlFilter instanceof RegExp)
		(a) => options.dataUrlFilter.test(a);
	var listingUrlFilter = options.listingUrlFilter || (() => false);
	if (listingUrlFilter instanceof RegExp)
		listingUrlFilter = (a) => options.listingUrlFilter.test(a);

	var cb = function(err, res, done) {
		if (err)
			return done(err);
		var $ = res.$;
		var uri = res.options.uri;
		var urls = _.uniq(_.compact(_.map($('a[href]'), function(a) {
			var theUrl = url.resolve(initUrl, $(a).attr('href'));
			if (!dataUrlFilter(theUrl) && !listingUrlFilter(theUrl))
				return null;
			var parts = url.parse(theUrl);
			parts.hash = null;
			return url.format(parts);
		})));
		var content = dataUrlFilter(uri) ? contentRipper($, uri) : null;
		dataHandler(uri, urls, content);
		done();
	};

	var dataHandler = function(currentUrl, links, content) {
		for (var i = 0, ii = links.length; i < ii; i++) {
			if (count >= maxPages)
				break;

			var newUrl = links[i];
			var newUrlPath = url.parse(newUrl).path;
			if (visitedUrl.has(newUrlPath))
				continue;
			visitedUrl.add(newUrlPath);

			if (dataUrlFilter(newUrl))
				count++;

			var next = cache[newUrl];
			if (!next)
				crawler.queue(newUrl);
			else
				setImmediate(dataHandler, newUrl, next.links, next.content);
		}

		console.log([++countWhenDone, '/', maxPages, ' ', decodeURIComponent(currentUrl)].join(' '));
		if (!cache[currentUrl])
			cache[currentUrl] = { links, content };
		handler(content, currentUrl);
	};

	var crawler = new Crawler({ maxConnections, callback: cb });
	visitedUrl.add(url.parse(initUrl).path);
	crawler.queue(initUrl);
};


exports.resetCache = function() {
	cache = {};
};
