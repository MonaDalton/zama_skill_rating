"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useMetaMaskEthersSigner } from "@/hooks/useWallet/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { SkillRadarChart } from "@/components/RadarChart/RadarChart";
import { SkillRatingABI } from "@/abi/SkillRatingABI";
import { SkillRatingAddresses } from "@/abi/SkillRatingAddresses";

export default function Results() {
  const { isConnected, accounts, ethersSigner, ethersReadonlyProvider, chainId, initialMockChains, provider } = useMetaMaskEthersSigner();
  const { storage } = useInMemoryStorage();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const [currentRoundId, setCurrentRoundId] = useState<bigint | undefined>(undefined);
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedScores, setDecryptedScores] = useState<{
    codeQuality?: number;
    communication?: number;
    contribution?: number;
    collaboration?: number;
    creativity?: number;
    weightedTotal?: number;
  } | null>(null);
  const [message, setMessage] = useState<string>("");

  // Get contract address and current round
  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider || !accounts?.[0]) return;

    const entry = SkillRatingAddresses[chainId.toString() as keyof typeof SkillRatingAddresses];
    if (entry && entry.address && entry.address !== ethers.ZeroAddress) {
      setContractAddress(entry.address as `0x${string}`);
    }
  }, [chainId, ethersReadonlyProvider, accounts]);

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

  // Note: useSkillRating hook available but requires proper handle retrieval from contract
  // For now, implementing direct contract interaction

  if (!isConnected || !accounts || accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
          Please connect your wallet to view results
        </p>
      </div>
    );
  }

  const handleDecrypt = async () => {
    if (!accounts?.[0] || !currentRoundId || !contractAddress) {
      alert("Missing required information. Please ensure you're connected and a round exists.");
      return;
    }

    if (!fhevmInstance || !ethersSigner) {
      alert("FHEVM instance or wallet signer not ready. Please wait...");
      return;
    }

    setIsDecrypting(true);
    setMessage("Starting decryption process...");

    try {
      const rateeAddress = accounts[0];
      
      if (!ethersReadonlyProvider) {
        throw new Error("Provider not available");
      }

      const contract = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersReadonlyProvider
      );

      // Step 1: Get current round ID and validate
      setMessage("Fetching current round information...");
      let maxRoundId: bigint;
      try {
        maxRoundId = await contract.currentRoundId();
      } catch (error: any) {
        throw new Error(`Failed to get current round: ${error?.message || error}`);
      }

      if (maxRoundId === 0n) {
        alert("No active round found. Admin needs to create a round first.");
        setIsDecrypting(false);
        return;
      }

      // Use the maxRoundId instead of stored currentRoundId to avoid issues
      const roundIdToUse = maxRoundId;
      
      // Diagnostic variables (accessible in error handlers)
      let weightsSet = false;
      let ratingCount = 0n;
      let isMember = false;
      
      // Step 2: Pre-check prerequisites before attempting calculation
      setMessage("Checking prerequisites before calculation...");
      
      // Try to check prerequisites using static calls (view functions where possible)
      let checksPassed = true;
      let errorMessage = "";
      
      // Check 1: Validate round using a simple view call
      try {
        const testRoundId = await contract.currentRoundId();
        if (roundIdToUse > testRoundId || roundIdToUse === 0n) {
          checksPassed = false;
          errorMessage = `Invalid round ID ${roundIdToUse.toString()}. Current round is ${testRoundId.toString()}.`;
        }
      } catch (err: any) {
        console.warn("Failed to verify round:", err);
      }
      
      // Check 2: Verify weights are set by checking weightConfigs storage FIRST
      setMessage("Checking if weights are configured...");
      try {
        const weightConfig = await contract.weightConfigs(roundIdToUse);
        const weightRoundId = Number(weightConfig?.roundId || 0);
        weightsSet = weightRoundId > 0 && weightRoundId === Number(roundIdToUse);
        
        console.log("Weight config check:", {
          weightRoundId,
          roundIdToUse: roundIdToUse.toString(),
          weightsSet,
        });
        
        if (!weightsSet) {
          alert(`❌ Weights are NOT configured for Round ${roundIdToUse.toString()}.\n\nAdmin needs to:\n1. Go to Settings page\n2. Configure dimension weights (must total 100%)\n3. Click 'Save Weights'\n\nCurrent weight roundId: ${weightRoundId}`);
          setIsDecrypting(false);
          return;
        }
      } catch (err: any) {
        console.error("Failed to check weights:", err);
        alert(`❌ Failed to check weight configuration.\n\nPlease ensure admin has set weights for Round ${roundIdToUse.toString()} in Settings page.`);
        setIsDecrypting(false);
        return;
      }
      
      // Check 3: Try to read rating count (this uses validRound modifier, so it will fail if round is invalid)
      setMessage("Checking rating count...");
      try {
        ratingCount = await contract.getRatingCount(rateeAddress, roundIdToUse);
        console.log("Rating count:", ratingCount.toString());
      } catch (err: any) {
        checksPassed = false;
        const errMsg = err?.message || err?.reason || JSON.stringify(err);
        console.error("Failed to get rating count:", err);
        
        if (errMsg.includes("Invalid round")) {
          errorMessage = `Invalid round ID ${roundIdToUse.toString()}. Please refresh the page.`;
        } else {
          errorMessage = `Failed to check rating count.\n\nYou may not be a member of this round.\n\nAdmin needs to:\n1. Go to Settings page\n2. Add your address as a member\n\nYour address: ${rateeAddress}`;
        }
      }
      
      if (!checksPassed) {
        alert(errorMessage || "Prerequisites check failed. Please ensure you are a member of this round and the round is valid.");
        setIsDecrypting(false);
        return;
      }
      
      if (ratingCount === 0n) {
        alert(`❌ No ratings found for your address in Round ${roundIdToUse.toString()}.\n\nYour address: ${rateeAddress}\n\nPlease wait for others to rate you, or ensure:\n1. You are a member of this round\n2. Others have submitted ratings for you`);
        setIsDecrypting(false);
        return;
      }
      
      // Check 4: Verify member status
      setMessage("Checking if you are a member...");
      try {
        isMember = await contract.isMember(rateeAddress, roundIdToUse);
        console.log("Is member:", isMember);
        
        if (!isMember) {
          alert(`❌ You are NOT a member of Round ${roundIdToUse.toString()}.\n\nYour address: ${rateeAddress}\n\nAdmin needs to:\n1. Go to Settings page\n2. Add your address as a member\n3. Then you can receive ratings`);
          setIsDecrypting(false);
          return;
        }
      } catch (err: any) {
        console.error("Failed to check membership:", err);
        const errMsg = err?.message || err?.reason || "";
        if (errMsg.includes("Invalid round")) {
          alert(`❌ Invalid round ID ${roundIdToUse.toString()}.\n\nPlease refresh the page.`);
          setIsDecrypting(false);
          return;
        }
        // Continue anyway
      }

      // Step 3: Try to calculate weighted score - use callStatic first to validate
      setMessage("Validating prerequisites (dry run)...");
      
      const contractWithSigner = new ethers.Contract(
        contractAddress,
        SkillRatingABI.abi,
        ethersSigner
      );

      try {
        // First, try a static call to see if the function would succeed
        // This won't actually execute but will validate the conditions
        try {
          await contractWithSigner.calculateWeightedScore.staticCall(rateeAddress, roundIdToUse);
        } catch (staticError: any) {
          // Static call failed - extract the reason
          const staticErrorMsg = staticError?.reason || staticError?.message || staticError?.shortMessage || JSON.stringify(staticError);
          const staticErrorLower = staticErrorMsg.toLowerCase();
          
          console.error("Static call validation failed:", staticError);
          
          // Check for specific error messages
          if (staticErrorLower.includes("weights not set") || staticErrorLower.includes("weight")) {
            alert("❌ Weights are not configured for this round.\n\nAdmin needs to:\n1. Go to Settings page\n2. Configure dimension weights (must total 100%)\n3. Click 'Save Weights'");
            setIsDecrypting(false);
            return;
          }
          
          if (staticErrorLower.includes("no ratings") || staticErrorLower.includes("no rating")) {
            alert("❌ No ratings found for your address.\n\nPlease ensure:\n1. You are a member of this round\n2. Others have submitted ratings for you");
            setIsDecrypting(false);
            return;
          }
          
          if (staticErrorLower.includes("invalid round") || staticErrorLower.includes("invalid")) {
            alert(`❌ Invalid round ID ${roundIdToUse.toString()}.\n\nCurrent round is ${maxRoundId.toString()}. Please refresh the page.`);
            setIsDecrypting(false);
            return;
          }
          
          // If we can't parse the error (unknown/internal error), provide comprehensive guidance
          const isUnparseableError = staticError?.code === "UNKNOWN_ERROR" || 
                                     staticErrorLower.includes("could not coalesce") || 
                                     staticErrorLower.includes("internal error") ||
                                     staticErrorLower.includes("internal json-rpc") ||
                                     staticErrorLower.includes("unrecognized custom error");
          
          if (isUnparseableError) {
            // Show diagnostic info since we already did checks above
            const diagnosticMsg = `⚠️ Static call validation failed (Round ${roundIdToUse.toString()}).\n\nDiagnostic Information:\n• Your address: ${rateeAddress}\n• Round ID: ${roundIdToUse.toString()}\n• Current Round: ${maxRoundId.toString()}\n• Weights configured: ${weightsSet ? "✅ Yes" : "❌ No"}\n• Rating count: ${ratingCount.toString()}\n• Is member: ${isMember ? "✅ Yes" : "❌ No (or check failed)"}\n\nPossible issues:\n1. ❌ Weights NOT properly saved\n   → Check: Settings → Verify weights roundId matches ${roundIdToUse.toString()}\n\n2. ❌ You're NOT a member\n   → Check: Settings → Verify your address is added\n\n3. ❌ No ratings in contract\n   → Check: Submit Rating → Ensure ratings were submitted successfully\n\n4. ❌ Contract state mismatch\n   → Try: Refresh page and check browser console for details\n\nPlease check browser console for detailed error logs.`;
            
            console.error("Unparseable static call error with full context:", {
              staticError,
              diagnosticInfo: {
                rateeAddress,
                roundIdToUse: roundIdToUse.toString(),
                maxRoundId: maxRoundId.toString(),
                weightsSet,
                ratingCount: ratingCount.toString(),
                isMember,
              },
            });
            
            alert(diagnosticMsg);
            setIsDecrypting(false);
            return;
          }
          
          // Generic error message
          alert(`⚠️ Validation failed: ${staticErrorMsg.slice(0, 200)}\n\nPlease check:\n1. You are a member of this round\n2. Weights are configured\n3. You have received ratings\n\nIf all conditions are met, please contact support.`);
          setIsDecrypting(false);
          return;
        }

        // Static call succeeded, now execute the actual transaction
        setMessage("Calculating weighted score (this may take a moment)...");
        
        const weightedScoreTx = await contractWithSigner.calculateWeightedScore(rateeAddress, roundIdToUse, {
          gasLimit: 5000000, // Set a higher gas limit for FHE operations
        });
        setMessage("Waiting for transaction confirmation...");
        await weightedScoreTx.wait();
        
        setMessage("Fetching dimension sums...");
        const dimensionSumsTx = await contractWithSigner.getDimensionSums(rateeAddress, roundIdToUse, {
          gasLimit: 5000000,
        });
        await dimensionSumsTx.wait();
        
        setMessage("Calculations completed successfully!");
      } catch (txError: any) {
        // Parse the error to provide helpful feedback
        const errorObj = txError?.data || txError;
        let errorStr = "";
        
        // Try to extract error message from various possible locations
        if (typeof errorObj === "string") {
          errorStr = errorObj;
        } else if (errorObj?.message) {
          errorStr = errorObj.message;
        } else if (errorObj?.reason) {
          errorStr = errorObj.reason;
        } else if (errorObj?.data?.message) {
          errorStr = errorObj.data.message;
        } else {
          errorStr = JSON.stringify(errorObj).slice(0, 500);
        }
        
        console.error("Transaction error details:", {
          error: txError,
          errorObj,
          errorStr,
          fullError: JSON.stringify(txError, Object.getOwnPropertyNames(txError)),
        });
        
        // This error occurred during transaction execution
        let userMessage = "";
        
        // Check for specific error types
        const errorLower = errorStr.toLowerCase();
        const errorCode = txError?.code;
        const isUnknownError = errorCode === "UNKNOWN_ERROR" || errorStr.includes("could not coalesce");
        const isInternalError = errorLower.includes("internal json-rpc") || errorLower.includes("internal error");
        
        // If it's an unknown/internal error, it's likely a contract revert that couldn't be parsed
        if (isUnknownError || isInternalError) {
          userMessage = `⚠️ Transaction failed (Round ${roundIdToUse.toString()}).\n\nThe contract rejected the transaction, which usually means:\n\n1. ❌ Weights NOT configured\n   → Admin must go to Settings → Configure weights → Save Weights\n\n2. ❌ You're NOT a member\n   → Admin must go to Settings → Add Member (your address)\n\n3. ❌ No ratings received\n   → Others must submit ratings for you first\n\n4. ❌ Round mismatch\n   → Current round: ${maxRoundId.toString()}\n\n⚠️ Action Required:\n\nAdmin should check:\n1. Settings page → Verify weights are saved (total = 100%)\n2. Settings page → Verify your address is listed as a member\n3. Submit Rating page → Verify others can rate you\n\nThen try again.`;
        } else if (errorLower.includes("weights not set") || errorLower.includes("weight")) {
          userMessage = "❌ Weights are not configured for this round.\n\nAdmin needs to:\n1. Go to Settings page\n2. Configure dimension weights (must total 100%)\n3. Click 'Save Weights'";
        } else if (errorLower.includes("no ratings") || errorLower.includes("no rating")) {
          userMessage = "❌ No ratings found for your address.\n\nPlease ensure:\n1. You are a member of this round\n2. Others have submitted ratings for you";
        } else if (errorLower.includes("invalid round") || errorLower.includes("validround")) {
          userMessage = `❌ Invalid round ID ${roundIdToUse.toString()}.\n\nCurrent round is ${maxRoundId.toString()}. Please refresh the page.`;
        } else if (errorLower.includes("member") || errorLower.includes("ratee not")) {
          userMessage = "❌ You are not a member of this round.\n\nAdmin needs to:\n1. Go to Settings page\n2. Add your address as a member\n3. Then you can receive ratings";
        } else {
          // Generic error - provide comprehensive troubleshooting
          userMessage = `⚠️ Transaction failed (Round ${roundIdToUse.toString()}).\n\nCommon causes:\n\n1. ❌ Weights not configured\n   → Admin: Settings → Save Weights\n\n2. ❌ Not a member\n   → Admin: Settings → Add Member\n\n3. ❌ No ratings\n   → Others must rate you first\n\nError: ${errorStr.slice(0, 150)}`;
        }
        
        console.error("Decrypt transaction error:", {
          error: txError,
          errorStr,
          errorCode,
          isUnknownError,
          roundId: roundIdToUse.toString(),
          maxRoundId: maxRoundId.toString(),
          rateeAddress,
        });
        
        alert(userMessage);
        setIsDecrypting(false);
        return;
      }
      
      // Step 3: Read encrypted handles from contract storage and decrypt
      setMessage("Reading encrypted results from contract storage...");
      
      // Read encrypted handles from contract storage
      const encryptedWeightedScore = await contract.weightedScores(roundIdToUse, rateeAddress);
      const encryptedDimensionAverages = await contract.dimensionAverages(roundIdToUse, rateeAddress);
      
      // Check if results exist (not zero hash)
      if (encryptedWeightedScore === ethers.ZeroHash) {
        alert("No encrypted results found. Please ensure calculation completed successfully.");
        setIsDecrypting(false);
        return;
      }
      
      setMessage("Preparing decryption signature...");
      
      // Load or create decryption signature
      const decryptionSig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance!,
        [contractAddress],
        ethersSigner!,
        storage
      );
      
      if (!decryptionSig) {
        throw new Error("Failed to create decryption signature");
      }
      
      setMessage("Decrypting encrypted results...");
      
      // Prepare handles to decrypt
      const handlesToDecrypt: Array<{ handle: string; contractAddress: string }> = [
        { handle: encryptedWeightedScore, contractAddress },
      ];
      
      // Add dimension averages if they exist
      if (encryptedDimensionAverages.codeQuality !== ethers.ZeroHash) {
        handlesToDecrypt.push({ handle: encryptedDimensionAverages.codeQuality, contractAddress });
      }
      if (encryptedDimensionAverages.communication !== ethers.ZeroHash) {
        handlesToDecrypt.push({ handle: encryptedDimensionAverages.communication, contractAddress });
      }
      if (encryptedDimensionAverages.contribution !== ethers.ZeroHash) {
        handlesToDecrypt.push({ handle: encryptedDimensionAverages.contribution, contractAddress });
      }
      if (encryptedDimensionAverages.collaboration !== ethers.ZeroHash) {
        handlesToDecrypt.push({ handle: encryptedDimensionAverages.collaboration, contractAddress });
      }
      if (encryptedDimensionAverages.creativity !== ethers.ZeroHash) {
        handlesToDecrypt.push({ handle: encryptedDimensionAverages.creativity, contractAddress });
      }
      
      // Decrypt all handles
      const decryptedResults = await fhevmInstance!.userDecrypt(
        handlesToDecrypt,
        decryptionSig.privateKey,
        decryptionSig.publicKey,
        decryptionSig.signature,
        decryptionSig.contractAddresses,
        decryptionSig.userAddress,
        decryptionSig.startTimestamp,
        decryptionSig.durationDays
      );
      
      // Extract decrypted values and convert to numbers
      const weightedTotalSumRaw = decryptedResults[encryptedWeightedScore];
      const codeQualitySumRaw = encryptedDimensionAverages.codeQuality !== ethers.ZeroHash 
        ? decryptedResults[encryptedDimensionAverages.codeQuality] 
        : null;
      const communicationSumRaw = encryptedDimensionAverages.communication !== ethers.ZeroHash
        ? decryptedResults[encryptedDimensionAverages.communication]
        : null;
      const contributionSumRaw = encryptedDimensionAverages.contribution !== ethers.ZeroHash
        ? decryptedResults[encryptedDimensionAverages.contribution]
        : null;
      const collaborationSumRaw = encryptedDimensionAverages.collaboration !== ethers.ZeroHash
        ? decryptedResults[encryptedDimensionAverages.collaboration]
        : null;
      const creativitySumRaw = encryptedDimensionAverages.creativity !== ethers.ZeroHash
        ? decryptedResults[encryptedDimensionAverages.creativity]
        : null;
      
      // Convert to numbers (handle BigInt if needed)
      const weightedTotalSum = weightedTotalSumRaw != null ? Number(weightedTotalSumRaw) : null;
      const codeQualitySum = codeQualitySumRaw != null ? Number(codeQualitySumRaw) : null;
      const communicationSum = communicationSumRaw != null ? Number(communicationSumRaw) : null;
      const contributionSum = contributionSumRaw != null ? Number(contributionSumRaw) : null;
      const collaborationSum = collaborationSumRaw != null ? Number(collaborationSumRaw) : null;
      const creativitySum = creativitySumRaw != null ? Number(creativitySumRaw) : null;
      
      // Calculate averages (sum / count)
      const count = Number(ratingCount);
      const codeQualityAvg = codeQualitySum !== null && count > 0 ? codeQualitySum / count : null;
      const communicationAvg = communicationSum !== null && count > 0 ? communicationSum / count : null;
      const contributionAvg = contributionSum !== null && count > 0 ? contributionSum / count : null;
      const collaborationAvg = collaborationSum !== null && count > 0 ? collaborationSum / count : null;
      const creativityAvg = creativitySum !== null && count > 0 ? creativitySum / count : null;
      
      // Weighted total: the contract calculates sum(avg * weight) where weights are 0-100
      // So we need to divide by 100 to get the final weighted score (0-10 scale)
      const weightedTotal = weightedTotalSum !== null ? weightedTotalSum / 100 : null;
      
      setMessage("Decryption completed successfully!");
      
      // Set decrypted scores
      setDecryptedScores({
        codeQuality: codeQualityAvg ?? undefined,
        communication: communicationAvg ?? undefined,
        contribution: contributionAvg ?? undefined,
        collaboration: collaborationAvg ?? undefined,
        creativity: creativityAvg ?? undefined,
        weightedTotal: weightedTotal ?? undefined,
      });

    } catch (error: any) {
      console.error("Failed to decrypt:", error);
      setMessage("Failed to decrypt results");
      
      const errorData = error?.data || error?.message || error?.reason || "Unknown error";
      const errorMsg = typeof errorData === "string" ? errorData : JSON.stringify(errorData);
      
      alert(`Error: ${errorMsg.slice(0, 300)}`);
    } finally {
      setIsDecrypting(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const dimensions = [
    { key: "codeQuality", label: "Code Quality", value: decryptedScores?.codeQuality },
    { key: "communication", label: "Communication", value: decryptedScores?.communication },
    { key: "contribution", label: "Contribution", value: decryptedScores?.contribution },
    { key: "collaboration", label: "Collaboration", value: decryptedScores?.collaboration },
    { key: "creativity", label: "Creativity", value: decryptedScores?.creativity },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          View Results
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Decrypt and view your encrypted skill ratings
        </p>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
        </div>
      )}

      {/* Decrypt Button */}
      {!decryptedScores && (
        <div className="text-center py-8">
          <div className="space-y-4">
            <button
              onClick={handleDecrypt}
              disabled={isDecrypting || !currentRoundId || fhevmStatus !== "ready"}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:from-neutral-300 disabled:to-neutral-300 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 text-lg"
            >
              {isDecrypting ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin">⏳</span>
                  <span>Decrypting...</span>
                </span>
              ) : fhevmStatus !== "ready" ? (
                "Initializing FHEVM..."
              ) : (
                "🔓 Decrypt Results"
              )}
            </button>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
              <p className="font-semibold">Before decrypting, ensure:</p>
              <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                <li>You are a member of the current round (added by admin)</li>
                <li>Admin has set weights for this round</li>
                <li>You have received at least one rating</li>
                <li>Round ID is valid (currently: {currentRoundId?.toString() || "N/A"})</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Decrypted Results */}
      {decryptedScores && (
        <div className="space-y-6">
          {/* Overall Score Card */}
          <div className="p-8 border-2 border-orange-200 dark:border-orange-800 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 shadow-xl text-center card-hover">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 mb-4 shadow-lg">
              <span className="text-3xl">⭐</span>
            </div>
            <h2 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">Weighted Total Score</h2>
            <p className="text-6xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent mb-2">
              {decryptedScores.weightedTotal?.toFixed(2) || "--"}
            </p>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              out of 10.0
            </p>
          </div>

          {/* Dimension Scores */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dimensions.map((dim, index) => (
              <div
                key={dim.key}
                className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 card-hover"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{dim.label}</h3>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex items-baseline space-x-2 mb-4">
                  <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                    {dim.value?.toFixed(1) || "--"}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">/ 10</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 shadow-sm"
                    style={{
                      width: `${((dim.value || 0) / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Radar Chart */}
          {decryptedScores && (
            <div className="p-6 border rounded-lg bg-white dark:bg-neutral-800">
              <h3 className="text-lg font-semibold mb-4">Skill Radar Chart</h3>
              <div className="h-64">
                <SkillRadarChart
                  data={[
                    {
                      dimension: "Code Quality",
                      score: decryptedScores.codeQuality || 0,
                    },
                    {
                      dimension: "Communication",
                      score: decryptedScores.communication || 0,
                    },
                    {
                      dimension: "Contribution",
                      score: decryptedScores.contribution || 0,
                    },
                    {
                      dimension: "Collaboration",
                      score: decryptedScores.collaboration || 0,
                    },
                    {
                      dimension: "Creativity",
                      score: decryptedScores.creativity || 0,
                    },
                  ]}
                  maxValue={10}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setDecryptedScores(null)}
            className="px-4 py-2 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Clear Decrypted Data
          </button>
        </div>
      )}
    </div>
  );
}

