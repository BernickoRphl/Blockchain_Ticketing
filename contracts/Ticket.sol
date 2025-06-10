// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventChainTicket
 * @dev ERC721-based ticketing contract with resale cap, expiration, and validation
 */
contract EventChainTicket is ERC721, Ownable {
    uint256 private _tokenIds;

    // Events
    event TicketMinted(
        uint256 indexed tokenId,
        address indexed attendee,
        string metadataURI
    );
    event TicketValidated(uint256 indexed tokenId, address indexed validator);
    event ResaleLimitSet(uint256 indexed tokenId, uint256 priceCap);
    event ExpirationSet(uint256 indexed tokenId, uint256 expirationTimestamp);
    event TicketRevoked(uint256 indexed tokenId);
    event TicketTransferred(
        uint256 indexed tokenId,
        address from,
        address to,
        uint256 price
    );

    // Ticket data
    struct TicketInfo {
        string metadataURI;
        uint256 resalePriceCap;
        uint256 expiration;
        bool used;
        string name;
    }

    mapping(uint256 => TicketInfo) private _tickets;

    // Authorized validators
    mapping(address => bool) public validators;

    // Modifiers
    modifier onlyOrganizer() {
        require(owner() == msg.sender, "Caller is not organizer");
        _;
    }

    modifier onlyBeforeExpiration(uint256 tokenId) {
        require(
            block.timestamp <= _tickets[tokenId].expiration,
            "Ticket expired"
        );
        _;
    }

    modifier onlyUnused(uint256 tokenId) {
        require(!_tickets[tokenId].used, "Ticket already used");
        _;
    }

    modifier onlyValidator() {
        require(
            validators[msg.sender] || owner() == msg.sender,
            "Not authorized to validate"
        );
        _;
    }

    /**
     * @dev Constructor sets token name and symbol
     */
    constructor() ERC721("EventChain EVT Ticket", "EVT") Ownable(msg.sender) {}

    /**
     * @dev Mint a new ticket NFT to attendee
     */
    function mintTicket(
        address attendee,
        string calldata metadataURI,
        uint256 priceCap,
        uint256 expirationTimestamp
        string name;
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

    /**
     * @dev Validate (use) the ticket at entry
     */
    function validateTicket(
        uint256 tokenId
    ) external onlyValidator onlyBeforeExpiration(tokenId) onlyUnused(tokenId) {
        _tickets[tokenId].used = true;
        emit TicketValidated(tokenId, msg.sender);
    }

    /**
     * @dev Add or remove validator
     */
    function setValidator(
        address validator,
        bool status
    ) external onlyOrganizer {
        validators[validator] = status;
    }

    /**
     * @dev Transfer ticket with price enforcement
     */
    function transferTicket(
        address to,
        uint256 tokenId,
        uint256 price
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(
            price <= _tickets[tokenId].resalePriceCap,
            "Price cap exceeded"
        );

        _transfer(msg.sender, to, tokenId);
        emit TicketTransferred(tokenId, msg.sender, to, price);
    }

    /**
     * @dev Set a new resale price cap for a ticket
     */
    function setResaleLimit(
        uint256 tokenId,
        uint256 newCap
    ) external onlyOrganizer {
        _tickets[tokenId].resalePriceCap = newCap;
        emit ResaleLimitSet(tokenId, newCap);
    }

    /**
     * @dev Extend or reduce expiration timestamp
     */
    function setExpiration(
        uint256 tokenId,
        uint256 newExpiration
    ) external onlyOrganizer {
        _tickets[tokenId].expiration = newExpiration;
        emit ExpirationSet(tokenId, newExpiration);
    }

    /**
     * @dev Revoke a ticket (burn it)
     */
    function revokeTicket(uint256 tokenId) external onlyOrganizer {
        _burn(tokenId);
        delete _tickets[tokenId];
        emit TicketRevoked(tokenId);
    }

    /**
 * @dev Purchase a ticket from the current owner by sending ETH
 */
function purchaseTicket(uint256 tokenId) external payable {
    address seller = ownerOf(tokenId);
    require(seller != msg.sender, "Cannot buy your own ticket");

    TicketInfo memory ticket = _tickets[tokenId];

    require(block.timestamp <= ticket.expiration, "Ticket expired");
    require(!ticket.used, "Ticket already used");
    require(msg.value <= ticket.resalePriceCap, "Offer exceeds price cap");

    // Transfer ETH to the seller
    payable(seller).transfer(msg.value);

    // Transfer the ticket to the buyer
    _transfer(seller, msg.sender, tokenId);

    emit TicketTransferred(tokenId, seller, msg.sender, msg.value);
}


    /**
     * @dev Retrieve ticket info
     */
    function getTicketInfo(
        uint256 tokenId
    ) external view returns (TicketInfo memory) {
        return _tickets[tokenId];
    }

    /**
     * @dev Override tokenURI to return stored metadata URI
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        ownerOf(tokenId); // Ensures token exists
        return _tickets[tokenId].metadataURI;
    }
    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }

    /**
     * @dev Check if a token exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
