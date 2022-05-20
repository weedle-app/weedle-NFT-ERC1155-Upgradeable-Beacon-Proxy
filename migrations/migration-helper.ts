import { ethers } from "ethers";

type Providers = Record<string, ethers.providers.Provider>;

export const providers: Providers = {
  default: new ethers.providers.JsonRpcProvider(),
  test: new ethers.providers.JsonRpcProvider(),
  localhost: new ethers.providers.JsonRpcProvider(),

  /**
   * You can extend this by adding other environments
   * staging: null,
   *
   * An example for staging could be using ALCHEMY for example
   * Simply add an alchemy API KEY for the environment of interest to a staging config file and use it
   ethers.getDefaultProvider("ropsten", {
      alchemy: config.get('ALCHEMY_API_KEY'),
    });
   */
};

export const getCurrentProvider = (): ethers.providers.Provider => {
  const environment = process.env.NODE_ENV as string;
  return providers[environment];
};
