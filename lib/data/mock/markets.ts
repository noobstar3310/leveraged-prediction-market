/**
 * Fabricated market data.
 *
 * EVERY figure in this file is invented — questions, probabilities, volumes and
 * close dates. Nothing here reflects a real market or a real price. The UI
 * surfaces this via `MarketPage.isMockData`; do not remove that label while this
 * adapter is the one in use.
 *
 * Prices are deliberately spread across the contested middle. Real prediction
 * market catalogues are dominated by near-resolved questions sitting at 0% or
 * 100%, which makes for a dull and untestable browse screen.
 */

import type { Market, MarketCategory } from "@/lib/data/clients";

/**
 * [question, category, yesPrice, volume24h (thousands), volumeTotal (thousands), closesAt]
 */
type Seed = readonly [string, MarketCategory, number, number, number, string];

const SEEDS: Seed[] = [
  // Politics
  ["Will the Democrats win the 2028 presidential election?", "Politics", 0.48, 412, 18400, "2028-11-07"],
  ["Will Trump complete his term through January 2029?", "Politics", 0.81, 268, 12250, "2029-01-20"],
  ["Will there be a US government shutdown before January 2027?", "Politics", 0.34, 189, 3420, "2027-01-01"],
  ["Will JD Vance announce a 2028 presidential run?", "Politics", 0.62, 143, 2870, "2027-12-31"],
  ["Will the UK hold a general election before 2028?", "Politics", 0.27, 96, 1980, "2028-01-01"],
  ["Will Kamala Harris run for California governor?", "Politics", 0.41, 74, 1240, "2026-12-31"],
  ["Will the US Supreme Court gain a new justice in 2027?", "Politics", 0.19, 61, 1655, "2027-12-31"],
  ["Will Congress pass immigration reform before 2028?", "Politics", 0.12, 52, 2110, "2028-01-01"],
  ["Will AOC announce a Senate run?", "Politics", 0.38, 88, 1470, "2027-06-30"],
  ["Will France's government collapse before July 2027?", "Politics", 0.29, 44, 920, "2027-07-01"],
  ["Will Germany hold snap elections in 2027?", "Politics", 0.16, 37, 780, "2027-12-31"],
  ["Will Canada's prime minister change before 2028?", "Politics", 0.33, 41, 1030, "2028-01-01"],

  // Crypto
  ["Will Bitcoin trade above $150,000 before 2027?", "Crypto", 0.44, 894, 26700, "2027-01-01"],
  ["Will Ethereum flip Bitcoin by market cap?", "Crypto", 0.06, 218, 9840, "2027-12-31"],
  ["Will Solana trade above $500 in 2027?", "Crypto", 0.31, 476, 8120, "2027-12-31"],
  ["Will a spot XRP ETF be approved before July 2027?", "Crypto", 0.57, 331, 6490, "2027-07-01"],
  ["Will Bitcoin drop below $40,000 in 2026?", "Crypto", 0.14, 287, 5310, "2027-01-01"],
  ["Will Solana sustain 100k TPS before 2028?", "Crypto", 0.22, 164, 2960, "2028-01-01"],
  ["Will Coinbase be acquired before 2028?", "Crypto", 0.08, 79, 1820, "2028-01-01"],
  ["Will Tether lose its dollar peg for 24 hours before 2028?", "Crypto", 0.11, 132, 4270, "2028-01-01"],
  ["Will a US state hold Bitcoin in its reserves by 2027?", "Crypto", 0.49, 203, 3940, "2027-12-31"],
  ["Will Ethereum staking yield exceed 6% in 2027?", "Crypto", 0.26, 91, 1560, "2027-12-31"],
  ["Will total DeFi TVL exceed $500B before 2028?", "Crypto", 0.37, 118, 2340, "2028-01-01"],
  ["Will a major L2 suffer a $100M+ exploit in 2027?", "Crypto", 0.42, 156, 3180, "2027-12-31"],

  // Economics
  ["Will the Fed cut rates at the September 2026 meeting?", "Economics", 0.66, 1240, 14600, "2026-09-17"],
  ["Will US inflation exceed 4% in any month of 2027?", "Economics", 0.28, 342, 7180, "2027-12-31"],
  ["Will the US enter a recession before 2028?", "Economics", 0.39, 528, 19300, "2028-01-01"],
  ["Will US unemployment exceed 5.5% before 2028?", "Economics", 0.31, 216, 5470, "2028-01-01"],
  ["Will the S&P 500 close above 8,000 in 2027?", "Economics", 0.46, 397, 8890, "2027-12-31"],
  ["Will gold trade above $4,000 per ounce before 2028?", "Economics", 0.53, 284, 6120, "2028-01-01"],
  ["Will the ECB cut rates below 1% in 2027?", "Economics", 0.24, 137, 2680, "2027-12-31"],
  ["Will oil close above $120 per barrel in 2027?", "Economics", 0.18, 172, 4310, "2027-12-31"],
  ["Will the yen strengthen past 120 per dollar before 2028?", "Economics", 0.21, 108, 2240, "2028-01-01"],
  ["Will US national debt exceed $42 trillion before 2028?", "Economics", 0.71, 149, 3070, "2028-01-01"],

  // Geopolitics
  ["Will the Ukraine ceasefire hold through 2027?", "Geopolitics", 0.36, 618, 22400, "2027-12-31"],
  ["Will China and Taiwan have a military confrontation before 2028?", "Geopolitics", 0.13, 445, 16800, "2028-01-01"],
  ["Will NATO admit a new member before 2028?", "Geopolitics", 0.29, 127, 3360, "2028-01-01"],
  ["Will sanctions on Russia be materially eased in 2027?", "Geopolitics", 0.23, 198, 5940, "2027-12-31"],
  ["Will Israel and Saudi Arabia normalize relations before 2028?", "Geopolitics", 0.44, 231, 7250, "2028-01-01"],
  ["Will North Korea conduct a nuclear test in 2027?", "Geopolitics", 0.32, 114, 2810, "2027-12-31"],
  ["Will the Strait of Hormuz close to shipping in 2027?", "Geopolitics", 0.07, 267, 8430, "2027-12-31"],
  ["Will India and Pakistan hold formal peace talks in 2027?", "Geopolitics", 0.26, 63, 1390, "2027-12-31"],
  ["Will the EU admit a new member state before 2029?", "Geopolitics", 0.17, 71, 1620, "2029-01-01"],
  ["Will a new UN Security Council permanent seat be created?", "Geopolitics", 0.04, 39, 1140, "2029-12-31"],

  // Tech
  ["Will OpenAI release GPT-6 before July 2027?", "Tech", 0.58, 703, 11900, "2027-07-01"],
  ["Will Apple ship a foldable iPhone before 2028?", "Tech", 0.47, 386, 7640, "2028-01-01"],
  ["Will Nvidia's market cap exceed $6 trillion in 2027?", "Tech", 0.35, 512, 10300, "2027-12-31"],
  ["Will TikTok be banned in the US before 2028?", "Tech", 0.22, 294, 9180, "2028-01-01"],
  ["Will Level 4 robotaxis operate in 10+ US cities by 2028?", "Tech", 0.41, 177, 4020, "2028-01-01"],
  ["Will Anthropic announce an IPO before 2028?", "Tech", 0.19, 246, 5580, "2028-01-01"],
  ["Will an AI model score above 90% on FrontierMath?", "Tech", 0.33, 158, 3290, "2027-12-31"],
  ["Will Meta discontinue the Quest headset line before 2028?", "Tech", 0.11, 67, 1480, "2028-01-01"],
  ["Will commercial quantum advantage be demonstrated by 2028?", "Tech", 0.16, 92, 2170, "2028-01-01"],
  ["Will Starlink exceed 10 million subscribers in 2027?", "Tech", 0.63, 121, 2530, "2027-12-31"],

  // Sports
  ["Will Real Madrid win the 2027 Champions League?", "Sports", 0.21, 356, 6740, "2027-05-29"],
  ["Will Max Verstappen win the 2027 Formula 1 title?", "Sports", 0.34, 289, 5910, "2027-11-28"],
  ["Will the Chiefs reach Super Bowl LXII?", "Sports", 0.18, 412, 8260, "2028-02-06"],
  ["Will an African nation reach the 2030 World Cup semifinals?", "Sports", 0.27, 84, 1930, "2030-07-15"],
  ["Will Novak Djokovic win another Grand Slam?", "Sports", 0.15, 197, 4480, "2027-09-12"],
  ["Will the Lakers win the 2027 NBA championship?", "Sports", 0.09, 243, 5120, "2027-06-20"],
  ["Will an official sub-2:00 marathon be run before 2029?", "Sports", 0.12, 58, 1270, "2029-01-01"],
  ["Will India win the 2027 Cricket World Cup?", "Sports", 0.31, 168, 3840, "2027-11-14"],

  // Science
  ["Will SpaceX land Starship on the Moon before 2028?", "Science", 0.38, 274, 6380, "2028-01-01"],
  ["Will a human H5N1 case be confirmed in the US in 2027?", "Science", 0.44, 136, 2940, "2027-12-31"],
  ["Will a CRISPR therapy be approved for a common disease by 2028?", "Science", 0.29, 87, 1860, "2028-01-01"],
  ["Will fusion net energy gain be replicated commercially by 2030?", "Science", 0.14, 112, 2610, "2030-01-01"],
  ["Will NASA's Artemis III launch before July 2027?", "Science", 0.26, 193, 4730, "2027-07-01"],
  ["Will an exoplanet biosignature be confirmed before 2030?", "Science", 0.11, 76, 1550, "2030-01-01"],
  ["Will 50 million malaria vaccine doses be delivered in 2027?", "Science", 0.52, 49, 1080, "2027-12-31"],
  ["Will global CO2 emissions decline year-over-year in 2027?", "Science", 0.23, 94, 2280, "2028-03-31"],

  // Culture
  ["Will Grand Theft Auto VI release before July 2027?", "Culture", 0.61, 528, 12400, "2027-07-01"],
  ["Will Taylor Swift announce a new world tour in 2027?", "Culture", 0.48, 217, 4360, "2027-12-31"],
  ["Will a streaming service win NFL Sunday Ticket rights?", "Culture", 0.36, 103, 2190, "2028-01-01"],
  ["Will an AI-generated song top the Billboard Hot 100?", "Culture", 0.17, 148, 3270, "2027-12-31"],
  ["Will Dune: Part Three gross over $1 billion?", "Culture", 0.42, 126, 2680, "2027-12-31"],
  ["Will the Oscars ceremony move off broadcast TV by 2028?", "Culture", 0.13, 64, 1420, "2028-01-01"],
];

function slugify(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Built once at module load. Deterministic — no Date.now(), no randomness — so
 * the same market always renders the same values across server and client.
 */
export const MOCK_MARKETS: Market[] = SEEDS.map(
  ([question, category, yesPrice, volume24k, volumeTotalK, closesAt], index) => ({
    id: `mock-${String(index + 1).padStart(3, "0")}`,
    slug: slugify(question),
    question,
    category,
    yesPrice,
    // Held to 4dp so floating point noise never reaches the formatter.
    noPrice: Number((1 - yesPrice).toFixed(4)),
    volume24h: volume24k * 1_000,
    volumeTotal: volumeTotalK * 1_000,
    closesAt: new Date(`${closesAt}T00:00:00.000Z`).toISOString(),
  }),
);
