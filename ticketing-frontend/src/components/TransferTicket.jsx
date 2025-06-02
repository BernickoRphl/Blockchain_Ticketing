import React, { useState } from "react";
import { getContract } from "../utils/blockchain";

export default function TransferTicket() {
  const [tokenId, setTokenId] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function transfer() {
    setLoading(true);
    setStatus("");
    try {
      const contract = await getContract();
      const tx = await contract["safeTransferFrom(address,address,uint256)"](
        await contract.signer.getAddress(),
        toAddress,
        tokenId
      );
      await tx.wait();
      setStatus("Ticket transferred successfully!");
    } catch (err) {
      setStatus("Transfer failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Transfer Ticket</h3>
      <input
        placeholder="Ticket Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
      />
      <input
        placeholder="Recipient Address"
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
      />
      <button onClick={transfer} disabled={loading || !tokenId || !toAddress}>
        {loading ? "Transferring..." : "Transfer"}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
