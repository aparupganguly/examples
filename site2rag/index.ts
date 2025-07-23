import 'dotenv/config'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { Hyperbrowser } from '@hyperbrowser/sdk'
import cheerio from 'cheerio'

function countTokens(text: string) {
  return Math.ceil(text.length / 4)
}

/** Split into chunks ≤ maxTokens */
function chunkText(paragraphs: string[], maxTokens: number) {
  const chunks: { id: number; text: string; tokens: number }[] = []
  let buffer = '', tok = 0, id = 1

  for (const p of paragraphs) {
    const pTok = countTokens(p)
    if (tok + pTok > maxTokens) {
      chunks.push({ id, text: buffer.trim(), tokens: tok })
      id++
      buffer = p
      tok = pTok
    } else {
      buffer += '\n\n' + p
      tok += pTok
    }
  }
  if (buffer) chunks.push({ id, text: buffer.trim(), tokens: tok })
  return chunks
}

async function main() {
  const { url, json, md, maxTokens } = yargs(hideBin(process.argv))
    .option('url', { alias: 'u', type: 'string', demandOption: true })
    .option('json', { type: 'boolean', default: false })
    .option('md',   { type: 'boolean', default: false })
    .option('maxTokens', { type: 'number', default: 1000 })
    .help()
    .parseSync() as {
      url: string
      json: boolean
      md: boolean
      maxTokens: number
    }

  try {
    if (!process.env.HYPERBROWSER_API_KEY) {
      throw new Error('HYPERBROWSER_API_KEY environment variable is required')
    }

    console.log(chalk.cyan(`\n🔍  Scraping ${url} with Hyperbrowser…`))
    
    // Initialize Hyperbrowser client
    const hbClient = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })

    // Use Hyperbrowser's scraping API to get rendered HTML
    const result = await hbClient.scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ['markdown', 'html']
      }
    })

    if (result.error) {
      throw new Error(`Hyperbrowser scraping failed: ${result.error}`)
    }

    console.log(chalk.cyan('🧹  Cleaning & parsing…'))
    
    // Use the markdown content from Hyperbrowser if available, otherwise fall back to HTML parsing
    let text: string
    if (result.data?.markdown) {
      text = result.data.markdown
    } else if (result.data?.html) {
      const $ = cheerio.load(result.data.html)
      // remove boilerplate
      $('nav, header, footer, script, style, noscript').remove()
      text = $('body').text()
    } else {
      throw new Error('No content received from Hyperbrowser')
    }

    // split into paragraphs
    const paras = text
      .split(/\n{2,}/g)
      .map(p => p.trim())
      .filter(p => p.length > 50) // skip tiny lines

    console.log(chalk.cyan(`✂️  Chunking into ≤${maxTokens} tokens…`))
    const chunks = chunkText(paras, maxTokens)

    if (json) {
      console.log(JSON.stringify({
        source: url,
        created: new Date().toISOString(),
        chunks: chunks.map(c => ({
          id: c.id,
          tokens: c.tokens,
          source: url,
          text: c.text
        }))
      }, null, 2))
      return
    }

    if (md) {
      console.log(`# Context Pack for ${url}\n`)
      for (const c of chunks) {
        console.log(`## Chunk ${c.id}  •  ${c.tokens} tokens\n`)
        console.log(c.text + `\n\n> _Source: ${url}_\n`)
      }
      return
    }

    // Default human‐readable table
    console.log(chalk.bold('\nContext Chunks'))
    console.log('───────────────────────────')
    for (const c of chunks) {
      console.log(
        chalk.green(`Chunk ${c.id}`) +
        ` — ${c.tokens} tokens`
      )
    }
    console.log(`\nRun with --md or --json for full output\n`)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(chalk.red('❌ Error during scraping:'), errorMessage)
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err)
  console.error(chalk.red('❌ Error:'), errorMessage)
  process.exit(1)
})