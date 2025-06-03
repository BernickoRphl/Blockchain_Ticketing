const axios = require("axios");
require("dotenv").config();

const pinJSONToIPFS = async (metadata) => {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  try {
    const res = await axios.post(url, metadata, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    });

    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  } catch (err) {
    console.error("IPFS error:", err.response?.data || err.message);
    return null;
  }
};

module.exports = { pinJSONToIPFS };