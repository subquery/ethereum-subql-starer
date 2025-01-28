import {
    EthereumProject,
    EthereumDatasourceKind,
    EthereumHandlerKind,
} from "@subql/types-ethereum";

// Can expand the Datasource processor types via the generic param
const project: EthereumProject = {
    specVersion: "1.0.0",
    version: "0.0.1",
    name: "subquery-fraxswap-eth",
    description:
        "subquery-fraxswap",
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
        chainId: "1",
        /**
         * These endpoint(s) should be public non-pruned archive node
         * We recommend providing more than one endpoint for improved reliability, performance, and uptime
         * Public nodes may be rate limited, which can affect indexing speed
         * When developing your project we suggest getting a private API key
         * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
         * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
         */
        endpoint: ["https://eth.api.onfinality.io/public"],
    },
    dataSources: [
        {
            kind: EthereumDatasourceKind.Runtime,
            startBlock: 14775229,
            options: {
                abi: "FraxswapFactory",
                address: "0xB076b06F669e682609fb4a8C6646D2619717Be4b",
            },
            assets: new Map([
                ["FraxswapFactory", { file: "./abis/FraxswapFactory.json" }],
                ["FraxswapPair", { file: "./abis/FraxswapPair.json" }],
                ["ERC20", { file: "./abis/ERC20.json" }],
                ["ERC20SymbolBytes", { file: "./abis/ERC20SymbolBytes.json" }],
                ["ERC20NameBytes", { file: "./abis/ERC20NameBytes.json" }],
            ]),
            mapping: {
                file: "./dist/index.js",
                handlers: [
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onPairCreated",
                        filter: {
                            topics: [
                                "PairCreated(indexed address,indexed address,address,uint256)"
                            ]
                        },
                    },
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onMint",
                        filter: {
                            topics: [
                                "Mint(indexed address,uint256,uint256)"
                            ]
                        },
                    },
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onBurn",
                        filter: {
                            topics: [
                                "Burn(indexed address,uint256,uint256,indexed address)"
                            ]
                        },
                    },
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onSwap",
                        filter: {
                            topics: [
                                "Swap(indexed address,uint256,uint256,uint256,uint256,indexed address)"
                            ]
                        },
                    },
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onTransfer",
                        filter: {
                            topics: [
                                "Transfer(indexed address,indexed address,uint256)"
                            ]
                        },
                    },
                    {
                        kind: EthereumHandlerKind.Event,
                        handler: "onSync",
                        filter: {
                            topics: [
                                "Sync(uint112,uint112)"
                            ]
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
