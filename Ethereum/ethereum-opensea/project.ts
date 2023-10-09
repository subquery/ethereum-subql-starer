import {
  EthereumProject,
  EthereumDatasourceKind,
  EthereumHandlerKind,
} from "@subql/types-ethereum";

// Can expand the Datasource processor types via the generic param
const project: EthereumProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "opensea",
  description:
    "This project can be use as a starting point for developing your new Ethereum SubQuery project, it indexes NFT data from the Opensea marketplace",
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
     * chainId is the EVM Chain ID, for Ethereum this is 1
     * https://chainlist.org/chain/1
     */
    chainId: "1",
    /**
     * These endpoint(s) should be non-pruned archive nodes
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     # We suggest providing an array of endpoints for increased speed and reliability
     */
    endpoint: ["https://eth.api.onfinality.io/public"],
    dictionary: "https://gx.api.subquery.network/sq/subquery/eth-dictionary",
  },
  dataSources: [
    {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 14946474,

      options: {
        // Must be a key of assets
        abi: "SeaportExchange",
        address: "0x00000000006c3852cbef3e08e8df289169ede581",
      },
      assets: new Map([
        ["SeaportExchange", { file: "./abis/SeaportExchange.abi.json" }],
        ["ERC165", { file: "./abis/ERC165.json" }],
        ["NftMetadata", { file: "./abis/NftMetadata.json" }],
      ]),
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            kind: EthereumHandlerKind.Event,
            handler: "handleOrderFulfilled",
            filter: {
              topics: [
                "OrderFulfilled(bytes32,address,address,address,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256,address)[])\n",
              ],
            },
          },
        ],
      },
    },
  ],
  repository: "https://github.com/subquery/ethereum-subql-starter",
};

export default project;
