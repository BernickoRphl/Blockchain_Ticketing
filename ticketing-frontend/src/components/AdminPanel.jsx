import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';


// Replace with your deployed contract address after running deploy script
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// 0x5FbDB2315678afecb367f032d93F642f64180aa3
// Complete ABI for EventChainTicket contract
const CONTRACT_ABI = [
    "function mintTicket(address attendee, string calldata metadataURI, uint256 priceCap, uint256 expirationTimestamp) external returns (uint256)",
    "function validateTicket(uint256 tokenId) external",
    "function transferTicket(address to, uint256 tokenId, uint256 price) external",
    "function setValidator(address validator, bool status) external",
    "function setResaleLimit(uint256 tokenId, uint256 newCap) external",
    "function setExpiration(uint256 tokenId, uint256 newExpiration) external",
    "function revokeTicket(uint256 tokenId) external",
    "function getTicketInfo(uint256 tokenId) external view returns (tuple(string metadataURI, uint256 resalePriceCap, uint256 expiration, bool used))",
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function validators(address) external view returns (bool)",
    "function owner() external view returns (address)",
    "event TicketMinted(uint256 indexed tokenId, address indexed attendee, string metadataURI)",
    "event TicketValidated(uint256 indexed tokenId, address indexed validator)",
    "event TicketTransferred(uint256 indexed tokenId, address from, address to, uint256 price)",
    "event ResaleLimitSet(uint256 indexed tokenId, uint256 priceCap)",
    "event ExpirationSet(uint256 indexed tokenId, uint256 expirationTimestamp)",
    "event TicketRevoked(uint256 indexed tokenId)"
];

const AdminPanel = () => {
    const [account, setAccount] = useState('');
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [networkName, setNetworkName] = useState('');
    const [activeTab, setActiveTab] = useState('mint');

    // Loading and transaction states
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState('');

    // Statistics
    const [totalTickets, setTotalTickets] = useState(0);
    const [allTickets, setAllTickets] = useState([]);
    const [validators, setValidators] = useState([]);

    const [showEventPopup, setShowEventPopup] = useState(false);
    const [eventLogs, setEventLogs] = useState([]);

    // Form states for Mint Ticket
    const [attendeeAddress, setAttendeeAddress] = useState('');
    const [metadataURI, setMetadataURI] = useState('');
    const [priceCap, setPriceCap] = useState('');
    const [expirationDays, setExpirationDays] = useState('30');

    // Form states for Ticket Management
    const [selectedTicketId, setSelectedTicketId] = useState('');
    const [ticketInfo, setTicketInfo] = useState(null);
    const [newPriceCap, setNewPriceCap] = useState('');
    const [newExpirationDays, setNewExpirationDays] = useState('');

    // Form states for Validator Management
    const [validatorAddress, setValidatorAddress] = useState('');
    const [validatorStatus, setValidatorStatus] = useState(true);

    // Validation ticket
    const [validateTicketId, setValidateTicketId] = useState('');

    // Add new state variables for loading states
    const [loadingPriceCap, setLoadingPriceCap] = useState(false);
    const [loadingExpiration, setLoadingExpiration] = useState(false);
    const [loadingRevoke, setLoadingRevoke] = useState(false);

    // Check if user is on local network
    const isLocalNetwork = async () => {
        if (!window.ethereum) return false;
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        return chainId === '0x7A69'; // 31337 in hex
    };

    // Switch to local Hardhat network
    const switchToLocalNetwork = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7A69' }], // 31337 in hex
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x7A69',
                            chainName: 'Hardhat Local',
                            rpcUrls: ['http://127.0.0.1:8545'],
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18
                            }
                        }]
                    });
                } catch (addError) {
                    console.error('Error adding network:', addError);
                    alert('Please add Hardhat Local network manually');
                }
            }
        }
    };

    // Get network name
    const getNetworkName = async (chainId) => {
        switch (chainId) {
            case '0x1': return 'Ethereum Mainnet';
            case '0x89': return 'Polygon';
            case '0x13881': return 'Mumbai Testnet';
            case '0x7A69': return 'Hardhat Local';
            default: return `Unknown (${chainId})`;
        }
    };

    // Connect to MetaMask
    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                alert('Please install MetaMask!');
                return;
            }

            const isLocal = await isLocalNetwork();
            if (!isLocal) {
                const shouldSwitch = window.confirm(
                    'You need to be on Hardhat Local network. Switch now?'
                );
                if (shouldSwitch) {
                    await switchToLocalNetwork();
                } else {
                    return;
                }
            }

            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            // Add user to database if not exists
            try {
                await axios.post('http://localhost:5000/api/users', {
                    wallet: accounts[0]
                });
            } catch (error) {
                console.error('Error adding user to database:', error);
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            const network = await provider.getNetwork();
            const networkName = await getNetworkName('0x' + network.chainId.toString(16));

            setAccount(accounts[0]);
            setProvider(provider);
            setContract(contract);
            setIsConnected(true);
            setNetworkName(networkName);

            // Check if connected account is the contract owner
            try {
                const owner = await contract.owner();
                const isOwner = owner.toLowerCase() === accounts[0].toLowerCase();
                setIsOwner(isOwner);

                if (isOwner) {
                    await loadContractData();
                } else {
                    alert('You are not the contract owner. Admin functions will be disabled.');
                }
            } catch (error) {
                console.error('Error checking contract details:', error);
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet: ' + error.message);
        }
    };

    // Load all contract data
    const loadContractData = async () => {
        if (!contract) return;

        try {
            setLoading(true);
            console.log("Loading contract data...");

            // Get tickets from blockchain
            const blockchainTickets = [];
            let tokenId = 1;
            while (true) {
                try {
                    const exists = await contract.exists(tokenId);
                    if (!exists) break;

                    const info = await contract.getTicketInfo(tokenId);
                    const owner = await contract.ownerOf(tokenId);
                    
                    blockchainTickets.push({
                        id: tokenId,
                        metadataURI: info[0],
                        resalePriceCap: ethers.formatEther(info[1]),
                        expiration: new Date(Number(info[2]) * 1000),
                        used: info[3],
                        owner: owner,
                        isExpired: new Date() > new Date(Number(info[2]) * 1000),
                        source: 'blockchain'
                    });
                    tokenId++;
                } catch (error) {
                    break;
                }
            }

            // Get tickets from database
            try {
                const response = await axios.get('http://localhost:5000/api/tickets');
                const dbTickets = response.data.map(ticket => ({
                    id: ticket.tokenId,
                    metadataURI: ticket.metadataURI,
                    resalePriceCap: ticket.priceCap,
                    expiration: new Date(ticket.expiration),
                    used: false,
                    owner: ticket.attendee,
                    isExpired: new Date() > new Date(ticket.expiration),
                    source: 'database'
                }));

                // Combine tickets from both sources
                const allTickets = [...blockchainTickets, ...dbTickets];
                setAllTickets(allTickets);
                setTotalTickets(allTickets.length);
            } catch (error) {
                console.error('Error loading tickets from database:', error);
                setAllTickets(blockchainTickets);
                setTotalTickets(blockchainTickets.length);
            }

            console.log("Contract data loaded successfully");
        } catch (error) {
            console.error("Error in loadContractData:", error);
        } finally {
            setLoading(false);
        }
    };

    // Mint a new ticket
    const mintTicket = async () => {
        if (!contract || !attendeeAddress || !metadataURI || !priceCap) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            setTxHash('');

            const priceCapWei = ethers.parseEther(priceCap);
            const expirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60);

            const tx = await contract.mintTicket(
                attendeeAddress,
                metadataURI,
                priceCapWei,
                expirationTimestamp
            );

            setTxHash(tx.hash);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.eventName === 'TicketMinted');
            const tokenId = event ? event.args.tokenId.toString() : null;

            if (!tokenId) {
                throw new Error('Failed to get token ID from mint event');
            }

            // Add ticket to database
            await axios.post('http://localhost:5000/api/tickets', {
                tokenId,
                metadataURI,
                attendee: attendeeAddress,
                priceCap,
                expiration: new Date(expirationTimestamp * 1000)
            });

            // Add transaction to database
            await axios.post('http://localhost:5000/api/transactions', {
                tokenId,
                from: account,
                to: attendeeAddress,
                priceETH: priceCap,
                txHash: tx.hash,
                type: 'mint'
            });

            alert('Ticket minted successfully!');
            setAttendeeAddress('');
            setMetadataURI('');
            setPriceCap('');
            setExpirationDays('30');
            await loadContractData();

        } catch (error) {
            console.error('Error minting ticket:', error);
            alert('Error minting ticket: ' + (error.reason || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Get ticket information
    const getTicketInfo = async () => {
        if (!contract || !selectedTicketId) {
            alert('Please enter a ticket ID');
            return;
        }

        try {
            // Check if ticket exists
            const exists = await contract.exists(selectedTicketId);
            if (!exists) {
                alert('Ticket does not exist');
                setTicketInfo(null);
                return;
            }

            const info = await contract.getTicketInfo(selectedTicketId);
            const owner = await contract.ownerOf(selectedTicketId);

            setTicketInfo({
                metadataURI: info[0],
                resalePriceCap: ethers.formatEther(info[1]),
                expiration: new Date(Number(info[2]) * 1000),
                used: info[3],
                owner: owner
            });

            // Set current values for editing
            setNewPriceCap(ethers.formatEther(info[1]));
            setNewExpirationDays(Math.ceil((Number(info[2]) * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
        } catch (error) {
            console.error('Error getting ticket info:', error);
            alert('Error getting ticket info: ' + (error.reason || error.message));
            setTicketInfo(null);
        }
    };

    // Update ticket price cap
    const updatePriceCap = async () => {
        if (!contract || !selectedTicketId || !newPriceCap) {
            alert('Please fill in all fields');
            return;
        }

        try {
            setLoadingPriceCap(true);
            const newCapWei = ethers.parseEther(newPriceCap);

            const tx = await contract.setResaleLimit(selectedTicketId, newCapWei);
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            // Update ticket in database
            await axios.patch(`http://localhost:5000/api/tickets/${selectedTicketId}`, {
                priceCapETH: newPriceCap
            });

            alert('Price cap updated successfully!');
            await getTicketInfo();
            await loadContractData();

        } catch (error) {
            console.error('Error updating price cap:', error);
            alert('Error updating price cap: ' + (error.reason || error.message));
        } finally {
            setLoadingPriceCap(false);
        }
    };

    // Update ticket expiration
    const updateExpiration = async () => {
        if (!contract || !selectedTicketId || !newExpirationDays) {
            alert('Please fill in all fields');
            return;
        }

        try {
            setLoadingExpiration(true);
            const newExpirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(newExpirationDays) * 24 * 60 * 60);

            const tx = await contract.setExpiration(selectedTicketId, newExpirationTimestamp);
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            // Update ticket in database
            await axios.patch(`http://localhost:5000/api/tickets/${selectedTicketId}`, {
                expiration: new Date(newExpirationTimestamp * 1000)
            });

            alert('Expiration updated successfully!');
            await getTicketInfo();
            await loadContractData();

        } catch (error) {
            console.error('Error updating expiration:', error);
            alert('Error updating expiration: ' + (error.reason || error.message));
        } finally {
            setLoadingExpiration(false);
        }
    };

    // Revoke ticket
    const revokeTicket = async () => {
        if (!contract || !selectedTicketId) {
            alert('Please select a ticket ID');
            return;
        }

        if (!window.confirm(`Are you sure you want to revoke ticket #${selectedTicketId}? This action cannot be undone.`)) {
            return;
        }

        try {
            setLoadingRevoke(true);

            const tx = await contract.revokeTicket(selectedTicketId);
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            // Add transaction to database
            await axios.post('http://localhost:5000/api/transactions', {
                tokenId: selectedTicketId,
                from: account,
                to: account,
                priceETH: "0",
                txHash: tx.hash,
                type: 'revoke'
            });

            alert('Ticket revoked successfully!');
            setTicketInfo(null);
            setSelectedTicketId('');
            await loadContractData();

        } catch (error) {
            console.error('Error revoking ticket:', error);
            alert('Error revoking ticket: ' + (error.reason || error.message));
        } finally {
            setLoadingRevoke(false);
        }
    };

    // Set validator
    const setValidator = async () => {
        if (!contract || !validatorAddress) {
            alert('Please enter validator address');
            return;
        }

        try {
            setLoading(true);

            // First, ensure the user exists in the database
            try {
                await axios.post('http://localhost:5000/api/users', {
                    wallet: validatorAddress
                });
            } catch (error) {
                // If user already exists, that's fine
                if (error.response?.status !== 200) {
                    throw error;
                }
            }

            const tx = await contract.setValidator(validatorAddress, validatorStatus);
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            // Update user's validator status in database
            await axios.patch(`http://localhost:5000/api/users/${validatorAddress}/validator`, {
                isValidator: validatorStatus
            });

            alert(`Validator ${validatorStatus ? 'added' : 'removed'} successfully!`);
            setValidatorAddress('');
            await loadContractData();

        } catch (error) {
            console.error('Error setting validator:', error);
            alert('Error setting validator: ' + (error.reason || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Validate ticket
    const validateTicket = async () => {
        if (!contract || !validateTicketId) {
            alert('Please enter ticket ID');
            return;
        }

        try {
            setLoading(true);

            // Check if user is validator in database
            const userResponse = await axios.get(`http://localhost:5000/api/users/${account}`);
            if (!userResponse.data || !userResponse.data.isValidator) {
                throw new Error('You are not authorized to validate tickets');
            }

            // Check if ticket exists and is not already used
            const info = await contract.getTicketInfo(validateTicketId);
            if (info[3]) { // Check if ticket is already used
                throw new Error('Ticket is already used');
            }

            const tx = await contract.validateTicket(validateTicketId);
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            // Add validation to database
            await axios.post('http://localhost:5000/api/validate-ticket', {
                tokenId: validateTicketId,
                validator: account,
                txHash: tx.hash
            });

            // Update ticket in database to mark it as used
            await axios.patch(`http://localhost:5000/api/tickets/${validateTicketId}`, {
                used: true
            });

            alert('Ticket validated successfully!');
            setValidateTicketId('');
            await loadContractData();

        } catch (error) {
            console.error('Error validating ticket:', error);
            alert('Error validating ticket: ' + (error.reason || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Handle account changes
    useEffect(() => {   
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    setIsConnected(false);
                    setAccount('');
                    setIsOwner(false);
                } else {
                    setAccount(accounts[0]);
                    if (contract) {
                        contract.owner().then(owner => {
                            setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
                            if (owner.toLowerCase() === accounts[0].toLowerCase()) {
                                loadContractData();
                            }
                        });
                    }
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }

        // Load contract data when contract is available and user is owner
        if (contract && isOwner) {
            loadContractData();
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeAllListeners('accountsChanged');
                window.ethereum.removeAllListeners('chainChanged');
            }
            if (!contract) return;
            ['TicketMinted','TicketValidated','TicketTransferred','ResaleLimitSet','ExpirationSet','TicketRevoked']
                .forEach(name => contract.off(name));
        };
    }, [contract, isOwner]);

    const TabButton = ({ id, label, active, onClick }) => (
        <button
            onClick={() => onClick(id)}
            style={{
                padding: '10px 20px',
                backgroundColor: active ? '#007bff' : '#f8f9fa',
                color: active ? 'white' : '#333',
                border: '1px solid #ddd',
                borderBottom: active ? '1px solid #007bff' : '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: active ? 'bold' : 'normal'
            }}
        >
            {label}
        </button>
    );

    const TicketCard = ({ ticket }) => (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            backgroundColor: '#fff',
            marginBottom: '15px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                        Ticket #{ticket.id}
                    </h4>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Owner:</strong> {ticket.owner.slice(0, 6)}...{ticket.owner.slice(-4)}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Metadata:</strong> {ticket.metadataURI}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Price Cap:</strong> {ticket.resalePriceCap} ETH
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        <strong>Expires:</strong> {ticket.expiration.toLocaleString()}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        <strong>Status:</strong>
                        <span style={{
                            color: ticket.used ? '#dc3545' : ticket.isExpired ? '#ffc107' : '#28a745',
                            fontWeight: 'bold',
                            marginLeft: '5px'
                        }}>
                            {ticket.used ? 'USED' : ticket.isExpired ? 'EXPIRED' : 'VALID'}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
    const EventPopup = () => showEventPopup && (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        position: 'relative',
        background: '#fff', padding: '20px', borderRadius: '8px',
        maxWidth: '500px', width: '90%', maxHeight: '80%', overflowY: 'auto'
      }}>
        <button onClick={() => setShowEventPopup(false)}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            fontSize: '18px', border: 'none', background: 'none', cursor: 'pointer'
          }}>×</button>
        <h3>📋 Event Logs</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {eventLogs.map((e,i) => (
            <li key={i} style={{ margin: '10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
              <strong>{e.name}</strong>
              {Object.entries(e.args).filter(([k]) => k!=='_event').map(([k,v]) =>
                <div key={k}><em>{k}:</em> {v.toString()}</div>
              )}
              <small style={{ color:'#666' }}>{new Date(e.timestamp).toLocaleTimeString()}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );


    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#333', margin: 0 }}>
                    🎫 EventChain Admin Panel
                </h1>
                
                <div>
        <button onClick={() => setShowEventPopup(true)}
           style={{
             marginRight: '10px',
             padding: '8px 12px',
            backgroundColor: '#17a2b8',
             color: 'white',
             border: 'none',
             borderRadius: '4px',
             cursor: 'pointer'
           }}>
           Show Events
         </button>
         <a href="/" style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>Customer View</a>
       </div>
            </div>

            {/* Connection Status */}
            {!isConnected ? (
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <p style={{ marginBottom: '15px', color: '#666' }}>
                        Connect your wallet to access the admin panel
                    </p>
                    <button
                        onClick={connectWallet}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Connect Wallet
                    </button>
                </div>
            ) : (
                <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        <div><strong>Account:</strong> {account.slice(0, 6)}...{account.slice(-4)}</div>
                        <div><strong>Network:</strong> {networkName}</div>
                        <div><strong>Role:</strong> {isOwner ? 'Contract Owner' : 'User'}</div>
                        <div><strong>Total Tickets:</strong> {totalTickets}</div>
                    </div>
                </div>
            )}

            {!isOwner && isConnected && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '6px',
                    marginBottom: '30px',
                    color: '#856404'
                }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>⚠️ Access Restricted</h3>
                    <p style={{ margin: 0 }}>
                        You are not the contract owner. Admin functions are disabled. Only the contract owner can manage tickets and validators.
                    </p>
                </div>
            )}

            {/* Transaction Hash Display */}
            {txHash && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '6px',
                    marginBottom: '20px'
                }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        <strong>Transaction Hash:</strong> {txHash}
                    </p>
                </div>
            )}

            {isConnected && isOwner && (
                <div>
                    {/* Tab Navigation */}
                    <div style={{
                        display: 'flex',
                        marginBottom: '30px',
                        borderBottom: '1px solid #ddd'
                    }}>
                        <TabButton id="mint" label="🎫 Mint Tickets" active={activeTab === 'mint'} onClick={setActiveTab} />
                        <TabButton id="manage" label="⚙️ Manage Tickets" active={activeTab === 'manage'} onClick={setActiveTab} />
                        <TabButton id="validate" label="✅ Validate Tickets" active={activeTab === 'validate'} onClick={setActiveTab} />
                        <TabButton id="validators" label="👥 Validators" active={activeTab === 'validators'} onClick={setActiveTab} />
                        <TabButton id="overview" label="📊 Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'mint' && (
                        <div style={{ border: '1px solid #28a745', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
                            <h2 style={{ marginTop: '0', color: '#28a745' }}>🎫 Mint New Ticket</h2>

                            <div style={{ display: 'grid', gap: '15px', maxWidth: '600px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Attendee Address:
                                    </label>
                                    <input
                                        type="text"
                                        value={attendeeAddress}
                                        onChange={(e) => setAttendeeAddress(e.target.value)}
                                        placeholder="0x..."
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Metadata URI:
                                    </label>
                                    <input
                                        type="text"
                                        value={metadataURI}
                                        onChange={(e) => setMetadataURI(e.target.value)}
                                        placeholder="https://... or ipfs://..."
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Price Cap (ETH):
                                        </label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={priceCap}
                                            onChange={(e) => setPriceCap(e.target.value)}
                                            placeholder="0.1"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Expiration (days):
                                        </label>
                                        <input
                                            type="number"
                                            value={expirationDays}
                                            onChange={(e) => setExpirationDays(e.target.value)}
                                            placeholder="30"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                border: '1px solid #ddd',
                                                borderRadius: '4px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={mintTicket}
                                    disabled={loading}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: loading ? '#6c757d' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '16px',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'Minting...' : 'Mint Ticket'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manage' && (
                        <div style={{ border: '1px solid #007bff', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
                            <h2 style={{ marginTop: '0', color: '#007bff' }}>⚙️ Manage Tickets</h2>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <input
                                    type="number"
                                    value={selectedTicketId}
                                    onChange={(e) => setSelectedTicketId(e.target.value)}
                                    placeholder="Enter Ticket ID"
                                    style={{
                                        flex: '1',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    onClick={getTicketInfo}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Load Ticket
                                </button>
                            </div>

                            {ticketInfo && (
                                <div style={{
                                    backgroundColor: '#fff',
                                    padding: '20px',
                                    borderRadius: '4px',
                                    border: '1px solid #e9ecef',
                                    marginBottom: '20px'
                                }}>
                                    <h3 style={{ marginTop: '0', color: '#333' }}>Ticket #{selectedTicketId}</h3>
                                    <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                                        <p><strong>Owner:</strong> {ticketInfo.owner}</p>
                                        <p><strong>Metadata URI:</strong> {ticketInfo.metadataURI}</p>
                                        <p><strong>Current Price Cap:</strong> {ticketInfo.resalePriceCap} ETH</p>
                                        <p><strong>Expiration:</strong> {ticketInfo.expiration.toLocaleString()}</p>
                                        <p>
                                            <strong>Status:</strong>
                                            <span style={{
                                                color: ticketInfo.used ? '#dc3545' : '#28a745',
                                                fontWeight: 'bold',
                                                marginLeft: '5px'
                                            }}>
                                                {ticketInfo.used ? 'USED' : 'VALID'}
                                            </span>
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                New Price Cap (ETH):
                                            </label>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={newPriceCap}
                                                    onChange={(e) => setNewPriceCap(e.target.value)}
                                                    style={{
                                                        flex: '1',
                                                        padding: '10px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <button
                                                    onClick={updatePriceCap}
                                                    disabled={loadingPriceCap}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: loadingPriceCap ? '#6c757d' : '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: loadingPriceCap ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {loadingPriceCap ? 'Updating...' : 'Update Price Cap'}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                New Expiration (days):
                                            </label>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input
                                                    type="number"
                                                    value={newExpirationDays}
                                                    onChange={(e) => setNewExpirationDays(e.target.value)}
                                                    style={{
                                                        flex: '1',
                                                        padding: '10px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                                <button
                                                    onClick={updateExpiration}
                                                    disabled={loadingExpiration}
                                                    style={{
                                                        padding: '10px 20px',
                                                        backgroundColor: loadingExpiration ? '#6c757d' : '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: loadingExpiration ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {loadingExpiration ? 'Updating...' : 'Update Expiration'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <button
                                                onClick={revokeTicket}
                                                disabled={loadingRevoke}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    backgroundColor: loadingRevoke ? '#6c757d' : '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: loadingRevoke ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {loadingRevoke ? 'Revoking...' : 'Revoke Ticket'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'validate' && (
                        <div style={{ border: '1px solid #28a745', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
                            <h2 style={{ marginTop: '0', color: '#28a745' }}>✅ Validate Ticket</h2>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <input
                                    type="number"
                                    value={validateTicketId}
                                    onChange={(e) => setValidateTicketId(e.target.value)}
                                    placeholder="Enter Ticket ID"
                                    style={{
                                        flex: '1',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    onClick={validateTicket}
                                    disabled={loading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: loading ? '#6c757d' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'Validating...' : 'Validate Ticket'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'validators' && (
                        <div style={{ border: '1px solid #007bff', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
                            <h2 style={{ marginTop: '0', color: '#007bff' }}>👥 Validators</h2>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <input
                                    type="text"
                                    value={validatorAddress}
                                    onChange={(e) => setValidatorAddress(e.target.value)}
                                    placeholder="Enter Validator Address"
                                    style={{
                                        flex: '1',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                                <select
                                    value={validatorStatus ? "true" : "false"}
                                    onChange={(e) => setValidatorStatus(e.target.value === "true")}
                                    style={{
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="true">Add Validator</option>
                                    <option value="false">Remove Validator</option>
                                </select>
                                <button
                                    onClick={setValidator}
                                    disabled={loading || !validatorAddress}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: loading ? '#6c757d' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'Processing...' : validatorStatus ? "Add Validator" : "Remove Validator"}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div style={{ border: '1px solid #28a745', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
                            <h2 style={{ marginTop: '0', color: '#28a745' }}>📊 Ticket Overview</h2>
                            {loading ? (
                                <p>Loading tickets...</p>
                            ) : (
                                <div>
                                    {allTickets.length === 0 ? (
                                        <p>No tickets found.</p>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '15px' }}>
                                            {allTickets.map(ticket => (
                                                <TicketCard key={`${ticket.source}-${ticket.id}`} ticket={ticket} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
         <EventPopup />

        </div>
    )
}

export default AdminPanel;