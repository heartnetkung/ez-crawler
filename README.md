# ez-crawler

## Install
```
npm install --save heartnetkung/ez-crawler
```

## Features
- local page cache
- easy to use (1 command)
- jquery (cheerio) for page data extraction
- auto crawl non-visited pages if they match regexp or specified function
- intended for wikipedia crawling or forum crawling
- includes console.log progress

## API

### crawler.crawl(options, pageHandler)
- options
  - initUrl (required) string
  - contentRipper (required) function(jQuery) return string
    - specify how to rip data you want from the page
  - dataUrlFilter (required) regexp or function(url) return true/false
    - specify how your url of data page look like
  - listingUrlFilter regexp or function(url) return true/false
    - similar to above but listing page is a page with no content, for example forum listing
    - these pages won't be counted toward max pages
  - maxPages int
  - maxConnections int
- pageHandler(content, url)

### crawler.resetCache()

## Example 
```js
const crawler = require('ez-crawler');
const url = require('url');

crawler.crawl({
	initUrl: 'https://th.wikipedia.org/wiki/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1',
	contentRipper: function($) {
		return $('#mw-content-text').text()
			.replace(/([ \t])[ \t]*/g, '$1')
			.replace(/\n\n*/g, '\n')
			.replace(/^\s*[ก-ฮ]\s*$/gm, '')
			.replace(/^↑[^\n]+$/gm, '');
	},
	dataUrlFilter: function(theUrl) {
		var parts = url.parse(theUrl);
		if (parts.hostname !== 'th.wikipedia.org')
			return false;
		var path = decodeURI(parts.path);
		return /^\/wiki\/([^.:]+)$/.test(path) && !/\/wiki\/หน้าหลัก|\/wiki\/PubMed/.test(path);
	},
	maxPages: 500,
	maxConnections: 10
}, function(content, pageUrl) {
	//do stuffs
});
```