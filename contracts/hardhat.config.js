require("@nomicfoundation/hardhat-toolbox");
// If you're using older version, you might need:
// require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-ethers");

// Load environment variables
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: {
//     version: "0.8.19", // or your Solidity version
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200,
//       },
//     },
//   },
//   networks: {
//     // Local Hardhat network
//     hardhat: {
//       chainId: 31337,
//     },
    
//     // Polygon Mumbai Testnet
//     polygonMumbai: {
//       url: process.env.POLYGON_MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 80001,
//       gasPrice: 35000000000, // 35 gwei
//     },
    
//     // Alternative RPC URLs for Mumbai (in case one doesn't work)
//     mumbai: {
//       url: "https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // Replace with your Alchemy key
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 80001,
//     },
    
//     // Polygon Mainnet (for future use)
//     polygon: {
//       url: process.env.POLYGON_MAINNET_RPC || "https://polygon-rpc.com",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 137,
//     },
//   },
  
//   // Etherscan verification (optional)
//   etherscan: {
//     apiKey: {
//       polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
//       polygon: process.env.POLYGONSCAN_API_KEY || "",
//     },
//   },
// };


module.exports = {
  solidity: "0.8.17",
  networks: {
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337
    },
    mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80001
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137
    }
  }
};