import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { ArrowUpRight, Check, Copy, FileCheck2, Fingerprint, Link2, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import { formatEther, type JsonRpcSigner } from "ethers";
import {
  BOT_CHAIN, CONTRACT_ADDRESS, DEMO_PACTS, connectWallet, dateLabel, digest,
  readContract, readProvider, short, stageLabel, writeContract, type Pact,
} from "./chain";

type WalletState = { signer: JsonRpcSigner | null; address: string; balance: string };
type Notice = { kind: "ok" | "error" | "pending"; text: string } | null;
type WalletEvents = {
  on?: (event: "accountsChanged" | "chainChanged", listener: (value: unknown) => void) => void;
  removeListener?: (event: "accountsChanged" | "chainChanged", listener: (value: unknown) => void) => void;
};

const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
const EMPTY_WALLET: WalletState = { signer: null, address: "", balance: "" };

export default function App() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [pacts, setPacts] = useState<Pact[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!CONTRACT_ADDRESS) { setPacts(DEMO_PACTS); return; }
    try {
      const contract = readContract()!;
      const count = Number(await contract.pactCount());
      const loaded: Pact[] = [];
      for (let id = count; id >= Math.max(1, count - 29); id--) {
        const pact = await contract.getPact(id);
        loaded.push({
          id, author: String(pact.author), briefHash: String(pact.briefHash), evidenceHash: String(pact.evidenceHash),
          resultHash: String(pact.resultHash), openedAt: Number(pact.openedAt), evidenceAt: Number(pact.evidenceAt),
          closedAt: Number(pact.closedAt), stage: Number(pact.stage),
        });
      }
      setPacts(loaded);
    } catch (error) {
      setNotice({ kind: "error", text: message(error, "Could not read contract records.") });
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const connect = useCallback(async () => {
    try {
      setNotice({ kind: "pending", text: "Waiting for wallet approval…" });
      const connected = await connectWallet();
      const balance = Number(formatEther(await connected.provider.getBalance(connected.address))).toFixed(3);
      setWallet({ signer: connected.signer, address: connected.address, balance });
      setNotice({ kind: "ok", text: "Wallet ready on BOT Chain." });
    } catch (error) { setNotice({ kind: "error", text: message(error, "Wallet connection failed.") }); }
  }, []);

  useEffect(() => {
    const ethereum = (window as Window & { ethereum?: WalletEvents }).ethereum;
    if (!ethereum?.on) return;
    const accountsChanged = (value: unknown) => {
      if (Array.isArray(value) && value.length === 0) setWallet(EMPTY_WALLET);
      else void connect();
    };
    const chainChanged = () => void connect();
    ethereum.on("accountsChanged", accountsChanged);
    ethereum.on("chainChanged", chainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", accountsChanged);
      ethereum.removeListener?.("chainChanged", chainChanged);
    };
  }, [connect]);

  const metrics = useMemo(() => ({
    total: pacts.length,
    active: pacts.filter((p) => p.stage < 3).length,
    closed: pacts.filter((p) => p.stage === 3).length,
  }), [pacts]);

  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark"><i /><i /><i /></span><b>TRACEPACT</b><em>Task passports</em>
      </Link>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu /></button>
      <nav className={menuOpen ? "nav-open" : ""}>
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>Desk</NavLink>
        <NavLink to="/create" onClick={() => setMenuOpen(false)}>New pact</NavLink>
        <NavLink to="/records" onClick={() => setMenuOpen(false)}>Records</NavLink>
        <NavLink to="/verify" onClick={() => setMenuOpen(false)}>Verify</NavLink>
      </nav>
      <WalletButton wallet={wallet} connect={connect} />
    </header>

    {!CONTRACT_ADDRESS && <div className="preview-bar"><b>PREVIEW LEDGER</b><span>Sample records are visible. Deploy the contract and add <code>VITE_TRACEPACT_ADDRESS</code> for live writes.</span></div>}
    {notice && <div className={`toast ${notice.kind}`} onClick={() => setNotice(null)}><span>{notice.text}</span><X size={16} /></div>}

    <Routes>
      <Route path="/" element={<Home pacts={pacts} metrics={metrics} />} />
      <Route path="/create" element={<CreatePact wallet={wallet} setNotice={setNotice} reload={reload} />} />
      <Route path="/records" element={<Records pacts={pacts} />} />
      <Route path="/verify" element={<Verify pacts={pacts} />} />
      <Route path="/evidence" element={<Evidence wallet={wallet} pacts={pacts} setNotice={setNotice} reload={reload} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>

    <footer>
      <div><span className="footer-dot" /> TRACEPACT / PUBLIC RECORD</div>
      <p>Chronology and integrity, made legible.</p>
      <div className="footer-links"><a href="https://www.botchain.ai/en/" target="_blank" rel="noreferrer">BOT Chain <ArrowUpRight /></a><a href={BOT_CHAIN.explorer} target="_blank" rel="noreferrer">Explorer <ArrowUpRight /></a></div>
    </footer>
  </div>;
}

function WalletButton({ wallet, connect }: { wallet: WalletState; connect(): void }) {
  return <button className={`wallet-button ${wallet.address ? "connected" : ""}`} onClick={connect}>
    <span className="wallet-light" />
    {wallet.address ? <><b>{short(wallet.address)}</b><small>{wallet.balance} BOT</small></> : <><b>Connect wallet</b><small>BOT Chain</small></>}
  </button>;
}

function Home({ pacts, metrics }: { pacts: Pact[]; metrics: { total: number; active: number; closed: number } }) {
  return <main>
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">VERIFIABLE TASK PASSPORTS / 2026</p>
        <h1>Make the<br /><span>promise</span><br />observable.</h1>
        <p className="hero-lede">Turn a project brief into a public sequence of facts: what was promised, which evidence arrived, and when the record closed.</p>
        <div className="hero-actions"><Link to="/create" className="button primary">Open a pact <ArrowUpRight /></Link><Link to="/verify" className="text-link">Check a record <span>→</span></Link></div>
      </div>
      <div className="passport-stage" aria-label="Example task passport">
        <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        <article className="passport-card">
          <div className="passport-head"><span>TP / 0104</span><Fingerprint size={30} /></div>
          <p>Project passport</p>
          <h2>Validator status panel</h2>
          <div className="passport-route"><span className="done"><Check /></span><i /><span className="done"><Check /></span><i /><span className="live">03</span></div>
          <div className="passport-labels"><span>Brief</span><span>Evidence</span><span>Result</span></div>
          <div className="passport-stamp">VERIFIED<br /><small>PUBLIC TRACE</small></div>
        </article>
        <div className="stage-note">Every phase gets its own hash and timestamp.</div>
      </div>
    </section>

    <section className="ticker">
      <div><b>{String(metrics.total).padStart(2, "0")}</b><span>visible records</span></div>
      <div><b>{String(metrics.active).padStart(2, "0")}</b><span>in progress</span></div>
      <div><b>{String(metrics.closed).padStart(2, "0")}</b><span>closed loops</span></div>
      <div><b>03</b><span>immutable checkpoints</span></div>
    </section>

    <section className="method-section">
      <div className="section-heading"><p className="eyebrow">THE WORKFLOW</p><h2>One job.<br />Three receipts.</h2></div>
      <div className="method-list">
        <Method number="01" icon={<Fingerprint />} title="Commit the brief" text="Normalize the title, goal, and measurable checks. Only the resulting fingerprint is recorded." tone="blue" />
        <Method number="02" icon={<Link2 />} title="Bind the evidence" text="Attach the exact repository commit, artifact link, or delivery note to the same passport." tone="orange" />
        <Method number="03" icon={<ShieldCheck />} title="Close the loop" text="Record the reviewed result. The three timestamps become a public chronology." tone="navy" />
      </div>
    </section>

    <section className="recent-section">
      <div className="section-row"><div><p className="eyebrow">LATEST ENTRIES</p><h2>Records in motion</h2></div><Link to="/records" className="text-link">Open ledger <span>→</span></Link></div>
      <div className="record-strip">{pacts.slice(0, 3).map((pact) => <RecordCard key={pact.id} pact={pact} compact />)}</div>
    </section>

    <section className="boundary"><div><p className="eyebrow">READ THIS CLEARLY</p><h2>A trace is not a verdict.</h2></div><p>TRACEPACT proves hashes, authorship, and ordering. It does not automatically prove that a claim is true, a deliverable is good, or a contract is legally binding. Humans still review the evidence.</p></section>
  </main>;
}

function Method({ number, icon, title, text, tone }: { number: string; icon: ReactNode; title: string; text: string; tone: string }) {
  return <article className={`method-card ${tone}`}><div className="method-number">{number}</div><div className="method-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

function CreatePact({ wallet, setNotice, reload }: { wallet: WalletState; setNotice(value: Notice): void; reload(): Promise<void> }) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [criteria, setCriteria] = useState([""]);
  const [review, setReview] = useState(false);
  const navigate = useNavigate();
  const briefHash = useMemo(() => digest({ title: title.trim(), goal: goal.trim(), criteria: criteria.map((c) => c.trim()).filter(Boolean) }), [title, goal, criteria]);

  const submit = async () => {
    if (!CONTRACT_ADDRESS) {
      setNotice({ kind: "ok", text: `Preview fingerprint prepared: ${short(briefHash, 10, 8)}` });
      navigate("/records"); return;
    }
    if (!wallet.signer) { setNotice({ kind: "error", text: "Connect the author wallet before opening a pact." }); return; }
    try {
      setNotice({ kind: "pending", text: "Confirm the open-pact transaction in your wallet…" });
      const tx = await writeContract(wallet.signer).openPact(briefHash);
      await tx.wait(); await reload();
      setNotice({ kind: "ok", text: "Pact opened and brief fingerprint recorded." }); navigate("/records");
    } catch (error) { setNotice({ kind: "error", text: message(error, "The transaction did not complete.") }); }
  };

  return <main className="page-main">
    <section className="page-intro split-intro"><div><p className="eyebrow">NEW PACT / STEP {review ? "02" : "01"}</p><h1>{review ? "Inspect the fingerprint." : "Write the promise first."}</h1></div><p>A good passport begins with a precise brief. Keep private information out of these fields even though only a hash is sent to the contract.</p></section>
    <section className="form-workbench">
      <div className="step-rail"><span className="active">01<br /><small>BRIEF</small></span><i /><span className={review ? "active" : ""}>02<br /><small>REVIEW</small></span><i /><span>03<br /><small>ANCHOR</small></span></div>
      {!review ? <form className="pact-form" onSubmit={(event) => { event.preventDefault(); setReview(true); }}>
        <Field label="Passport title" hint="A short name people can recognize."><input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Publish the operator handbook" /></Field>
        <Field label="Outcome statement" hint="Describe what must exist when the work is complete."><textarea required maxLength={1200} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Create a public handbook that covers daily operations, incident response, and recovery." /></Field>
        <div className="criteria-block"><div className="field-head"><div><label>Acceptance checks</label><p>Measurable conditions, kept in this exact order.</p></div><button type="button" className="mini-button" onClick={() => setCriteria([...criteria, ""])}><Plus /> Add check</button></div>
          {criteria.map((criterion, index) => <div className="criterion" key={index}><span>{String(index + 1).padStart(2, "0")}</span><input required value={criterion} onChange={(e) => setCriteria(criteria.map((item, i) => i === index ? e.target.value : item))} placeholder={index === 0 ? "Includes a documented recovery drill" : "Add another measurable check"} />{criteria.length > 1 && <button type="button" onClick={() => setCriteria(criteria.filter((_, i) => i !== index))}><X /></button>}</div>)}
        </div>
        <button className="button primary submit-button">Review fingerprint <ArrowUpRight /></button>
      </form> : <div className="review-panel">
        <div className="review-copy"><span className="review-badge"><FileCheck2 /> READY TO ANCHOR</span><h2>{title}</h2><p>{goal}</p><ol>{criteria.filter(Boolean).map((c) => <li key={c}>{c}</li>)}</ol></div>
        <div className="hash-ticket"><p>BRIEF FINGERPRINT</p><code>{briefHash}</code><button onClick={() => void navigator.clipboard.writeText(briefHash)}><Copy /> Copy hash</button><div className="hash-warning">Changing one character creates a different fingerprint.</div></div>
        <div className="review-actions"><button className="button ghost" onClick={() => setReview(false)}>Edit brief</button><button className="button primary" onClick={() => void submit()}>{CONTRACT_ADDRESS ? "Open pact" : "Preview record"} <ArrowUpRight /></button></div>
      </div>}
    </section>
  </main>;
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span><small>{hint}</small>{children}</label>;
}

function Records({ pacts }: { pacts: Pact[] }) {
  const [query, setQuery] = useState("");
  const filtered = pacts.filter((p) => `${p.id} ${p.title ?? ""} ${p.author}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="page-main">
    <section className="page-intro records-intro"><div><p className="eyebrow">PUBLIC LEDGER</p><h1>Every pact leaves a trail.</h1></div><div className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID, title, or author" /></div></section>
    <section className="records-grid">{filtered.map((pact) => <RecordCard key={pact.id} pact={pact} />)}{filtered.length === 0 && <div className="empty-state">No records match this search.</div>}</section>
    <div className="ledger-actions"><Link className="button primary" to="/create">Open a new pact <Plus /></Link><Link className="button ghost" to="/evidence">Attach evidence <Link2 /></Link></div>
  </main>;
}

function RecordCard({ pact, compact = false }: { pact: Pact; compact?: boolean }) {
  return <article className={`record-card stage-${pact.stage} ${compact ? "compact" : ""}`}>
    <div className="record-top"><span>TP-{String(pact.id).padStart(4, "0")}</span><b>{stageLabel(pact.stage)}</b></div>
    <h3>{pact.title ?? `Public pact #${pact.id}`}</h3>
    {!compact && <p>{pact.goal ?? "Hash-only public record. Readable details remain with the author."}</p>}
    <div className="record-progress"><i className={pact.stage >= 1 ? "filled" : ""} /><i className={pact.stage >= 2 ? "filled" : ""} /><i className={pact.stage >= 3 ? "filled" : ""} /></div>
    <div className="record-meta"><span>AUTHOR<br /><b>{short(pact.author)}</b></span><span>OPENED<br /><b>{dateLabel(pact.openedAt).split(",")[0]}</b></span></div>
    <Link to={`/verify?id=${pact.id}`}>Inspect trace <ArrowUpRight /></Link>
  </article>;
}

function Evidence({ wallet, pacts, setNotice, reload }: { wallet: WalletState; pacts: Pact[]; setNotice(value: Notice): void; reload(): Promise<void> }) {
  const [id, setId] = useState(String(pacts.find((p) => p.stage === 1)?.id ?? ""));
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [resultId, setResultId] = useState(String(pacts.find((p) => p.stage === 2)?.id ?? ""));
  const [outcome, setOutcome] = useState("");
  const evidenceHash = useMemo(() => digest({ source: source.trim(), note: note.trim() }), [source, note]);
  const resultHash = useMemo(() => digest({ outcome: outcome.trim() }), [outcome]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!CONTRACT_ADDRESS) { setNotice({ kind: "ok", text: `Preview evidence prepared: ${short(evidenceHash, 10, 8)}` }); return; }
    if (!wallet.signer) { setNotice({ kind: "error", text: "Connect the original author wallet first." }); return; }
    try {
      setNotice({ kind: "pending", text: "Confirm evidence attachment in your wallet…" });
      const tx = await writeContract(wallet.signer).attachEvidence(BigInt(id), evidenceHash);
      await tx.wait(); await reload(); setNotice({ kind: "ok", text: `Evidence attached to pact #${id}.` });
    } catch (error) { setNotice({ kind: "error", text: message(error, "Evidence could not be attached.") }); }
  };

  const close = async (event: FormEvent) => {
    event.preventDefault();
    if (!CONTRACT_ADDRESS) { setNotice({ kind: "ok", text: `Preview result prepared: ${short(resultHash, 10, 8)}` }); return; }
    if (!wallet.signer) { setNotice({ kind: "error", text: "Connect the original author wallet first." }); return; }
    try {
      setNotice({ kind: "pending", text: "Confirm the close-pact transaction in your wallet…" });
      const tx = await writeContract(wallet.signer).closePact(BigInt(resultId), resultHash);
      await tx.wait(); await reload(); setNotice({ kind: "ok", text: `Pact #${resultId} is now closed.` });
    } catch (error) { setNotice({ kind: "error", text: message(error, "The pact could not be closed.") }); }
  };

  return <main className="page-main">
    <section className="page-intro split-intro"><div><p className="eyebrow">CHECKPOINT / EVIDENCE</p><h1>Pin the delivery to the pact.</h1></div><p>The original author adds one exact evidence fingerprint. Use a permanent URL or commit reference whenever possible.</p></section>
    <section className="evidence-layout"><form className="pact-form" onSubmit={submit}>
      <Field label="Pact ID" hint="The open passport receiving this evidence."><input type="number" min="1" required value={id} onChange={(e) => setId(e.target.value)} placeholder="104" /></Field>
      <Field label="Evidence source" hint="Repository commit, artifact URL, or public receipt."><input type="url" required value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://github.com/organization/repository/commit/..." /></Field>
      <Field label="Delivery note" hint="A concise description of what the evidence demonstrates."><textarea required value={note} onChange={(e) => setNote(e.target.value)} placeholder="The commit implements all acceptance checks and includes the verification notes." /></Field>
      <button className="button primary submit-button">Attach evidence <Link2 /></button>
    </form><aside className="evidence-ticket"><p>LIVE FINGERPRINT</p><Fingerprint /><code>{evidenceHash}</code><span>Generated locally from the source and note.</span></aside></section>
    <section className="close-panel"><div><p className="eyebrow">FINAL CHECKPOINT</p><h2>Close the loop.</h2><p>After reviewing the evidence, record a concise result. Closing is permanent.</p></div><form onSubmit={close}><Field label="Pact ID" hint="Must already have evidence attached."><input type="number" min="1" required value={resultId} onChange={(e) => setResultId(e.target.value)} placeholder="103" /></Field><Field label="Result statement" hint="State what was accepted, rejected, or learned."><textarea required value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="All acceptance checks passed; the delivery was reviewed and accepted." /></Field><code>{resultHash}</code><button className="button primary">Close pact <ShieldCheck /></button></form></section>
  </main>;
}

function Verify({ pacts }: { pacts: Pact[] }) {
  const defaultId = new URLSearchParams(window.location.search).get("id") ?? "";
  const [id, setId] = useState(defaultId);
  const [result, setResult] = useState<Pact | null>(defaultId ? pacts.find((p) => String(p.id) === defaultId) ?? null : null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!CONTRACT_ADDRESS && defaultId) {
      setResult(pacts.find((p) => String(p.id) === defaultId) ?? null);
    }
  }, [defaultId, pacts]);

  const verify = async (event: FormEvent) => {
    event.preventDefault(); setStatus("Reading the public record…"); setResult(null);
    try {
      if (!CONTRACT_ADDRESS) {
        const found = pacts.find((p) => String(p.id) === id);
        if (!found) throw new Error("No preview record has that ID. Try 102, 103, or 104.");
        setResult(found); setStatus(""); return;
      }
      const pact = await readContract()!.getPact(BigInt(id));
      setResult({ id: Number(id), author: String(pact.author), briefHash: String(pact.briefHash), evidenceHash: String(pact.evidenceHash), resultHash: String(pact.resultHash), openedAt: Number(pact.openedAt), evidenceAt: Number(pact.evidenceAt), closedAt: Number(pact.closedAt), stage: Number(pact.stage) });
      setStatus("");
    } catch (error) { setStatus(message(error, "No record was found.")); }
  };

  return <main className="page-main verify-page">
    <section className="verify-mast"><p className="eyebrow">PUBLIC INSPECTOR</p><h1>Follow the chain<br />of custody.</h1><form onSubmit={verify}><span>TP-</span><input required type="number" min="1" value={id} onChange={(e) => setId(e.target.value)} placeholder="0104" /><button>Verify <ArrowUpRight /></button></form><small>{status || "No wallet is required to inspect a public record."}</small></section>
    {result ? <Trace pact={result} /> : <section className="verify-placeholder"><div className="radar"><i /><i /><i /><Fingerprint /></div><p>Enter a passport number to reconstruct its checkpoints.</p></section>}
  </main>;
}

function Trace({ pact }: { pact: Pact }) {
  const steps = [
    { label: "Brief committed", time: pact.openedAt, hash: pact.briefHash, active: pact.stage >= 1 },
    { label: "Evidence attached", time: pact.evidenceAt, hash: pact.evidenceHash, active: pact.stage >= 2 },
    { label: "Result recorded", time: pact.closedAt, hash: pact.resultHash, active: pact.stage >= 3 },
  ];
  return <section className="trace-result"><div className="trace-head"><div><span>TRACE VERIFIED</span><h2>TP-{String(pact.id).padStart(4, "0")}</h2></div><div><small>AUTHOR</small><b>{short(pact.author, 10, 8)}</b></div></div>
    <div className="trace-steps">{steps.map((step, index) => <article className={step.active ? "active" : ""} key={step.label}><div className="trace-index">0{index + 1}</div><span className="trace-node">{step.active ? <Check /> : ""}</span><h3>{step.label}</h3><time>{dateLabel(step.time)}</time><code>{step.hash === ZERO ? "Awaiting checkpoint" : step.hash}</code></article>)}</div>
    <a className="text-link" href={CONTRACT_ADDRESS ? `${BOT_CHAIN.explorer}/address/${CONTRACT_ADDRESS}` : BOT_CHAIN.explorer} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS ? "Inspect contract" : "Open explorer"} <span>↗</span></a>
  </section>;
}

function NotFound() { return <main className="not-found"><b>404</b><h1>This passport page is missing.</h1><Link className="button primary" to="/">Return to desk</Link></main>; }
function message(error: unknown, fallback: string) { return error instanceof Error ? error.message.replace("execution reverted: ", "") : fallback; }

