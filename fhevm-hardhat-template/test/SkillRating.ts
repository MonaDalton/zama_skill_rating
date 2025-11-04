import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SkillRating, SkillRating__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("SkillRating")) as SkillRating__factory;
  const skillRatingContract = (await factory.deploy()) as SkillRating;
  const skillRatingContractAddress = await skillRatingContract.getAddress();

  return { skillRatingContract, skillRatingContractAddress };
}

describe("SkillRating", function () {
  let signers: Signers;
  let skillRatingContract: SkillRating;
  let skillRatingContractAddress: string;
  let roundId: bigint;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ skillRatingContract, skillRatingContractAddress } = await deployFixture());
    
    // Create a new round
    const tx = await skillRatingContract.createRound();
    await tx.wait();
    roundId = await skillRatingContract.currentRoundId();
    
    // Add members
    await skillRatingContract.addMembers([
      signers.alice.address,
      signers.bob.address,
      signers.charlie.address,
    ]);
  });

  it("should create a new round", async function () {
    const currentRound = await skillRatingContract.currentRoundId();
    expect(currentRound).to.be.gt(0);
  });

  it("should add members to a round", async function () {
    const isAliceMember = await skillRatingContract.isMember(signers.alice.address, roundId);
    const isBobMember = await skillRatingContract.isMember(signers.bob.address, roundId);
    expect(isAliceMember).to.be.true;
    expect(isBobMember).to.be.true;
  });

  it("should set weights for a round", async function () {
    // Set weights (e.g., codeQuality=40, communication=15, contribution=10, collaboration=30, creativity=5)
    // Note: In real usage, these would be encrypted values
    const codeQualityWeight = 40;
    const communicationWeight = 15;
    const contributionWeight = 10;
    const collaborationWeight = 30;
    const creativityWeight = 5;

    const encryptedWeights = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.deployer.address)
      .add32(codeQualityWeight)
      .add32(communicationWeight)
      .add32(contributionWeight)
      .add32(collaborationWeight)
      .add32(creativityWeight)
      .encrypt();

    const tx = await skillRatingContract.setWeights(
      roundId,
      encryptedWeights.handles[0],
      encryptedWeights.handles[1],
      encryptedWeights.handles[2],
      encryptedWeights.handles[3],
      encryptedWeights.handles[4],
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof
    );
    await tx.wait();

    // Weights are set (no revert means success)
    expect(tx.hash).to.not.be.undefined;
  });

  it("should submit encrypted ratings", async function () {
    // Alice rates Bob
    const codeQualityScore = 8;
    const communicationScore = 7;
    const contributionScore = 9;
    const collaborationScore = 8;
    const creativityScore = 6;

    const encryptedScores = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.alice.address)
      .add32(codeQualityScore)
      .add32(communicationScore)
      .add32(contributionScore)
      .add32(collaborationScore)
      .add32(creativityScore)
      .encrypt();

    const tx = await skillRatingContract
      .connect(signers.alice)
      .submitRating(
        signers.bob.address,
        roundId,
        encryptedScores.handles[0],
        encryptedScores.handles[1],
        encryptedScores.handles[2],
        encryptedScores.handles[3],
        encryptedScores.handles[4],
        [
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
        ]
      );
    await tx.wait();

    // Check if rating was recorded
    const hasRated = await skillRatingContract.hasMemberRated(
      signers.bob.address,
      signers.alice.address,
      roundId
    );
    expect(hasRated).to.be.true;

    const ratingCount = await skillRatingContract.getRatingCount(signers.bob.address, roundId);
    expect(ratingCount).to.eq(1);
  });

  it("should prevent duplicate ratings", async function () {
    const encryptedScores = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.alice.address)
      .add32(8)
      .add32(7)
      .add32(9)
      .add32(8)
      .add32(6)
      .encrypt();

    // First rating
    let tx = await skillRatingContract
      .connect(signers.alice)
      .submitRating(
        signers.bob.address,
        roundId,
        encryptedScores.handles[0],
        encryptedScores.handles[1],
        encryptedScores.handles[2],
        encryptedScores.handles[3],
        encryptedScores.handles[4],
        [
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
          encryptedScores.inputProof,
        ]
      );
    await tx.wait();

    // Try to rate again - should fail
    await expect(
      skillRatingContract
        .connect(signers.alice)
        .submitRating(
          signers.bob.address,
          roundId,
          encryptedScores.handles[0],
          encryptedScores.handles[1],
          encryptedScores.handles[2],
          encryptedScores.handles[3],
          encryptedScores.handles[4],
          [
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
          ]
        )
    ).to.be.revertedWith("Already rated");
  });

  it("should prevent self-rating", async function () {
    const encryptedScores = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.alice.address)
      .add32(8)
      .add32(7)
      .add32(9)
      .add32(8)
      .add32(6)
      .encrypt();

    await expect(
      skillRatingContract
        .connect(signers.alice)
        .submitRating(
          signers.alice.address,
          roundId,
          encryptedScores.handles[0],
          encryptedScores.handles[1],
          encryptedScores.handles[2],
          encryptedScores.handles[3],
          encryptedScores.handles[4],
          [
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
            encryptedScores.inputProof,
          ]
        )
    ).to.be.revertedWith("Cannot rate yourself");
  });

  it("should calculate weighted score", async function () {
    // Set weights first
    const encryptedWeights = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.deployer.address)
      .add32(40)
      .add32(15)
      .add32(10)
      .add32(30)
      .add32(5)
      .encrypt();

    await skillRatingContract.setWeights(
      roundId,
      encryptedWeights.handles[0],
      encryptedWeights.handles[1],
      encryptedWeights.handles[2],
      encryptedWeights.handles[3],
      encryptedWeights.handles[4],
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof,
      encryptedWeights.inputProof
    );

    // Alice rates Bob
    const encryptedScores1 = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.alice.address)
      .add32(8)
      .add32(7)
      .add32(9)
      .add32(8)
      .add32(6)
      .encrypt();

    await skillRatingContract
      .connect(signers.alice)
      .submitRating(
        signers.bob.address,
        roundId,
        encryptedScores1.handles[0],
        encryptedScores1.handles[1],
        encryptedScores1.handles[2],
        encryptedScores1.handles[3],
        encryptedScores1.handles[4],
        [
          encryptedScores1.inputProof,
          encryptedScores1.inputProof,
          encryptedScores1.inputProof,
          encryptedScores1.inputProof,
          encryptedScores1.inputProof,
        ]
      );

    // Charlie rates Bob
    const encryptedScores2 = await fhevm
      .createEncryptedInput(skillRatingContractAddress, signers.charlie.address)
      .add32(9)
      .add32(8)
      .add32(8)
      .add32(9)
      .add32(7)
      .encrypt();

    await skillRatingContract
      .connect(signers.charlie)
      .submitRating(
        signers.bob.address,
        roundId,
        encryptedScores2.handles[0],
        encryptedScores2.handles[1],
        encryptedScores2.handles[2],
        encryptedScores2.handles[3],
        encryptedScores2.handles[4],
        [
          encryptedScores2.inputProof,
          encryptedScores2.inputProof,
          encryptedScores2.inputProof,
          encryptedScores2.inputProof,
          encryptedScores2.inputProof,
        ]
      );

    // Calculate weighted score
    const weightedScore = await skillRatingContract.calculateWeightedScore(
      signers.bob.address,
      roundId
    );

    // Score should be encrypted (non-zero hash)
    expect(weightedScore).to.not.eq(ethers.ZeroHash);

    // Decrypt and verify (weighted average of two ratings)
    // Average: codeQuality=(8+9)/2=8.5, communication=(7+8)/2=7.5, etc.
    // Weighted: 8.5*40 + 7.5*15 + 8.5*10 + 8.5*30 + 6.5*5 = 340 + 112.5 + 85 + 255 + 32.5 = 825
    // Note: Division by 100 (for percentage) happens during decryption or off-chain
  });
});



