#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, log, Address, Env, String, Symbol, Map};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum NftError {
    NotOwner = 1,
    TokenAlreadyMinted = 2,
    TokenNotFound = 3,
}

#[contract]
pub struct StellarNftContract;

#[contractimpl]
impl StellarNftContract {
    /// Initialize the contract with admin details, NFT collection name, and symbol
    pub fn initialize_contract(env: Env, admin: Address, collection_name: String, symbol: Symbol) {
        log!(
            &env,
            "Admin: {}, Collection Name: {}, Symbol: {}",
            admin,
            collection_name,
            symbol
        );
    }

    /// Mint a new NFT with metadata and a unique token ID
    pub fn mint_nft(env: Env, owner: Address, token_id: u32, metadata_ipfs_hash: String) -> Result<u32, NftError> {
        let mut nft_registry: Map<u32, (Address, String)> = env
            .storage()
            .persistent()
            .get(&"nft_registry")
            .unwrap_or(Map::new(&env));

        if nft_registry.contains_key(token_id) {
            return Err(NftError::TokenAlreadyMinted);
        }

        nft_registry.set(token_id, (owner.clone(), metadata_ipfs_hash.clone()));
        env.storage().persistent().set(&"nft_registry", &nft_registry);
        log!(
            &env,
            "NFT minted for Owner: {}, Token ID: {}, Metadata Hash: {}",
            owner,
            token_id,
            metadata_ipfs_hash
        );
        Ok(token_id)
    }

    /// Retrieve the owner of a specific NFT by token ID
    pub fn get_owner(env: Env, token_id: u32) -> Option<Address> {
        let nft_registry: Map<u32, (Address, String)> = env
            .storage()
            .persistent()
            .get(&"nft_registry")
            .unwrap_or(Map::new(&env));
        nft_registry.get(token_id).map(|(owner, _)| owner)
    }

    /// Transfer an NFT from one address to another
    pub fn transfer_nft(env: Env, token_id: u32, from: Address, to: Address) -> Result<u32, NftError> {
        let mut nft_registry: Map<u32, (Address, String)> = env
            .storage()
            .persistent()
            .get(&"nft_registry")
            .unwrap_or(Map::new(&env));

        match nft_registry.get(token_id) {
            Some((current_owner, metadata)) if current_owner == from => {
                nft_registry.set(token_id, (to.clone(), metadata.clone()));
                env.storage().persistent().set(&"nft_registry", &nft_registry);
                log!(
                    &env,
                    "NFT Token ID: {} transferred from {} to {}",
                    token_id,
                    from,
                    to
                );
                Ok(token_id)
            }
            _ => Err(NftError::NotOwner),
        }
    }

    /// Retrieve metadata associated with an NFT
    pub fn get_metadata(env: Env, token_id: u32) -> Option<String> {
        let nft_registry: Map<u32, (Address, String)> = env
            .storage()
            .persistent()
            .get(&"nft_registry")
            .unwrap_or(Map::new(&env));
        nft_registry.get(token_id).map(|(_, metadata)| metadata)
    }

    /// Burn (delete) an NFT by its token ID
    pub fn burn_nft(env: Env, token_id: u32, caller: Address) -> Result<(), NftError> {
        let mut nft_registry: Map<u32, (Address, String)> = env
            .storage()
            .persistent()
            .get(&"nft_registry")
            .unwrap_or(Map::new(&env));

        // Check if the token exists
        match nft_registry.get(token_id) {
            Some((owner, _)) if owner == caller => {
                // Burn the NFT (remove it from the registry)
                nft_registry.remove(token_id);
                env.storage().persistent().set(&"nft_registry", &nft_registry);
                log!(
                    &env,
                    "NFT Token ID: {} burned by Owner: {}",
                    token_id,
                    caller
                );
                Ok(())
            }
            Some(_) => Err(NftError::NotOwner), // Caller is not the owner
            None => Err(NftError::TokenNotFound), // Token not found
        }
    }
}


mod test;