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
    event TicketPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );

    // Ticket data
    struct TicketInfo {
        string metadataURI;
        uint256 resalePriceCap;
        uint256 expiration;
        bool used;
    }

    mapping(uint256 => TicketInfo) private _tickets;
    
    // Ticket listings for sale
    mapping(uint256 => uint256) public ticketPrices; // tokenId => price (0 means not for sale)

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
     * @dev List ticket for sale
     */
    function listTicketForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(price > 0, "Price must be greater than 0");
        require(
            price <= _tickets[tokenId].resalePriceCap,
            "Price exceeds resale cap"
        );
        require(
            block.timestamp <= _tickets[tokenId].expiration,
            "Ticket expired"
        );
        require(!_tickets[tokenId].used, "Ticket already used");

        ticketPrices[tokenId] = price;
    }

    /**
     * @dev Remove ticket from sale
     */
    function removeFromSale(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        ticketPrices[tokenId] = 0;
    }

    /**
     * @dev Purchase ticket from another user
     */
    function purchaseTicket(uint256 tokenId) external payable {
        require(ticketPrices[tokenId] > 0, "Ticket not for sale");
        require(msg.value == ticketPrices[tokenId], "Incorrect payment amount");
        require(
            block.timestamp <= _tickets[tokenId].expiration,
            "Ticket expired"
        );
        require(!_tickets[tokenId].used, "Ticket already used");

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Cannot buy your own ticket");

        uint256 price = ticketPrices[tokenId];
        
        // Remove from sale
        ticketPrices[tokenId] = 0;

        // Transfer ticket
        _transfer(seller, msg.sender, tokenId);
        
        // Transfer payment to seller
        payable(seller).transfer(price);

        emit TicketPurchased(tokenId, msg.sender, seller, price);
        emit TicketTransferred(tokenId, seller, msg.sender, price);
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
     * @dev Transfer ticket without payment (gift)
     */
    function transferTicket(
        address to,
        uint256 tokenId
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(to != address(0), "Invalid recipient");

        // Remove from sale if listed
        if (ticketPrices[tokenId] > 0) {
            ticketPrices[tokenId] = 0;
        }

        _transfer(msg.sender, to, tokenId);
        emit TicketTransferred(tokenId, msg.sender, to, 0);
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
        // Remove from sale if listed
        if (ticketPrices[tokenId] > 0) {
            ticketPrices[tokenId] = 0;
        }
        
        _burn(tokenId);
        delete _tickets[tokenId];
        emit TicketRevoked(tokenId);
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
     * @dev Get ticket sale price (0 if not for sale)
     */
    function getTicketPrice(uint256 tokenId) external view returns (uint256) {
        return ticketPrices[tokenId];
    }

    /**
     * @dev Check if ticket is for sale
     */
    function isTicketForSale(uint256 tokenId) external view returns (bool) {
        return ticketPrices[tokenId] > 0;
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