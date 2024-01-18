import { Feed, FeedOptions, Item } from 'feed';
import { TheJenkinsComic } from './parser/thejenkinscomic';
import { SafelyEndangered } from './parser/safely-endangered';

const parsers = {
	thejenkinscomic: TheJenkinsComic,
	safelyendangered: SafelyEndangered,
};

function generateFeedResponse(rssOptions: FeedOptions, comics: Item[]) {
	const feed = new Feed(rssOptions);

	comics.forEach((comic) => {
		feed.addItem(comic);
	});

	return new Response(feed.rss2(), {
		headers: {
			'Content-Type': 'application/rss+xml',
			'Cache-Control': 'max-age=900',
		},
	});
}

export default {
	async fetch(request) {
		const requestUrl = new URL(request.url);
		const cache = await caches.open('comics');
		const cacheResponse = await cache.match(requestUrl);

		const urlSegments = new URL(request.url).pathname.split('/').slice(1);
		const urlRootSegment = urlSegments[0].toLowerCase();

		// If the param is not a valid parser, return 404
		if (!urlRootSegment || !parsers.hasOwnProperty(urlRootSegment)) {
			return new Response('Not found', {
				status: 404,
			});
		}

		if (cacheResponse) {
			// Cache hit
			return cacheResponse;
		} else {
			// Cache miss
			const comics = await parsers[urlRootSegment].get();
			const rssOptions = parsers[urlRootSegment].rssOptions;
			const feedResponse = generateFeedResponse(rssOptions, comics);
			cache.put(requestUrl, feedResponse.clone());
			return feedResponse;
		}
	},
};
