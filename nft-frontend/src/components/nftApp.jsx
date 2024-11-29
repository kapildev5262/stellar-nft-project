import React, { useState } from "react";
import StellarSdk from "@stellar/stellar-sdk";
import { freighterApi } from "@stellar/freighter-api";
import axios from "axios";

const StellarNFT = () => {
  const [account, setAccount] = useState("");
  const [tokenID, setTokenID] = useState("");
  const [metadata, setMetadata] = useState({ name: "", description: "", image: null });
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state for better UX

  // Initialize connection to the Soroban contract
  const initializeContract = async () => {
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
    const contractAddress = "Your_Contract_Address"; // Replace with actual contract address
    try {
      const sorobanContract = new StellarSdk.SorobanContract(server, contractAddress);
      setContract(sorobanContract);
      console.log("Contract Initialized:", sorobanContract);
    } catch (error) {
      console.error("Error initializing contract:", error);
    }
  };

  // Connect Freighter wallet
  const connectWallet = async () => {
    try {
      console.log("Checking if Freighter is available...");
      if (!window.freighterApi) {
        throw new Error("Freighter wallet not detected. Please install Freighter.");
      }
      console.log("Freighter wallet detected. Attempting to get public key...");
      const publicKey = await window.freighterApi.getPublicKey();
      console.log("Connected Wallet Public Key:", publicKey);
      setAccount(publicKey); // Save public key to state
    } catch (error) {
      console.error("Error connecting to Freighter wallet:", error);
      alert(error.message);
    }
  };

  // Upload metadata to IPFS using Pinata
  const uploadToIPFS = async () => {
    const formData = new FormData();
    formData.append("file", metadata.image);

    const metadataObject = {
      name: metadata.name,
      description: metadata.description,
      image: "ipfs://<PLACEHOLDER_CID>/image.png",
    };

    try {
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          Authorization: `39a660ce7ecbb7ae4114`, // Replace with your Pinata API key
          "pinata-api-version": "v1",
        },
      });

      const cid = response.data.IpfsHash;
      metadataObject.image = `ipfs://${cid}/image.png`;

      return { metadataCID: cid, metadataJSON: metadataObject };
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      throw error;
    }
  };

  // Mint an NFT
  const mintNFT = async () => {
    if (!contract) {
      console.error("Contract not initialized!");
      return;
    }
    setLoading(true); // Start loading
    try {
      const { metadataCID, metadataJSON } = await uploadToIPFS();

      // Call Soroban contract to mint NFT
      const tx = await contract.call("mint_nft", {
        owner: account,
        token_id: tokenID,
        metadata_ipfs_hash: metadataCID,
      });

      console.log("NFT Minted:", tx);
      console.log("Metadata:", metadataJSON);
    } catch (error) {
      console.error("Error minting NFT:", error);
      alert("Error minting NFT. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div>
      <h1>Stellar NFT Minting</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <button onClick={initializeContract}>Initialize Contract</button>

      <div>
        <input
          type="text"
          placeholder="NFT Name"
          value={metadata.name}
          onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          value={metadata.description}
          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
        />
        <input type="file" onChange={(e) => setMetadata({ ...metadata, image: e.target.files[0] })} />
        <input type="number" placeholder="Token ID" value={tokenID} onChange={(e) => setTokenID(e.target.value)} />
        <button onClick={mintNFT} disabled={loading}>
          {loading ? "Minting..." : "Mint NFT"}
        </button>
      </div>
    </div>
  );
};

export default StellarNFT;
