import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { ChakraProvider } from '@chakra-ui/react';
import { WalletKitProvider } from '@gokiprotocol/walletkit';
import { BundlrContextProvider } from './contexts/BundlrContext';

ReactDOM.render(
  <WalletKitProvider
    defaultNetwork='mainnet-beta'
    networkConfigs={{
      'mainnet-beta': { endpoint: 'https://ssc-dao.genesysgo.net/' },
    }}
    app={{
      name: 'Celestial Forge',
      icon: (
        <img
          src='https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_32,h_32/https://asgardarmy.com/wp-content/uploads/2021/10/cropped-logo-192x192.png'
          alt='Asgard Army'
        />
      ),
    }}
  >
    <ChakraProvider>
      <BundlrContextProvider>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </BundlrContextProvider>
    </ChakraProvider>
  </WalletKitProvider>,
  document.getElementById('root')
);
