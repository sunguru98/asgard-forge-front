// @ts-ignore
import { WebBundlr } from '@bundlr-network/client/web';
import { createContext, useContext, useEffect, useState } from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { PublicKey } from '@solana/web3.js';

export const BundlrContext = createContext<{
  walletProvider: null | PhantomWalletAdapter;
  bundlrInstance: null | WebBundlr;
  bundlrFundingAddress: null | PublicKey;
  setBundlrWalletProvider: () => Promise<void>;
}>({
  walletProvider: null,
  bundlrInstance: null,
  bundlrFundingAddress: null,
  setBundlrWalletProvider: async () => {},
});

export const useBundlr = () => useContext(BundlrContext);

export const BundlrContextProvider: React.FC = ({ children }) => {
  const [walletProvider, setWalletProvider] =
    useState<null | PhantomWalletAdapter>(null);

  const [bundlrInstance, setBundlrInstance] = useState<null | WebBundlr>(null);
  const [bundlrFundingAddress, setBundlrFundingAddress] =
    useState<null | PublicKey>(null);

  useEffect(() => {
    if (bundlrFundingAddress) {
      console.log(`BUNDLR USER ADDRESS: ${bundlrInstance.address}`);
      console.log(`BUNDLR FUNDING ADDRESS: ${bundlrFundingAddress.toString()}`);
    }
  }, [bundlrFundingAddress, bundlrInstance]);

  async function setBundlrWalletProvider() {
    const phantomAdapter = new PhantomWalletAdapter();
    await phantomAdapter.connect();
    setWalletProvider(phantomAdapter);
    const bundlrInstance: WebBundlr = new WebBundlr(
      'https://node1.bundlr.network',
      'solana',
      phantomAdapter
    );
    await bundlrInstance.ready();
    setBundlrInstance(bundlrInstance);
    const add = await bundlrInstance.utils.getBundlerAddress('solana');
    setBundlrFundingAddress(new PublicKey(add));
  }

  return (
    <BundlrContext.Provider
      value={{
        walletProvider,
        bundlrInstance,
        bundlrFundingAddress,
        setBundlrWalletProvider,
      }}
    >
      {children}
    </BundlrContext.Provider>
  );
};
