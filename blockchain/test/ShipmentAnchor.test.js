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

  it("sets the deployer as owner", async function () {
    const { anchor, owner } = await deployFixture();

    expect(await anchor.owner()).to.equal(owner.address);
  });

  it("transfers ownership", async function () {
    const { anchor, owner, other } = await deployFixture();

    await expect(anchor.transferOwnership(other.address))
      .to.emit(anchor, "OwnershipTransferred")
      .withArgs(owner.address, other.address);

    expect(await anchor.owner()).to.equal(other.address);
  });

  it("rejects ownership transfer to the zero address", async function () {
    const { anchor } = await deployFixture();

    await expect(anchor.transferOwnership(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      anchor,
      "InvalidOwner"
    );
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

  it("rejects invalid anchor inputs", async function () {
    const { anchor } = await deployFixture();
    const shipmentKey = ethers.keccak256(ethers.toUtf8Bytes("shipment-1"));
    const recordHash = ethers.sha256(ethers.toUtf8Bytes("event-1"));

    await expect(
      anchor.anchorRecord(ethers.ZeroHash, recordHash, ethers.ZeroHash, 1)
    ).to.be.revertedWithCustomError(anchor, "InvalidShipmentKey");

    await expect(
      anchor.anchorRecord(shipmentKey, ethers.ZeroHash, ethers.ZeroHash, 1)
    ).to.be.revertedWithCustomError(anchor, "InvalidRecordHash");

    await expect(
      anchor.anchorRecord(shipmentKey, recordHash, ethers.ZeroHash, 99)
    ).to.be.revertedWithCustomError(anchor, "InvalidRecordType");
  });

  it("rejects lookup of a missing record", async function () {
    const { anchor } = await deployFixture();
    const recordHash = ethers.sha256(ethers.toUtf8Bytes("missing"));

    expect(await anchor.isAnchored(recordHash)).to.equal(false);
    await expect(anchor.getRecord(recordHash)).to.be.revertedWithCustomError(
      anchor,
      "RecordNotAnchored"
    );
  });

  it("accepts all supported record types", async function () {
    const { anchor } = await deployFixture();
    const shipmentKey = ethers.keccak256(ethers.toUtf8Bytes("shipment-1"));

    for (const recordType of [1, 2, 3]) {
      const recordHash = ethers.sha256(ethers.toUtf8Bytes(`record-${recordType}`));

      await anchor.anchorRecord(shipmentKey, recordHash, ethers.ZeroHash, recordType);

      const record = await anchor.getRecord(recordHash);
      expect(record.recordType).to.equal(recordType);
    }
  });
});
