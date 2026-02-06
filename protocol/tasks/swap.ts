import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:executeRound", "Execute the round")
  .addParam("swapaddress", "Address of the ConfidentialSwap contract")
  .setAction(async function (taskArgs: TaskArguments, hre) {
    const { ethers, fhevm } = hre;

    // Initialize FHE CLI once
    await fhevm.initializeCLIApi();

    const swapAddress = taskArgs.swapaddress;

    // Get the swap contract instance
    const swap = await ethers.getContractAt("ConfidentialSwap", swapAddress);

    const currentRound = await swap.currentRound();
    const roundToExecute = currentRound - 1n;
    console.log(`Executing round: ${roundToExecute}`);

    // Get the encrypted round delta
    const encryptedRoundDelta = await swap.roundDelta(roundToExecute);
    console.log(`Encrypted round delta handle: ${encryptedRoundDelta}`);

    // Wait for the Gateway to decrypt the value
    // This will poll the Gateway until the decryption is available
    const decryptionResult = await fhevm.publicDecrypt([encryptedRoundDelta]);

    if (!decryptionResult) {
      throw new Error("Decryption not yet available. Please wait and try again.");
    }

    console.log("Decryption result received:");
    console.log(`Decrypted amount: ${decryptionResult.clearValues[encryptedRoundDelta as `0x${string}`]}`);

    console.log("Calling executeRound...");
    const tx = await swap.executeRound(decryptionResult.abiEncodedClearValues, decryptionResult.decryptionProof);
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed.toString()}`);
  });
