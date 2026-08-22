import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Protocol · Leveraged",
  description:
    "How the on-chain program is intended to work — what is settled, and what is still open.",
};

/**
 * Protocol design reference.
 *
 * Static and server-rendered — no interactivity beyond anchor links, so nothing
 * here needs to be a Client Component.
 *
 * Every section carries a status chip. For a protocol that is mostly intent,
 * certainty IS the information: without it a proposal reads as a description of
 * something that exists. The only numbered list is the lifecycle, because that
 * is the only content where order actually carries meaning.
 */
export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6">
      <header className="border-b border-hairline pb-8">
        <p className="text-[11px] tracking-[0.14em] text-faint uppercase">
          Protocol design · BNB Chain
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Leveraged Outcomes Protocol
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">
          Binary prediction markets with perpetual-style leverage, settled in
          USDC. This describes how the on-chain program is intended to work — the
          parts that are settled, and the parts that are still genuinely open.
        </p>
        <p className="mt-7 max-w-[68ch] rounded-md border border-warn px-4 py-3 text-sm text-foreground">
          <strong className="text-warn">Nothing here is deployed.</strong> No
          on-chain contract exists yet. Market data is live from predict.fun on
          BNB Chain, but every position, price fill and payout is simulated in
          the browser — no order is routed and no money moves. The margin maths
          lives in a tested TypeScript module meant to become this
          contract&apos;s specification. Treat every section as intent, not
          description.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-4 text-[11px] tracking-[0.14em] text-faint uppercase">
            Contents
          </p>
          <nav aria-label="Document sections" className="flex flex-col">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="border-l-2 border-transparent py-1.5 pl-3 text-sm text-muted transition-colors hover:border-border hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-14">
          <Section id="primitive" title="The primitive" status="decided">
            <P>
              Every market is a single yes/no question with a fixed close time. It
              mints two complementary share types. A share pays exactly{" "}
              <strong className="font-medium text-foreground">1 USDC</strong> if
              its side resolves true and <strong>0</strong> if it doesn&apos;t, so
              the two prices always sum to one.
            </P>
            <P>
              A price is therefore a probability. A YES share at <Code>0.64</Code>{" "}
              means the market prices the outcome at 64%, and the NO share
              necessarily costs <Code>0.36</Code>.
            </P>
            <P>
              Leverage changes only how many shares a given amount of collateral
              controls. It does not change what a share is or what it pays.
            </P>
            <Callout title="Why binary, and only binary">
              Multi-outcome markets need a different collateral model and a
              different liquidation rule, and every additional outcome multiplies
              the ways a position can be mispriced. Scalar and categorical markets
              are deliberately out of scope until the binary case is safe.
            </Callout>
          </Section>

          <Section id="accounts" title="On-chain accounts" status="open" statusLabel="Shapes proposed">
            <P>
              Four account types. Field names are indicative — the shapes are
              settled, the exact layouts are not.
            </P>
            <div className="grid gap-4 sm:grid-cols-2">
              <Account
                name="Market"
                fields={["question_hash", "closes_at", "mark_price", "oracle", "state"]}
              >
                The question, its close time, its resolution source, and the
                current mark. One per market, PDA-derived from a question hash.
              </Account>
              <Account
                name="Position"
                fields={["owner", "market", "side", "collateral", "leverage_bps", "entry_price"]}
              >
                One trader&apos;s exposure to one market: side, collateral posted,
                effective leverage and entry price. Everything needed to recompute
                liquidation without trusting a client.
              </Account>
              <Account
                name="Collateral vault"
                fields={["mint (USDC)", "authority (PDA)", "total_collateral"]}
              >
                A single USDC token account per market holding all posted
                collateral. Withdrawals are only ever authorised by the program, on
                close, liquidation or settlement.
              </Account>
              <Account name="Insurance fund" fields={["balance", "high_water"]}>
                Absorbs the shortfall when a liquidation fills worse than the
                bankruptcy price. Funded by a share of trading fees.
              </Account>
            </div>
            <P>
              <strong className="font-medium text-foreground">
                USDC is the only settlement asset.
              </strong>{" "}
              Collateral, position size, PnL and payouts are all denominated in it.
              BNB is used exclusively for transaction fees — it is never traded
              and never posted as margin.
            </P>
          </Section>

          <Section id="lifecycle" title="Market lifecycle" status="decided" statusLabel="Sequence decided">
            <P>
              The order matters and each step gates the next, which is why these
              are numbered.
            </P>
            <ol className="flex flex-col">
              {LIFECYCLE.map((step, i) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t border-hairline py-4 last:border-b"
                >
                  <span className="numeric pt-0.5 text-xs text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="margin" title="Margin & liquidation" status="decided" statusLabel="Specified & tested">
            <P>
              This is the one part that already exists as running, tested code. The
              program is expected to reproduce these results exactly.
            </P>
            <pre className="numeric overflow-x-auto rounded-md border border-hairline bg-well p-4 text-xs leading-relaxed text-foreground">
{`notional     = collateral × leverage
shares       = notional ÷ price of your side

liquidation  (YES) = entry × (1 − 1/L)
liquidation  (NO)  = entry + (1 − entry) ÷ L`}
            </pre>
            <P>
              Liquidation is always expressed as a YES probability whatever side is
              held, so it is directly comparable to the mark. At 1× neither side
              can be liquidated before resolution.
            </P>

            <h3 className="mt-2 text-xl font-semibold text-foreground">
              Tiered margin
            </h3>
            <P>
              Maximum leverage falls as position size grows, and a position
              spanning tiers is charged each tier&apos;s rate on its own slice —
              the same mechanic as income tax brackets. Without it, offering 20× at
              any size would assume liquidity that does not exist.
            </P>
            <Table
              head={["Position up to", "Max leverage", "Margin rate"]}
              rows={[
                ["10,000 USDC", "20×", "5%"],
                ["50,000 USDC", "10×", "10%"],
                ["250,000 USDC", "5×", "20%"],
                ["1,000,000 USDC", "2×", "50%"],
                ["above", "1×", "100%"],
              ]}
              numericFrom={0}
            />
            <P>
              A trader selecting 20× with 10,000 USDC of collateral is charged
              across three tiers and ends up at{" "}
              <strong className="font-medium text-foreground">
                7.75× effective
              </strong>
              . Every downstream figure — liquidation price above all — uses the
              effective value. Quoting the requested leverage would place the
              liquidation line closer than reality, which is the dangerous
              direction to be wrong in.
            </P>
            <Callout title="Maintenance margin is not yet implemented">
              The current maths liquidates at exactly zero equity — the point a
              real venue calls the <em>bankruptcy price</em>. Production venues
              close positions while a few percent of collateral remains, because
              unwinding takes time and does not happen at the quoted price. Until a
              maintenance buffer exists, every liquidation price this system
              reports is the optimistic bound.
            </Callout>
          </Section>

          <Section id="liquidity" title="Pricing & liquidity" status="open">
            <P>
              Where the price comes from is the largest undecided piece of the
              design. Two viable directions, and they are not compatible.
            </P>
            <Table
              head={["Approach", "Gets you", "Costs you"]}
              rows={[
                [
                  "Automated market maker — LMSR or a constant-product curve seeded by the protocol",
                  "Tradeable prices from day one with no external participants. Deterministic, cheap to compute on-chain.",
                  "The protocol is counterparty to every trade and carries directional risk. Curve parameters are hard to tune and expensive to change later.",
                ],
                [
                  "Central limit order book — on-chain or via an off-chain matching engine",
                  "Real price discovery, tight spreads once makers arrive, and a familiar surface for derivatives traders.",
                  "Needs market makers who do not exist yet. An empty book is worse than a mediocre curve — it looks broken and cannot be traded.",
                ],
              ]}
            />
            <P>
              The pragmatic reading is that a launch needs an AMM and a mature
              venue needs a book — but building the AMM first and migrating later
              means migrating open positions, which is its own hazard. This
              decision should be made before the program is written, not after.
            </P>
          </Section>

          <Section id="resolution" title="Resolution" status="open">
            <P>
              Prediction markets fail at resolution far more often than they fail
              at pricing. An ambiguous question with real money behind it is the
              most expensive bug this protocol can ship.
            </P>
            <ul className="flex max-w-[68ch] list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-faint">
              <li>
                <strong className="font-medium text-foreground">
                  Optimistic oracle.
                </strong>{" "}
                A proposer posts an outcome with a bond; anyone may dispute within
                a window by matching it; disputes escalate to a vote.
                Permissionless and battle-tested elsewhere, but slow and it needs a
                credible final arbiter.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Designated resolver.
                </strong>{" "}
                Each market names its source at creation, and a keeper reports it.
                Fast and simple, but centralised and only as good as the named
                source.
              </li>
              <li>
                <strong className="font-medium text-foreground">Hybrid.</strong> A
                designated resolver for well-specified, machine-readable questions
                — a price at a timestamp, a scheduled result — escalating to an
                optimistic process only when disputed.
              </li>
            </ul>
            <P>
              Whichever is chosen, the resolution source must be committed at
              market creation and be immutable afterwards. A resolution rule that
              can be edited after positions exist is not a rule.
            </P>
          </Section>

          <Section id="gap" title="The gap problem" status="open" statusLabel="Unsolved">
            <P>
              This is the risk most specific to leveraged prediction markets, and
              the one most likely to cause a loss the protocol has to absorb.
            </P>
            <P>
              A perpetual future on an asset trades continuously, so prices slide
              and a liquidation engine usually finds fills near the trigger.{" "}
              <strong className="font-medium text-foreground">
                A prediction market resolves.
              </strong>{" "}
              News lands and the price moves from 0.64 to 0.99 with nothing traded
              in between. A 20× position is not liquidated at 0.608 — it is skipped
              straight past, and the difference falls on the insurance fund or on
              other traders.
            </P>
            <P>
              The exposure is worst precisely when volume is highest: the hours
              around a resolution event.
            </P>
            <Callout title="Proposal: leverage that decays toward resolution">
              <span className="block">
                Cap maximum leverage as a function of time remaining — the full 20×
                while a market is months out and drifting, materially less in the
                final days, and near 1× in the closing hours. Enforced by the
                program, shown in the interface as a narrowing corridor.
              </span>
              <span className="mt-3 block">
                It prices the risk where the risk actually is, rather than applying
                one static limit to a market whose behaviour changes completely as
                it approaches settlement. It is also a mechanic no comparable venue
                currently ships.
              </span>
            </Callout>
            <P>
              Alongside it, the conventional defences still apply and none are
              built: a maintenance-margin buffer, partial rather than
              all-or-nothing liquidation, an insurance fund with a public balance,
              and auto-deleveraging as the last resort when the fund is exhausted.
            </P>
          </Section>

          <Section id="fees" title="Fees & incentives" status="open" statusLabel="Structure only">
            <P>
              The shape is settled; no rates have been chosen, and none should be
              quoted until the liquidity model is decided — the two are coupled.
            </P>
            <ul className="flex max-w-[68ch] list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-faint">
              <li>
                <strong className="font-medium text-foreground">Trading fee</strong>{" "}
                on notional at open and close, split between the insurance fund and
                the protocol treasury.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Liquidation fee
                </strong>{" "}
                paid to whoever calls the instruction — this is what makes
                liquidation permissionless and timely rather than a privileged role.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  Market creation bond
                </strong>
                , returned on clean resolution and forfeited on an ambiguous or
                unresolvable question.
              </li>
              <li>
                <strong className="font-medium text-foreground">
                  No funding rate.
                </strong>{" "}
                These markets have a terminal date and settle at 0 or 1, so there
                is no perpetual anchor to maintain. This is a genuine
                simplification relative to perps, not an omission.
              </li>
            </ul>
          </Section>

          <Section id="status" title="Decided vs open" status="none" statusLabel="Summary">
            <P>
              Read this as the honest state of the design. Anything marked open is
              a decision that has to be made before a line of Rust is written.
            </P>
            <div className="overflow-x-auto rounded-md border border-hairline">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-wider text-faint uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">Area</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ROWS.map(([area, status, label, note]) => (
                    <tr key={area} className="border-t border-hairline align-top">
                      <td className="px-4 py-3 text-foreground">{area}</td>
                      <td className="px-4 py-3">
                        <Chip status={status as ChipStatus}>{label}</Chip>
                      </td>
                      <td className="px-4 py-3 text-muted">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <footer className="max-w-[68ch] border-t border-hairline pt-6 text-sm text-faint">
            Companion documents in the repository: <Code>LEVERAGE.md</Code> for the
            margin mathematics with worked examples, <Code>DESIGN.md</Code> for the
            interface system, and <Code>CLAUDE.md</Code> for current build status.
            Where this page and the code disagree, the code is correct.
          </footer>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "primitive", label: "The primitive" },
  { id: "accounts", label: "On-chain accounts" },
  { id: "lifecycle", label: "Market lifecycle" },
  { id: "margin", label: "Margin & liquidation" },
  { id: "liquidity", label: "Pricing & liquidity" },
  { id: "resolution", label: "Resolution" },
  { id: "gap", label: "The gap problem" },
  { id: "fees", label: "Fees & incentives" },
  { id: "status", label: "Decided vs open" },
] as const;

const LIFECYCLE = [
  {
    title: "Create",
    body: "A market is opened with a question, a close time and a resolution source. Creation posts a bond, forfeited if the question turns out to be ambiguous or unresolvable.",
  },
  {
    title: "Trade",
    body: "A trader posts USDC collateral, selects a side and a leverage multiplier, and receives a position. The program computes the margin requirement from tiers and records the effective leverage, never the requested one.",
  },
  {
    title: "Mark",
    body: "The market price updates as trading moves it. Every open position is valued against the current mark; unrealised PnL and health are derived, never stored.",
  },
  {
    title: "Liquidate",
    body: "When a position's equity falls below its maintenance requirement, anyone may call the liquidation instruction and collect a fee. The position is closed against the vault; any shortfall draws on the insurance fund.",
  },
  {
    title: "Resolve",
    body: "At close, the oracle reports the outcome and a dispute window opens. Trading is halted for the duration. An undisputed report finalises automatically.",
  },
  {
    title: "Settle",
    body: "Winning shares pay 1 USDC each; losing shares pay nothing. Traders claim from the vault. The market account is closed and its rent reclaimed once all positions are settled.",
  },
] as const;

const STATUS_ROWS: [string, string, string, string][] = [
  ["Binary shares paying 0 or 1", "decided", "Decided", "Multi-outcome deliberately excluded"],
  ["USDC settlement, BNB for gas", "decided", "Decided", "BNB is never collateral"],
  ["Margin, liquidation, payout maths", "decided", "Decided", "Implemented and tested off-chain"],
  ["Tiered margin, 20× ceiling", "decided", "Decided", "Verified against a live venue's published tiers"],
  ["Maintenance margin buffer", "none", "Not built", "Liquidation currently equals bankruptcy price"],
  ["Pricing & liquidity model", "open", "Open", "AMM or order book — blocks the program design"],
  ["Resolution & oracle", "open", "Open", "Highest-consequence unresolved decision"],
  ["Gap risk mitigation", "open", "Open", "Decaying leverage proposed, not specified"],
  ["Fee rates", "open", "Open", "Coupled to the liquidity decision"],
  ["BNB Chain contract", "none", "Not started", "No contract code exists"],
];

type ChipStatus = "decided" | "open" | "none";

function Chip({
  status,
  children,
}: {
  status: ChipStatus;
  children: ReactNode;
}) {
  // Written out, not interpolated: Tailwind scans source text, so a
  // `text-${status}` template literal produces no class at all.
  const tone =
    status === "decided"
      ? "text-long border-long"
      : status === "open"
        ? "text-warn border-warn"
        : "text-faint border-border";
  return (
    <span
      className={`numeric inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] tracking-wider uppercase ${tone}`}
    >
      <span aria-hidden className="size-1 rounded-full bg-current" />
      {children}
    </span>
  );
}

function Section({
  id,
  title,
  status,
  statusLabel,
  children,
}: {
  id: string;
  title: string;
  status: ChipStatus;
  statusLabel?: string;
  children: ReactNode;
}) {
  const label =
    statusLabel ??
    (status === "decided" ? "Decided" : status === "open" ? "Open question" : "Note");
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Chip status={status}>{label}</Chip>
      </div>
      {children}
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[68ch] text-sm leading-relaxed text-muted">{children}</p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="numeric rounded-sm border border-hairline bg-well px-1.5 py-0.5 text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="panel max-w-[68ch] p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Account({
  name,
  fields,
  children,
}: {
  name: string;
  fields: string[];
  children: ReactNode;
}) {
  return (
    <article className="panel flex flex-col gap-2.5 p-5">
      <h3 className="numeric text-sm font-medium text-foreground">{name}</h3>
      <p className="text-sm leading-relaxed text-muted">{children}</p>
      <div className="mt-0.5 flex flex-wrap gap-1.5">
        {fields.map((f) => (
          <span
            key={f}
            className="numeric rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] text-faint"
          >
            {f}
          </span>
        ))}
      </div>
    </article>
  );
}

function Table({
  head,
  rows,
  numericFrom,
}: {
  head: string[];
  rows: string[][];
  /** Column index from which cells render in tabular figures. */
  numericFrom?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-wider text-faint uppercase">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-hairline align-top">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 leading-relaxed ${
                    numericFrom !== undefined && i >= numericFrom
                      ? "numeric text-foreground"
                      : "text-muted"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
