// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Skill Rating Hub Contract
/// @notice A privacy-preserving skill rating platform using FHEVM
/// @dev All ratings are encrypted and computations are performed on ciphertext
contract SkillRating is ZamaEthereumConfig {
    // ============ Structs ============
    
    struct RatingSubmission {
        address rater;
        address ratee;
        uint256 roundId;
        uint256 timestamp;
    }
    
    struct WeightConfiguration {
        euint32 codeQuality;
        euint32 communication;
        euint32 contribution;
        euint32 collaboration;
        euint32 creativity;
        uint256 roundId;
        uint256 effectiveFrom;
        uint256 effectiveTo;
    }
    
    struct EncryptedScores {
        euint32 codeQuality;
        euint32 communication;
        euint32 contribution;
        euint32 collaboration;
        euint32 creativity;
    }
    
    // ============ State Variables ============
    
    address public admin;
    uint256 public currentRoundId;
    
    // Mapping: roundId => ratee => rater => rating submission
    mapping(uint256 => mapping(address => mapping(address => RatingSubmission))) public ratings;
    
    // Mapping: roundId => ratee => array of encrypted dimension scores from all raters
    mapping(uint256 => mapping(address => EncryptedScores[])) public rateeScores;
    
    // Mapping: roundId => weight configuration
    mapping(uint256 => WeightConfiguration) public weightConfigs;
    
    // Mapping: roundId => ratee => rater => bool (has rated)
    mapping(uint256 => mapping(address => mapping(address => bool))) public hasRated;
    
    // Mapping: roundId => address => bool (is registered member)
    mapping(uint256 => mapping(address => bool)) public members;
    
    // Mapping: roundId => ratee => encrypted weighted total score
    mapping(uint256 => mapping(address => euint32)) public weightedScores;
    
    // Mapping: roundId => ratee => encrypted dimension averages
    mapping(uint256 => mapping(address => EncryptedScores)) public dimensionAverages;
    
    // Mapping: roundId => ratee => uint256 (count of ratings received)
    mapping(uint256 => mapping(address => uint256)) public ratingCounts;
    
    // Events
    event RatingSubmitted(
        uint256 indexed roundId,
        address indexed rater,
        address indexed ratee,
        uint256 timestamp
    );
    
    event RoundCreated(uint256 indexed roundId, address indexed creator);
    event RoundEnded(uint256 indexed roundId);
    event WeightsSet(uint256 indexed roundId);
    event MemberAdded(uint256 indexed roundId, address indexed member);
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier validRound(uint256 roundId) {
        require(roundId > 0 && roundId <= currentRoundId, "Invalid round");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        admin = msg.sender;
        currentRoundId = 0;
    }
    
    // ============ Admin Functions ============
    
    /// @notice Create a new rating round
    /// @dev Only admin can create rounds
    function createRound() external onlyAdmin returns (uint256) {
        currentRoundId++;
        emit RoundCreated(currentRoundId, msg.sender);
        return currentRoundId;
    }
    
    /// @notice Add a member to the current round
    /// @param member Address of the member to add
    function addMember(address member) external onlyAdmin {
        require(member != address(0), "Invalid address");
        members[currentRoundId][member] = true;
        emit MemberAdded(currentRoundId, member);
    }
    
    /// @notice Add multiple members to the current round
    /// @param memberList Array of member addresses
    function addMembers(address[] calldata memberList) external onlyAdmin {
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] != address(0)) {
                members[currentRoundId][memberList[i]] = true;
                emit MemberAdded(currentRoundId, memberList[i]);
            }
        }
    }
    
    /// @notice Set weights for a round (encrypted weights)
    /// @param roundId The round ID
    /// @param codeQuality Encrypted weight for code quality dimension
    /// @param communication Encrypted weight for communication dimension
    /// @param contribution Encrypted weight for contribution dimension
    /// @param collaboration Encrypted weight for collaboration dimension
    /// @param creativity Encrypted weight for creativity dimension
    /// @param codeQualityProof Proof for code quality weight
    /// @param communicationProof Proof for communication weight
    /// @param contributionProof Proof for contribution weight
    /// @param collaborationProof Proof for collaboration weight
    /// @param creativityProof Proof for creativity weight
    function setWeights(
        uint256 roundId,
        externalEuint32 codeQuality,
        externalEuint32 communication,
        externalEuint32 contribution,
        externalEuint32 collaboration,
        externalEuint32 creativity,
        bytes calldata codeQualityProof,
        bytes calldata communicationProof,
        bytes calldata contributionProof,
        bytes calldata collaborationProof,
        bytes calldata creativityProof
    ) external onlyAdmin validRound(roundId) {
        WeightConfiguration storage config = weightConfigs[roundId];
        
        config.codeQuality = FHE.fromExternal(codeQuality, codeQualityProof);
        config.communication = FHE.fromExternal(communication, communicationProof);
        config.contribution = FHE.fromExternal(contribution, contributionProof);
        config.collaboration = FHE.fromExternal(collaboration, collaborationProof);
        config.creativity = FHE.fromExternal(creativity, creativityProof);
        
        // Allow contract to access these encrypted weights for calculations
        FHE.allowThis(config.codeQuality);
        FHE.allowThis(config.communication);
        FHE.allowThis(config.contribution);
        FHE.allowThis(config.collaboration);
        FHE.allowThis(config.creativity);
        
        config.roundId = roundId;
        config.effectiveFrom = block.timestamp;
        config.effectiveTo = 0; // 0 means active
        
        emit WeightsSet(roundId);
    }
    
    /// @notice End a round
    /// @param roundId The round ID to end
    function endRound(uint256 roundId) external onlyAdmin validRound(roundId) {
        WeightConfiguration storage config = weightConfigs[roundId];
        config.effectiveTo = block.timestamp;
        emit RoundEnded(roundId);
    }
    
    // ============ Rating Functions ============
    
    /// @notice Submit encrypted ratings for a ratee
    /// @param ratee Address of the person being rated
    /// @param roundId The round ID
    /// @param codeQuality Encrypted code quality score
    /// @param communication Encrypted communication score
    /// @param contribution Encrypted contribution score
    /// @param collaboration Encrypted collaboration score
    /// @param creativity Encrypted creativity score
    /// @param proofs Array of proofs for each dimension
    function submitRating(
        address ratee,
        uint256 roundId,
        externalEuint32 codeQuality,
        externalEuint32 communication,
        externalEuint32 contribution,
        externalEuint32 collaboration,
        externalEuint32 creativity,
        bytes[5] calldata proofs
    ) external validRound(roundId) {
        require(members[roundId][ratee], "Ratee not a member");
        require(ratee != msg.sender, "Cannot rate yourself");
        require(!hasRated[roundId][ratee][msg.sender], "Already rated");
        
        // Convert external encrypted values to internal euint32
        EncryptedScores memory scores = EncryptedScores({
            codeQuality: FHE.fromExternal(codeQuality, proofs[0]),
            communication: FHE.fromExternal(communication, proofs[1]),
            contribution: FHE.fromExternal(contribution, proofs[2]),
            collaboration: FHE.fromExternal(collaboration, proofs[3]),
            creativity: FHE.fromExternal(creativity, proofs[4])
        });
        
        // Store the rating
        ratings[roundId][ratee][msg.sender] = RatingSubmission({
            rater: msg.sender,
            ratee: ratee,
            roundId: roundId,
            timestamp: block.timestamp
        });
        
        // Add to ratee's scores array
        rateeScores[roundId][ratee].push(scores);
        
        // Mark as rated
        hasRated[roundId][ratee][msg.sender] = true;
        
        // Update rating count
        ratingCounts[roundId][ratee]++;
        
        // Allow contract and rater to access these encrypted values
        FHE.allowThis(scores.codeQuality);
        FHE.allow(scores.codeQuality, msg.sender);
        FHE.allowThis(scores.communication);
        FHE.allow(scores.communication, msg.sender);
        FHE.allowThis(scores.contribution);
        FHE.allow(scores.contribution, msg.sender);
        FHE.allowThis(scores.collaboration);
        FHE.allow(scores.collaboration, msg.sender);
        FHE.allowThis(scores.creativity);
        FHE.allow(scores.creativity, msg.sender);
        
        emit RatingSubmitted(roundId, msg.sender, ratee, block.timestamp);
    }
    
    // ============ Calculation Functions ============
    
    /// @notice Calculate weighted total score for a ratee in a round
    /// @param ratee Address of the person being rated
    /// @param roundId The round ID
    /// @return encrypted weighted total score
    /// @dev This function performs FHE operations which modify state, so it cannot be view
    function calculateWeightedScore(
        address ratee,
        uint256 roundId
    ) public validRound(roundId) returns (euint32) {
        WeightConfiguration memory config = weightConfigs[roundId];
        require(config.roundId > 0, "Weights not set");
        
        EncryptedScores[] storage scores = rateeScores[roundId][ratee];
        require(scores.length > 0, "No ratings");
        
        // Calculate average for each dimension
        euint32 avgCodeQuality = calculateDimensionAverage(ratee, roundId, 0);
        euint32 avgCommunication = calculateDimensionAverage(ratee, roundId, 1);
        euint32 avgContribution = calculateDimensionAverage(ratee, roundId, 2);
        euint32 avgCollaboration = calculateDimensionAverage(ratee, roundId, 3);
        euint32 avgCreativity = calculateDimensionAverage(ratee, roundId, 4);
        
        // Calculate weighted sum
        euint32 weighted = FHE.mul(avgCodeQuality, config.codeQuality);
        weighted = FHE.add(weighted, FHE.mul(avgCommunication, config.communication));
        weighted = FHE.add(weighted, FHE.mul(avgContribution, config.contribution));
        weighted = FHE.add(weighted, FHE.mul(avgCollaboration, config.collaboration));
        weighted = FHE.add(weighted, FHE.mul(avgCreativity, config.creativity));
        
        // Store weighted score in mapping for retrieval
        weightedScores[roundId][ratee] = weighted;
        
        // Store dimension averages in mapping for retrieval
        dimensionAverages[roundId][ratee] = EncryptedScores({
            codeQuality: avgCodeQuality,
            communication: avgCommunication,
            contribution: avgContribution,
            collaboration: avgCollaboration,
            creativity: avgCreativity
        });
        
        // Store and allow access
        FHE.allowThis(weighted);
        FHE.allow(weighted, ratee);
        FHE.allowThis(avgCodeQuality);
        FHE.allow(avgCodeQuality, ratee);
        FHE.allowThis(avgCommunication);
        FHE.allow(avgCommunication, ratee);
        FHE.allowThis(avgContribution);
        FHE.allow(avgContribution, ratee);
        FHE.allowThis(avgCollaboration);
        FHE.allow(avgCollaboration, ratee);
        FHE.allowThis(avgCreativity);
        FHE.allow(avgCreativity, ratee);
        
        return weighted;
    }
    
    /// @notice Calculate average score for a specific dimension
    /// @param ratee Address of the person being rated
    /// @param roundId The round ID
    /// @param dimensionIndex 0=codeQuality, 1=communication, 2=contribution, 3=collaboration, 4=creativity
    /// @return encrypted sum of scores for this dimension (division by count happens off-chain)
    /// @dev This function performs FHE operations which modify state, so it cannot be view
    function calculateDimensionAverage(
        address ratee,
        uint256 roundId,
        uint256 dimensionIndex
    ) public validRound(roundId) returns (euint32) {
        EncryptedScores[] storage scores = rateeScores[roundId][ratee];
        require(scores.length > 0, "No ratings");
        
        euint32 sum;
        
        // Sum all scores for this dimension
        for (uint256 i = 0; i < scores.length; i++) {
            euint32 score;
            if (dimensionIndex == 0) {
                score = scores[i].codeQuality;
            } else if (dimensionIndex == 1) {
                score = scores[i].communication;
            } else if (dimensionIndex == 2) {
                score = scores[i].contribution;
            } else if (dimensionIndex == 3) {
                score = scores[i].collaboration;
            } else if (dimensionIndex == 4) {
                score = scores[i].creativity;
            } else {
                revert("Invalid dimension");
            }
            
            sum = FHE.add(sum, score);
        }
        
        // Note: Division by count is complex in FHE, we return the sum
        // Division can be performed off-chain or with additional complexity
        // For now, we store the sum and division happens during decryption
        return sum;
    }
    
    /// @notice Get rating count for a ratee in a round
    /// @param ratee Address of the person being rated
    /// @param roundId The round ID
    /// @return count of ratings
    function getRatingCount(
        address ratee,
        uint256 roundId
    ) external view validRound(roundId) returns (uint256) {
        return ratingCounts[roundId][ratee];
    }
    
    /// @notice Get all dimension sums (division by count needed off-chain)
    /// @param ratee Address of the person being rated
    /// @param roundId The round ID
    /// @return encrypted sum of code quality scores
    /// @return encrypted sum of communication scores
    /// @return encrypted sum of contribution scores
    /// @return encrypted sum of collaboration scores
    /// @return encrypted sum of creativity scores
    /// @dev This function calls calculateDimensionAverage which performs FHE operations, so it cannot be view
    function getDimensionSums(
        address ratee,
        uint256 roundId
    ) external validRound(roundId) returns (
        euint32,
        euint32,
        euint32,
        euint32,
        euint32
    ) {
        euint32 codeQualitySum = calculateDimensionAverage(ratee, roundId, 0);
        euint32 communicationSum = calculateDimensionAverage(ratee, roundId, 1);
        euint32 contributionSum = calculateDimensionAverage(ratee, roundId, 2);
        euint32 collaborationSum = calculateDimensionAverage(ratee, roundId, 3);
        euint32 creativitySum = calculateDimensionAverage(ratee, roundId, 4);
        
        return (codeQualitySum, communicationSum, contributionSum, collaborationSum, creativitySum);
    }
    
    /// @notice Check if a member has rated another member in a round
    /// @param ratee Address of the person being rated
    /// @param rater Address of the rater
    /// @param roundId The round ID
    /// @return true if rated, false otherwise
    function hasMemberRated(
        address ratee,
        address rater,
        uint256 roundId
    ) external view validRound(roundId) returns (bool) {
        return hasRated[roundId][ratee][rater];
    }
    
    /// @notice Check if an address is a member of a round
    /// @param member Address to check
    /// @param roundId The round ID
    /// @return true if member, false otherwise
    function isMember(address member, uint256 roundId) external view validRound(roundId) returns (bool) {
        return members[roundId][member];
    }
}



