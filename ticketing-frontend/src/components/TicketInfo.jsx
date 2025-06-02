import React, { useState } from "react";
import axios from "axios";

export default function TicketInfo() {
  const [tokenId, setTokenId] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchTicket() {
    setLoading(true);
    setError("");
    setTicket(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/tickets/${tokenId}`);
      setTicket(res.data);
    } catch (err) {
      setError("Ticket not found or server error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Check Ticket Info</h3>
      <input
        placeholder="Enter Ticket Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
      />
      <button onClick={fetchTicket} disabled={loading || !tokenId}>
        {loading ? "Loading..." : "Get Info"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {ticket && (
        <div style={{ marginTop: 10 }}>
          <p><b>Token ID:</b> {ticket.tokenId}</p>
          <p><b>Owner:</b> {ticket.owner}</p>
          <p><b>Event Date:</b> {new Date(ticket.eventDate).toLocaleString()}</p>
          <p><b>Used:</b> {ticket.used ? "Yes" : "No"}</p>
        </div>
      )}
    </div>
  );
}
