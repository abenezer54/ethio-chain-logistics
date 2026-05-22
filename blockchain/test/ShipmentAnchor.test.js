const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { ethers } = require("hardhat");

describe("ShipmentAnchor", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const ShipmentAnchor = await ethers.getContractFactory("ShipmentAnchor");
    const anchor = await ShipmentAnchor.deploy();
    await anchor.waitForDeployment();
    return { anchor, owner, other };
  }

  it("anchors a record and exposes it for verification", async function () {
    const { anchor, owner } = await deployFixture();
    const shipmentKey = ethers.keccak256(ethers.toUtf8Bytes("shipment-1"));
    const recordHash = ethers.sha256(ethers.toUtf8Bytes("event-1"));
    const previousHash = ethers.ZeroHash;

    await expect(anchor.anchorRecord(shipmentKey, recordHash, previousHash, 1))
      .to.emit(anchor, "RecordAnchored")
      .withArgs(shipmentKey, recordHash, previousHash, 1, owner.address, anyValue);

    expect(await anchor.isAnchored(recordHash)).to.equal(true);
    const record = await anchor.getRecord(recordHash);
    expect(record.shipmentKey).to.equal(shipmentKey);
    expect(record.previousHash).to.equal(previousHash);
    expect(record.recordType).to.equal(1);
    expect(record.anchoredBy).to.equal(owner.address);
  });

  it("rejects non-owner anchoring", async function () {
    const { anchor, other } = await deployFixture();
    const shipmentKey = ethers.keccak256(ethers.toUtf8Bytes("shipment-1"));
    const recordHash = ethers.sha256(ethers.toUtf8Bytes("event-1"));

    await expect(
      anchor.connect(other).anchorRecord(shipmentKey, recordHash, ethers.ZeroHash, 1)
    ).to.be.revertedWithCustomError(anchor, "NotOwner");
  });

  it("rejects duplicate record hashes", async function () {
    const { anchor } = await deployFixture();
    const shipmentKey = ethers.keccak256(ethers.toUtf8Bytes("shipment-1"));
    const recordHash = ethers.sha256(ethers.toUtf8Bytes("event-1"));

    await anchor.anchorRecord(shipmentKey, recordHash, ethers.ZeroHash, 1);

    await expect(
      anchor.anchorRecord(shipmentKey, recordHash, ethers.ZeroHash, 1)
    ).to.be.revertedWithCustomError(anchor, "RecordAlreadyAnchored");
  });
});

