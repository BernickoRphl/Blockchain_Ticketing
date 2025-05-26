const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EventChainTicket", function () {
    let eventTicket;
    let owner, attendee1, attendee2, validator1, validator2, unauthorizedUser;
    let futureExpiration, pastExpiration;

    beforeEach(async function () {
        // Get signers
        [owner, attendee1, attendee2, validator1, validator2, unauthorizedUser] = await ethers.getSigners();

        // Deploy contract
        const EventTicket = await ethers.getContractFactory("EventChainTicket");
        eventTicket = await EventTicket.deploy();
        await eventTicket.waitForDeployment();

        // Set up time constants
        const currentTime = await time.latest();
        futureExpiration = currentTime + 86400; // 24 hours from now
        pastExpiration = currentTime - 3600; // 1 hour ago

        // Set up validator
        await eventTicket.setValidator(validator1.address, true);
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await eventTicket.name()).to.equal("EventChain EVT Ticket");
            expect(await eventTicket.symbol()).to.equal("EVT");
        });

        it("Should set the deployer as owner", async function () {
            expect(await eventTicket.owner()).to.equal(owner.address);
        });
    });

    describe("Minting Tickets", function () {
        it("Should mint a ticket successfully with correct parameters", async function () {
            const metadataURI = "ipfs://QmTest123";
            const priceCap = ethers.parseEther("0.1");

            const tx = await eventTicket.mintTicket(
                attendee1.address,
                metadataURI,
                priceCap,
                futureExpiration
            );

            // Check token was minted
            expect(await eventTicket.ownerOf(1)).to.equal(attendee1.address);
            expect(await eventTicket.tokenURI(1)).to.equal(metadataURI);

            // Check ticket info
            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.metadataURI).to.equal(metadataURI);
            expect(ticketInfo.resalePriceCap).to.equal(priceCap);
            expect(ticketInfo.expiration).to.equal(futureExpiration);
            expect(ticketInfo.used).to.be.false;

            // Check events were emitted
            await expect(tx)
                .to.emit(eventTicket, "TicketMinted")
                .withArgs(1, attendee1.address, metadataURI);
            await expect(tx)
                .to.emit(eventTicket, "ResaleLimitSet")
                .withArgs(1, priceCap);
            await expect(tx)
                .to.emit(eventTicket, "ExpirationSet")
                .withArgs(1, futureExpiration);
        });

        it("Should increment token IDs correctly", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test1",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            await eventTicket.mintTicket(
                attendee2.address,
                "ipfs://test2",
                ethers.parseEther("0.2"),
                futureExpiration
            );

            expect(await eventTicket.ownerOf(1)).to.equal(attendee1.address);
            expect(await eventTicket.ownerOf(2)).to.equal(attendee2.address);
        });

        it("Should only allow organizer to mint tickets", async function () {
            await expect(
                eventTicket.connect(attendee1).mintTicket(
                    attendee2.address,
                    "ipfs://test",
                    ethers.parseEther("0.1"),
                    futureExpiration
                )
            ).to.be.revertedWith("Caller is not organizer");
        });

        it("Should store metadata URI correctly", async function () {
            const metadataURI = "ipfs://QmExampleHash123";
            
            await eventTicket.mintTicket(
                attendee1.address,
                metadataURI,
                ethers.parseEther("0.1"),
                futureExpiration
            );

            expect(await eventTicket.tokenURI(1)).to.equal(metadataURI);
        });
    });

    describe("Validating Tickets", function () {
        beforeEach(async function () {
            // Mint a ticket for testing
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );
        });

        it("Should validate ticket successfully by authorized validator", async function () {
            const tx = await eventTicket.connect(validator1).validateTicket(1);

            // Check ticket is marked as used
            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.used).to.be.true;

            // Check event was emitted
            await expect(tx)
                .to.emit(eventTicket, "TicketValidated")
                .withArgs(1, validator1.address);
        });

        it("Should allow organizer to validate tickets", async function () {
            const tx = await eventTicket.connect(owner).validateTicket(1);

            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.used).to.be.true;

            await expect(tx)
                .to.emit(eventTicket, "TicketValidated")
                .withArgs(1, owner.address);
        });

        it("Should reject validation by unauthorized users", async function () {
            await expect(
                eventTicket.connect(unauthorizedUser).validateTicket(1)
            ).to.be.revertedWith("Not authorized to validate");
        });

        it("Should reject validation of already used tickets", async function () {
            // First validation should succeed
            await eventTicket.connect(validator1).validateTicket(1);

            // Second validation should fail
            await expect(
                eventTicket.connect(validator1).validateTicket(1)
            ).to.be.revertedWith("Ticket already used");
        });

        it("Should reject validation of expired tickets", async function () {
            // Mint an expired ticket
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://expired",
                ethers.parseEther("0.1"),
                pastExpiration
            );

            await expect(
                eventTicket.connect(validator1).validateTicket(2)
            ).to.be.revertedWith("Ticket expired");
        });
    });

    describe("Ticket Status Checking", function () {
        it("Should return correct ticket info", async function () {
            const metadataURI = "ipfs://test123";
            const priceCap = ethers.parseEther("0.5");

            await eventTicket.mintTicket(
                attendee1.address,
                metadataURI,
                priceCap,
                futureExpiration
            );

            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.metadataURI).to.equal(metadataURI);
            expect(ticketInfo.resalePriceCap).to.equal(priceCap);
            expect(ticketInfo.expiration).to.equal(futureExpiration);
            expect(ticketInfo.used).to.be.false;
        });

        it("Should show correct used status after validation", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            // Before validation
            let ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.used).to.be.false;

            // After validation
            await eventTicket.connect(validator1).validateTicket(1);
            ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.used).to.be.true;
        });

        it("Should show correct status after ownership transfer", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("1"),
                futureExpiration
            );

            // Transfer ticket
            await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                ethers.parseEther("0.5")
            );

            // Owner should have changed
            expect(await eventTicket.ownerOf(1)).to.equal(attendee2.address);

            // Ticket info should remain the same
            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.used).to.be.false;
            expect(ticketInfo.expiration).to.equal(futureExpiration);
        });
    });

    describe("Access Control", function () {
        it("Should allow only owner to add/remove validators", async function () {
            // Owner should be able to add validator
            await eventTicket.setValidator(validator2.address, true);
            expect(await eventTicket.validators(validator2.address)).to.be.true;

            // Owner should be able to remove validator
            await eventTicket.setValidator(validator2.address, false);
            expect(await eventTicket.validators(validator2.address)).to.be.false;

            // Non-owner should not be able to set validators
            await expect(
                eventTicket.connect(attendee1).setValidator(validator2.address, true)
            ).to.be.revertedWith("Caller is not organizer");
        });

        it("Should allow only owner to set resale limits", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            const newCap = ethers.parseEther("0.2");

            // Owner should be able to set resale limit
            const tx = await eventTicket.setResaleLimit(1, newCap);
            
            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.resalePriceCap).to.equal(newCap);

            await expect(tx)
                .to.emit(eventTicket, "ResaleLimitSet")
                .withArgs(1, newCap);

            // Non-owner should not be able to set resale limit
            await expect(
                eventTicket.connect(attendee1).setResaleLimit(1, ethers.parseEther("0.3"))
            ).to.be.revertedWith("Caller is not organizer");
        });

        it("Should allow only owner to set expiration dates", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            const newExpiration = futureExpiration + 86400; // Add one more day

            // Owner should be able to set expiration
            const tx = await eventTicket.setExpiration(1, newExpiration);
            
            const ticketInfo = await eventTicket.getTicketInfo(1);
            expect(ticketInfo.expiration).to.equal(newExpiration);

            await expect(tx)
                .to.emit(eventTicket, "ExpirationSet")
                .withArgs(1, newExpiration);

            // Non-owner should not be able to set expiration
            await expect(
                eventTicket.connect(attendee1).setExpiration(1, newExpiration + 86400)
            ).to.be.revertedWith("Caller is not organizer");
        });

        it("Should allow only owner to revoke tickets", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            // Owner should be able to revoke ticket
            const tx = await eventTicket.revokeTicket(1);

            await expect(tx)
                .to.emit(eventTicket, "TicketRevoked")
                .withArgs(1);

            // Ticket should no longer exist
            await expect(eventTicket.ownerOf(1)).to.be.reverted;

            // Non-owner should not be able to revoke tickets
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test2",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            await expect(
                eventTicket.connect(attendee1).revokeTicket(2)
            ).to.be.revertedWith("Caller is not organizer");
        });

        it("Should allow only ticket owners to transfer their tickets", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("1"),
                futureExpiration
            );

            // Owner should be able to transfer
            await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                ethers.parseEther("0.5")
            );

            expect(await eventTicket.ownerOf(1)).to.equal(attendee2.address);

            // Non-owner should not be able to transfer
            await expect(
                eventTicket.connect(attendee1).transferTicket(
                    attendee2.address,
                    1,
                    ethers.parseEther("0.5")
                )
            ).to.be.revertedWith("Not ticket owner");
        });
    });

    describe("Transfer and Resale Price Cap", function () {
        beforeEach(async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("1"), // Price cap of 1 ETH
                futureExpiration
            );
        });

        it("Should allow transfer within price cap", async function () {
            const transferPrice = ethers.parseEther("0.8"); // Below cap

            const tx = await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                transferPrice
            );

            expect(await eventTicket.ownerOf(1)).to.equal(attendee2.address);

            await expect(tx)
                .to.emit(eventTicket, "TicketTransferred")
                .withArgs(1, attendee1.address, attendee2.address, transferPrice);
        });

        it("Should reject transfer above price cap", async function () {
            const transferPrice = ethers.parseEther("1.5"); // Above cap

            await expect(
                eventTicket.connect(attendee1).transferTicket(
                    attendee2.address,
                    1,
                    transferPrice
                )
            ).to.be.revertedWith("Price cap exceeded");
        });

        it("Should allow transfer at exact price cap", async function () {
            const transferPrice = ethers.parseEther("1"); // Exactly at cap

            await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                transferPrice
            );

            expect(await eventTicket.ownerOf(1)).to.equal(attendee2.address);
        });

        it("Should block standard ERC721 transfers", async function () {
            await expect(
                eventTicket.connect(attendee1).transferFrom(
                    attendee1.address,
                    attendee2.address,
                    1
                )
            ).to.be.revertedWith("Use transferTicket()");

            await expect(
                eventTicket.connect(attendee1)["safeTransferFrom(address,address,uint256,bytes)"](
                    attendee1.address,
                    attendee2.address,
                    1,
                    "0x"
                )
            ).to.be.revertedWith("Use transferTicket()");
        });
    });

    describe("Event Logging", function () {
        it("Should emit events with correct parameters for minting", async function () {
            const metadataURI = "ipfs://test123";
            const priceCap = ethers.parseEther("0.5");

            const tx = await eventTicket.mintTicket(
                attendee1.address,
                metadataURI,
                priceCap,
                futureExpiration
            );

            await expect(tx)
                .to.emit(eventTicket, "TicketMinted")
                .withArgs(1, attendee1.address, metadataURI);
            await expect(tx)
                .to.emit(eventTicket, "ResaleLimitSet")
                .withArgs(1, priceCap);
            await expect(tx)
                .to.emit(eventTicket, "ExpirationSet")
                .withArgs(1, futureExpiration);
        });

        it("Should emit events for price cap changes", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            const newCap = ethers.parseEther("0.2");
            const tx = await eventTicket.setResaleLimit(1, newCap);

            await expect(tx)
                .to.emit(eventTicket, "ResaleLimitSet")
                .withArgs(1, newCap);
        });

        it("Should emit events for expiration changes", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            const newExpiration = futureExpiration + 86400;
            const tx = await eventTicket.setExpiration(1, newExpiration);

            await expect(tx)
                .to.emit(eventTicket, "ExpirationSet")
                .withArgs(1, newExpiration);
        });

        it("Should emit events for ticket revocation", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            const tx = await eventTicket.revokeTicket(1);

            await expect(tx)
                .to.emit(eventTicket, "TicketRevoked")
                .withArgs(1);
        });

        it("Should emit events for transfers with price information", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("1"),
                futureExpiration
            );

            const transferPrice = ethers.parseEther("0.5");
            const tx = await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                transferPrice
            );

            await expect(tx)
                .to.emit(eventTicket, "TicketTransferred")
                .withArgs(1, attendee1.address, attendee2.address, transferPrice);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should revert when trying to get info for non-existent token", async function () {
            await expect(eventTicket.tokenURI(999)).to.be.reverted;
        });

        it("Should handle zero price transfers", async function () {
            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("1"),
                futureExpiration
            );

            // Should allow zero price transfer (free transfer)
            await eventTicket.connect(attendee1).transferTicket(
                attendee2.address,
                1,
                0
            );

            expect(await eventTicket.ownerOf(1)).to.equal(attendee2.address);
        });

        it("Should handle multiple validators correctly", async function () {
            await eventTicket.setValidator(validator2.address, true);

            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                futureExpiration
            );

            // Both validators should be able to validate
            await eventTicket.connect(validator1).validateTicket(1);

            // But can't validate twice
            await expect(
                eventTicket.connect(validator2).validateTicket(1)
            ).to.be.revertedWith("Ticket already used");
        });

        it("Should handle expiration boundary correctly", async function () {
            const currentTime = await time.latest();
            const nearExpiration = currentTime + 10; // Give more buffer time

            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test",
                ethers.parseEther("0.1"),
                nearExpiration
            );

            // Should work before expiration
            await eventTicket.connect(validator1).validateTicket(1);
        });

        it("Should reject validation exactly at expiration boundary", async function () {
            const currentTime = await time.latest();
            const exactExpiration = currentTime + 1;

            await eventTicket.mintTicket(
                attendee1.address,
                "ipfs://test2",
                ethers.parseEther("0.1"),
                exactExpiration
            );

            // Advance time to exactly the expiration time + 1 second
            await time.increaseTo(exactExpiration + 1);

            // Should fail validation after expiration
            await expect(
                eventTicket.connect(validator1).validateTicket(2)
            ).to.be.revertedWith("Ticket expired");
        });
    });
});