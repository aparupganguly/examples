import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import { z } from "zod";
import * as fs from "fs";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CitySchema = z.object({
  city: z.string(),
  country: z.string(),
  population: z.number(),
  rank: z.number(),
});

const ResponseSchema = z.object({ cities: z.array(CitySchema) });

const SYSTEM_PROMPT = `You are a helpful assistant that can extract information from markdown and convert it into a structured format.
Ensure the output adheres to the following:
- city: The name of the city
- country: The name of the country
- population: The population of the city
- rank: The rank of the city

Provide the extracted data as a JSON object. Parse the Markdown content carefully to identify and categorize the city details accurately.
`;

const main = async () => {
  console.log("Started scraping");
  const scrapeResult = await client.scrape.startAndWait({
    url: "https://en.wikipedia.org/wiki/List_of_largest_cities",
    scrapeOptions: {
      // Only return the markdown for the scraped data
      formats: ["markdown"],
      // Only include the table element with class `wikitable` from the page
      includeTags: [".wikitable"],
      // Remove any img tags from the table
      excludeTags: ["img"],
    },
  });
  console.log("Finished scraping");
  if (scrapeResult.status === "failed") {
    console.error("Scrape failed:", scrapeResult.error);
    return;
  }
  if (!scrapeResult.data?.markdown) {
    console.error("No markdown data found in the scrape result");
    return;
  }

  console.log("Extracting data from markdown");
  const completion = await openai.responses.create({
    model: "o3-pro-2025-06-10",
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT + "\n\nProvide your response in the following JSON format:\n" + JSON.stringify({
          cities: [
            {
              city: "string",
              country: "string", 
              population: "number",
              rank: "number"
            }
          ]
        }, null, 2),
      },
      { role: "user", content: scrapeResult.data.markdown },
    ],
  });
  console.log("Finished extracting data from markdown");

  const cities = completion.output;

  const data = JSON.stringify(cities, null, 2);
  fs.writeFileSync("cities.json", data);
};

main();