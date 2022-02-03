import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

import {
  Edition,
  MasterEdition,
  Metadata,
  MetadataKey,
} from '@metaplex-foundation/mpl-token-metadata';
import axios from 'axios';

async function getMetadata(connection: Connection, mint: PublicKey) {
  const metadataPDA = await Metadata.getPDA(mint);
  const { data: metadata } = await Metadata.load(connection, metadataPDA);

  const { data: arweaveMetadata } = await axios.get(metadata.data.uri);

  return {
    metadataPDA: metadataPDA.toString(),
    onChainMetadata: metadata,
    arweaveMetadata,
  };
}

async function getMasterEdition(connection: Connection, mint: PublicKey) {
  const masterEditionPDA = await Edition.getPDA(mint);
  const editionAccountInfo = await connection.getAccountInfo(masterEditionPDA);

  if (editionAccountInfo) {
    const key = editionAccountInfo?.data[0];
    let masterEditionData;

    switch (key) {
      case MetadataKey.MasterEditionV1:
      case MetadataKey.MasterEditionV2:
        const { data } = new MasterEdition(
          masterEditionPDA,
          editionAccountInfo
        );
        masterEditionData = data;
        break;
      default:
        masterEditionData = undefined;
        break;
    }

    return {
      masterEditionPDA: masterEditionPDA.toString(),
      masterEditionData,
    };
  }

  return null;
}

export async function getUserNFTs(connection: Connection, user: PublicKey) {
  const { value: tokens } = await connection.getParsedTokenAccountsByOwner(
    user,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  const filteredTokens = await Promise.all(
    tokens
      .filter((token) => {
        const { tokenAmount } = token.account.data.parsed.info;
        return tokenAmount.decimals === 0 && tokenAmount.uiAmount === 1;
      })
      .map(async (t) => ({
        tokenAccount: t.pubkey.toString(),
        mint: new PublicKey(t.account.data.parsed.info.mint).toString(),
        metadata: await getMetadata(
          connection,
          t.account.data.parsed.info.mint
        ),
        masterEdition: await getMasterEdition(
          connection,
          t.account.data.parsed.info.mint
        ),
      }))
  );

  return filteredTokens.filter((filteredToken: any) => {
    return (
      filteredToken.mint &&
      filteredToken.metadata.arweaveMetadata &&
      filteredToken.metadata.onChainMetadata
    );
  });
}
