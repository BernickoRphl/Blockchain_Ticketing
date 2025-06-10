import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Replace with your deployed contract address after running deploy script
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Complete ABI for EventChainTicket contract
const CONTRACT_ABI = [
  "function mintTicket(address attendee, string calldata metadataURI, uint256 priceCap, uint256 expirationTimestamp) external returns (uint256)",
  "function validateTicket(uint256 tokenId) external",
  "function purchaseTicket(uint256 tokenId) external payable",
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

const CustomerApp = () => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [networkName, setNetworkName] = useState('');

  // Ticket states
  // const [userTickets, setUserTickets] = useState([]);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Transfer states
  const [transferTicketId, setTransferTicketId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferPrice, setTransferPrice] = useState('');

  // Purchase states
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [purchasePrice, setPurchasePrice] = useState('');

  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventLogs, setEventLogs] = useState([]);

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

      const events = ['TicketMinted', 'TicketValidated', 'TicketTransferred'];
      events.forEach(name => {
        contract.on(name, (...args) => {
          const e = args[args.length - 1];
          setEventLogs(prev => ([{ name, args: e.args, timestamp: Date.now() }, ...prev]));
          setShowEventPopup(true);
        });
      });
      // Load tickets
      await loadTickets(contract, accounts[0]);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting wallet: ' + error.message);
    }
  };

  // Load all tickets and categorize them
  const loadTickets = async (contractInstance = contract, userAccount = account) => {
    if (!contractInstance) return;

    try {
      setLoading(true);
      const totalSupply = await contractInstance.totalSupply();
      const tickets = [];
      const userTickets = [];

      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const exists = await contractInstance.exists(i);
          if (!exists) continue;

          const info = await contractInstance.getTicketInfo(i);
          const owner = await contractInstance.ownerOf(i);

          const ticketData = {
            id: i,
            metadataURI: info[0],
            resalePriceCap: ethers.formatEther(info[1]),
            expiration: new Date(Number(info[2]) * 1000),
            used: info[3],
            owner: owner,
            isExpired: new Date() > new Date(Number(info[2]) * 1000)
          };

          if (owner.toLowerCase() === userAccount.toLowerCase()) {
            userTickets.push(ticketData);
          } else if (!ticketData.used && !ticketData.isExpired) {
            tickets.push(ticketData);
          }
        } catch (error) {
          console.error(`Error loading ticket ${i}:`, error);
        }
      }

      setAvailableTickets(tickets);
      setMyTickets(userTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Purchase ticket (transfer from current owner)
  const purchaseTicket = async (ticketId, price) => {
    if (!contract || !price) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setLoading(true);
      setTxHash('');

      const priceWei = ethers.parseEther(price);

      // Get ticket info to check price cap
      const info = await contract.getTicketInfo(ticketId);
      const priceCap = info[1];

      if (priceWei > priceCap) {
        alert(`Price exceeds the maximum allowed price of ${ethers.formatEther(priceCap)} ETH`);
        return;
      }

      const tx = await contract.purchaseTicket(ticketId, {
        value: priceWei
      });

      setTxHash(tx.hash);
      console.log('Purchase transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('Purchase confirmed:', receipt);

      alert('Ticket purchased successfully!');
      setSelectedTicket(null);
      setPurchasePrice('');

      await loadTickets();

    } catch (error) {
      console.error('Error purchasing ticket:', error);
      alert('Error purchasing ticket: ' + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Transfer own ticket
  const transferTicket = async () => {
    if (!contract || !transferTicketId || !transferTo || !transferPrice) {
      alert('Please fill in all transfer fields');
      return;
    }

    try {
      setLoading(true);
      setTxHash('');

      const priceWei = ethers.parseEther(transferPrice);

      const tx = await contract.transferTicket(transferTo, transferTicketId, priceWei);
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      console.log('Transfer confirmed:', receipt);

      alert('Ticket transferred successfully!');

      // Clear form
      setTransferTicketId('');
      setTransferTo('');
      setTransferPrice('');

      // Reload tickets
      await loadTickets();

    } catch (error) {
      console.error('Error transferring ticket:', error);
      alert('Error transferring ticket: ' + (error.reason || error.message));
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
        } else {
          setAccount(accounts[0]);
          if (contract) {
            loadTickets(contract, accounts[0]);
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
      if (!contract) return;
      const evts = ['TicketMinted', 'TicketValidated', 'TicketTransferred'];
      return () => evts.forEach(name => contract.off(name));
    };
  }, [contract]);

  const TicketCard = ({ ticket, isOwned = false }) => (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: isOwned ? '#f8f9fa' : '#fff',
      marginBottom: '15px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
            Ticket #{ticket.id}
          </h4>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
            <strong>Metadata:</strong> {ticket.metadataURI}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
            <strong>Max Price:</strong> {ticket.resalePriceCap} ETH
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
          {!isOwned && (
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
              <strong>Owner:</strong> {ticket.owner.slice(0, 6)}...{ticket.owner.slice(-4)}
            </p>
          )}
        </div>

        {!isOwned && !ticket.used && !ticket.isExpired && (
          <button
            onClick={() => setSelectedTicket(ticket)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Buy Now
          </button>
        )}
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
        position: 'relative', background: '#fff', padding: '20px',
        borderRadius: '8px', maxWidth: '500px', width: '90%',
        maxHeight: '80%', overflowY: 'auto'
      }}>
        <button onClick={() => setShowEventPopup(false)}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            fontSize: '18px', border: 'none', background: 'none', cursor: 'pointer'
          }}>×</button>
        <h3>📋 Event Logs</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {eventLogs.map((e, i) => (
            <li key={i} style={{ margin: '10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
              <strong>{e.name}</strong>
              {Object.entries(e.args).filter(([k]) => k !== '_event').map(([k, v]) =>
                <div key={k}><em>{k}:</em> {v.toString()}</div>
              )}
              <small style={{ color: '#666' }}>{new Date(e.timestamp).toLocaleTimeString()}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );


  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#333', margin: 0 }}>
          🎫 EventChain Marketplace
        </h1>
        <div>
          <button onClick={() => setShowEventPopup(true)}
            style={{
              marginRight: '10px', padding: '8px 12px',
              backgroundColor: '#17a2b8', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer'
            }}>
            Show Events
          </button>
          <a href="/admin" style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}>Admin Panel</a>
        </div>

      </div>

      {/* Connection Status */}
      {!isConnected ? (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Connect your wallet to view and purchase tickets
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
            <div><strong>Account:</strong> {account.slice(0, 6)}...{account.slice(-4)}</div>
            <div><strong>Network:</strong> {networkName}</div>
            <div><strong>Available Tickets:</strong> {availableTickets.length}</div>
            <div><strong>My Tickets:</strong> {myTickets.length}</div>
          </div>
        </div>
      )}

      {isConnected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>

          {/* Available Tickets */}
          <div>
            <h2 style={{ color: '#007bff', marginBottom: '20px' }}>🛒 Available Tickets</h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading tickets...</p>
              </div>
            ) : availableTickets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#666'
              }}>
                <p>No tickets available for purchase</p>
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {availableTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>

          {/* My Tickets */}
          <div>
            <h2 style={{ color: '#28a745', marginBottom: '20px' }}>🎟️ My Tickets</h2>

            {myTickets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#666',
                marginBottom: '30px'
              }}>
                <p>You don't own any tickets yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '30px' }}>
                {myTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} isOwned={true} />
                ))}
              </div>
            )}

            {/* Transfer Ticket Section */}
            {myTickets.length > 0 && (
              <div style={{
                border: '1px solid #ffc107',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#fffdf0'
              }}>
                <h3 style={{ marginTop: '0', color: '#856404' }}>↗️ Transfer Ticket</h3>

                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Ticket ID:
                    </label>
                    <select
                      value={transferTicketId}
                      onChange={(e) => setTransferTicketId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select your ticket</option>
                      {myTickets.filter(t => !t.used && !t.isExpired).map(ticket => (
                        <option key={ticket.id} value={ticket.id}>
                          Ticket #{ticket.id} (Max: {ticket.resalePriceCap} ETH)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Transfer To Address:
                    </label>
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
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
                      Price (ETH):
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={transferPrice}
                      onChange={(e) => setTransferPrice(e.target.value)}
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

                  <button
                    onClick={transferTicket}
                    disabled={loading}
                    style={{
                      padding: '12px',
                      backgroundColor: loading ? '#6c757d' : '#ffc107',
                      color: loading ? 'white' : '#212529',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? 'Transferring...' : 'Transfer Ticket'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>
              Purchase Ticket #{selectedTicket.id}
            </h3>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ margin: '5px 0' }}><strong>Metadata:</strong> {selectedTicket.metadataURI}</p>
              <p style={{ margin: '5px 0' }}><strong>Maximum Price:</strong> {selectedTicket.resalePriceCap} ETH</p>
              <p style={{ margin: '5px 0' }}><strong>Expires:</strong> {selectedTicket.expiration.toLocaleString()}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Your Offer (ETH):
              </label>
              <input
                type="number"
                step="0.001"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder={`Max: ${selectedTicket.resalePriceCap} ETH`}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => purchaseTicket(selectedTicket.id, purchasePrice)}
                disabled={loading || !purchasePrice}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </button>

              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setPurchasePrice('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Hash Display */}
      {txHash && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          borderRadius: '4px',
          border: '1px solid #c3e6cb',
          color: '#155724',
          maxWidth: '400px',
          zIndex: 1001
        }}>
          <strong>Transaction Hash:</strong><br />
          <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px' }}>
            {txHash.slice(0, 20)}...
          </a>
        </div>
      )}
      <EventPopup />
    </div>
  );
};

export default CustomerApp;