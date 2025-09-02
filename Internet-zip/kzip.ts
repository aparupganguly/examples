#!/usr/bin/env ts-node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { URL } from "url";
import { Hyperbrowser } from "@hyperbrowser/sdk";

dotenv.config();

type KnowledgeShard = {
	url: string;
	scrapedAt: string;
	title: string;
	summary: string;
	keyPoints: string[];
	outboundLinks: string[];
	rawSize: number;
	compressedSize: number;
};

async function run(): Promise<void> {
	const program = new Command();
	program
		.arguments("<url>")
		.option("--out <file>", "Output file name (must end with .kzip.json)")
		.description("Scrape a URL with Hyperbrowser and save a compressed knowledge shard (.kzip.json)")
		.action(async (urlArg: string, opts: { out?: string }) => {
			const apiKey = process.env.HYPERBROWSER_API_KEY;
			if (!apiKey) {
				console.error("Error: HYPERBROWSER_API_KEY is missing. Set it in .env or env vars.");
				process.exit(1);
			}

			let targetUrl: string;
			try {
				const u = new URL(urlArg);
				targetUrl = u.toString();
			} catch {
				console.error("Error: Invalid URL provided.");
				process.exit(1);
			}

			const client = new Hyperbrowser({ apiKey });

			try {
				// 1) Scrape
				const scrape = await client.scrape.startAndWait({
					url: targetUrl,
					scrapeOptions: { formats: ["html"] },
				});

				const rawHtml: string | undefined = (scrape as any)?.data?.html;
				if (!rawHtml) throw new Error("Scrape returned no HTML.");
				const rawSize = Buffer.byteLength(rawHtml, "utf8");
				console.log(`✔ Scraped ${targetUrl}`);

				// 2) Compress (semantic extraction)
				const extractSchema = {
					type: "object",
					required: ["title", "summary", "keyPoints", "outboundLinks"],
					properties: {
						title: { type: "string" },
						summary: { type: "string" },
						keyPoints: { type: "array", items: { type: "string" } },
						outboundLinks: { type: "array", items: { type: "string" } },
					},
				};

				const extract = await client.extract.startAndWait({
					urls: [targetUrl],
					prompt:
						"Summarize this page into 1 paragraph and 5 key bullet points suitable for storage in a knowledge base. Return JSON with fields: title, summary, keyPoints (array of 5 strings), outboundLinks (all absolute links on page).",
					schema: extractSchema as any,
				});

				const data = (extract as any)?.data || {};
				const title: string = data.title || "";
				const summary: string = data.summary || "";
				const keyPoints: string[] = Array.isArray(data.keyPoints) ? data.keyPoints : [];
				const linksRaw: string[] = Array.isArray(data.outboundLinks) ? data.outboundLinks : [];
				const outboundLinks = Array.from(new Set(linksRaw)).sort();

				const shard: KnowledgeShard = {
					url: targetUrl,
					scrapedAt: new Date().toISOString(),
					title,
					summary,
					keyPoints,
					outboundLinks,
					rawSize,
					compressedSize: 0,
				};

				console.log("✔ Compressed into knowledge shard");

				// 3) Output
				const defaultOut = `${new URL(targetUrl).hostname}.kzip.json`;
				const outPath = path.resolve(opts.out || defaultOut);
				if (opts.out && !opts.out.endsWith(".kzip.json")) {
					console.error("Error: --out must end with .kzip.json");
					process.exit(1);
				}

				fs.writeFileSync(outPath, JSON.stringify(shard, null, 2), "utf8");
				const compressedSize = fs.statSync(outPath).size;
				shard.compressedSize = compressedSize;
				fs.writeFileSync(outPath, JSON.stringify(shard, null, 2), "utf8");

				const ratio = (shard.rawSize / shard.compressedSize).toFixed(1);
				console.log(`✔ Saved as ${path.basename(outPath)} (compression ratio: ${ratio}x)`);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				console.error(`Error: ${message}`);
				process.exit(1);
			}
		});

	await program.parseAsync(process.argv);
}

run().catch((err) => {
	const message = err instanceof Error ? err.message : String(err);
	console.error(`Error: ${message}`);
	process.exit(1);
});



