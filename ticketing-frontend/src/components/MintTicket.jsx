import React, { useState } from 'react';

const MintTicket = ({ account }) => {
  const [ticketPrice, setTicketPrice] = useState('');
  const [attendeeAddress, setAttendeeAddress] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [expirationDays, setExpirationDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleMintTicket = async () => {
    if (!ticketPrice || !attendeeAddress || !metadataURI) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/mint-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeAddress,
          ticketPrice,
          metadataURI,
          expirationDays: parseInt(expirationDays)
        })
      });

      const data = await response.json();

      if (data.success) {
        setTxHash(data.txHash);
        alert('Ticket minted and saved successfully!');
      } else {
        throw new Error(data.error || 'Minting failed');
      }
    } catch (error) {
      console.error('Error minting ticket:', error);
      alert('Minting error: ' + error.message);
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
          />
        </label>
      </div>

      <button onClick={handleMintTicket} disabled={loading || !account}>
        {loading ? 'Minting...' : 'Mint Ticket'}
      </button>

      {txHash && (
        <div style={{ marginTop: "15px" }}>
          <strong>Transaction Hash:</strong><br />
          {txHash}
        </div>
      )}
    </div>
  );
};

export default MintTicket;