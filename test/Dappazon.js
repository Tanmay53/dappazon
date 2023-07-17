const { expect } = require("chai")
const { ethers } = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ID = 1
const NAME = "Shoes"
const CATEGORY = "clothing"
const IMAGE = "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg"
const COST = tokens(1)
const RATING = 4
const STOCK = 5

describe("Dappazon", () => {
  let dappazon
  let deployer, buyer

  beforeEach( async () => {
    // Accounts
    [deployer, buyer] = await ethers.getSigners()

    // Deploy Contract
    const Dappazon = await ethers.getContractFactory("Dappazon")
    dappazon = await Dappazon.deploy()
  })

  describe("Deployment", () => {
    it('Sets the owners', async () => {
      expect(deployer.address).to.equal(await dappazon.owner())
    })
  })

  describe("Listing", () => {
    let transaction

    beforeEach(async () => {
      transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
      await transaction.wait()
    })

    it("Returns item attributes", async () => {
      const item = await dappazon.items(ID)
      expect(item.id).to.equal(ID)
      expect(item.name).to.equal(NAME)
      expect(item.category).to.equal(CATEGORY)
      expect(item.image).to.equal(IMAGE)
      expect(item.cost).to.equal(COST)
      expect(item.rating).to.equal(RATING)
      expect(item.stock).to.equal(STOCK)
    })

    it("Emits List event", () => {
      expect(transaction).to.emit(dappazon, 'List')
    })
  })

  describe("Buying", () => {
    let transaction

    beforeEach( async () => {
      transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
      await transaction.wait()

      transaction = await dappazon.connect(buyer).buy(ID, { value: COST })
    })

    it("Updates the contract balance", async() => {
      const balance = await ethers.provider.getBalance(dappazon.address)
      expect(balance).to.equal(COST)
    })

    it("Updates buyer's order count", async () => {
      const count = await dappazon.orderCount(buyer.address)
      expect(count).to.equal(1)
    })

    it("Adds the order", async () => {
      const order = await dappazon.orders(buyer.address, 1)

      expect(order.time).to.greaterThan(0)
      expect(order.item.name).to.equal(NAME)
    })

    it("Updates the Stock", async () => {
      const item = await dappazon.items(ID)

      expect(item.stock).to.equal(STOCK - 1)
    })

    it("Emits Buy event", () => {
      expect(transaction).to.emit(dappazon, 'Buying')
    })
  })

  describe("Withdrawl", () => {
    let transaction, beforeBalance

    beforeEach( async () => {
      transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
      await transaction.wait()

      transaction = await dappazon.connect(buyer).buy(ID, { value: COST })

      beforeBalance = await ethers.provider.getBalance(deployer.address)

      transaction = await dappazon.connect(deployer).withdraw()
      await transaction.wait()
    })

    it("Updates owner balance", async () => {
      const balance = await ethers.provider.getBalance(deployer.address)

      expect(balance).to.greaterThan(beforeBalance)
    })

    it("Updates contract balance", async () => {
      const balance = await ethers.provider.getBalance(dappazon.address)

      expect(balance).to.equal(0)
    })
  })
})
