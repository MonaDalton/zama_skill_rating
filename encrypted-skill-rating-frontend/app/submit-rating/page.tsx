"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { SkillRatingABI } from "@/abi/SkillRatingABI";
import { SkillRatingAddresses } from "@/abi/SkillRatingAddresses";

const DIMENSIONS = [
  { key: "codeQuality", label: "Code Quality", description: "Programming skills and code quality" },
  { key: "communication", label: "Communication", description: "Communication and collaboration skills" },
  { key: "contribution", label: "Contribution", description: "Project contribution and impact" },
  { key: "collaboration", label: "Collaboration", description: "Team collaboration and cooperation" },
  { key: "creativity", label: "Creativity", description: "Creative problem-solving and innovation" },
];

export default function SubmitRating() {
  const { isConnected, accounts, ethersSigner, chainId, initialMockChains } = useMetaMaskEthersSigner();
  const { storage } = useInMemoryStorage();
  const { provider } = useMetaMaskEthersSigner();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const { ethersReadonlyProvider } = useMetaMaskEthersSigner();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<bigint | undefined>(undefined);
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [members, setMembers] = useState<Array<{ address: string; name?: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Get contract address and current round
  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider) return;
    const entry = SkillRatingAddresses[chainId.toString() as keyof typeof SkillRatingAddresses];
    if (entry && entry.address && entry.address !== ethers.ZeroAddress) {
      setContractAddress(entry.address as `0x${string}`);
    }
  }, [chainId, ethersReadonlyProvider]);

  // Fetch current round
  useEffect(() => {
    if (!contractAddress || !ethersReadonlyProvider) return;

    const fetchRound = async () => {
      try {
        const contract = new ethers.Contract(
          contractAddress,
          SkillRatingABI.abi,
          ethersReadonlyProvider
        );
        const roundId = await contract.currentRoundId();
        setCurrentRoundId(BigInt(Number(roundId)));
      } catch (error) {
        console.error("Failed to fetch round:", error);
      }
    };

    fetchRound();
  }, [contractAddress, ethersReadonlyProvider]);

  // Fetch members from contract events
  const fetchMembers = useCallback(async () => {
    if (!contractAddress || !ethersReadonlyProvider || !currentRoundId || currentRoundId === 0n) {
      setMembers([]);
      return;
    }

    setIsLoadingMembers(true);
    try {
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersReadonlyProvider
      );

      // Filter MemberAdded events for the current round
      const filter = contract.filters.MemberAdded(currentRoundId, null);
      const events = await contract.queryFilter(filter);

      // Extract unique member addresses
      const memberAddresses = new Set<string>();
      events.forEach((event) => {
        if ('args' in event && event.args && event.args.member) {
          memberAddresses.add(event.args.member.toLowerCase());
        }
      });

      // Convert to array with formatted display
      const membersList = Array.from(memberAddresses).map((address) => ({
        address: address,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      }));

      setMembers(membersList);
      if (membersList.length === 0) {
        setMessage("No members found in this round. Admin should add members first.");
      } else {
        setMessage("");
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      setMessage("Failed to load members list");
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [contractAddress, ethersReadonlyProvider, currentRoundId]);

  // Fetch members when round or contract changes
  useEffect(() => {
    if (contractAddress && currentRoundId && currentRoundId > 0n) {
      fetchMembers();
    } else {
      setMembers([]);
    }
  }, [contractAddress, currentRoundId, fetchMembers]);

  if (!isConnected || !accounts || accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
          Please connect your wallet to submit ratings
        </p>
      </div>
    );
  }

  const handleScoreChange = (dimension: string, value: number) => {
    setScores((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      alert("Please select a member to rate");
      return;
    }

    if (!ethers.isAddress(selectedMember)) {
      alert("Invalid member address");
      return;
    }

    const allDimensionsFilled = DIMENSIONS.every(
      (dim) => scores[dim.key] !== undefined && scores[dim.key] >= 1 && scores[dim.key] <= 10
    );

    if (!allDimensionsFilled) {
      alert("Please provide ratings for all dimensions (1-10)");
      return;
    }

    if (!fhevmInstance || !ethersSigner || !contractAddress || !currentRoundId) {
      alert("FHEVM instance or contract not ready. Please wait...");
      return;
    }

    setIsSubmitting(true);
    setMessage("Encrypting ratings...");

    try {
      const signerAddress = await ethersSigner.getAddress();
      
      // Encrypt each dimension separately
      setMessage("Encrypting dimension scores...");
      
      const encryptedInputs = await Promise.all(
        DIMENSIONS.map(async (dim) => {
          const input = fhevmInstance.createEncryptedInput(
            contractAddress,
            signerAddress
          );
          input.add32(scores[dim.key]);
          return await input.encrypt();
        })
      );

      setMessage("Submitting to contract...");

      // Prepare contract call parameters
      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );

      const tx = await contract.submitRating(
        selectedMember,
        currentRoundId,
        encryptedInputs[0].handles[0], // codeQuality
        encryptedInputs[1].handles[0], // communication
        encryptedInputs[2].handles[0], // contribution
        encryptedInputs[3].handles[0], // collaboration
        encryptedInputs[4].handles[0], // creativity
        [
          encryptedInputs[0].inputProof,
          encryptedInputs[1].inputProof,
          encryptedInputs[2].inputProof,
          encryptedInputs[3].inputProof,
          encryptedInputs[4].inputProof,
        ]
      );

      setMessage(`Waiting for transaction: ${tx.hash}...`);
      const receipt = await tx.wait();

      setMessage("Rating submitted successfully!");
      alert(`Rating submitted successfully! Transaction: ${receipt.hash}`);
      
      // Reset form
      setSelectedMember("");
      setScores({});
    } catch (error: any) {
      console.error("Failed to submit rating:", error);
      setMessage("Failed to submit rating");
      alert(error?.reason || error?.message || "Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Fetch members from contract (if available)
  // For now, allow manual address entry

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          Submit Rating
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Rate team members on multiple skill dimensions (all ratings are encrypted)
        </p>
      </div>

      {/* Member Selection */}
      <div className="p-6 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            Select Member to Rate
          </label>
          <button
            onClick={fetchMembers}
            disabled={isLoadingMembers || !contractAddress || !currentRoundId}
            className="text-xs px-3 py-1 border rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingMembers ? "Loading..." : "Refresh"}
          </button>
        </div>
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-neutral-900 font-mono"
          disabled={isLoadingMembers}
        >
          <option value="">-- Select a member --</option>
          {members.map((member) => (
            <option key={member.address} value={member.address}>
              {member.name} ({member.address})
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 mt-2">
          {members.length === 0
            ? "No members found in this round. Admin should add members first."
            : `${members.length} member(s) available for rating`}
        </p>
        {!currentRoundId || currentRoundId === 0n ? (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            ⚠️ No active round. Admin needs to create a round first.
          </p>
        ) : null}
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
        </div>
      )}

      {fhevmStatus === "loading" && (
        <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Initializing FHEVM instance...
          </p>
        </div>
      )}

      {fhevmStatus === "error" && (
        <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">
            FHEVM initialization failed. Please check your connection.
          </p>
        </div>
      )}

      {/* Rating Form */}
      <div className="space-y-6">
        {DIMENSIONS.map((dimension, index) => (
          <div
            key={dimension.key}
            className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 card-hover"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{dimension.label}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {dimension.description}
                  </p>
                </div>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                {scores[dimension.key] || "--"}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={scores[dimension.key] || 5}
              onChange={(e) =>
                handleScoreChange(dimension.key, parseInt(e.target.value))
              }
              className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              style={{
                background: `linear-gradient(to right, #6366F1 0%, #6366F1 ${((scores[dimension.key] || 5) - 1) * 11.11}%, #E5E7EB ${((scores[dimension.key] || 5) - 1) * 11.11}%, #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
              <span>1 (Poor)</span>
              <span>10 (Excellent)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedMember || fhevmStatus !== "ready"}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:from-neutral-300 disabled:to-neutral-300 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 text-lg"
        >
          {isSubmitting ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Encrypting & Submitting...</span>
            </span>
          ) : fhevmStatus !== "ready" ? (
            "Initializing FHEVM..."
          ) : (
            "🔒 Submit Encrypted Rating"
          )}
        </button>
      </div>
    </div>
  );
}



