import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Get environment variables from .env
  const UNIVERSAL_ROUTER_ADDRESS = process.env.UNI_UNIVERSAL_ROUTER_SEPOLIA;
  const POOL_MANAGER_ADDRESS = process.env.UNI_POOL_MANAGER_SEPOLIA;
  const PERMIT2_ADDRESS = process.env.PERMIT2_SEPOLIA;
  const QUOTER_ADDRESS = process.env.UNI_QUOTER_SEPOLIA;

  if (!UNIVERSAL_ROUTER_ADDRESS || !POOL_MANAGER_ADDRESS || !PERMIT2_ADDRESS || !QUOTER_ADDRESS) {
    throw new Error(
      "Missing required environment variables: UNI_UNIVERSAL_ROUTER_SEPOLIA, UNI_POOL_MANAGER_SEPOLIA, PERMIT2_SEPOLIA, or UNI_QUOTER_SEPOLIA",
    );
  }

  const deployedConfidentialSwap = await deploy("ConfidentialSwap", {
    from: deployer,
    args: [UNIVERSAL_ROUTER_ADDRESS, POOL_MANAGER_ADDRESS, PERMIT2_ADDRESS, QUOTER_ADDRESS],
    log: true,
  });

  console.log(`ConfidentialSwap contract: `, deployedConfidentialSwap.address);
};

export default func;
func.id = "deploy_confidential_swap"; // id required to prevent reexecution
func.tags = ["ConfidentialSwap"];
func.dependencies = ["ERC7984Mock"]; // Ensure ERC7984Mock is deployed first
