import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ConfidentialLending, ERC20Mock, ERC7984Mock, FHECounter, FHECounter__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { parseUnits } from "ethers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployMocksFixture() {
  // Deploy mock USDC
  const erc20Factory = await ethers.getContractFactory("ERC20Mock");
  const mockUSDC = await erc20Factory.deploy("USDC", "USDC", 6);
  const mockUSDCAddress = await mockUSDC.getAddress();

  // Deploy ERC7984 mock (Confidential cUSDC) wrapping the mock USDC
  const erc7984Factory = await ethers.getContractFactory("ERC7984Mock");
  const confidentialCUSDC = await erc7984Factory.deploy(mockUSDCAddress);
  const confidentialCUSDCAddress = await confidentialCUSDC.getAddress();

  return { mockUSDC, mockUSDCAddress, confidentialCUSDC, confidentialCUSDCAddress };
}

async function deployConfidentialLendingFixture(
  signers: Signers,
  mockUSDCAddress: string,
  confidentialCUSDCAddress: string,
) {
  // For now, use a dummy AAVE pool address since we're just testing deployment
  const dummyAavePool = signers.alice.address;

  const confidentialLendingFactory = await ethers.getContractFactory("ConfidentialLending");
  const confidentialLending = await confidentialLendingFactory.deploy(
    dummyAavePool,
    confidentialCUSDCAddress,
    "Confidential Lending cUSDC",
    "lcUSDC",
  );
  const confidentialLendingAddress = await confidentialLending.getAddress();

  return { confidentialLending, confidentialLendingAddress };
}

async function mintConfidentialTokenToUser(
  user: HardhatEthersSigner,
  amount: bigint,
  mockUSDC: ERC20Mock,
  confidentialCUSDC: ERC7984Mock,
) {
  const formattedAmount = parseUnits(amount.toString(), await mockUSDC.decimals());
  const mintTx = await mockUSDC.mint(user.address, formattedAmount);
  await mintTx.wait();
  const approveTx = await mockUSDC.connect(user).approve(await confidentialCUSDC.getAddress(), formattedAmount);
  await approveTx.wait();
  const wrapTx = await confidentialCUSDC.connect(user).wrap(user.address, formattedAmount);
  await wrapTx.wait();
}


describe("ConfidentialLending", function () {
  let signers: Signers;
  let mockUSDC: ERC20Mock;
  let mockUSDCAddress: string;
  let confidentialCUSDC: ERC7984Mock;
  let confidentialCUSDCAddress: string;
  let confidentialLending: ConfidentialLending;
  let confidentialLendingAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ mockUSDC, mockUSDCAddress, confidentialCUSDC, confidentialCUSDCAddress } = await deployMocksFixture());
    ({ confidentialLending, confidentialLendingAddress } = await deployConfidentialLendingFixture(
      signers,
      mockUSDCAddress,
      confidentialCUSDCAddress,
    ));
  });

  it("should initialize with correct deployment variables", async function () {
    const aavePoolAddress = await confidentialLending.AAVE_POOL_ADDRESS();
    const assetAddress = await confidentialLending.asset();

    expect(aavePoolAddress).to.equal(signers.alice.address);
    expect(assetAddress).to.equal(mockUSDCAddress);
  });

  it("should increase user balance when wrapping USDC", async function () {
    // Mint 1000 USDC to alice
    const amountToMint = 1000n;
    await mintConfidentialTokenToUser(signers.alice, amountToMint, mockUSDC, confidentialCUSDC);

    const encryptedAmount = await fhevm
      .createEncryptedInput(confidentialCUSDCAddress, signers.alice.address)
      .add64(amountToMint)
      .encrypt();

    const transferTx = await confidentialCUSDC
      .connect(signers.alice)
      ["confidentialTransferAndCall(address,bytes32,bytes,bytes)"]
      (confidentialLendingAddress, encryptedAmount.handles[0], encryptedAmount.inputProof, "0x");
    await transferTx.wait();

    const encryptedLendingBalance = await confidentialLending.confidentialBalanceOf(signers.alice.address);
    const clearLendingBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedLendingBalance,
      confidentialLendingAddress,
      signers.alice,
    );

    expect(clearLendingBalance).to.equal(amountToMint);
  });
});
