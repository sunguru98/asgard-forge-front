import {
  Box,
  Button,
  Center,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
import { useWallet } from '@saberhq/use-solana';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { getUserNFTs } from '../utils/getUserNFTs';

export const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

type UserNFT = {
  tokenAccount: string;
  mint: string;
  metadata: {
    metadataPDA: string;
    onChainMetadata: MetadataData;
    arweaveMetadata: any;
  };
};

const ForgePage = () => {
  // All state variables
  const [soldierNFTs, setSoliderNFTs] = useState<UserNFT[]>([]);
  const [weaponNFTs, setWeaponNFTs] = useState<UserNFT[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [weaponMints] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('weaponMints') || '[]')
  );
  const [soldierMints] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('soldierMints') || '[]')
  );
  const [selectedSoldier, setSelectedSoldier] = useState<UserNFT | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<UserNFT | null>(null);

  // Custom Hoooks
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { wallet, disconnect, connection: SOLANA_CONNECTION } = useWallet();

  useEffect(() => {
    if (!wallet) navigate('/');
  }, [wallet, navigate]);

  useEffect(() => {
    (async function () {
      try {
        setIsFetching(true);

        if (weaponMints.length === 0 || soldierMints.length === 0)
          throw new Error('Mints not present');

        if (wallet?.publicKey) {
          const userNFTs = await getUserNFTs(
            SOLANA_CONNECTION,
            wallet.publicKey
          );

          const wNFTs = userNFTs.filter((nft) =>
            weaponMints.includes(nft.mint)
          );
          const sNFTs = userNFTs.filter((nft) =>
            soldierMints.includes(nft.mint)
          );

          setSoliderNFTs(sNFTs);
          setWeaponNFTs(wNFTs);
        }
      } catch (err) {
        toast({
          title: 'Error',
          status: 'error',
          position: 'bottom',
          description: (err as Error).message,
        });
        setSoliderNFTs([]);
        setWeaponNFTs([]);
      } finally {
        setIsFetching(false);
      }
    })();
  }, []);

  const renderMyItems = (minImageHeight = '220px') => (
    <>
      <Heading color='white' mb={4}>
        My items
      </Heading>
      <Grid
        templateColumns='repeat(3, 1fr)'
        gap='20px'
        maxH='100%'
        overflow='auto'
      >
        {weaponNFTs.map((nft) => (
          <GridItem cursor='pointer' onClick={() => setSelectedWeapon(nft)}>
            <Image
              border={
                selectedWeapon?.mint === nft.mint ? '10px solid purple' : 'none'
              }
              src={nft.metadata.arweaveMetadata.image}
              w='100%'
              minH={minImageHeight}
              mb={4}
              padding='10px'
            />
            <Heading color='white' fontSize='xl' textAlign='center'>
              {nft.metadata.arweaveMetadata.attributes[0].value}
            </Heading>
          </GridItem>
        ))}
      </Grid>
    </>
  );

  const renderFuseOption = () => {
    return selectedSoldier ? (
      <Stack h='100%' justify='space-between'>
        <Image src={selectedSoldier.metadata.arweaveMetadata.image} />
        <HStack w='100%'>
          <Button
            w='50%'
            height='7vh'
            fontSize='30px'
            textTransform='uppercase'
            colorScheme='teal'
            onClick={() => {
              setSelectedSoldier(null);
              setSelectedWeapon(null);
            }}
          >
            Back
          </Button>
          <Button
            colorScheme='purple'
            disabled={!selectedWeapon}
            w='50%'
            height='7vh'
            fontSize='30px'
            textTransform='uppercase'
            onClick={onOpen}
          >
            Upgrade
          </Button>
        </HStack>
      </Stack>
    ) : null;
  };

  return wallet && wallet.publicKey ? (
    <Center
      h='100vh'
      w='100vw'
      background='purple.900'
      padding='20px'
      flexDirection='column'
    >
      <HStack mb='4' w='100%' justify='space-between'>
        <Image src={logo} width='200px' />
        <Button onClick={disconnect} colorScheme='purple'>
          Connected to {shortenAddress(wallet.publicKey.toString())}
        </Button>
      </HStack>

      <HStack
        w='100%'
        height='100%'
        padding='20px'
        spacing='30px'
        background='#4b29774a'
      >
        {isFetching ? (
          <Heading color='white' textAlign='center' margin='auto'>
            Fetching your NFTs ...
          </Heading>
        ) : soldierNFTs.length === 0 || weaponNFTs.length === 0 ? (
          <Heading color='white' textAlign='center' margin='auto'>
            Connected wallet doesn't possess enough soldier/weapon NFTs ...
          </Heading>
        ) : (
          <>
            <Box
              h='100%'
              w='60%'
              border='1px solid rgba(255, 255, 255, .2)'
              rounded='md'
              padding='20px'
            >
              {selectedSoldier ? (
                renderMyItems('100px')
              ) : (
                <>
                  <Heading color='white' mb={4}>
                    My Divine Soldiers
                  </Heading>
                  <Grid
                    templateColumns='repeat(3, 1fr)'
                    gap='20px'
                    maxH='100%'
                    overflow='auto'
                  >
                    {soldierNFTs.map((nft) => (
                      <GridItem
                        cursor='pointer'
                        onClick={() => setSelectedSoldier(nft)}
                      >
                        <Image
                          _hover={{ border: '5px solid purple' }}
                          padding='10px'
                          src={nft.metadata.arweaveMetadata.image}
                          w='100%'
                          minH='350px'
                          mb={4}
                        />
                        <Heading color='white' fontSize='xl' textAlign='center'>
                          {nft.metadata.onChainMetadata.data.name.replace(
                            'Divine Soldier',
                            ''
                          )}
                        </Heading>
                      </GridItem>
                    ))}
                  </Grid>
                </>
              )}
            </Box>
            <Box
              rounded='md'
              h='100%'
              w='40%'
              border='1px solid rgba(255, 255, 255, .2)'
              padding='20px'
            >
              {selectedSoldier ? renderFuseOption() : renderMyItems()}
            </Box>
          </>
        )}
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          background='rgba(0, 0, 0, .75)'
          color='white'
          minH='30vh'
          minW='40vw'
        >
          <VStack h='30vh' justifyContent='center'>
            <ModalHeader fontSize='20px' textAlign='center' mt='50px'>
              <Heading>UPGRADE</Heading>
            </ModalHeader>
            <ModalBody>
              <Heading fontWeight='normal' textAlign='center' margin='auto'>
                You are about to improve your soldier. Do you accept?
              </Heading>
            </ModalBody>

            <ModalFooter mb='50px' w='100%' display='flex'>
              <Button
                size='lg'
                width='50%'
                height='60px'
                fontSize='x-large'
                colorScheme='purple'
                mr={3}
                onClick={onClose}
              >
                Yes
              </Button>
              <Button
                size='lg'
                width='50%'
                height='60px'
                fontSize='x-large'
                colorScheme='whiteAlpha'
                onClick={onClose}
              >
                No
              </Button>
            </ModalFooter>
          </VStack>
        </ModalContent>
      </Modal>
    </Center>
  ) : (
    <Center
      h='100vh'
      w='100vw'
      background='purple.900'
      padding='20px'
      flexDirection='column'
    >
      <Heading color='white'>Please connect to your wallet</Heading>
    </Center>
  );
};

export default ForgePage;
