import { BrowserProvider, Contract, JsonRpcProvider, keccak256, toUtf8Bytes, type JsonRpcSigner } from "ethers";

export const BOT_CHAIN = {
  chainId: 677,
  chainIdHex: "0x2a5",
  name: "BOT Chain Mainnet",
  rpcUrl: "https://rpc.botchain.ai",
  explorer: "https://scan.botchain.ai",
  currency: { name: "BOT", symbol: "BOT", decimals: 18 },
};

export const CONTRACT_ADDRESS = (import.meta.env.VITE_TRACEPACT_ADDRESS ?? "").trim();

export const TRACEPACT_ABI = [
  "function pactCount() view returns (uint256)",
  "function getPact(uint256) view returns ((address author,bytes32 briefHash,bytes32 evidenceHash,bytes32 resultHash,uint64 openedAt,uint64 evidenceAt,uint64 closedAt,uint8 stage))",
  "function openPact(bytes32 briefHash) returns (uint256)",
  "function attachEvidence(uint256 pactId,bytes32 evidenceHash)",
  "function closePact(uint256 pactId,bytes32 resultHash)",
  "event PactOpened(uint256 indexed pactId,address indexed author,bytes32 indexed briefHash,uint64 openedAt)",
] as const;

export type Pact = {
  id: number;
  author: string;
  briefHash: string;
  evidenceHash: string;
  resultHash: string;
  openedAt: number;
  evidenceAt: number;
  closedAt: number;
  stage: number;
  title?: string;
  goal?: string;
  demo?: boolean;
};

export const DEMO_PACTS: Pact[] = [
  {
    id: 104, author: "0x71d8d13688E3A00168F1320FcB1216c9d27A15F4",
    briefHash: "0x4a4cf17f117794b497604096626589ef4b6bd64fb5a28befc6614bcf2ae54ff0",
    evidenceHash: "0xe12379f0202515108435b365730e8a83676fd60ad8e10f51825ea948bf5b5633",
    resultHash: "0x5e424f5fd78c7d2018993761498148b98510547d36cb73dbc03f32c4477880af",
    openedAt: 1792038642, evidenceAt: 1792169501, closedAt: 1792171875, stage: 3,
    title: "Publish the validator status panel", goal: "Ship an observable, mobile-ready validator status experience.", demo: true,
  },
  {
    id: 103, author: "0x51e66b3d93d356A2B3430C3e20b07F75001AC9c9",
    briefHash: "0x34853728b8b8afe2d5afd6fdedb14cacdff00fa402c9d5140ddd38e744a25ac9",
    evidenceHash: "0x9770e2b59165b9a0054da67a717d0d877ea224eaa998d5c77ac2e68f0bb98264",
    resultHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    openedAt: 1791901002, evidenceAt: 1792073200, closedAt: 0, stage: 2,
    title: "Document the relayer recovery drill", goal: "Produce a repeatable recovery checklist and evidence bundle.", demo: true,
  },
  {
    id: 102, author: "0x8C61Bb1959b6C1f78Dd17B7F4F79743aC95542e1",
    briefHash: "0xd276a5a0fd55bd45d5dd1fa111b41fe1f1516b99bdd7819dc61c2f3c12f8ad20",
    evidenceHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    resultHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    openedAt: 1791814602, evidenceAt: 0, closedAt: 0, stage: 1,
    title: "Benchmark the public RPC", goal: "Measure latency under the agreed traffic profile.", demo: true,
  },
];

export const readProvider = new JsonRpcProvider(BOT_CHAIN.rpcUrl);

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: JsonRpcSigner; address: string }> {
  const ethereum = (window as Window & { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
  if (!ethereum) throw new Error("No EVM wallet detected. Install or open a browser wallet first.");
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BOT_CHAIN.chainIdHex }] });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? Number((error as { code: unknown }).code) : 0;
    if (code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: BOT_CHAIN.chainIdHex, chainName: BOT_CHAIN.name, nativeCurrency: BOT_CHAIN.currency, rpcUrls: [BOT_CHAIN.rpcUrl], blockExplorerUrls: [BOT_CHAIN.explorer] }],
    });
  }
  const provider = new BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}

export function readContract() { return CONTRACT_ADDRESS ? new Contract(CONTRACT_ADDRESS, TRACEPACT_ABI, readProvider) : null; }
export function writeContract(signer: JsonRpcSigner) { return new Contract(CONTRACT_ADDRESS, TRACEPACT_ABI, signer); }
export function digest(value: unknown) { return keccak256(toUtf8Bytes(JSON.stringify(value))); }
export function short(value: string, front = 6, back = 4) { return `${value.slice(0, front)}…${value.slice(-back)}`; }
export function stageLabel(stage: number) { return ["Missing", "Brief locked", "Evidence attached", "Closed"][stage] ?? "Unknown"; }
export function dateLabel(timestamp: number) { return timestamp ? new Date(timestamp * 1000).toLocaleString() : "—"; }

