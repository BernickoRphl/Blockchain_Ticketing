import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Replace with your deployed contract address after running deploy script
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
  "function totalSupply() external view returns (uint256)",
  "function validators(address) external view returns (bool)",
  "function owner() external view returns (address)",
  "function exists(uint256 tokenId) external view returns (bool)",
  "event TicketMinted(uint256 indexed tokenId, address indexed attendee, string metadataURI)",
  "event TicketValidated(uint256 indexed tokenId, address indexed validator)",
  "event TicketTransferred(uint256 indexed tokenId, address from, address to, uint256 price)"
];

const EventChainApp = () => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [networkName, setNetworkName] = useState('');
  
  // Form states
  const [attendeeAddress, setAttendeeAddress] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [priceCap, setPriceCap] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  
  // Ticket info states
  const [ticketId, setTicketId] = useState('');
  const [ticketInfo, setTicketInfo] = useState(null);
  const [totalTickets, setTotalTickets] = useState(0);

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
      // Network doesn't exist, add it
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

      // Check if on local network
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

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Get network info
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
        setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
        
        // Get total tickets
        const total = await contract.totalSupply();
        setTotalTickets(Number(total));
      } catch (error) {
        console.error('Error checking contract details:', error);
      }

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting wallet: ' + error.message);
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

      console.log('Minting ticket with params:', {
        attendee: attendeeAddress,
        metadataURI,
        priceCap: priceCapWei.toString(),
        expiration: expirationTimestamp
      });

      const tx = await contract.mintTicket(
        attendeeAddress,
        metadataURI,
        priceCapWei,
        expirationTimestamp
      );

      setTxHash(tx.hash);
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      alert('Ticket minted successfully!');
      
      // Update total tickets
      const total = await contract.totalSupply();
      setTotalTickets(Number(total));
      
      // Clear form
      setAttendeeAddress('');
      setMetadataURI('');
      setPriceCap('');
      setExpirationDays('30');

    } catch (error) {
      console.error('Error minting ticket:', error);
      alert('Error minting ticket: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Load saved contract address from JSON file
  const loadContractAddress = async () => {
    try {
      const response = await fetch('/contract-data.json');
      if (response.ok) {
        const data = await response.json();
        return data.address;
      }
    } catch (error) {
      console.log('No contract data file found, using default address');
    }
    return CONTRACT_ADDRESS;
  };

  // Get ticket information
  const getTicketInfo = async () => {
    if (!contract || !ticketId) {
      alert('Please enter a ticket ID');
      return;
    }

    try {
      // Check if ticket exists
      const exists = await contract.exists(ticketId);
      if (!exists) {
        alert('Ticket does not exist');
        return;
      }

      const info = await contract.getTicketInfo(ticketId);
      const owner = await contract.ownerOf(ticketId);
      
      setTicketInfo({
        metadataURI: info[0],
        resalePriceCap: ethers.formatEther(info[1]),
        expiration: new Date(Number(info[2]) * 1000).toLocaleString(),
        used: info[3],
        owner: owner
      });
    } catch (error) {
      console.error('Error getting ticket info:', error);
      alert('Error getting ticket info: ' + (error.reason || error.message));
    }
  };

  // Validate a ticket
  const validateTicket = async () => {
    if (!contract || !ticketId) {
      alert('Please enter a ticket ID');
      return;
    }

    try {
      setLoading(true);

      const tx = await contract.validateTicket(ticketId);
      setTxHash(tx.hash);
      await tx.wait();

      alert('Ticket validated successfully!');
      
      // Refresh ticket info
      await getTicketInfo();

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
          // Re-check owner status
          if (contract) {
            contract.owner().then(owner => {
              setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());
            });
          }
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [contract]);

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
        EventChain Ticket System
      </h1>

      {/* Connection Status */}
      {!isConnected ? (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Connect your wallet to interact with the EventChain smart contract
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

      {isConnected && (
        <div style={{ display: 'grid', gap: '30px' }}>
          
          {/* Mint Ticket Section - Only for Owner */}
          {isOwner && (
            <div style={{ border: '1px solid #28a745', padding: '20px', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
              <h2 style={{ marginTop: '0', color: '#28a745' }}>🎫 Mint New Ticket</h2>
              
              <div style={{ display: 'grid', gap: '15px' }}>
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

          {/* Ticket Info Section */}
          <div style={{ border: '1px solid #007bff', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9ff' }}>
            <h2 style={{ marginTop: '0', color: '#007bff' }}>🔍 Check Ticket Info</h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="number"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
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
                Get Info
              </button>
            </div>

            {ticketInfo && (
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '15px', 
                borderRadius: '4px',
                border: '1px solid #e9ecef',
                marginBottom: '15px'
              }}>
                <h3 style={{ marginTop: '0', color: '#333' }}>Ticket #{ticketId}</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <p><strong>Owner:</strong> {ticketInfo.owner}</p>
                  <p><strong>Metadata URI:</strong> {ticketInfo.metadataURI}</p>
                  <p><strong>Resale Price Cap:</strong> {ticketInfo.resalePriceCap} ETH</p>
                  <p><strong>Expiration:</strong> {ticketInfo.expiration}</p>
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
              </div>
            )}

            {ticketInfo && !ticketInfo.used && (
              <button 
                onClick={validateTicket}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Validating...' : 'Validate Ticket'}
              </button>
            )}
          </div>

          {/* Transaction Hash Display */}
          {txHash && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#d4edda', 
              borderRadius: '4px',
              border: '1px solid #c3e6cb',
              color: '#155724'
            }}>
              <strong>Transaction Hash:</strong><br/>
              <a href={`https://mumbai.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                {txHash}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default EventChainApp;
// Note: Make sure to replace CONTRACT_ADDRESS with your actual deployed contract address