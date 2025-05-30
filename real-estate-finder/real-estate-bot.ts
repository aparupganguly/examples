import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import inquirer from "inquirer";
import { z } from "zod";
import { getJson } from "serpapi";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

// Define the expected schema
const listingSchema = z.object({
  listings: z.array(
    z.object({
      title: z.string(),
      price: z.string(),
      location: z.string().optional(),
      link: z.string().optional(),
      bedrooms: z.string().optional(),
      bathrooms: z.string().optional(),
      area: z.string().optional(),
      propertyType: z.string().optional(),
    })
  ),
});

interface SearchParams {
  location: string;
  bedrooms?: string;
  budget?: string;
  propertyType?: string;
  listingType: string; // rent or buy
}

async function searchRealEstateUrls(params: SearchParams): Promise<string[]> {
  const { location, bedrooms, budget, propertyType, listingType } = params;
  
  // Construct search query for US market
  let query = "";
  if (bedrooms && bedrooms !== "Any") {
    query += `${bedrooms} bedroom `;
  }
  query += `${propertyType || "apartment"} for ${listingType} in ${location}`;
  if (budget) {
    query += ` under $${budget}`;
  }
  
  // Add popular US real estate sites to the search
  query += " site:zillow.com OR site:apartments.com OR site:rent.com OR site:realtor.com OR site:trulia.com OR site:redfin.com";

  console.log(`🔍 Searching for: ${query}`);

  if (!process.env.SERPAPI_KEY) {
    console.error("❌ SERPAPI_KEY environment variable is not set!");
    console.log("Please add SERPAPI_KEY=your_api_key to your .env file");
    console.log("Get your API key from: https://serpapi.com/manage-api-key");
    return [];
  }

  try {
    const response = await getJson({
      engine: "google",
      q: query,
      api_key: process.env.SERPAPI_KEY,
      num: 10, // Get top 10 results
    });

    const urls: string[] = [];
    
    if (response.organic_results) {
      for (const result of response.organic_results) {
        if (result.link && isRealEstateUrl(result.link)) {
          urls.push(result.link);
        }
      }
    }

    return urls.slice(0, 5); // Return top 5 relevant URLs
  } catch (error) {
    console.error("❌ Error searching for URLs:", error);
    return [];
  }
}

function isRealEstateUrl(url: string): boolean {
  const realEstateHosts = [
    'zillow.com',
    'apartments.com',
    'rent.com',
    'realtor.com',
    'trulia.com',
    'redfin.com',
    'rentals.com',
    'padmapper.com',
    'hotpads.com',
    'forrent.com'
  ];
  
  return realEstateHosts.some(host => url.includes(host));
}

async function main() {
  console.log("🏠 Welcome to the US Real Estate Finder!");
  console.log("Find apartments and houses for rent or sale across the United States.\n");

  // Prompt user for search parameters
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "listingType",
      message: "Are you looking to rent or buy?",
      choices: ["rent", "buy"],
      default: "rent",
    },
    {
      type: "input",
      name: "location",
      message: "Enter the location (e.g., 'New York NY', 'San Francisco CA', 'Austin Texas'):",
      validate: (input) => input.trim().length > 0 || "Location is required",
    },
    {
      type: "list",
      name: "bedrooms",
      message: "Select number of bedrooms:",
      choices: ["1", "2", "3", "4", "5+", "Any"],
      default: "Any",
    },
    {
      type: "input",
      name: "budget",
      message: "Enter budget range (optional, e.g., '3000' for $3,000/month or $300k):",
    },
    {
      type: "list",
      name: "propertyType",
      message: "Select property type:",
      choices: ["apartment", "house", "condo", "townhouse", "studio", "Any"],
      default: "apartment",
    },
  ]);

  const searchParams: SearchParams = {
    location: answers.location,
    bedrooms: answers.bedrooms !== "Any" ? answers.bedrooms : undefined,
    budget: answers.budget || undefined,
    propertyType: answers.propertyType !== "Any" ? answers.propertyType : undefined,
    listingType: answers.listingType,
  };

  // Search for relevant URLs
  console.log("🔎 Finding relevant real estate websites...");
  const urls = await searchRealEstateUrls(searchParams);

  if (urls.length === 0) {
    console.log("❌ No relevant real estate websites found. Please try different search criteria.");
    return;
  }

  console.log(`✅ Found ${urls.length} relevant websites. Extracting listings...`);
  
  // Build prompt for Hyperbrowser
  const criteria = `${searchParams.bedrooms ? searchParams.bedrooms + '-bedroom' : ''} ${searchParams.propertyType || 'property'} for ${searchParams.listingType} in ${searchParams.location}${searchParams.budget ? ' within budget of $' + searchParams.budget : ''}`.trim();
  const prompt = `You are an AI real estate listings extractor. From the provided webpage, extract a comprehensive list of real estate listings that match the following criteria: ${criteria}. 

For each listing, extract the following details:
- title: The property title/heading
- price: The ${searchParams.listingType === 'rent' ? 'monthly rental' : 'sale'} price (include currency)
- location: Specific neighborhood/area within the city
- link: Direct URL to the individual listing
- bedrooms: Number of bedrooms (if mentioned)
- bathrooms: Number of bathrooms (if mentioned)
- area: Property area/size in square feet (if mentioned)
- propertyType: Type of property (apartment, house, condo, etc.)

Focus on active listings and ignore advertisements or sponsored content. Extract as many relevant listings as possible from the page.`;

  try {
    const result = await client.extract.startAndWait({
      urls,
      prompt,
      schema: listingSchema,
    });

    const extractedData = result.data as z.infer<typeof listingSchema>;
    
    if (extractedData && extractedData.listings && extractedData.listings.length > 0) {
      console.log(`\n🏠 Found ${extractedData.listings.length} listings for ${searchParams.listingType}:\n`);
      
      extractedData.listings.forEach((listing: any, index: number) => {
        console.log(`${index + 1}. ${listing.title}`);
        console.log(`   💰 Price: ${listing.price}`);
        if (listing.location) console.log(`   📍 Location: ${listing.location}`);
        if (listing.bedrooms) console.log(`   🛏️  Bedrooms: ${listing.bedrooms}`);
        if (listing.bathrooms) console.log(`   🚿 Bathrooms: ${listing.bathrooms}`);
        if (listing.area) console.log(`   📐 Area: ${listing.area}`);
        if (listing.propertyType) console.log(`   🏠 Type: ${listing.propertyType}`);
        if (listing.link) console.log(`   🔗 Link: ${listing.link}`);
        console.log("");
      });
    } else {
      console.log("❌ No listings found matching your criteria. Try adjusting your search parameters.");
    }
  } catch (error) {
    console.error("❌ Error during extraction:", error);
  }
}

main();