import { Button, Center, Heading, Image } from '@chakra-ui/react';
import { useWalletKit } from '@gokiprotocol/walletkit';
import { useSolana } from '@saberhq/use-solana';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useBundlr } from '../contexts/BundlrContext';

const HomePage = () => {
  const { connected } = useSolana();
  const { connect } = useWalletKit();
  const { setBundlrWalletProvider } = useBundlr();
  const navigate = useNavigate();

  useEffect(() => {
    (async function () {
      if (connected) {
        await setBundlrWalletProvider();
        navigate('/forge');
      }
    })();
  }, [connected, navigate, setBundlrWalletProvider]);

  return (
    <Center flexDirection='column' h='100vh' w='100vw' background='purple.900'>
      <Image src={logo} w='300px' />
      <Heading color='white' my='20px'>
        CELESTIAL FORGE
      </Heading>
      <Button
        background='purple.500'
        color='white'
        colorScheme='purple'
        size='lg'
        onClick={connect}
      >
        Connect your wallet to enter
      </Button>
    </Center>
  );
};

export default HomePage;
