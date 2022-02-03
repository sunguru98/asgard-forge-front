import { Center } from '@chakra-ui/react';
import { useWallet } from '@saberhq/use-solana';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgePage = () => {
  const { wallet } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (!wallet) navigate('/');
  }, [wallet, navigate]);

  return (
    <Center h='100vh' w='100vw'>
      Forge Page
    </Center>
  );
};

export default ForgePage;
