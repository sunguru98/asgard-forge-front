import { WalletAdapter } from '@saberhq/use-solana';
import {
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { ASGARD_TOKEN_MINT } from '../pages/ForgePage';

export const handleSendAsgard = async (
  wallet: WalletAdapter<boolean>,
  SOLANA_CONNECTION: Connection
) => {
  try {
    const updateAuthorityKeypair = Keypair.fromSecretKey(
      Uint8Array.from(
        JSON.parse(process.env.REACT_APP_UPDATE_AUTHORITY_PRIVATE!)
      )
    );

    const senderTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      ASGARD_TOKEN_MINT,
      updateAuthorityKeypair.publicKey
    );

    const receiverTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      ASGARD_TOKEN_MINT,
      wallet?.publicKey!
    );

    const transaction = new Transaction();

    if (!(await SOLANA_CONNECTION.getAccountInfo(receiverTokenAddress))) {
      transaction.add(
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          ASGARD_TOKEN_MINT,
          receiverTokenAddress,
          wallet?.publicKey!,
          wallet?.publicKey!
        )
      );
    }

    transaction.add(
      Token.createTransferCheckedInstruction(
        TOKEN_PROGRAM_ID,
        senderTokenAddress,
        ASGARD_TOKEN_MINT,
        receiverTokenAddress,
        updateAuthorityKeypair.publicKey,
        [],
        1000 * LAMPORTS_PER_SOL,
        9
      )
    );

    transaction.feePayer = wallet?.publicKey!;
    transaction.recentBlockhash = (
      await SOLANA_CONNECTION.getRecentBlockhash()
    ).blockhash;

    const signedTx = await wallet!.signTransaction(transaction);
    signedTx?.partialSign(updateAuthorityKeypair);

    const txHash = await SOLANA_CONNECTION.sendRawTransaction(
      signedTx.serialize()
    );

    await SOLANA_CONNECTION.confirmTransaction(txHash);
  } catch (err) {
    console.error(err);
  }
};
