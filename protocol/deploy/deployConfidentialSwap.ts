import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Get environment variables from .env
  const UNIVERSAL_ROUTER_ADDRESS = process.env.UNI_UNIVERSAL_ROUTER_SEPOLIA;
  const POOL_MANAGER_ADDRESS = process.env.UNI_POOL_MANAGER_SEPOLIA;
  const PERMIT2_ADDRESS = process.env.PERMIT2_SEPOLIA;

  if (!UNIVERSAL_ROUTER_ADDRESS || !POOL_MANAGER_ADDRESS || !PERMIT2_ADDRESS) {
    throw new Error(
      "Missing required environment variables: UNI_UNIVERSAL_ROUTER_SEPOLIA, UNI_POOL_MANAGER_SEPOLIA, or PERMIT2_SEPOLIA"
    );
  }

  // Get the deployed USDC Wrapper address (ERC7984Mock)
  const usdcWrapper = await hre.deployments.get("ERC7984Mock");
  const WRAPPER_ADDRESS = usdcWrapper.address;

  const deployedConfidentialSwap = await deploy("ConfidentialSwap", {
    from: deployer,
    args: [WRAPPER_ADDRESS, UNIVERSAL_ROUTER_ADDRESS, POOL_MANAGER_ADDRESS, PERMIT2_ADDRESS],
    log: true,
  });

  console.log(`ConfidentialSwap contract: `, deployedConfidentialSwap.address);
};

export default func;
func.id = "deploy_confidential_swap"; // id required to prevent reexecution
func.tags = ["ConfidentialSwap"];
func.dependencies = ["ERC7984Mock"]; // Ensure ERC7984Mock is deployed first
