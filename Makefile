deploy-nft:
	@ NODE_ENV=localhost npx hardhat run --network localhost migrations/nfts-deploy.ts --show-stack-traces
compile:
	@ npx hardhat compile
clean:
	@ npx hardhat clean