const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EventChainTicket contract...");

  // Get the ContractFactory and Signers here.
  const EventChainTicket = await ethers.getContractFactory("EventChainTicket");
  
  // Deploy the contract
  const eventChainTicket = await EventChainTicket.deploy();
  
  // Wait for deployment to finish
  await eventChainTicket.waitForDeployment();
  
  const contractAddress = await eventChainTicket.getAddress();
  console.log("EventChainTicket deployed to:", contractAddress);

  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Get the actual ABI from the compiled contract
  const contractInfo = {
  address: contractAddress,
  abi: JSON.parse(EventChainTicket.interface.formatJson()) // Format yang benar
};

  fs.writeFileSync(
    path.join(contractsDir, "EventChainTicket.json"),
    JSON.stringify(contractInfo, null, 2)
  );

  console.log("Contract info saved to src/contracts/EventChainTicket.json");
  console.log("\nTo use in frontend, update CONTRACT_ADDRESS to:", contractAddress);
  
  // Verify deployment by calling owner function
  try {
    const owner = await eventChainTicket.owner();
    console.log("Contract owner:", owner);
  } catch (error) {
    console.log("Note: owner() function may not exist in this contract");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });