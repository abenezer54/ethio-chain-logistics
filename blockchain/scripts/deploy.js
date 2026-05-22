const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const ShipmentAnchor = await hre.ethers.getContractFactory("ShipmentAnchor");
  const anchor = await ShipmentAnchor.deploy();
  await anchor.waitForDeployment();

  const address = await anchor.getAddress();
  const deployment = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contract: "ShipmentAnchor",
    address,
    deployer: deployer.address
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${hre.network.name}.json`),
    `${JSON.stringify(deployment, null, 2)}\n`
  );

  console.log(`ShipmentAnchor deployed to ${address}`);
  console.log(`Deployer: ${deployer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

