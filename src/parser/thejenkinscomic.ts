import * as htmlparser2 from 'htmlparser2';
import * as DomUtils from 'domutils';
import { stripQueryParams } from '../utils';
import { Item, FeedOptions } from 'feed';

export class TheJenkinsComic {
	static url = 'https://thejenkinscomic.wordpress.com';
	static comicName = 'thejenkinscomic';

	static rssOptions: FeedOptions = {
		title: 'The Jenkins Comic',
		description: 'The Jenkins Comic',
		id: TheJenkinsComic.url,
		link: TheJenkinsComic.url,
		language: 'en',
		copyright: '',
		favicon: 'https://secure.gravatar.com/blavatar/dea9800898e3f09f4417b5451588cbe8ef938313dbafc4cd6ffc2eea3f72d65c?s=114',
		updated: new Date(),
		generator: 'The Jenkins Comic',
		feedLinks: {},
		author: {},
	};

	static async get(): Promise<Item[]> {
		const response = await fetch(TheJenkinsComic.url);
		const dom = htmlparser2.parseDocument(await response.text());

		const posts = DomUtils.findAll((elem) => {
			return elem.name === 'article';
		}, dom.childNodes);

		const comics: Item[] = [];

		posts.forEach((post) => {
			let src = DomUtils.findOne((elem) => {
				return elem.name === 'img';
			}, post.children)?.attribs.src;
			src = src ? stripQueryParams(src) : src;

			const titleElement = DomUtils.findOne((elem) => {
				return elem.name === 'h2';
			}, post.children)?.firstChild;

			const title = titleElement ? DomUtils.textContent(titleElement) : null;

			const date = DomUtils.findOne((elem) => {
				return elem.name === 'time';
			}, post.children)?.attribs.datetime;

			const id = src?.split('/')?.pop()?.split('.')[0]; // Basically the filename without the extension

			if (src && title && date) {
				comics.push({
					title: title,
					id: id,
					link: src,
					image: src,
					date: new Date(date),
				});
			}
		});

		return comics;
	}
}
