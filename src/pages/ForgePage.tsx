import {
  Box,
  Button,
  Center,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  Creator,
  MetadataDataData,
  UpdateMetadata,
} from '@metaplex-foundation/mpl-token-metadata';

import { useWallet } from '@saberhq/use-solana';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useBundlr } from '../contexts/BundlrContext';
import { UserNFT } from '../types';
import { drawFusedImage } from '../utils/fuse';
import { getUserNFTs } from '../utils/getUserNFTs';

export const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

export const COST_FOR_UPLOAD = 203_878;
export const ASGARD_TOKEN_FEE = 10_000;
export const ASGARD_TOKEN_MINT = new PublicKey(
  'BQTN97PwrQGkbNepQxjvcYfRPYbPNgd5PqoioYwBt4qX'
);

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
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenAccount, setTokenAccount] = useState<PublicKey | null>(null);

  // Temp
  const [, setImage] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);

  // Custom Hoooks
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { wallet, disconnect, connection: SOLANA_CONNECTION } = useWallet();
  const { bundlrInstance, createTransaction, fundAccount } = useBundlr();

  const fetchUserNFTs = useCallback(async () => {
    try {
      setIsFetching(true);

      if (weaponMints.length === 0 || soldierMints.length === 0)
        throw new Error('Mints not present');

      if (wallet?.publicKey) {
        console.log('FETCHING USER NFTS');
        const { userNFTs, asgardTokenBalance, asgardTokenAccount } =
          await getUserNFTs(SOLANA_CONNECTION, wallet.publicKey);

        const wNFTs = userNFTs.filter((nft) => weaponMints.includes(nft.mint));
        const sNFTs = userNFTs.filter((nft) => soldierMints.includes(nft.mint));

        setSoliderNFTs(sNFTs);
        setWeaponNFTs(wNFTs);
        setTokenBalance(asgardTokenBalance);
        setTokenAccount(asgardTokenAccount);

        const transactionProgress = JSON.parse(
          localStorage.getItem('transactionProgress') || '{}'
        );

        if (transactionProgress.selectedSoldier) {
          setSelectedSoldier(
            sNFTs.find(
              (nft) => nft.mint === transactionProgress.selectedSoldier
            ) || null
          );
        }

        if (transactionProgress.selectedWeapon) {
          setSelectedWeapon(
            wNFTs.find(
              (nft) => nft.mint === transactionProgress.selectedWeapon
            ) || null
          );
        }
      }
    } catch (err) {
      console.error(err);
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
  }, [SOLANA_CONNECTION, soldierMints, toast, wallet?.publicKey, weaponMints]);

  useEffect(() => {
    if (!wallet) navigate('/');
  }, [wallet, navigate]);

  useEffect(() => {
    fetchUserNFTs();
  }, []);

  const changeJSONMetadata = (soldierNFT: UserNFT, weaponNFT: UserNFT) => {
    const { metadata: soldierMetadata } = soldierNFT;
    const { metadata: weaponMetadata } = weaponNFT;

    const weaponAttribute = weaponMetadata.arweaveMetadata.attributes.find(
      (a: any) => a.trait_type === 'Weapon Name'
    );

    return {
      ...soldierMetadata.arweaveMetadata,
      attributes: [
        ...soldierMetadata.arweaveMetadata.attributes.filter(
          (a: { trait_type: string; value: string }) =>
            a.trait_type !== 'Weapon'
        ),
        { trait_type: 'Weapon', value: weaponAttribute.value },
      ],
    };
  };

  const createArweavePathManifest = (
    imageDataId: string,
    jsonDataId: string
  ) => {
    return {
      manifest: 'arweave/paths',
      version: '0.1.0',
      paths: {
        'image.png': {
          id: imageDataId,
        },
        'metadata.json': {
          id: jsonDataId,
        },
      },
      index: {
        path: 'metadata.json',
      },
    };
  };

  const handleFuse = async () => {
    try {
      if (!wallet?.publicKey) throw new Error('Wallet not connected');
      if (!selectedWeapon || !selectedSoldier)
        throw new Error('Weapon/Soldier missing for fusion');

      if (!tokenAccount) throw new Error('Insufficient ASGARD for forge');

      setStep(1);
      const baseImage = await drawFusedImage(selectedSoldier, selectedWeapon);
      setImage(baseImage);

      const imageBuffer = Buffer.from(
        baseImage.replace('data:image/png;base64,', ''),
        'base64'
      );

      const bundlrBalance = (
        (await bundlrInstance.getLoadedBalance()) as BigNumber
      ).toNumber();

      console.log(`BUNDLR BALANCE: ${bundlrBalance}`);

      if (bundlrBalance < COST_FOR_UPLOAD) {
        const isFunded = await fundAccount(205_000 - bundlrBalance);
        if (!isFunded)
          throw new Error('Account unable to fund for upload costs');
      }

      setStep(2);

      const transactionProgress = JSON.parse(
        localStorage.getItem('transactionProgress') || '{}'
      );

      let imageId = transactionProgress.imageLink;
      let jsonId = transactionProgress.jsonLink;
      let manifestId = transactionProgress.manifestLink;

      const initialData = {
        selectedSoldier: selectedSoldier.mint,
        selectedWeapon: selectedWeapon.mint,
      };

      if (!imageId) {
        const imageTx = await createTransaction(imageBuffer, 'image/png');
        if (!imageTx) throw new Error('Image Upload Failed');
        localStorage.setItem(
          'transactionProgress',
          JSON.stringify({
            ...initialData,
            imageLink: `https://arweave.net/${imageTx.id}`,
          })
        );
        imageId = `https://arweave.net/${imageTx.id}`;
        setStep(3);
      }

      if (!jsonId) {
        const newJSON = changeJSONMetadata(selectedSoldier, selectedWeapon);
        const jsonTx = await createTransaction(
          JSON.stringify({
            ...newJSON,
            image: imageId,
            properties: {
              ...newJSON.properties,
              files: [{ type: 'image/png', uri: imageId }],
            },
          }),
          'application/json'
        );

        if (!jsonTx) throw new Error('Metadata upload failed');

        localStorage.setItem(
          'transactionProgress',
          JSON.stringify({
            ...initialData,
            imageLink: imageId,
            jsonLink: `https://arweave.net/${jsonTx.id}`,
          })
        );
        jsonId = `https://arweave.net/${jsonTx.id}`;
        setStep(4);
      }

      if (!manifestId) {
        const manifestTx = await createTransaction(
          JSON.stringify(createArweavePathManifest(imageId, jsonId)),
          'application/x.arweave-manifest+json'
        );

        if (!manifestTx) throw new Error('Manifest upload failed');

        localStorage.setItem(
          'transactionProgress',
          JSON.stringify({
            ...initialData,
            imageLink: imageId,
            jsonLink: jsonId,
            manifestLink: `https://arweave.net/${manifestTx.id}`,
          })
        );
        manifestId = `https://arweave.net/${manifestTx.id}`;
        setStep(5);
      }

      const txProgress = localStorage.getItem('transactionProgress');
      if (!txProgress)
        throw new Error('Transaction for upload not found. Please try again');
      setStep(5);

      const updateAuthorityKeypair = Keypair.fromSecretKey(
        Uint8Array.from(
          JSON.parse(process.env.REACT_APP_UPDATE_AUTHORITY_PRIVATE!)
        )
      );

      const burnerWallet = new PublicKey(
        process.env.REACT_APP_WEAPON_BURNER_WALLET || ''
      );

      const { name, sellerFeeBasisPoints, creators, symbol } =
        selectedSoldier.metadata.onChainMetadata.data;

      const { instructions: updateMetadataIx } = new UpdateMetadata(
        {
          feePayer: wallet.publicKey,
        },
        {
          metadata: new PublicKey(selectedSoldier.metadata.metadataPDA),
          updateAuthority: updateAuthorityKeypair.publicKey,
          metadataData: new MetadataDataData({
            name,
            symbol,
            sellerFeeBasisPoints,
            creators:
              creators?.map(
                ({ address, share, verified }) =>
                  new Creator({ address, share, verified })
              ) || null,
            uri: jsonId,
          }),
        }
      );

      const transaction = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: (await SOLANA_CONNECTION.getRecentBlockhash())
          .blockhash,
      });

      transaction.add(...updateMetadataIx);

      const receiverTokenAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(selectedWeapon.mint),
        burnerWallet
      );

      if (!(await SOLANA_CONNECTION.getAccountInfo(receiverTokenAddress))) {
        transaction.add(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            new PublicKey(selectedWeapon.mint),
            receiverTokenAddress,
            burnerWallet,
            wallet.publicKey
          )
        );
      }

      const receiverAsgardTokenAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        ASGARD_TOKEN_MINT,
        burnerWallet
      );

      if (
        !(await SOLANA_CONNECTION.getAccountInfo(receiverAsgardTokenAddress))
      ) {
        transaction.add(
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            ASGARD_TOKEN_MINT,
            receiverAsgardTokenAddress,
            burnerWallet,
            wallet.publicKey
          )
        );
      }

      transaction.add(
        Token.createTransferCheckedInstruction(
          TOKEN_PROGRAM_ID,
          new PublicKey(selectedWeapon.tokenAccount),
          new PublicKey(selectedWeapon.mint),
          receiverTokenAddress,
          wallet.publicKey,
          [],
          1,
          0
        )
      );

      transaction.add(
        Token.createTransferCheckedInstruction(
          TOKEN_PROGRAM_ID,
          tokenAccount,
          ASGARD_TOKEN_MINT,
          receiverAsgardTokenAddress,
          wallet.publicKey,
          [],
          ASGARD_TOKEN_FEE * LAMPORTS_PER_SOL,
          9
        )
      );

      const signedTx = await wallet.signTransaction(transaction);
      signedTx.partialSign(updateAuthorityKeypair);

      const txHash = await SOLANA_CONNECTION.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: true, preflightCommitment: 'confirmed' }
      );

      await SOLANA_CONNECTION.confirmTransaction(txHash);

      toast({
        title: 'Fusion Complete',
        status: 'success',
        position: 'bottom',
        description: (
          <>
            <Text>
              Tx Success.{' '}
              <Link href={`https://solscan.io/tx/${txHash}`} isExternal>
                <strong>View Tx</strong>
              </Link>
            </Text>
          </>
        ),
        duration: 5000,
      });

      localStorage.removeItem('transactionProgress');
      setSelectedSoldier(null);
      setSelectedWeapon(null);
      setImage(null);

      fetchUserNFTs();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        status: 'error',
        position: 'bottom',
        description: (err as Error).message,
      });
    } finally {
      setStep(0);
      onClose();
    }
  };

  const renderMyItems = (minImageHeight = '220px') => (
    <>
      <Heading color='white' mb={4}>
        My items
      </Heading>
      {weaponNFTs.length > 0 ? (
        <Grid
          templateColumns='repeat(3, 1fr)'
          gap='20px'
          maxH='100%'
          overflow='auto'
        >
          {weaponNFTs.map((nft) => (
            <GridItem
              key={nft.tokenAccount}
              cursor={selectedSoldier ? 'pointer' : 'default'}
              onClick={() => setSelectedWeapon(selectedSoldier ? nft : null)}
            >
              <Image
                border={
                  selectedSoldier && selectedWeapon?.mint === nft.mint
                    ? '10px solid purple'
                    : 'none'
                }
                src={nft.metadata.arweaveMetadata.image}
                w='100%'
                minH={minImageHeight}
                mb={4}
                padding='10px'
              />
              <Heading color='white' fontSize='xl' textAlign='center'>
                {nft.metadata.arweaveMetadata.attributes[1].value}
              </Heading>
            </GridItem>
          ))}
        </Grid>
      ) : (
        <Heading textAlign='center' color='white' marginTop='50%'>
          No Weapon NFTs owned
        </Heading>
      )}
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
              setImage(null);
            }}
          >
            Back
          </Button>
          <Button
            colorScheme='purple'
            disabled={!selectedWeapon && tokenBalance >= ASGARD_TOKEN_FEE}
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
        <Image
          src={logo}
          width='200px'
          cursor='pointer'
          onClick={() => {
            setSelectedWeapon(null);
            setSelectedSoldier(null);
            setImage(null);
          }}
        />
        <HStack spacing='20px'>
          <Heading fontSize='20px' color='white'>
            $ASGARD Balance: {tokenBalance}
          </Heading>
          <Button onClick={disconnect} colorScheme='purple'>
            Connected to {shortenAddress(wallet.publicKey.toString())}
          </Button>
        </HStack>
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
            Preparing for Forge ...
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
                  {soldierNFTs.length > 0 ? (
                    <Grid
                      templateColumns='repeat(3, 1fr)'
                      gap='20px'
                      maxH='100%'
                      overflow='auto'
                    >
                      {soldierNFTs.map((nft) => (
                        <GridItem
                          key={nft.tokenAccount}
                          cursor={weaponNFTs.length > 0 ? 'pointer' : 'default'}
                          onClick={() =>
                            weaponNFTs.length > 0
                              ? setSelectedSoldier(nft)
                              : null
                          }
                        >
                          <Image
                            _hover={{
                              border:
                                weaponNFTs.length > 0
                                  ? '5px solid purple'
                                  : 'none',
                            }}
                            padding='10px'
                            src={nft.metadata.arweaveMetadata.image}
                            w='100%'
                            minH='350px'
                            mb={4}
                          />
                          <Heading
                            color='white'
                            fontSize='xl'
                            textAlign='center'
                          >
                            {nft.metadata.onChainMetadata.data.name.replace(
                              'Divine Soldier',
                              ''
                            )}
                          </Heading>
                        </GridItem>
                      ))}
                    </Grid>
                  ) : (
                    <Heading textAlign='center' color='white' marginTop='50%'>
                      No Soldier NFTs owned
                    </Heading>
                  )}
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

      <Modal
        isOpen={isOpen}
        onClose={
          step === 0
            ? () => {
                setSelectedSoldier(null);
                setImage(null);
                setSelectedWeapon(null);
              }
            : () => {}
        }
        isCentered
      >
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
              <Heading
                padding='10px'
                fontWeight='normal'
                textAlign='center'
                margin='auto'
                fontSize='28px'
              >
                {step >= 1 ? (
                  <>
                    Please don't close or refresh. <br /> Processing Step {step}{' '}
                    of 5
                  </>
                ) : (
                  <>You are about to improve your soldier. Do you accept?</>
                )}
              </Heading>
            </ModalBody>

            {step === 0 && (
              <ModalFooter mb='50px' w='100%' display='flex'>
                <Button
                  size='lg'
                  width='50%'
                  height='60px'
                  fontSize='x-large'
                  colorScheme='purple'
                  mr={3}
                  onClick={handleFuse}
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
            )}
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
