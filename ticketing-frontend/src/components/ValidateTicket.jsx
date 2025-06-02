import React, { useState } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/blockchain";

export default function ValidateTicket() {
  const [tokenId, setTokenId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function validate() {
    setLoading(true);
    setStatus("");
    try {
      const contract = await getContract();
      // Asumsi smart contract punya fungsi ticketStatus(tokenId) yang mengembalikan status tiket
      const used = await contract.tickets(tokenId).then(t => t.used);
      const expirationDate = (await contract.tickets(tokenId)).expirationDate.toNumber();
      const now = Math.floor(Date.now() / 1000);

      if (used) setStatus("Ticket already used.");
      else if (now > expirationDate) setStatus("Ticket expired.");
      else setStatus("Ticket is valid.");
    } catch (err) {
      setStatus("Error validating ticket: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Validate Ticket</h3>
      <input
        placeholder="Enter Ticket Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
      />
      <button onClick={validate} disabled={loading || !tokenId}>
        {loading ? "Validating..." : "Validate"}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
