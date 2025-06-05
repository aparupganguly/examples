# AI Newsletter Automation 🤖📧

An automated newsletter system that scrapes the latest AI news from top sources, generates personalized content using OpenAI, and sends customized newsletters to subscribers via email.

## 🌟 Features

- **Multi-source Scraping**: Automatically scrapes content from major AI news sources
- **AI-Powered Content Generation**: Uses OpenAI GPT-4 to create engaging newsletter content
- **Personalized Delivery**: Sends customized newsletters to each subscriber
- **Email Integration**: Reliable email delivery through Resend API
- **TypeScript**: Full type safety and modern development experience

## 📰 News Sources

The system automatically scrapes content from:
- [Anthropic News](https://www.anthropic.com/news)
- [OpenAI Blog](https://openai.com/blog)
- [DeepMind Blog](https://deepmind.com/blog)
- [Hacker News Front Page](https://news.ycombinator.com/front)

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or later)
- npm or yarn package manager
- API keys for:
  - Hyperbrowser SDK
  - OpenAI
  - Resend

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd agi-newsletter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
   OPENAI_API_KEY=your_openai_api_key
   RESEND_API_KEY=your_resend_api_key
   ```

4. **Configure subscribers:**
   Edit the `users` array in `trend-newsletter.ts`:
   ```typescript
   const users = [
     { name: "Your Name", email: "your.email@example.com" },
     // Add more subscribers...
   ];
   ```

5. **Run the newsletter:**
   ```bash
   npx ts-node trend-newsletter.ts
   ```

## 🔧 Configuration

### Adding New News Sources

To add new sources, modify the `urls` array:

```typescript
const urls = [
  "https://www.anthropic.com/news",
  "https://openai.com/blog",
  "https://your-new-source.com/news", // Add here
];
```

### Customizing Newsletter Content

Modify the `SYSTEM_PROMPT` to change the newsletter style:

```typescript
const SYSTEM_PROMPT = `Your custom instructions for the AI...`;
```

### Email Customization

Update the email configuration in the Resend section:

```typescript
const emailResponse = await resend.emails.send({
  from: "your-verified-domain@example.com",
  to: user.email,
  subject: "Your Custom Newsletter Title",
  text: personalizedNewsletter,
});
```

## 📋 How It Works

1. **Web Scraping**: The system uses Hyperbrowser SDK to scrape markdown content from configured news sources
2. **Content Processing**: All scraped content is combined and processed
3. **AI Generation**: OpenAI GPT-4 generates a friendly, engaging newsletter from the scraped content
4. **Personalization**: Each newsletter is personalized with the recipient's name
5. **Email Delivery**: Newsletters are sent via Resend to all configured subscribers

## 🔑 API Keys Setup

### Hyperbrowser SDK
1. Visit [Hyperbrowser](https://hyperbrowser.ai)
2. Sign up and get your API key
3. Add to `.env` as `HYPERBROWSER_API_KEY`

### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create an API key
3. Add to `.env` as `OPENAI_API_KEY`

### Resend
1. Visit [Resend](https://resend.com)
2. Sign up and verify your domain
3. Create an API key
4. Add to `.env` as `RESEND_API_KEY`

## 📊 Output Example

```
🔍 Starting to scrape pages...
🌐 Scraping https://www.anthropic.com/news
🌐 Scraping https://openai.com/blog
🌐 Scraping https://deepmind.com/blog
🌐 Scraping https://news.ycombinator.com/front
🤖 Generating newsletter draft with OpenAI...
📧 Sent newsletter to user@example.com: { id: 'email-id' }
📨 All newsletters generated and sent successfully!
```

## 🛠️ Development

### Scripts

```bash
# Run the newsletter
npx ts-node trend-newsletter.ts

# Install dependencies
npm install

# Type checking
npx tsc --noEmit
```

### Dependencies

- `@hyperbrowser/sdk` - Web scraping
- `openai` - AI content generation
- `resend` - Email delivery
- `zod` - Schema validation
- `dotenv` - Environment variables

## 🚨 Important Notes

- **Rate Limits**: Be mindful of API rate limits for all services
- **Email Verification**: Ensure your Resend domain is verified before sending
- **Content Quality**: Monitor generated content for accuracy and tone
- **Error Handling**: The system includes robust error handling for failed scrapes

## 📝 License

MIT License - Feel free to modify and distribute as needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Happy Newslettering!** 🎉
