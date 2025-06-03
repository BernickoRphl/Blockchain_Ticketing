export const CONTRACT_CONFIG = {
  31337: { // Hardhat local
    rpcUrl: 'http://localhost:8545',
    chainName: 'Hardhat Local',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  80001: { // Mumbai testnet
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    chainName: 'Mumbai Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  }
};

// Contract address will be loaded from deployed contract data
export const getContractAddress = () => {
  try {
    const contractData = require('../contracts/EventChainTicket.json');
    return contractData.address;
  } catch (error) {
    console.error('Contract data not found. Deploy contract first.');
    return null;
  }
};