// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed();
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed();
error NftMarketplace__NotEnoughPrice();
error NftMarketplace__NotEnoughProceeds();
error NftMarketplace__TransferNotSuccess();

contract NftMarketplace {
	// Type Variables
	struct Listing {
		address seller;
		uint256 price;
	}

	// Events
	event ItemListed(
		address indexed seller,
		address indexed nftAddress,
		uint256 indexed tokenId,
		uint256 price
	);

	event ItemCancelled(
		address indexed nftAddress,
		address indexed sender,
		uint256 indexed tokenId
	);

	event BoughtNft(
		address indexed nftAddress,
		address indexed buyer,
		uint256 indexed tokenId
	);

	// State Variables
	mapping(address => mapping(uint256 => Listing)) private s_listings;
	mapping(address => uint256) private s_addressToAmount;
	// Modifier Functions

	modifier notListed(address nftAddress, uint256 tokenId) {
		Listing memory listing = s_listings[nftAddress][tokenId];
		if (listing.price > 0) {
			revert NftMarketplace__AlreadyListed();
		}
		_;
	}
	modifier isListed(address nftAddress, uint256 tokenId) {
		Listing memory listing = s_listings[nftAddress][tokenId];
		if (listing.price <= 0) {
			revert NftMarketplace__NotListed();
		}
		_;
	}

	modifier isOwner(
		address nftAddress,
		uint256 tokenId,
		address spender
	) {
		IERC721 nft = IERC721(nftAddress);
		if (nft.ownerOf(tokenId) != spender) {
			revert NftMarketplace__NotOwner();
		}
		_;
	}

	function listNft(
		address nftAddress,
		uint256 tokenId,
		uint256 price
	)
		external
		notListed(nftAddress, tokenId)
		isOwner(nftAddress, tokenId, msg.sender)
	{
		if (price <= 0) {
			revert NftMarketplace__PriceMustBeAboveZero();
		}
		// Two ways to list nft
		// 1. the Nft is transferred to the marketplace contract and the contract becomes the current owner to sell it
		// 2. the Marketplace Contract is given approval to sell the nft, the owner still has nft but the contract has the aprroval to move/sell it
		IERC721 nft = IERC721(nftAddress);

		if (nft.getApproved(tokenId) != address(this)) {
			revert NftMarketplace__NotApprovedForMarketplace();
		}

		// How to we keep track of the listings? mapping(nftAddress => mapping(tokenId => Listing)), where Listing will be a custom type
		// Listing will have address of the lister and the price
		s_listings[nftAddress][tokenId] = Listing(msg.sender, price);
		emit ItemListed(msg.sender, nftAddress, tokenId, price);
	}

	function cancelListing(address nftAddress, uint256 tokenId)
		external
		isOwner(nftAddress, tokenId, msg.sender)
		isListed(nftAddress, tokenId)
	{
		delete (s_listings[nftAddress][tokenId]);
		emit ItemCancelled(nftAddress, msg.sender, tokenId);
	}

	function buyNft(address nftAddress, uint256 tokenId)
		external
		payable
		isListed(nftAddress, tokenId)
	{
		Listing memory listedItem = s_listings[nftAddress][tokenId];
		if (msg.value < listedItem.price) {
			revert NftMarketplace__NotEnoughPrice();
		}
		// here!!!!!!!!!!!!!!!!
		address seller = listedItem.seller;
		delete (s_listings[nftAddress][tokenId]);
		s_addressToAmount[seller] += msg.value;

		IERC721 nft = IERC721(nftAddress);
		nft.safeTransferFrom(seller, msg.sender, tokenId);
		emit BoughtNft(nftAddress, msg.sender, tokenId);
	}

	function updateListing(address nftAddress, uint256 tokenId, uint256 newPrice)
		external
		isOwner(nftAddress, tokenId, msg.sender)
		isListed(nftAddress, tokenId)
	{
		s_listings[nftAddress][tokenId].price = newPrice;
		emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
	}

	function withdrawProceeds() external {
		uint256 proceeds = s_addressToAmount[msg.sender];
		if (proceeds <= 0 ){
			revert NftMarketplace__NotEnoughProceeds();
		}
		s_addressToAmount[msg.sender] = 0;
		(bool success, ) = payable(msg.sender).call{value:proceeds}("");
		if (!success) {
			revert NftMarketplace__TransferNotSuccess();
		}
	}

	// Getter functions
	function getListing(address nftAddress, uint256 tokenId)
		public
		view
		returns (uint256)
	{
		return s_listings[nftAddress][tokenId].price;
	}

	function getAddressToAmount(address user) public view returns (uint256) {
		return s_addressToAmount[user];
	}
}
