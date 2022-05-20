deploy-nft:
	@ NODE_ENV=$(env) npx hardhat run --network $(env) migrations/nfts-deploy.ts --show-stack-traces
compile:
	@ npx hardhat compile
clean:
	@ npx hardhat clean