import React, { useState, useEffect } from "react";
import MintTicket from "./components/MintTicket";
import TicketInfo from "./components/TicketInfo";
import ValidateTicket from "./components/ValidateTicket";
import TransferTicket from "./components/TransferTicket";
import SetLimits from "./components/SetLimits";
import { connectWallet, getBalance, switchToPolygonTestnet } from "./utils/blockchain";

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if wallet is already connected on page load
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const { signer } = await connectWallet();
          const addr = await signer.getAddress();
          setAccount(addr);
          const userBalance = await getBalance(addr);
          setBalance(userBalance);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to switch to Polygon testnet
      await switchToPolygonTestnet();
      
      // Then connect wallet
      const { signer } = await connectWallet();
      const addr = await signer.getAddress();
      setAccount(addr);
      
      // Get balance
      const userBalance = await getBalance(addr);
      setBalance(userBalance);
      
    } catch (error) {
      console.error('Connection error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    setBalance(null);
    setError(null);
  };

  const formatBalance = (bal) => {
    if (!bal) return '0';
    return parseFloat(bal).toFixed(4);
  };

  return (
    <div style={{ 
      padding: "20px", 
      maxWidth: "1200px", 
      margin: "0 auto",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{ 
        textAlign: "center", 
        marginBottom: "30px",
        borderBottom: "2px solid #e0e0e0",
        paddingBottom: "20px"
      }}>
        <h1 style={{ color: "#2c3e50", margin: "0" }}>🎫 EventChain Ticketing DApp</h1>
        <p style={{ color: "#7f8c8d", margin: "10px 0 0 0" }}>
          Blockchain-based event ticketing platform
        </p>
      </header>

      {error && (
        <div style={{ 
          backgroundColor: "#f8d7da", 
          color: "#721c24", 
          padding: "12px", 
          borderRadius: "5px", 
          marginBottom: "20px",
          border: "1px solid #f5c6cb"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!account ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "40px", 
            borderRadius: "10px",
            border: "1px solid #e9ecef"
          }}>
            <h2>Connect Your Wallet</h2>
            <p style={{ color: "#6c757d", marginBottom: "30px" }}>
              Connect your MetaMask wallet to start using EventChain
            </p>
            <button 
              onClick={handleConnect}
              disabled={loading}
              style={{
                backgroundColor: loading ? "#6c757d" : "#007bff",
                color: "white",
                border: "none",
                padding: "12px 30px",
                fontSize: "16px",
                borderRadius: "5px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.3s"
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.backgroundColor = "#0056b3";
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.backgroundColor = "#007bff";
              }}
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ 
            backgroundColor: "#d4edda", 
            color: "#155724", 
            padding: "15px", 
            borderRadius: "5px", 
            marginBottom: "30px",
            border: "1px solid #c3e6cb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <strong>Connected:</strong> {account.slice(0, 6)}...{account.slice(-4)} <br/>
              <strong>Balance:</strong> {formatBalance(balance)} MATIC
            </div>
            <button 
              onClick={handleDisconnect}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "3px",
                cursor: "pointer"
              }}
            >
              Disconnect
            </button>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
            gap: "20px" 
          }}>
            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>🎫 Mint Ticket</h3>
              <MintTicket account={account} />
            </div>

            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>📋 Ticket Info</h3>
              <TicketInfo />
            </div>

            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>✅ Validate Ticket</h3>
              <ValidateTicket />
            </div>

            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>🔄 Transfer Ticket</h3>
              <TransferTicket />
            </div>

            <div style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "8px", 
              padding: "20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2c3e50" }}>⚙️ Set Limits</h3>
              <SetLimits />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;