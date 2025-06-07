import React, { useState } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/blockchain";
import axios from "axios";

export default function ValidateTicket() {
  const [tokenId, setTokenId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function validate() {
    setLoading(true);
    setStatus("");
    try {
      const res = await axios.post("http://localhost:5000/api/validate-ticket", {
        tokenId,
      });

      setStatus(res.data.message);
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
