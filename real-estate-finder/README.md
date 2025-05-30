# US Real Estate Finder

An intelligent real estate bot that automatically finds and extracts property listings across the United States based on your search criteria. The bot uses SERP API to search for relevant real estate websites and Hyperbrowser to extract structured data from those sites.

## 🚀 Get Started in 2 Minutes

Ready to find your next home? This bot does all the heavy lifting for you - no more manually browsing dozens of real estate websites!

## Features

- 🔍 **Automatic Web Search**: No need to manually enter URLs - the bot finds relevant real estate websites for you
- 🏠 **Rent or Buy Options**: Search for both rental properties and homes for sale
- 📊 **Structured Data**: Get organized listings with title, price, location, bedrooms, bathrooms, area, and direct links
- 🌐 **Multi-site Support**: Searches across popular US real estate platforms like Zillow, Apartments.com, Realtor.com, Trulia, Redfin, and more

## Prerequisites

You'll need API keys for:

1. **Hyperbrowser**: Get your API key at [hyperbrowser.ai](https://hyperbrowser.ai) 
2. **SerpAPI**: Sign up at [SerpAPI](https://serpapi.com) to get your search API key

## Setup

1. Clone this repository and install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your API keys:
```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
SERPAPI_KEY=your_serpapi_key_here
```

## Usage

Run the application:

```bash
npx tsx real-estate-bot.ts
```

The bot will prompt you for:

- **Rent or Buy**: Choose whether you're looking for rentals or properties for sale
- **Location**: City and state (e.g., "New York NY", "San Francisco CA", "Austin Texas")
- **Bedrooms**: Number of bedrooms (1, 2, 3, 4, 5+, or Any)
- **Budget**: Optional budget range (e.g., "3000" for $3,000/month rent or "$300k" for purchase)
- **Property Type**: apartment, house, condo, townhouse, studio, or Any

The bot will then:

1. 🔍 Search for relevant real estate websites using your criteria
2. 🌐 Find and validate real estate URLs from trusted US platforms
3. 🤖 Extract structured listing data using Hyperbrowser
4. 📋 Display organized results with all property details

## Example Output

```
🔍 Searching for: 2 bedroom apartment for rent in New York NY under $4000 site:zillow.com OR site:apartments.com...
✅ Found 5 relevant websites. Extracting listings...

🏠 Found 8 listings for rent:

1. Spacious 2BR in Manhattan
   💰 Price: $3,500/month
   📍 Location: Upper East Side, New York
   🛏️  Bedrooms: 2
   🚿 Bathrooms: 1
   📐 Area: 900 sq ft
   🏠 Type: apartment
   🔗 Link: https://...

2. Modern 2-Bedroom Apartment
   💰 Price: $3,200/month
   📍 Location: Brooklyn Heights, New York
   🛏️  Bedrooms: 2
   🚿 Bathrooms: 2
   📐 Area: 1100 sq ft
   🏠 Type: apartment
   🔗 Link: https://...
```

## Supported Real Estate Platforms

- Zillow.com
- Apartments.com
- Rent.com
- Realtor.com
- Trulia.com
- Redfin.com
- Rentals.com
- PadMapper.com
- HotPads.com
- ForRent.com

## 🎯 Start Your Property Search Now!

1. **Get your free API keys**: [Hyperbrowser](https://hyperbrowser.ai) and [SerpAPI](https://serpapi.com)
2. **Clone and setup** this repository (takes 2 minutes)
3. **Run the bot** and find your perfect property!

## API Rate Limits

- **SerpAPI**: Check your plan limits on the SerpAPI dashboard
- **Hyperbrowser**: Check your usage on the Hyperbrowser dashboard

## Troubleshooting

**No listings found?**
- Try different search criteria
- Check if your target location is a valid US city/state
- Verify your API keys are correctly set in the `.env` file

**API errors?**
- Ensure your API keys are valid and have sufficient credits
- Check your internet connection
- Verify the `.env` file is in the correct location

**SERPAPI_KEY error?**
- Make sure you've added `SERPAPI_KEY=your_actual_api_key` to your `.env` file
- Get your free API key from [SerpAPI](https://serpapi.com/manage-api-key)

## Technical Details

The application uses:
- **TypeScript** for type safety
- **Zod** for data validation and schema definition
- **SerpAPI** for web search functionality
- **Hyperbrowser SDK** for intelligent data extraction
- **Inquirer** for interactive command-line prompts

## License

MIT License 