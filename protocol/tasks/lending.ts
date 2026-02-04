import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Supply confidential USDC into the ConfidentialLending pool by transferring cUSDC with encrypted amount
 * Example:
 *   npx hardhat --network sepolia task:lend --amount 5
 */
task("task:lend", "Supply liquidity into Aave via ConfidentialLending")
  .addOptionalParam("amount", "Amount of USDC to supply (in units)", "5")
  .setAction(async function (taskArgs: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    // Initialize FHE CLI once
    await fhevm.initializeCLIApi();

    // Load env wallets (pk1, pk2)
    const pk1 = process.env.ACCOUNT_1_PRIVATE_KEY;
    const pk2 = process.env.ACCOUNT_2_PRIVATE_KEY;
    const provider = ethers.provider;
    const wallets = [pk1, pk2]
      .filter((pk): pk is string => typeof pk === "string" && pk.trim().length > 0)
      .map((pk) => (pk.startsWith("0x") ? pk.trim() : `0x${pk.trim()}`))
      .map((pk) => new ethers.Wallet(pk, provider));

    if (wallets.length === 0) {
      console.warn("No env private keys found: set ACCOUNT_1_PRIVATE_KEY / ACCOUNT_2_PRIVATE_KEY.");
      return;
    }

    const wrapper = await deployments.get("ERC7984Mock");
    const lending = await deployments.get("ConfidentialLending");

    // Parse amount using underlying decimals once
    const infoSigner = wallets[0];
    const wrapperInfo = await ethers.getContractAt("ERC7984Mock", wrapper.address, infoSigner);
    const usdcAddress: string = await wrapperInfo.underlying();
    const erc20Info = await ethers.getContractAt(["function decimals() view returns (uint8)"], usdcAddress, infoSigner);
    const decimals: number = await erc20Info.decimals();
    const amountStr = taskArgs.amount as string;
    const amountUnits = ethers.parseUnits(amountStr, decimals);
    const amountNum = Number(amountUnits);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new Error(`Invalid amount to encrypt: ${amountUnits.toString()}`);
    }

    // Iterate all wallets: encrypt per wallet and transfer
    for (const w of wallets) {
      console.log(
        `Supplying ${amountStr} USDC (encrypted) via cUSDC transfer to ConfidentialLending for ${w.address} ...`,
      );
      const encrypted = await fhevm.createEncryptedInput(wrapper.address, w.address).add64(amountNum).encrypt();
      const wrapperContract = await ethers.getContractAt("ERC7984Mock", wrapper.address, w);
      try {
        const tx = await wrapperContract["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
          lending.address,
          encrypted.handles[0],
          encrypted.inputProof,
          "0x",
        );
        console.log(`supply tx (${w.address}): ${tx.hash}`);
        await tx.wait();
      } catch (e: any) {
        console.warn(`Supply failed for ${w.address}: ${e?.message || e}`);
      }
    }

    console.log("Supply requests submitted for all wallets. They will be processed in the next round.");
  });
