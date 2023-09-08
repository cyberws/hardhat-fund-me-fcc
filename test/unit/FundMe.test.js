const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.parseEther("1") // 1 ETH
          beforeEach(async function () {
              // deploy our fundMe contact
              // using Hardhat-deploy
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]

              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture("all")
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
          describe("constructor", async function () {
              it("set the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  const mockaddress = await mockV3Aggregator.getAddress()
                  assert.equal(response, mockaddress)
              })
          })

          describe("fund", async function () {
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              it("Updates the amount funded data structure", async function () {
                  await fundMe.fund({ value: sendValue })
                  const response = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds funder to array of funders", async function () {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue })
              })
              it("withdraw ETH from a single founder", async function () {
                  // Arrange
                  const startingFundeMeBalance =
                      await ethers.provider.getBalance(fundMe.getAddress())
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { fee } = transactionReceipt
                  const endingFundeMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress()
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundeMeBalance, 0)
                  assert.equal(
                      startingFundeMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee
                  )
              })

              it("allows us to withdraw with multiple funders", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundeMeBalance =
                      await ethers.provider.getBalance(fundMe.getAddress())
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer)
                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)

                  const { fee } = transactionReceipt
                  const endingFundeMeBalance = await ethers.provider.getBalance(
                      fundMe.getAddress()
                  )
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer)

                  // Assert
                  assert.equal(endingFundeMeBalance, 0)
                  assert.equal(
                      startingFundeMeBalance + startingDeployerBalance,
                      endingDeployerBalance + fee
                  )
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allow deployer to withdraw", async function () {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await expect(
                          fundMeConnectedContract.withdraw()
                      ).to.be.revertedWith("FundMe__NotOwner")
                  }
              })
          })
      })
