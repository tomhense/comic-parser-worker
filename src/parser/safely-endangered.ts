import * as htmlparser2 from 'htmlparser2';
import * as DomUtils from 'domutils';
import { Item, FeedOptions } from 'feed';

export class SafelyEndangered {
	static url = 'https://www.webtoons.com/en/comedy/safely-endangered/rss?title_no=352';
	static comicName = 'safelyendangered';

	static rssOptions: FeedOptions = {
		title: 'Safely Endangered',
		description: 'Safely Endangered',
		id: SafelyEndangered.url,
		link: SafelyEndangered.url,
		language: 'en',
		copyright: '',
		updated: new Date(),
		generator: 'Safely Endangered',
		feedLinks: {},
		author: {},
	};

	static async get(): Promise<Item[]> {
		const feedResp = await fetch(SafelyEndangered.url);
		const feedRaw = await feedResp.text();
		const feed = htmlparser2.parseFeed(feedRaw);

		if (!feed) return [];

		const comics: Item[] = [];
		for (const item of feed.items) {
			if (!item.link) return [];

			const cache = await caches.open('comics');
			let response = await cache.match(item.link);
			if (!response) {
				// Cache miss
				response = await fetch(item.link);
				cache.put(item.link, response.clone());
			}

			const dom = htmlparser2.parseDocument(await response.text());
			const imageSources = DomUtils.getElementsByTagName(
				'img',
				DomUtils.getElementById('_imageList', dom.childNodes)!.childNodes,
				false
			).map((elem) => elem.attribs.src);

			let content = '';
			for (const imageSource of imageSources) {
				content += `<img src="${imageSource}" />`;
			}

			comics.push({
				title: item.title || '',
				id: item.id,
				link: item.link || '',
				content: content,
				date: item.pubDate || new Date(),
			});
		}

		console.log(comics);

		return comics;
	}
}
