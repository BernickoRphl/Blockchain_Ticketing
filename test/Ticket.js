const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventChainTicket", function () {
  let contract;
  let owner, attendee, validator, buyer;

  beforeEach(async function () {
    [owner, attendee, validator, buyer] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("EventChainTicket");
    contract = await Ticket.connect(owner).deploy();
    await contract.deployed();
  });

  it("should mint a new ticket", async function () {
    const metadataURI = "ipfs://ticket-metadata";
    const priceCap = ethers.utils.parseEther("1");
    const expiration = Math.floor(Date.now() / 1000) + 86400;

    const tx = await contract.mintTicket(attendee.address, metadataURI, priceCap, expiration);
    const receipt = await tx.wait();
    const tokenId = receipt.events.find((e) => e.event === "TicketMinted").args.tokenId;

    expect(await contract.ownerOf(tokenId)).to.equal(attendee.address);

    const info = await contract.getTicketInfo(tokenId);
    expect(info.metadataURI).to.equal(metadataURI);
    expect(info.resalePriceCap).to.equal(priceCap);
    expect(info.expiration).to.equal(expiration);
    expect(info.used).to.equal(false);
  });

  it("should allow validation of an unused ticket by validator", async function () {
    await contract.setValidator(validator.address, true);

    const tx = await contract.mintTicket(attendee.address, "ipfs://meta", ethers.utils.parseEther("1"), Math.floor(Date.now() / 1000) + 1000);
    const receipt = await tx.wait();
    const tokenId = receipt.events.find((e) => e.event === "TicketMinted").args.tokenId;

    await contract.connect(validator).validateTicket(tokenId);
    const info = await contract.getTicketInfo(tokenId);
    expect(info.used).to.equal(true);
  });

  it("should enforce resale price cap", async function () {
    const tx = await contract.mintTicket(attendee.address, "ipfs://meta", ethers.utils.parseEther("0.5"), Math.floor(Date.now() / 1000) + 1000);
    const receipt = await tx.wait();
    const tokenId = receipt.events.find((e) => e.event === "TicketMinted").args.tokenId;

    await contract.connect(attendee).approve(buyer.address, tokenId);

    // Fails if price is higher than cap
    await expect(
      contract.connect(attendee).transferTicket(buyer.address, tokenId, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("Price cap exceeded");

    // Succeeds within cap
    await contract.connect(attendee).transferTicket(buyer.address, tokenId, ethers.utils.parseEther("0.4"));
    expect(await contract.ownerOf(tokenId)).to.equal(buyer.address);
  });

  it("should allow organizer to revoke a ticket", async function () {
    const tx = await contract.mintTicket(attendee.address, "ipfs://meta", ethers.utils.parseEther("1"), Math.floor(Date.now() / 1000) + 1000);
    const receipt = await tx.wait();
    const tokenId = receipt.events.find((e) => e.event === "TicketMinted").args.tokenId;

    await contract.revokeTicket(tokenId);

    await expect(contract.ownerOf(tokenId)).to.be.revertedWith("ERC721: invalid token ID");
  });

  it("should allow setting and getting ticket info", async function () {
    const metadata = "ipfs://abc";
    const tx = await contract.mintTicket(attendee.address, metadata, 100, 9999999999);
    const receipt = await tx.wait();
    const tokenId = receipt.events.find((e) => e.event === "TicketMinted").args.tokenId;

    const ticket = await contract.getTicketInfo(tokenId);
    expect(ticket.metadataURI).to.equal(metadata);
  });
});
