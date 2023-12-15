//import { eventTargetToAsyncIter } from './event-target-to-async-iter';
import { eventTargetToAsyncIter } from 'event-target-to-async-iter';

declare const HTMLRewriter: any;

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		// Polyfill for CustomEvent
		if (!('CustomEvent' in self)) {
			class CustomEvent<T = any> extends Event {
				readonly detail: T;
				constructor(event: string, { detail }: CustomEventInit<T>) {
					super(event);
					this.detail = detail as T;
				}
			}

			Object.defineProperty(self, 'CustomEvent', {
				configurable: false,
				enumerable: false,
				writable: false,
				value: CustomEvent,
			});
		}

		async function consume(stream: ReadableStream) {
			const reader = stream.getReader();
			while (!(await reader.read()).done) {
				/* NOOP */
			}
		}

		const response = await fetch('https://thejenkinscomic.wordpress.com');

		const target = new EventTarget();

		const rewriter = new HTMLRewriter().on('article .wp-block-image img', {
			element(el) {
				target.dispatchEvent(
					new CustomEvent('data', {
						detail: el.getAttribute('src'),
					})
				);
			},
		});

		const data = eventTargetToAsyncIter(target, 'data');

		consume(rewriter.transform(response).body!)
			.catch((e) => data.throw(e))
			.then(() => data.return());

		const sources: string[] = [];
		for await (const i of data) {
			sources.push((i as CustomEvent<string>).detail);
		}

		return new Response(JSON.stringify(sources), {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		});
	},
};
