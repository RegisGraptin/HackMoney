import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // FIXME: Not clean use .env for the future
  const cUSDC_ADDRESS = "0xb5a33983Abe09102D006b00d7bd7B424c038f809";
  const cUNI_ADDRESS = "0xd190201eEEdcDFeCD1AC53c8E5f3B26ff0b2bB3B";

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
    args: [
      UNIVERSAL_ROUTER_ADDRESS,
      POOL_MANAGER_ADDRESS,
      PERMIT2_ADDRESS,
      QUOTER_ADDRESS,
      cUSDC_ADDRESS,
      cUNI_ADDRESS,
    ],
    log: true,
  });

  console.log(`ConfidentialSwap contract: `, deployedConfidentialSwap.address);

  // Add timeout
  await new Promise((resolve) => setTimeout(resolve, 10_000)); // Wait for 10 seconds to ensure the contract is fully propagated on the network

  // Verify call
  await hre.run("verify:verify", {
    address: deployedConfidentialSwap.address,
    constructorArguments: [
      UNIVERSAL_ROUTER_ADDRESS,
      POOL_MANAGER_ADDRESS,
      PERMIT2_ADDRESS,
      QUOTER_ADDRESS,
      cUSDC_ADDRESS,
      cUNI_ADDRESS,
    ],
  });
};

export default func;
func.id = "deploy_confidential_swap"; // id required to prevent reexecution
func.tags = ["ConfidentialSwap"];
