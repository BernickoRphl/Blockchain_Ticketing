import { ethers, BrowserProvider, JsonRpcProvider, parseEther, formatEther } from 'ethers';

// Contract Configuration
export const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE"; // Replace with your deployed contract address
export const POLYGON_TESTNET_RPC = "https://rpc-mumbai.maticvigil.com/"; // Mumbai testnet

// Contract ABI - Add your contract ABI here
export const CONTRACT_ABI = [
  // Add your EventChainTicket contract ABI here
  // Example functions:
  "function mintTicket(address attendee, string calldata metadataURI, uint256 priceCap, uint256 expirationTimestamp) external returns (uint256)",
  "function validateTicket(uint256 tokenId) external",
  "function transferTicket(address to, uint256 tokenId, uint256 price) external",
  "function setResaleLimit(uint256 tokenId, uint256 newCap) external",
  "function setExpiration(uint256 tokenId, uint256 newExpiration) external",
  "function getTicketInfo(uint256 tokenId) external view returns (tuple(string metadataURI, uint256 resalePriceCap, uint256 expiration, bool used))",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)"
];

// Check if MetaMask is installed
export const checkMetaMask = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
  }
  return true;
};

// Connect to wallet
export const connectWallet = async () => {
  try {
    checkMetaMask();
    
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider and signer
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    // Check if connected to correct network (Polygon Mumbai testnet)
    const network = await provider.getNetwork();
    console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
    
    return {
      provider,
      signer,
      address,
      network
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
};

// Get contract instance
export const getContract = async (signerOrProvider = null) => {
  try {
    let contractSigner = signerOrProvider;
    
    if (!contractSigner) {
      const { signer } = await connectWallet();
      contractSigner = signer;
    }
    
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, contractSigner);
  } catch (error) {
    console.error('Error getting contract:', error);
    throw new Error(`Failed to get contract: ${error.message}`);
  }
};

// Get account balance
export const getBalance = async (address) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new Error(`Failed to get balance: ${error.message}`);
  }
};

// Switch to Polygon Mumbai testnet
export const switchToPolygonTestnet = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13881' }], // 80001 in hex (Mumbai testnet)
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x13881',
              chainName: 'Polygon Mumbai Testnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
              blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Polygon Mumbai testnet to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to Polygon Mumbai testnet');
    }
  }
};

// Utility functions
export const parseEtherValue = (value) => {
  return parseEther(value.toString());
};

export const formatEtherValue = (value) => {
  return formatEther(value);
};

export const isValidAddress = (address) => {
  return ethers.isAddress(address);
};