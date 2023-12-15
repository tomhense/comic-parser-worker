import { Feed, Item } from 'feed';
import { TheJenkinsComic } from './parser/thejenkinscomic';
import { base64Decode } from 'miniflare';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const parsers = {
	thejenkinscomic: TheJenkinsComic,
};

function generateFeedResponse(comics: Item[]) {
	const feed = new Feed(TheJenkinsComic.rssOptions);

	comics.forEach((comic) => {
		feed.addItem(comic);
	});

	return new Response(feed.atom1(), {
		headers: {
			'Content-Type': 'application/atom+xml',
			'Cache-Control': 'max-age=900',
		},
	});
}

async function generateImagePage(comicName: string, id: string, KV: any) {
	const comic = JSON.parse(await KV.get(comicName + '_' + id));

	if (!comic) {
		return new Response('Not found', {
			status: 404,
		});
	}

	const html = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<title>${comic.title}</title>
	</head>
	<body>
		<h1>${comic.title}</h1>
		<span><time datetime="${comic.date}"></span>
		<img src="${comic.link}" />
		<span>${comic.description}</span>
	</body>
</html>
`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html',
			'Cache-Control': 'max-age=3600',
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

			if (urlSegments.length == 1) {
				const comics = await parsers[urlRootSegment].get();
				const comicName: string = parsers[urlRootSegment].comicName;

				// Cache the comics
				for (const comic of comics) {
					const comicKey = comicName + '_' + comic.id;
					await env.COMIC_KV.put(comicKey, JSON.stringify(comic));
				}

				return generateFeedResponse(
					// Overwrite the links to point to the worker
					comics.map((comic: Item) => {
						comic.link = `/${comicName}/${comic.id}`;
						return comic;
					})
				);
			} else if (urlSegments.length == 2) {
				// Special generate html pages for the comic images
				return generateImagePage(urlRootSegment, urlSegments[1], env.COMIC_KV);
			} else {
				// Return 404 for anything else
				return new Response('Not found', {
					status: 404,
				});
			}
		}
	},
};
