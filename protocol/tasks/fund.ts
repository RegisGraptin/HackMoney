import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const DEFAULT_ETH = "0.01"; // 0.01 ETH
const DEFAULT_USDC = "1000"; // 1000 USDC

const IERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

task("task:fund-eth-usdc", "Send small ETH and transfer USDC")
  .addOptionalParam("eth", "ETH amount to send (in ETH)", DEFAULT_ETH)
  .addOptionalParam("usdc", "USDC amount to transfer (in units)", DEFAULT_USDC)
  .setAction(async function (taskArgs: TaskArguments, hre) {
    const { ethers: hreEthers } = hre;

    // READ signers from env private key
    const pk1 = process.env.ACCOUNT_1_PRIVATE_KEY;
    const pk2 = process.env.ACCOUNT_2_PRIVATE_KEY;

    // Set them in an array of Wallets (derived addresses)
    const provider = hreEthers.provider;
    const accounts = [pk1, pk2]
      .filter((pk): pk is string => typeof pk === "string" && pk.trim().length > 0)
      .map((pk) => (pk.startsWith("0x") ? pk.trim() : `0x${pk.trim()}`))
      .map((pk) => new hreEthers.Wallet(pk, provider));

    if (accounts.length === 0) {
      console.warn("No env private keys found: set ACCOUNT_1_PRIVATE_KEY / ACCOUNT_2_PRIVATE_KEY.");
      return;
    }

    const [funder] = await hreEthers.getSigners();

    // Loop over accounts: send ETH then USDC
    const ethAmount = hreEthers.parseEther(taskArgs.eth as string);
    const usdcAddress = process.env.USDC_ADDRESS_SEPOLIA;

    let erc20: any | undefined;
    let usdcAmount: bigint | undefined;
    if (usdcAddress && usdcAddress.startsWith("0x") && usdcAddress.length === 42) {
      try {
        erc20 = new hreEthers.Contract(usdcAddress, IERC20_ABI, funder);
        const decimals: number = await erc20.decimals();
        usdcAmount = hreEthers.parseUnits(taskArgs.usdc as string, decimals);
      } catch (e: any) {
        console.warn(`USDC setup failed: ${e?.message || e}`);
      }
    } else {
      console.warn("USDC_ADDRESS_SEPOLIA is not set or invalid; skipping USDC transfers.");
    }

    for (const wallet of accounts) {
      const toAddress = wallet.address;
      console.log(`Funding account: ${toAddress}`);

      // Send ETH to this address
      try {
        const ethTx = await funder.sendTransaction({ to: toAddress, value: ethAmount });
        console.log(`ETH tx: ${ethTx.hash}`);
        await ethTx.wait();
      } catch (e: any) {
        console.warn(`ETH send failed for ${toAddress}: ${e?.message || e}`);
      }

      // Send USDC to this address
      if (erc20 && usdcAmount) {
        try {
          const usdcTx = await erc20.transfer(toAddress, usdcAmount);
          console.log(`USDC tx: ${usdcTx.hash}`);
          await usdcTx.wait();
        } catch (e: any) {
          console.warn(`USDC transfer failed for ${toAddress}: ${e?.message || e}`);
        }
      }
    }
  });

/**
 * Approve USDC to the ERC7984 wrapper and wrap it to cUSDC (confidential form)
 * Example:
 *   npx hardhat --network sepolia task:shield-usdc
 */
task("task:shield-usdc", "Wrap USDC into confidential cUSDC via ERC7984 wrapper")
  .addOptionalParam("amount", "USDC amount to wrap", DEFAULT_USDC)
  .setAction(async function (taskArgs: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    // Wrapper deployment
    const wrapper = await deployments.get("ERC7984Mock");

    // Env private keys
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

    // Resolve underlying USDC and decimals
    const anySigner = wallets[0];
    const wrapperForInfo = await ethers.getContractAt("ERC7984Mock", wrapper.address, anySigner);
    const usdcAddress: string = await wrapperForInfo.underlying();
    const erc20Abi = [
      "function decimals() view returns (uint8)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const erc20Info = await ethers.getContractAt(erc20Abi, usdcAddress, anySigner);
    const decimals: number = await erc20Info.decimals();
    const amountStr = taskArgs.amount as string;
    const amountUnits = ethers.parseUnits(amountStr, decimals);

    // Loop 1: approve allowance for each wallet
    for (const w of wallets) {
      const erc20 = await ethers.getContractAt(erc20Abi, usdcAddress, w);
      console.log(`Approving ${amountStr} USDC for wrapper from ${w.address} ...`);
      try {
        const tx = await erc20.approve(wrapper.address, amountUnits);
        console.log(`approve tx: ${tx.hash}`);
        await tx.wait();
      } catch (e: any) {
        console.warn(`Approval failed for ${w.address}: ${e?.message || e}`);
      }
    }

    // Loop 2: wrap tokens for each wallet
    for (const w of wallets) {
      const wrapperContract = await ethers.getContractAt("ERC7984Mock", wrapper.address, w);
      console.log(`Wrapping ${amountStr} USDC into cUSDC for ${w.address} ...`);
      try {
        const tx = await wrapperContract.wrap(w.address, amountUnits);
        console.log(`wrap tx: ${tx.hash}`);
        await tx.wait();
      } catch (e: any) {
        console.warn(`Wrap failed for ${w.address}: ${e?.message || e}`);
      }
    }

    console.log("Shielding complete.");
  });
