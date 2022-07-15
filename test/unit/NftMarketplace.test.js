const { expect, assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
/* global BigInt */

!developmentChains.includes(network.name)
	? describe.skip
	: describe("NftMarketplace Unit test", function () {
			let deployer, nftMarketplace, basicNft, txResponse, tokenId, player, nftMarketplacePlayer
			beforeEach(async () => {
				deployer = (await getNamedAccounts()).deployer
				player = (await getNamedAccounts()).player
				await deployments.fixture(["all"])
				nftMarketplace = await ethers.getContract("NftMarketplace", deployer)
				nftMarketplacePlayer = await ethers.getContract("NftMarketplace", player)
				basicNft = await ethers.getContract("BasicNft", deployer)
				txResponse = await basicNft.mintNft()
				await txResponse.wait(1)
				tokenId = await basicNft.getTokenCounter()
			})
			describe("listNft tests", function () {
				it("Reverts when value send is 0 or less", async () => {
					await basicNft.approve(nftMarketplace.address, tokenId)
					await expect(
						nftMarketplace.listNft(basicNft.address, tokenId, 0),
					).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
				})

				it("Reverts when nft is already listed", async () => {
					await basicNft.approve(nftMarketplace.address, tokenId)
					const price = ethers.utils.parseEther("1")
					await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await expect(
						nftMarketplace.listNft(basicNft.address, tokenId, price),
					).to.be.revertedWith("NftMarketplace__AlreadyListed")
				})

				it("Reverts if not Owner", async ()=> {
					await basicNft.approve(nftMarketplace.address, tokenId)
					const price = ethers.utils.parseEther("1")
					await expect(nftMarketplacePlayer.listNft(basicNft.address, tokenId, price)).to.be.revertedWith("NftMarketplace__NotOwner")
				})

				it("Reverts if NFT not approved for Marketplace", async () => {
					const price = ethers.utils.parseEther("1")
					await expect(
						nftMarketplace.listNft(basicNft.address, tokenId, price),
					).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
				})

				it("Checks if listing is updated", async () => {
                    const price = ethers.utils.parseEther("1")
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await nftMarketplace.listNft(basicNft.address, tokenId, price)
                    const listedPrice = await nftMarketplace.getListing(basicNft.address,tokenId)
                    assert.equal(price.toString(),listedPrice.toString())
                })
                
                it("Emits event", async () => {
                    const price = ethers.utils.parseEther("1")
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await expect(nftMarketplace.listNft(basicNft.address, tokenId, price)).to.emit(nftMarketplace, "ItemListed")
                })
			})

            describe("cancelListing Tests", function () {
                it("Reverts when not Listed", async () => {
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await expect(nftMarketplace.cancelListing(basicNft.address, tokenId)).to.be.revertedWith("NftMarketplace__NotListed")
                })
				it("Reverts if not Owner", async () => {
					const price = ethers.utils.parseEther("1")
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await nftMarketplace.listNft(basicNft.address, tokenId, price)
                    await expect(nftMarketplacePlayer.cancelListing(basicNft.address, tokenId)).to.be.revertedWith("NftMarketplace__NotOwner")
				})
                
                it("Deletes Listing", async () => {
                    const price = ethers.utils.parseEther("1")
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await nftMarketplace.listNft(basicNft.address, tokenId, price)
                    await nftMarketplace.cancelListing(basicNft.address, tokenId)
                    const list = await nftMarketplace.getListing(basicNft.address, tokenId)
                    assert.equal(list.toString(),"0")

                })

                it("Emits event", async () => {
                    const price = ethers.utils.parseEther("1")
                    await basicNft.approve(nftMarketplace.address, tokenId)
                    await nftMarketplace.listNft(basicNft.address, tokenId, price)
                    await expect(nftMarketplace.cancelListing(basicNft.address, tokenId)).to.emit(nftMarketplace,"ItemCancelled")
                })
            })

			describe("buyNft Tests", () => {
				it("Reverts if not already listed", async () => {
                    const price = ethers.utils.parseEther("1")
					await basicNft.approve(nftMarketplace.address, tokenId)
					await expect(nftMarketplacePlayer.buyNft(basicNft.address, tokenId,{value: price})).to.be.revertedWith("NftMarketplace__NotListed")
				})

				it("Reverts if value sent is less", async () => {
					const price = ethers.utils.parseEther("1")
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					const price2 = ethers.utils.parseEther("0.5")
					await expect(nftMarketplacePlayer.buyNft(basicNft.address, tokenId,{value: price2})).to.be.revertedWith("NftMarketplace__NotEnoughPrice")
				})

				it("Checks if listing is deleted", async () => {
					const price = ethers.utils.parseEther("1")
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					await nftMarketplacePlayer.buyNft(basicNft.address, tokenId,{value: price})
					const updatedPrice = await nftMarketplace.getListing(basicNft.address,tokenId)
					assert.equal(updatedPrice.toString(),"0") 
				})

				it("Checks if amount paid is updated on sellers account", async () => {
					const price = ethers.utils.parseEther("1")
					const amount = await nftMarketplace.getAddressToAmount(deployer)
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					await nftMarketplacePlayer.buyNft(basicNft.address, tokenId,{value: price})
					const updatedAmount = await  nftMarketplace.getAddressToAmount(deployer)
					const amountNumber = BigInt(amount.toString())
					const priceNumber =  BigInt(price.toString())
					const expectedAmount =  amountNumber + priceNumber 
					assert.equal(expectedAmount,BigInt(updatedAmount.toString()))
				})

				it("Emits event", async () => {
					const price = ethers.utils.parseEther("1")
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					await expect(nftMarketplacePlayer.buyNft(basicNft.address, tokenId,{value: price})).to.emit(nftMarketplace,"BoughtNft")
				})
			})

			describe("updateListing", () =>{
				it("Reverts if not already listed", async () => {
					await basicNft.approve(nftMarketplace.address, tokenId)
					const updatedPrice = ethers.utils.parseEther("2")
					await expect(nftMarketplace.updateListing(basicNft.address, tokenId,updatedPrice)).to.be.revertedWith("NftMarketplace__NotListed")
				})
				it("Reverts if not Owner", async () => {
					await basicNft.approve(nftMarketplace.address, tokenId)
					const updatedPrice = ethers.utils.parseEther("2")
					await expect(nftMarketplacePlayer.updateListing(basicNft.address, tokenId,updatedPrice)).to.be.revertedWith("")
				})
				it("Updates listing price", async () => {
					const price = ethers.utils.parseEther("1")
					const amount = await nftMarketplace.getAddressToAmount(deployer)
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					const updatedPrice = ethers.utils.parseEther("2")
					await nftMarketplace.updateListing(basicNft.address,tokenId,updatedPrice)
					const amountFromContract = await nftMarketplace.getListing(basicNft.address, tokenId)
					assert.equal(updatedPrice.toString(), amountFromContract.toString())
				})

				it("Emits event", async () => {
					const price = ethers.utils.parseEther("1")
					const amount = await nftMarketplace.getAddressToAmount(deployer)
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					const updatedPrice = ethers.utils.parseEther("2")
					await expect(nftMarketplace.updateListing(basicNft.address,tokenId,updatedPrice)).to.emit(nftMarketplace,"ItemListed")
				})
			})

			describe("withdrawProceeds", () => {
				it("Reverts if no proceeds", async () => {
					await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith("NftMarketplace__NotEnoughProceeds")
				})

				it("Updates proceeds to zero", async () => {
					const price = ethers.utils.parseEther("1")
					// const amount = await nftMarketplace.getAddressToAmount(deployer)
					await basicNft.approve(nftMarketplace.address, tokenId)
					const tx = await nftMarketplace.listNft(basicNft.address, tokenId, price)
					await tx.wait(1)
					// const updatedPrice = ethers.utils.parseEther("2")
					await nftMarketplace.buyNft(basicNft.address, tokenId,{value: price})
					await nftMarketplace.withdrawProceeds()
					const amountFromContract = await nftMarketplace.getAddressToAmount(deployer)
					assert.equal(amountFromContract.toString(),"0")
				})
			})

	  })
