import {
  EthereumProject,
  EthereumDatasourceKind,
  EthereumHandlerKind,
} from "@subql/types-ethereum";

// Can expand the Datasource processor types via the generic param
const project: EthereumProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "arbitrum-one-subql-starter",
  description:
    "This SubQuery Arbitrum Example project indexes all Arbitrum WINR Staking Rewards.",
  runner: {
    node: {
      name: "@subql/node-ethereum",
      version: ">=3.0.0",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /**
     * chainId is the EVM Chain ID, for Arbitrum One this is 42161
     * https://chainlist.org/chain/42161
     */
    chainId: "42161",
    /**
     * These endpoint(s) should be public non-pruned archive node
     * We recommend providing more than one endpoint for improved reliability, performance, and uptime
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
     * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
     */
    endpoint: ["https://arbitrum.api.onfinality.io/public"],
  },
  dataSources: [
    {
      kind: EthereumDatasourceKind.Runtime,
      // This is the block of the first claim dividend https://arbiscan.io/tx/0x300b6199816f44029408efc850fb9d6f8751bbedec3e273909eac6f3a61ee3b3
      startBlock: 91573785,
      options: {
        // Must be a key of assets
        abi: "winr-staking",
        // This is the contract address for WINR Staking https://arbiscan.io/tx/0x44e9396155f6a90daaea687cf48c309128afead3be9faf20c5de3d81f6f318a6
        address: "0xddAEcf4B02A3e45b96FC2d7339c997E072b0d034",
      },
      assets: new Map([
        ["winr-staking", { file: "./abis/winr-staking.abi.json" }],
      ]),
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            kind: EthereumHandlerKind.Event,
            handler: "handleDividendBatch",
            filter: {
              /**
               * Follows standard log filters https://docs.ethers.io/v5/concepts/events/
               * address: "0x60781C2586D68229fde47564546784ab3fACA982"
               */
              topics: [
                "ClaimDividendBatch(address indexed user, uint256 reward)",
              ],
            },
          },
        ],
      },
    },
  ],
  repository: "https://github.com/subquery/ethereum-subql-starter",
};

// Must set default to the project instance
export default project;
