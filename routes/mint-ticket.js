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
    const currentTokenId = await contract.tokenCounter();
    const tokenId = Number(currentTokenId); // Ensure it's stored as Number

    const metadata = {
      name: `Event Ticket #${tokenId}`,
      description: "Admission to a decentralized event.",
      image: "https://example.com/ticket.png",
      external_url: metadataURI
    };

    const ipfsURI = await pinJSONToIPFS(metadata);
    if (!ipfsURI) throw new Error("IPFS upload failed");

    const price = ethers.parseEther(ticketPrice);
    const expiration = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000); // JS Date

    const tx = await contract.mintTicket(attendeeAddress, ipfsURI, price, Math.floor(expiration.getTime() / 1000), {
      value: price
    });
    const receipt = await tx.wait();

    const newTicket = new Ticket({
      tokenId,
      metadataURI: ipfsURI,
      owner: attendeeAddress,
      resaleCapETH: ticketPrice,
      expiration,
      used: false,
      status: "active",
      createdAt: new Date()
    });

    await newTicket.save();

    res.json({ success: true, txHash: receipt.hash, tokenId });
  } catch (err) {
    console.error("Minting error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;