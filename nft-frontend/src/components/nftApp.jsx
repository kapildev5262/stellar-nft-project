import React, { useState } from "react";
import StellarSdk from "@stellar/stellar-sdk";
import { freighterApi } from "@stellar/freighter-api";
import axios from "axios";
import "./StellarNFT.css"; // Assuming your CSS file is named StellarNFT.css

const StellarNFT = () => {
  const [account, setAccount] = useState("");
  const [tokenID, setTokenID] = useState("");
  const [metadata, setMetadata] = useState({ name: "", description: "", image: null });
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state for better UX
  const [nftOwner, setNftOwner] = useState("");
  const [nftMetadata, setNftMetadata] = useState("");
  const [transferStatus, setTransferStatus] = useState("");

  // Initialize connection to the Soroban contract
  const initializeContract = async () => {
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
    const contractAddress = "80c17635b126b9def6200f304e33a53fba907ac3610a5b777d0cb00d24a0e191"; // Replace with actual contract address
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

  // Retrieve the owner of a specific NFT
  const getOwner = async () => {
    if (!contract || !tokenID) {
      console.error("Contract not initialized or token ID not provided!");
      return;
    }
    try {
      const owner = await contract.call("get_owner", { token_id: tokenID });
      console.log("NFT Owner:", owner);
      setNftOwner(owner); // Save the owner's address to state
    } catch (error) {
      console.error("Error retrieving NFT owner:", error);
      alert("Error retrieving NFT owner. Please try again.");
    }
  };

  // Transfer an NFT to another address
  const transferNFT = async (toAddress) => {
    if (!contract || !tokenID || !account) {
      console.error("Contract not initialized, token ID not provided, or account not connected!");
      return;
    }
    setTransferStatus("Transferring..."); // Set transfer status
    try {
      const tx = await contract.call("transfer_nft", {
        token_id: tokenID,
        from: account,
        to: toAddress,
      });
      console.log("NFT Transferred:", tx);
      setTransferStatus("Transfer Successful!");
    } catch (error) {
      console.error("Error transferring NFT:", error);
      setTransferStatus("Transfer Failed.");
    }
  };

  // Retrieve metadata associated with an NFT
  const getMetadata = async () => {
    if (!contract || !tokenID) {
      console.error("Contract not initialized or token ID not provided!");
      return;
    }
    try {
      const metadata = await contract.call("get_metadata", { token_id: tokenID });
      console.log("NFT Metadata:", metadata);
      setNftMetadata(metadata); // Save metadata to state
    } catch (error) {
      console.error("Error retrieving NFT metadata:", error);
      alert("Error retrieving NFT metadata. Please try again.");
    }
  };

  // Burn an NFT (delete by token ID)
  const burnNFT = async () => {
    if (!contract || !tokenID || !account) {
      console.error("Contract not initialized, token ID not provided, or account not connected!");
      return;
    }
    try {
      const tx = await contract.call("burn_nft", {
        token_id: tokenID,
        caller: account,
      });
      console.log("NFT Burned:", tx);
    } catch (error) {
      console.error("Error burning NFT:", error);
      alert("Error burning NFT. Please try again.");
    }
  };

  return (
    <div className="nft-container">
      <h1 className="heading">Stellar NFT Minting</h1>
      <div className="actions">
        <button className="btn" onClick={connectWallet}>
          Connect Wallet
        </button>
        <button className="btn" onClick={initializeContract}>
          Initialize Contract
        </button>
      </div>

      <div className="mint-form">
        <h2>Mint NFT</h2>
        <input
          className="input-field"
          type="text"
          placeholder="NFT Name"
          value={metadata.name}
          onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
        />
        <input
          className="input-field"
          type="text"
          placeholder="Description"
          value={metadata.description}
          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
        />
        <input
          className="input-field"
          type="file"
          onChange={(e) => setMetadata({ ...metadata, image: e.target.files[0] })}
        />
        <input
          className="input-field"
          type="number"
          placeholder="Token ID"
          value={tokenID}
          onChange={(e) => setTokenID(e.target.value)}
        />
        <button className="btn" onClick={mintNFT} disabled={loading}>
          {loading ? "Minting..." : "Mint NFT"}
        </button>
      </div>

      <div className="nft-info">
      <input
          className="input-field"
          type="number"
          placeholder="Token ID"
          value={tokenID}
          onChange={(e) => setTokenID(e.target.value)}
        />
        <button className="btn" onClick={getOwner}>
          Get Owner
        </button>
        {nftOwner && <p>Owner Address: {nftOwner}</p>}
      </div>

      <div className="nft-info">
        <input
          className="input-field"
          type="number"
          placeholder="Token ID"
          value={tokenID}
          onChange={(e) => setTokenID(e.target.value)}
        />
        <button className="btn" onClick={getMetadata}>
          Get Metadata
        </button>
        {nftMetadata && <p>Metadata: {nftMetadata}</p>}
      </div>

      <div className="nft-transfer">
        <input
          className="input-field"
          type="text"
          placeholder="Recipient Address"
          onChange={(e) => setTransferStatus(e.target.value)}
        />
        <button className="btn" onClick={() => transferNFT(transferStatus)}>
          Transfer NFT
        </button>
        <p>{transferStatus}</p>
      </div>

      <div className="nft-burn">
        <input
          className="input-field"
          type="number"
          placeholder="Token ID"
          value={tokenID}
          onChange={(e) => setTokenID(e.target.value)}
        />
        <button className="btn" onClick={burnNFT}>
          Burn NFT
        </button>
      </div>
    </div>
  );
};

export default StellarNFT;
