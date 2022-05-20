# Weedle NFT Factory Contracts

The project contains contracts for creating upgradable NFT contracts from a factory. The contract can be used to create and deploy NFT contracts and all deployed contracts can be upgraded using the beacon proxy pattern.

### What are Beacon Proxy & How do they work

You can read more about beacon proxies here [https://docs.openzeppelin.com/contracts/3.x/api/proxy](https://docs.openzeppelin.com/contracts/3.x/api/proxy)

## Contracts

All contracts can be found in /contracts. We have two main contracts here:

### WeedleTokenFactory.sol

A factory contract for creating NFT contracts. Couple of things to note:
- The contract takes a settings struct which contains all the initialization values for a new smart contract
    - uri - Standard NFT base url in the form https://joinweedle.com/{id}.json
    - name - Name of NFT
    - price - Price NFT is going for. We can think of this as a starting price a more dynamic system can be created using oracles
    - maxSupply - Maximum fixed supply of all mintable NFT's
    - maxMintsAllowed - Maximum mints permitted for each user
- A new NFT contract is created using the `createNFTContract`
- The contract is pausable and unpausable by the original deployer
- We maintain three instance variables
    - createdTokenCount - Number of NFT instances created so far
    - weedleTokenBeacon - The beacon proxy instance
    - nftContracts - Mapping of integer to contract created NFT contract address


### WeedleNFTTokenV1.sol


## Useful Commands

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

## Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).
