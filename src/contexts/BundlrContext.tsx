// @ts-ignore
import { WebBundlr, BundlrTransaction } from '@bundlr-network/client/web';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { PublicKey } from '@solana/web3.js';

export const BundlrContext = createContext<{
  walletProvider: null | PhantomWalletAdapter;
  bundlrInstance: null | WebBundlr;
  bundlrFundingAddress: null | PublicKey;
  setBundlrWalletProvider: () => Promise<void>;
  fundAccount: (number: number) => Promise<boolean>;
  createTransaction: (
    data: Buffer | string,
    dataType: string
  ) => Promise<{ id: string } | null>;
}>({
  walletProvider: null,
  bundlrInstance: null,
  bundlrFundingAddress: null,
  setBundlrWalletProvider: async () => {},
  fundAccount: async (number: number) => true,
  createTransaction: async (data: Buffer | string, dataType: string) => null,
});

export const useBundlr = () => useContext(BundlrContext);

export const BundlrContextProvider: React.FC = ({ children }) => {
  const [walletProvider, setWalletProvider] =
    useState<null | PhantomWalletAdapter>(null);

  const [bundlrInstance, setBundlrInstance] = useState<null | WebBundlr>(null);
  const [bundlrFundingAddress, setBundlrFundingAddress] =
    useState<null | PublicKey>(null);

  useEffect(() => {
    if (bundlrFundingAddress && bundlrInstance) {
      console.log(`BUNDLR USER ADDRESS: ${bundlrInstance.address}`);
      console.log(`BUNDLR FUNDING ADDRESS: ${bundlrFundingAddress.toString()}`);
      console.log(`BUNDLR URL:`, bundlrInstance.api.config.host);
    }
  }, [bundlrFundingAddress, bundlrInstance]);

  const setBundlrWalletProvider = useCallback(async () => {
    const phantomAdapter = new PhantomWalletAdapter();
    await phantomAdapter.connect();
    setWalletProvider(phantomAdapter);
    const bundlrInstance: WebBundlr = new WebBundlr(
      'https://node1.bundlr.network',
      'solana',
      phantomAdapter
    );
    await bundlrInstance.ready();
    const add = await bundlrInstance.utils.getBundlerAddress('solana');
    setBundlrInstance(bundlrInstance);
    setBundlrFundingAddress(new PublicKey(add));
  }, []);

  const fundAccount = useCallback(
    async (number: number) => {
      try {
        if (number < 1) throw new Error('Number too small');
        await bundlrInstance.fund(number);
        return true;
      } catch (err) {
        return false;
      }
    },
    [bundlrInstance]
  );

  const createTransaction = useCallback(
    async (data: Buffer | string, type: string) => {
      if (bundlrInstance) {
        const res = await bundlrInstance.uploader.upload(data, {
          tags: [
            { name: 'App-Name', value: 'Asgard Army' },
            {
              name: 'Content-Type',
              value: type,
            },
          ],
        });

        console.log(res);

        return res.data;
      } else {
        console.log('Instance not available');
        return null;
      }
    },
    [bundlrInstance]
  );

  return (
    <BundlrContext.Provider
      value={{
        walletProvider,
        bundlrInstance,
        bundlrFundingAddress,
        setBundlrWalletProvider,
        fundAccount,
        createTransaction,
      }}
    >
      {children}
    </BundlrContext.Provider>
  );
};
