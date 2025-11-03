"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm/useFhevm";
import { SkillRatingABI } from "@/abi/SkillRatingABI";
import { SkillRatingAddresses } from "@/abi/SkillRatingAddresses";

const DIMENSIONS = [
  { key: "codeQuality", label: "Code Quality" },
  { key: "communication", label: "Communication" },
  { key: "contribution", label: "Contribution" },
  { key: "collaboration", label: "Collaboration" },
  { key: "creativity", label: "Creativity" },
];

export default function Settings() {
  const { isConnected, accounts, ethersSigner, ethersReadonlyProvider, chainId, initialMockChains, provider } = useMetaMaskEthersSigner();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const [weights, setWeights] = useState<Record<string, number>>({
    codeQuality: 40,
    communication: 15,
    contribution: 10,
    collaboration: 30,
    creativity: 5,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<bigint | undefined>(undefined);
  const [newMemberAddress, setNewMemberAddress] = useState<string>("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [message, setMessage] = useState<string>("");

  // Get contract address and check admin status
  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider || !accounts?.[0]) return;

    const entry = SkillRatingAddresses[chainId.toString() as keyof typeof SkillRatingAddresses];
    if (entry && entry.address && entry.address !== ethers.ZeroAddress) {
      setContractAddress(entry.address as `0x${string}`);
    }
  }, [chainId, ethersReadonlyProvider, accounts]);

  // Check admin status and current round
  useEffect(() => {
    if (!contractAddress || !ethersReadonlyProvider || !accounts?.[0]) return;

    const checkAdmin = async () => {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          SkillRatingABI.abi,
          ethersReadonlyProvider
        );
        const admin = await contract.admin();
        setIsAdmin(admin.toLowerCase() === accounts[0].toLowerCase());
        
        const roundId = await contract.currentRoundId();
        setCurrentRoundId(BigInt(Number(roundId)));
      } catch (error) {
        console.error("Failed to check admin:", error);
      }
    };

    checkAdmin();
  }, [contractAddress, ethersReadonlyProvider, accounts]);

  if (!isConnected || !accounts || accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
          Please connect your wallet to access settings
        </p>
      </div>
    );
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const handleWeightChange = (dimension: string, value: number) => {
    setWeights((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleSave = async () => {
    if (totalWeight !== 100) {
      alert("Total weight must equal 100%");
      return;
    }

    if (!isAdmin) {
      alert("Only admin can set weights");
      return;
    }

    if (!contractAddress || !ethersSigner || !currentRoundId || currentRoundId === 0n) {
      alert("Missing required information. Please ensure contract is deployed and a round exists.");
      return;
    }

    if (!fhevmInstance) {
      alert("FHEVM instance not ready. Please wait...");
      return;
    }

    setIsSavingWeights(true);
    setMessage("Encrypting weights...");

    try {
      const signerAddress = await ethersSigner.getAddress();

      // Encrypt each weight separately
      setMessage("Encrypting weight values...");
      
      const encryptedInputs = await Promise.all(
        DIMENSIONS.map(async (dim) => {
          const input = fhevmInstance.createEncryptedInput(
            contractAddress,
            signerAddress
          );
          input.add32(weights[dim.key]);
          return await input.encrypt();
        })
      );

      setMessage("Submitting weights to contract...");

      // Prepare contract call parameters
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );

      const tx = await contract.setWeights(
        currentRoundId,
        encryptedInputs[0].handles[0], // codeQuality
        encryptedInputs[1].handles[0], // communication
        encryptedInputs[2].handles[0], // contribution
        encryptedInputs[3].handles[0], // collaboration
        encryptedInputs[4].handles[0], // creativity
        encryptedInputs[0].inputProof,
        encryptedInputs[1].inputProof,
        encryptedInputs[2].inputProof,
        encryptedInputs[3].inputProof,
        encryptedInputs[4].inputProof
      );

      setMessage(`Waiting for transaction confirmation: ${tx.hash}...`);
      const receipt = await tx.wait();

      setMessage("");
      alert(`Weights saved successfully! Transaction: ${receipt.hash}`);
    } catch (error: any) {
      console.error("Failed to save weights:", error);
      setMessage("");
      const errorMsg = error?.reason || error?.message || "Failed to save weights. Please try again.";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsSavingWeights(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleAddMember = async () => {
    // Detailed validation with specific error messages
    if (!contractAddress) {
      alert("Contract address not found. Please check if the contract is deployed on this network.");
      console.error("Missing contractAddress. ChainId:", chainId);
      return;
    }

    if (!ethersSigner) {
      alert("Wallet signer not available. Please ensure your wallet is connected.");
      console.error("Missing ethersSigner");
      return;
    }

    if (!isAdmin) {
      alert("You don't have admin permissions to add members.");
      return;
    }

    if (currentRoundId === undefined) {
      alert("Round information not loaded yet. Please wait a moment and try again.");
      console.error("currentRoundId is undefined");
      return;
    }

    // Note: Round 0 is valid, but typically you should create a round first
    if (currentRoundId === 0n) {
      const proceed = confirm("Round 0 is active. It's recommended to create a new round first. Do you want to proceed anyway?");
      if (!proceed) {
        return;
      }
    }

    if (!ethers.isAddress(newMemberAddress)) {
      alert("Invalid Ethereum address. Please enter a valid address starting with 0x.");
      return;
    }

    setIsAddingMember(true);
    try {
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );
      setMessage(`Adding member ${newMemberAddress}...`);
      const tx = await contract.addMember(newMemberAddress);
      setMessage(`Waiting for transaction confirmation...`);
      const receipt = await tx.wait();
      setMessage("");
      alert(`Member ${newMemberAddress} added successfully! Transaction: ${receipt.hash}`);
      setNewMemberAddress("");
    } catch (error: any) {
      console.error("Failed to add member:", error);
      setMessage("");
      const errorMsg = error?.reason || error?.message || "Failed to add member. Please try again.";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCreateRound = async () => {
    if (!contractAddress || !ethersSigner || !isAdmin) {
      alert("Missing required information");
      return;
    }

    try {
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );
      const tx = await contract.createRound();
      const receipt = await tx.wait();
      const roundId = await contract.currentRoundId();
      setCurrentRoundId(BigInt(Number(roundId)));
      alert(`New round #${roundId} created successfully!`);
    } catch (error: any) {
      console.error("Failed to create round:", error);
      alert(error?.reason || error?.message || "Failed to create round. Please try again.");
    }
  };

  const handleEndRound = async (roundId: bigint) => {
    if (!contractAddress || !ethersSigner || !isAdmin) {
      alert("Missing required information");
      return;
    }

    try {
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );
      const tx = await contract.endRound(roundId);
      await tx.wait();
      alert(`Round #${roundId} ended successfully!`);
    } catch (error: any) {
      console.error("Failed to end round:", error);
      alert(error?.reason || error?.message || "Failed to end round. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Configure rating weights, manage rounds, and add members
        </p>
      </div>


      {/* Weight Configuration */}
      <div className="p-8 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center">
            <span className="text-2xl">⚖️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dimension Weights</h2>
          </div>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Configure the weight for each skill dimension (total must equal 100%)
        </p>

        <div className="space-y-4">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension.key}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">{dimension.label}</label>
                <span className="text-lg font-bold">{weights[dimension.key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[dimension.key]}
                onChange={(e) =>
                  handleWeightChange(dimension.key, parseInt(e.target.value))
                }
                disabled={!isAdmin}
                className="w-full disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Weight</span>
            <span
              className={`text-xl font-bold ${
                totalWeight === 100
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {totalWeight}%
            </span>
          </div>
        </div>

        {isAdmin && (
          <>
            {message && (
              <div className="mt-4 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
              </div>
            )}
            {fhevmStatus === "loading" && (
              <div className="mt-4 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Initializing FHEVM instance...
                </p>
              </div>
            )}
            {fhevmStatus === "error" && (
              <div className="mt-4 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  FHEVM initialization failed. Please check your connection.
                </p>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={
                totalWeight !== 100 || 
                isSavingWeights || 
                !currentRoundId || 
                currentRoundId === 0n ||
                fhevmStatus !== "ready"
              }
              className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingWeights ? "Encrypting & Saving..." : "Save Weights"}
            </button>
            {!currentRoundId || currentRoundId === 0n ? (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                ⚠️ No active round. Please create a round first before setting weights.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* Add Member Section */}
      {isAdmin && (
        <div className="p-6 border rounded-lg bg-white dark:bg-neutral-800">
          <h2 className="text-xl font-semibold mb-4">Add Member</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Add a new member to the current round
            {currentRoundId === undefined ? (
              <span className="block text-yellow-600 dark:text-yellow-400 mt-1">
                ⏳ Loading round information...
              </span>
            ) : currentRoundId === 0n ? (
              <span className="block text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ Round 0 is active. Consider creating a new round first.
              </span>
            ) : (
              <span className="block text-green-600 dark:text-green-400 mt-1">
                ✓ Round #{currentRoundId.toString()} is active
              </span>
            )}
            <span className="block text-xs text-neutral-500 mt-2">
              Debug: Contract={contractAddress ? "✓" : "✗"} | Signer={ethersSigner ? "✓" : "✗"} | Round={currentRoundId?.toString() || "?"}
            </span>
          </p>
          {message && (
            <div className="p-3 mb-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
            </div>
          )}
          <div className="flex space-x-4">
            <input
              type="text"
              value={newMemberAddress}
              onChange={(e) => setNewMemberAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-neutral-900 font-mono"
            />
            <button
              onClick={handleAddMember}
              disabled={
                isAddingMember || 
                !newMemberAddress || 
                !ethers.isAddress(newMemberAddress) ||
                !contractAddress ||
                currentRoundId === undefined
              }
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingMember ? "Adding..." : "Add Member"}
            </button>
          </div>
          {!contractAddress && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Contract not found on this network. ChainId: {chainId || "unknown"}
            </p>
          )}
        </div>
      )}

      {/* Round Management */}
      <div className="p-6 border rounded-lg bg-white dark:bg-neutral-800">
        <h2 className="text-xl font-semibold mb-4">Round Management</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Current Round: <span className="font-semibold">Round #{currentRoundId?.toString() || "0"}</span>
            </p>
          </div>
          {isAdmin && (
            <div className="flex space-x-4">
              <button
                onClick={handleCreateRound}
                disabled={!contractAddress}
                className="px-4 py-2 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create New Round
              </button>
              {currentRoundId && currentRoundId > 0n && (
                <button
                  onClick={() => handleEndRound(currentRoundId)}
                  disabled={!contractAddress}
                  className="px-4 py-2 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  End Current Round
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



