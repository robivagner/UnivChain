export type UnivChainDeployment = {
  universityCore: `0x${string}`;
  studentRegistry: `0x${string}`;
  gradebook: `0x${string}`;
  certification: `0x${string}`;
  feeManager: `0x${string}`;
  /** Block where UniversityCore was deployed — used by the indexer for log scans. */
  deployBlock: number;
  /** Mock USDC from `make setup-dev` — required for requestEnrollment. */
  enrollmentToken?: `0x${string}`;
};

/** Default Foundry Anvil deployment order (first run on fresh chain). Re-export after `forge script`. */
export const ANVIL_CHAIN_ID = 31337;

export const DEPLOYMENTS: Record<number, UnivChainDeployment> = {
  [ANVIL_CHAIN_ID]: {
    universityCore: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    studentRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    gradebook: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    certification: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    feeManager: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    deployBlock: 1,
    enrollmentToken: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  }
};

export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs/";
