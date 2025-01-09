import React, { useState } from "react";
import StellarSdk from "@stellar/stellar-sdk";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import axios from "axios";
import "./StellarNFT.css"; // Assuming your CSS file is named StellarNFT.css

const StellarNFT = () => {
  const [account, setAccount] = useState("");
  const [tokenID, setTokenID] = useState("");
  const [metadata, setMetadata] = useState({ name: "", description: "", image: null });
  const [contract, setContract] = useState(null);
  const [nftOwner, setNftOwner] = useState("");
  const [nftMetadata, setNftMetadata] = useState("");
  const [transferStatus, setTransferStatus] = useState("");

  const [isFreighterConnected, setIsFreighterConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize connection to the Soroban contract
  const initializeContract = async () => {
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
    const contractAddress = "CDHYIPJYPPJYZCTEYBYMBRV2M6TYLGE7BKM45JS5SQIE6JWM3M37SRAR"; // Replace with actual contract address
    try {
      const sorobanContract = new StellarSdk.SorobanContract(server, contractAddress);
      setContract(sorobanContract);
      console.log("Contract Initialized:", sorobanContract);
    } catch (error) {
      console.error("Error initializing contract:", error);
    }
  };

  // Check if Freighter is connected
  const checkFreighterConnection = async () => {
    try {
      setLoading(true);
      const connectionStatus = await isConnected();
      setIsFreighterConnected(connectionStatus.isConnected);
      setLoading(false);
    } catch (error) {
      setIsError(true);
      console.error("Error checking Freighter connection", error);
      setLoading(false);
    }
  };

  // Request access and retrieve public key
  const connectWallet = async () => {
    try {
      setLoading(true);
      const accessObj = await requestAccess();
      if (accessObj.error) {
        setIsError(true);
        alert("Error connecting to Freighter");
      } else {
        setUserAddress(accessObj.address);
      }
      setLoading(false);
    } catch (error) {
      setIsError(true);
      console.error("Error requesting access", error);
      setLoading(false);
    }
  };

  // Get the address without requesting access
  const getWalletAddress = async () => {
    try {
      setLoading(true);
      const addressObj = await getAddress();
      if (addressObj.error) {
        setIsError(true);
        alert("Error retrieving address");
      } else {
        setUserAddress(addressObj.address);
      }
      setLoading(false);
    } catch (error) {
      setIsError(true);
      console.error("Error retrieving address", error);
      setLoading(false);
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
        <button className="btn" onClick={checkFreighterConnection} disabled={loading}>
          {loading ? "Checking..." : "Check Connection"}
        </button>

        {isFreighterConnected && !userAddress && (
          <div>
            <button className="btn" onClick={connectWallet} disabled={loading}>
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        )}

        {!isFreighterConnected && !loading && (
          <div>
            <p>Freighter is not connected. Please install the Freighter extension.</p>
          </div>
        )}

        {userAddress && (
          <div>
            <p>Connected! Address: {userAddress}</p>
            <button className="btn" onClick={initializeContract}>
              Initialize Contract
            </button>
          </div>
        )}

        {isError && <p style={{ color: "red" }}>Something went wrong. Please try again.</p>}
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
