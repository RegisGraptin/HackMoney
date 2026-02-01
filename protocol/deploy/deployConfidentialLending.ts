import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Sepolia Aave V3 Pool address
  const AAVE_POOL_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

  // Get the deployed USDC Wrapper address
  const usdcWrapper = await hre.deployments.get("ERC7984Mock");
  const WRAPPER_ADDRESS = usdcWrapper.address;

  // Deploy AaveAdapter library first
  const deployedAaveAdapter = await deploy("AaveAdapter", {
    from: deployer,
    log: true,
  });

  const deployedConfidentialLending = await deploy("ConfidentialLending", {
    from: deployer,
    args: [AAVE_POOL_ADDRESS, WRAPPER_ADDRESS, "Confidential Lending USDC", "clUSDC"],
    libraries: {
      AaveAdapter: deployedAaveAdapter.address,
    },
    log: true,
  });

  console.log(`ConfidentialLending contract: `, deployedConfidentialLending.address);
};
export default func;
func.id = "deploy_confidential_lending"; // id required to prevent reexecution
func.tags = ["ConfidentialLending"];
func.dependencies = ["ERC7984Mock"]; // Ensure ERC7984Mock is deployed first
