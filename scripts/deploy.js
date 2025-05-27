require("dotenv").config();
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
  const [deployer] = await ethers.getSigners();

  const EventChainTicket = await ethers.getContractFactory("EventChainTicket");
  const ticketContract = await EventChainTicket.deploy();
  await ticketContract.deployed();
  console.log("EventChainTicket deployed to:", ticketContract.address);

  const Lock = await ethers.getContractFactory("Lock");
  const currentTime = await time.latest()
  const unlockTime = currentTime + 86400;
  
  const lockContract = await Lock.deploy(unlockTime, { value: ethers.parseEther("0.1") });
  await lockContract.deployed();
  console.log("Lock contract deployed to:", lockContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});