#![cfg(test)]
extern crate std;

use crate::{StellarNftContract, StellarNftContractClient};
use soroban_sdk::{
    testutils::{Address as _, Logs},
    Address, Env, IntoVal,
};

/// Helper function to create and initialize an NFT contract
fn create_nft_contract<'a>(env: &Env, admin: &Address) -> StellarNftContractClient<'a> {
    let nft_contract = StellarNftContractClient::new(
        env,
        &env.register_contract(None, StellarNftContract {}),
    );

    nft_contract.initialize_contract(
        &admin,
        &"Eras Tour".into_val(env),
        &"Eras".into_val(env),
    );

    nft_contract
}

#[test]
fn mint_nft_should_work() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner_1 = Address::generate(&env);
    let owner_2 = Address::generate(&env);

    let nft_contract = create_nft_contract(&env, &admin);

    nft_contract.mint_nft(
        &owner_1,
        &1,
        &"ipfs://metadata_hash_1".into_val(&env),
    );
    nft_contract.mint_nft(
        &owner_2,
        &2,
        &"ipfs://metadata_hash_2".into_val(&env),
    );

    assert_eq!(nft_contract.get_owner(&1), Some(owner_1.clone()));
    assert_eq!(nft_contract.get_owner(&2), Some(owner_2.clone()));

    std::println!("{}", env.logs().all().join("\n"));
}

#[test]
fn transfer_nft_should_work() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner_1 = Address::generate(&env);
    let owner_2 = Address::generate(&env);

    let nft_contract = create_nft_contract(&env, &admin);

    nft_contract.mint_nft(
        &owner_1,
        &1,
        &"ipfs://metadata_hash_1".into_val(&env),
    );

    assert_eq!(nft_contract.get_owner(&1), Some(owner_1.clone()));

    nft_contract.transfer_nft(&1, &owner_1, &owner_2);
    assert_eq!(nft_contract.get_owner(&1), Some(owner_2.clone()));

    std::println!("{}", env.logs().all().join("\n"));
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn mint_duplicate_nft_should_fail() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);

    let nft_contract = create_nft_contract(&env, &admin);

    nft_contract.mint_nft(
        &owner,
        &1,
        &"ipfs://metadata_hash_1".into_val(&env),
    );

    // Attempt to mint a duplicate token ID
    nft_contract.mint_nft(
        &owner,
        &1,
        &"ipfs://metadata_hash_2".into_val(&env),
    );
}

#[test]
fn burn_nft_should_work() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);

    let nft_contract = create_nft_contract(&env, &admin);

    nft_contract.mint_nft(
        &owner,
        &1,
        &"ipfs://metadata_hash_1".into_val(&env),
    );

    assert_eq!(nft_contract.get_owner(&1), Some(owner.clone()));

    nft_contract.burn_nft(&1, &owner);
    assert_eq!(nft_contract.get_owner(&1), None);

    std::println!("{}", env.logs().all().join("\n"));
}



#[test]
fn test_transfer_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let non_owner = Address::generate(&env);

    let nft_contract = create_nft_contract(&env, &admin);

    nft_contract.mint_nft(
        &owner,
        &1,
        &"ipfs://metadata_hash_1".into_val(&env),
    );
    assert_eq!(nft_contract.get_owner(&1), Some(owner.clone()));

    nft_contract.transfer_nft(&1, &owner, &non_owner);
    assert_eq!(nft_contract.get_owner(&1), Some(non_owner.clone()));

    std::println!("{}", env.logs().all().join("\n"));
}