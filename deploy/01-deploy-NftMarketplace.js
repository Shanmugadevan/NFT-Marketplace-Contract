const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()

    log("Deploying NftMarketplace......")
    const nftMarketplace = await deploy("NftMarketplace",{
        from:deployer,
        args:[],
        log:true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    log("Deployed!")
    log("------------------------------")

}

module.exports.tags = ["all"]