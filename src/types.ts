import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';

export type UserNFT = {
  tokenAccount: string;
  mint: string;
  metadata: {
    metadataPDA: string;
    onChainMetadata: MetadataData;
    arweaveMetadata: any;
  };
};

export enum DataType {
  Image = 'image/png',
  JSON = 'application/json',
  Manifest = 'application/x.arweave-manifest+json',
}
