import React, { useState } from 'react';
import { ethers, parseEther, BrowserProvider } from 'ethers';

// You need to replace these with your actual contract details
const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";
const contractABI = [
  // Add your contract ABI here
  "function mintTicket(address to, string memory uri, uint256 price, uint256 expiration) external payable",
  "function balanceOf(address owner) external view returns (uint256)",
  // Add other function signatures as needed
];

const MintTicket = ({ account }) => {
  const [ticketPrice, setTicketPrice] = useState('');
  const [attendeeAddress, setAttendeeAddress] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleMintTicket = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    if (!ticketPrice || !attendeeAddress || !metadataURI) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // V6 way to connect to MetaMask
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // V6 way to parse ether
      const price = parseEther(ticketPrice);
      
      // Calculate expiration timestamp
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (parseInt(expirationDays) * 24 * 60 * 60);
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      const tx = await contract.mintTicket(
        attendeeAddress,
        metadataURI,
        price,
        expirationTimestamp
      );
      
      setTxHash(tx.hash);
      await tx.wait();

      await fetch("/api/mint-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeAddress,
          ticketPrice,
          metadataURI,
          expirationDays
        })
      });
      
      alert('Ticket minted successfully!');
    } catch (error) {
      console.error('Error minting ticket:', error);
      alert('Error minting ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mint-ticket">
      <div style={{ marginBottom: "15px" }}>
        <label>
          Attendee Address:
          <input
            type="text"
            value={attendeeAddress}
            onChange={(e) => setAttendeeAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
        </label>
      </div>
      
      <div style={{ marginBottom: "15px" }}>
        <label>
          Ticket Price (MATIC):
          <input
            type="number"
            step="0.001"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            placeholder="0.1"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
        </label>
      </div>
      
      <div style={{ marginBottom: "15px" }}>
        <label>
          Metadata URI:
          <input
            type="text"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="https://..."
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
        </label>
      </div>
      
      <div style={{ marginBottom: "15px" }}>
        <label>
          Expiration (days):
          <input
            type="number"
            value={expirationDays}
            onChange={(e) => setExpirationDays(e.target.value)}
            placeholder="30"
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "5px",
              border: "1px solid #ddd",
              borderRadius: "4px"
            }}
          />
        </label>
      </div>
      
      <button 
        onClick={handleMintTicket} 
        disabled={loading || !account}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: loading ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? 'Minting...' : 'Mint Ticket'}
      </button>
      
      {txHash && (
        <div style={{ 
          marginTop: "15px", 
          padding: "10px", 
          backgroundColor: "#d4edda", 
          borderRadius: "4px",
          fontSize: "12px"
        }}>
          <strong>Transaction Hash:</strong><br/>
          {txHash}
        </div>
      )}
    </div>
  );
};

export default MintTicket;