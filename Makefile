deploy-nft:
	@ npx hardhat run scripts/nfts-deploy.ts --network localhost
compile:
	@ npx hardhat compile