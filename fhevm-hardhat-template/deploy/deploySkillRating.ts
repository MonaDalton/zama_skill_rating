import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deployment script for SkillRating contract

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSkillRating = await deploy("SkillRating", {
    from: deployer,
    log: true,
  });

  console.log(`SkillRating contract: `, deployedSkillRating.address);
};
export default func;
func.id = "deploy_skillRating"; // id required to prevent reexecution
func.tags = ["SkillRating"];



