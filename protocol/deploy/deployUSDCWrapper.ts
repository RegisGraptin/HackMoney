import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // USDC address used by AAVE on sepolia
  const USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

  const deployedUSDCWrapper = await deploy("ERC7984Mock", {
    from: deployer,
    args: [USDC_ADDRESS],
    log: true,
  });

  console.log(`cUSDC Wrapper contract: `, deployedUSDCWrapper.address);
};
export default func;
func.id = "deploy_usdc_wrapper"; // id required to prevent reexecution
func.tags = ["ERC7984Mock"];
