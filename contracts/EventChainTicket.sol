// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title EventChainTicket
/// @dev ERC721 ticket with resale cap, expiration, and validation
contract EventChainTicket is ERC721, Ownable {
    uint256 private _tokenIds;

    struct TicketInfo {
        string metadataURI;
        uint256 resalePriceCap;
        uint256 expiration;
        bool used;
    }

    mapping(uint256 => TicketInfo) private _tickets;
    mapping(address => bool) public validators;

    // Only the contract owner (organizer) may call
    modifier onlyOrganizer() {
        require(owner() == msg.sender, "Caller is not organizer");
        _;
    }
    // Must not be past the stored expiration timestamp
    modifier onlyBeforeExpiration(uint256 tokenId) {
        require(block.timestamp <= _tickets[tokenId].expiration, "Ticket expired");
        _;
    }
    // Must not have been validated (used) already
    modifier onlyUnused(uint256 tokenId) {
        require(!_tickets[tokenId].used, "Ticket already used");
        _;
    }
    // Only a whitelisted validator or the organizer can call
    modifier onlyValidator() {
        require(validators[msg.sender] || owner() == msg.sender, "Not authorized to validate");
        _;
    }

    /// @notice Constructor: supply ERC721 name & symbol, and set msg.sender as Ownable owner
    constructor() ERC721("EventChain EVT Ticket", "EVT") Ownable(msg.sender) {}

    /// @notice Mint a new ticket NFT to `attendee`
    function mintTicket(
        address attendee,
        string calldata metadataURI,
        uint256 priceCap,
        uint256 expirationTimestamp
    ) external onlyOrganizer returns (uint256) {
        _tokenIds += 1;
        uint256 newId = _tokenIds;
        _safeMint(attendee, newId);
        _tickets[newId] = TicketInfo({
            metadataURI: metadataURI,
            resalePriceCap: priceCap,
            expiration: expirationTimestamp,
            used: false
        });
        emit TicketMinted(newId, attendee, metadataURI);
        emit ResaleLimitSet(newId, priceCap);
        emit ExpirationSet(newId, expirationTimestamp);
        return newId;
    }

    /// @notice Validate (use) the ticket at entry
    function validateTicket(uint256 tokenId)
        external
        onlyValidator
        onlyBeforeExpiration(tokenId)
        onlyUnused(tokenId)
    {
        _tickets[tokenId].used = true;
        emit TicketValidated(tokenId, msg.sender);
    }

    /// @notice Grant or revoke validation rights
    function setValidator(address validator, bool status) external onlyOrganizer {
        validators[validator] = status;
    }

    /// @notice Transfer ticket with price enforcement
    function transferTicket(address to, uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(price <= _tickets[tokenId].resalePriceCap, "Price cap exceeded");
        _transfer(msg.sender, to, tokenId);
        emit TicketTransferred(tokenId, msg.sender, to, price);
    }

    /// @notice Owner can adjust the resale price cap
    function setResaleLimit(uint256 tokenId, uint256 newCap) external onlyOrganizer {
        _tickets[tokenId].resalePriceCap = newCap;
        emit ResaleLimitSet(tokenId, newCap);
    }

    /// @notice Owner can adjust the expiration timestamp
    function setExpiration(uint256 tokenId, uint256 newExpiration) external onlyOrganizer {
        _tickets[tokenId].expiration = newExpiration;
        emit ExpirationSet(tokenId, newExpiration);
    }

    /// @notice Owner can revoke (burn) a ticket
    function revokeTicket(uint256 tokenId) external onlyOrganizer {
        _burn(tokenId);
        delete _tickets[tokenId];
        emit TicketRevoked(tokenId);
    }

    /// @notice Read-only: return stored TicketInfo
    function getTicketInfo(uint256 tokenId) external view returns (TicketInfo memory) {
        return _tickets[tokenId];
    }

    /// @notice Override tokenURI() to return the stored metadataURI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // revert if nonexistent
        return _tickets[tokenId].metadataURI;
    }

    // We can still override transferFrom and the 4-argument safeTransferFrom,
    // since those remain virtual. But the 2-argument safeTransferFrom is non-virtual,
    // so we must remove its override.

    function transferFrom(address, address, uint256) public pure override {
        revert("Use transferTicket()");
    }

    // Remove this (2-argument) override because in OZ v5 it is no longer virtual:
    // function safeTransferFrom(address, address, uint256) public pure override {
    //     revert("Use transferTicket()");
    // }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
    revert("Use transferTicket()");
    }


    // Events
    event TicketMinted(uint256 indexed tokenId, address indexed attendee, string metadataURI);
    event TicketValidated(uint256 indexed tokenId, address indexed validator);
    event ResaleLimitSet(uint256 indexed tokenId, uint256 priceCap);
    event ExpirationSet(uint256 indexed tokenId, uint256 expirationTimestamp);
    event TicketRevoked(uint256 indexed tokenId);
    event TicketTransferred(uint256 indexed tokenId, address from, address to, uint256 price);
}
