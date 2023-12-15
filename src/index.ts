import { Feed, Item } from 'feed';
import { TheJenkinsComic } from './parser/thejenkinscomic';

const parsers = {
	thejenkinscomic: TheJenkinsComic,
};

function generateFeedResponse(comics: Item[]) {
	const feed = new Feed(TheJenkinsComic.rssOptions);

	comics.forEach((comic) => {
		feed.addItem(comic);
	});

	return new Response(feed.rss2(), {
		headers: {
			'Content-Type': 'application/atom+xml',
			'Cache-Control': 'max-age=900',
		},
	});
}

export default {
	async fetch(request, env) {
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
			return generateFeedResponse(comics);
		}
	},
};
