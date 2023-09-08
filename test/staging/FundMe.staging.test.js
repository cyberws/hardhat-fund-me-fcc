const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")

if (developmentChains.includes(network.name)) {
    console.log("Not a dev net skipping ...")
} else {
    console.log("Dev net testing ...")
    describe("FundMe", async function () {
        let fundMe
        let deployer
        const sendValue = ethers.parseEther("0.05")
        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            fundMe = await ethers.getContract("FundMe", deployer)
        })

        it("allows people to fund and withdraw", async function () {
            await fundMe.fund({ value: sendValue })
            await fundMe.withdraw()
            const endingBalance = await ethers.provider.getBalance(
                fundMe.getAddress()
            )
            assert.equal(endingBalance.toString(), "0")
        })
    })
}
