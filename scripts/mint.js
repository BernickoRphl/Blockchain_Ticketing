require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("hardhat");
const { pinJSONToIPFS } = require("../utils/ipfs");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const nftSchema = new mongoose.Schema({
  tokenId: Number,
  ipfsURI: String,
  attendee: String,
  txHash: String,
  expiration: Number,
});

const Ticket = mongoose.model("Ticket", nftSchema);

async function main() { // Change PASTE_DEPLOYED_TICKET_ADDRESS to {current address var}.address
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const [organizer] = await ethers.getSigners();
  const ticketContract = await ethers.getContractAt("EventChainTicket", "PASTE_DEPLOYED_TICKET_ADDRESS");

  const tokenId = await ticketContract.tokenCounter();

  const metadata = {
    name: `Event Ticket #${tokenId}`,
    description: "Admission to a decentralized event.",
    image: "https://example.com/ticket.png"
  };

  const ipfsURI = await pinJSONToIPFS(metadata);
  const expiration = (await time.latest()) + 86400;
  const priceCap = ethers.parseEther("0.05");

  const tx = await ticketContract.mintTicket(organizer.address, ipfsURI, priceCap, expiration);
  const receipt = await tx.wait();

  await new Ticket({
    tokenId: tokenId.toString(),
    ipfsURI,
    attendee: organizer.address,
    txHash: receipt.transactionHash,
    expiration
  }).save();

  console.log(`Minted ticket #${tokenId} | IPFS: ${ipfsURI}`);
}

main().catch(console.error);