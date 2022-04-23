import { ethers } from "ethers";

type ProviderType = "local" | "staging";

export function getProvider(
  provider?: ProviderType
): ethers.providers.Provider {
  if (provider === "staging") {
    return ethers.getDefaultProvider("ropsten", {
      alchemy: process.env.ALCHEMY_API_KEY,
    });
  }
  return new ethers.providers.JsonRpcProvider();
}

export const getWallet = (envName: ProviderType = "local"): ethers.Wallet => {
  const envKey = envName.toUpperCase();
  const privateKey = process.env[`${envKey}_PRIVATE_KEY`];
  if (!privateKey) throw new Error("Invalid private key");
  return new ethers.Wallet(privateKey, getProvider(envName));
};
