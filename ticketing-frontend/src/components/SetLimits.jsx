import React, { useState } from 'react';
import { ethers, parseEther, BrowserProvider } from 'ethers';

// You need to replace these with your actual contract details
const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";
const contractABI = [
  // Add your contract ABI here
  "function setResaleLimit(uint256 tokenId, uint256 limit) external",
  "function setSpendingLimits(uint256 daily, uint256 weekly, uint256 monthly) external",
  // Add other function signatures as needed
];

const SetLimits = ({ account }) => {
  const [tokenId, setTokenId] = useState('');
  const [priceLimit, setPriceLimit] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [activeTab, setActiveTab] = useState('resale');

  const setResaleLimit = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    if (!tokenId || !priceLimit) {
      alert('Please fill in Token ID and Price Limit');
      return;
    }

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // V6 way to parse ether
      const limit = parseEther(priceLimit);
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      const tx = await contract.setResaleLimit(tokenId, limit);
      setTxHash(tx.hash);
      await tx.wait();
      
      alert('Resale limit set successfully!');
    } catch (error) {
      console.error('Error setting resale limit:', error);
      alert('Error setting resale limit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const setSpendingLimits = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    if (!dailyLimit && !weeklyLimit && !monthlyLimit) {
      alert('Please set at least one spending limit');
      return;
    }

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // V6 way to parse ether
      const dailyLimitWei = dailyLimit ? parseEther(dailyLimit) : 0;
      const weeklyLimitWei = weeklyLimit ? parseEther(weeklyLimit) : 0;
      const monthlyLimitWei = monthlyLimit ? parseEther(monthlyLimit) : 0;
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      const tx = await contract.setSpendingLimits(
        dailyLimitWei,
        weeklyLimitWei,
        monthlyLimitWei
      );
      
      setTxHash(tx.hash);
      await tx.wait();
      
      alert('Spending limits set successfully!');
    } catch (error) {
      console.error('Error setting spending limits:', error);
      alert('Error setting spending limits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-limits">
      {/* Tab Navigation */}
      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={() => setActiveTab('resale')}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            backgroundColor: activeTab === 'resale' ? "#007bff" : "#f8f9fa",
            color: activeTab === 'resale' ? "white" : "#333",
            border: "1px solid #007bff",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Resale Limits
        </button>
        <button 
          onClick={() => setActiveTab('spending')}
          style={{
            padding: "8px 16px",
            backgroundColor: activeTab === 'spending' ? "#007bff" : "#f8f9fa",
            color: activeTab === 'spending' ? "white" : "#333",
            border: "1px solid #007bff",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Spending Limits
        </button>
      </div>

      {activeTab === 'resale' && (
        <div>
          <div style={{ marginBottom: "15px" }}>
            <label>
              Token ID:
              <input
                type="number"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="1"
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
              Price Limit (MATIC):
              <input
                type="number"
                step="0.001"
                value={priceLimit}
                onChange={(e) => setPriceLimit(e.target.value)}
                placeholder="1.0"
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
            onClick={setResaleLimit} 
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
            {loading ? 'Setting...' : 'Set Resale Limit'}
          </button>
        </div>
      )}

      {activeTab === 'spending' && (
        <div>
          <div style={{ marginBottom: "15px" }}>
            <label>
              Daily Limit (MATIC):
              <input
                type="number"
                step="0.001"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="1.0"
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
              Weekly Limit (MATIC):
              <input
                type="number"
                step="0.001"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
                placeholder="5.0"
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
              Monthly Limit (MATIC):
              <input
                type="number"
                step="0.001"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="20.0"
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
            onClick={setSpendingLimits} 
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
            {loading ? 'Setting...' : 'Set Spending Limits'}
          </button>
        </div>
      )}

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

export default SetLimits;