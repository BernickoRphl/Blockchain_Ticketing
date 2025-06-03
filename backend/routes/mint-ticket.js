const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const { pinJSONToIPFS } = require("../utils/ipfs");
const Ticket = require("../models/Ticket");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractABI = [
  "function mintTicket(address to, string memory uri, uint256 price, uint256 expiration) external payable",
  "function tokenCounter() view returns (uint256)"
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

router.post("/mint-ticket", async (req, res) => {
  const { attendeeAddress, ticketPrice, metadataURI, expirationDays } = req.body;

  try {
    const tokenId = await contract.tokenCounter();

    const metadata = {
      name: `Event Ticket #${tokenId}`,
      description: "Admission to a decentralized event.",
      image: "https://example.com/ticket.png",
      external_url: metadataURI
    };

    const ipfsURI = await pinJSONToIPFS(metadata);
    if (!ipfsURI) throw new Error("IPFS upload failed");

    const price = ethers.parseEther(ticketPrice);
    const expiration = Math.floor(Date.now() / 1000) + expirationDays * 86400;

    const tx = await contract.mintTicket(attendeeAddress, ipfsURI, price, expiration, {
      value: price
    });

    const receipt = await tx.wait();

    const newTicket = new Ticket({
      tokenId: tokenId.toString(),
      ipfsURI,
      attendee: attendeeAddress,
      txHash: receipt.hash,
      expiration
    });

    await newTicket.save();
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("Minting error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;