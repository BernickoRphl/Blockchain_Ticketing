require("dotenv").config();
const { ethers } = require("hardhat");

async function main() { // Change PASTE_DEPLOYED_TICKET_ADDRESS to {current address var}.address
  const ticketContract = await ethers.getContractAt("EventChainTicket", "PASTE_DEPLOYED_TICKET_ADDRESS");

  const tokenId = 1;
  const tx = await ticketContract.validateTicket(tokenId);
  await tx.wait();
  console.log(`Validated ticket ${tokenId}`);
}

main().catch(console.error);
