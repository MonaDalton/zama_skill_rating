# 🔒 Encrypted Skill Rating Hub

A privacy-preserving skill rating platform built on FHEVM (Fully Homomorphic Encryption Virtual Machine) that enables anonymous, encrypted peer-to-peer skill evaluations on the blockchain.

## ✨ Features

- **🔐 Fully Encrypted Ratings**: All skill ratings are encrypted using FHEVM before submission, ensuring complete privacy
- **🎯 Multi-Dimensional Evaluation**: Rate team members across 5 dimensions:
  - Code Quality
  - Communication
  - Contribution
  - Collaboration
  - Creativity
- **⚖️ Weighted Scoring**: Admin-configurable weights for each dimension
- **📊 Anonymous Aggregation**: Ratings are aggregated on-chain while remaining encrypted
- **🔓 Selective Decryption**: Only authorized users can decrypt their own results
- **🌐 Web3 Integration**: Seamless MetaMask wallet integration with EIP-6963 support
- **📱 Modern UI**: Beautiful, responsive frontend built with Next.js and Tailwind CSS

## 🏗️ Architecture

This project consists of two main components:

1. **Smart Contracts** (`fhevm-hardhat-template/`)
   - Solidity contracts using FHEVM for encrypted computations
   - Hardhat-based development environment
   - Deployment scripts for local and testnet networks

2. **Frontend Application** (`encrypted-skill-rating-frontend/`)
   - Next.js 15 with App Router
   - Static export for decentralized hosting
   - FHEVM integration with Relayer SDK
   - Mock utils for local development

## 📋 Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **MetaMask**: Browser extension wallet
- **Sepolia ETH**: For testnet deployment and testing

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/MonaDalton/zama_skill_rating.git
cd zama_skill_rating
```

### 2. Install Smart Contract Dependencies

```bash
cd fhevm-hardhat-template
npm install
```

### 3. Set Up Environment Variables

```bash
# Set your mnemonic for deployment
npx hardhat vars set MNEMONIC

# Set Infura API key for network access
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

### 4. Compile and Test Contracts

```bash
npm run compile
npm run test
```

### 5. Deploy Contracts

**Local Network:**
```bash
# Start local FHEVM node
npx hardhat node

# Deploy to localhost
npx hardhat deploy --network localhost
```

**Sepolia Testnet:**
```bash
npx hardhat deploy --network sepolia
```

### 6. Install Frontend Dependencies

```bash
cd ../encrypted-skill-rating-frontend
npm install
```

### 7. Generate ABI Files

```bash
npm run genabi
```

### 8. Run Frontend

**Local Development (Mock Mode):**
```bash
npm run dev:mock
```

**Local Development (Real Relayer):**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
```

## 📁 Project Structure

```
zama_skill_rating/
├── fhevm-hardhat-template/          # Smart contract project
│   ├── contracts/
│   │   ├── SkillRating.sol          # Main rating contract
│   │   └── FHECounter.sol           # Example contract
│   ├── deploy/
│   │   └── deploySkillRating.ts     # Deployment script
│   ├── test/
│   │   └── SkillRating.ts           # Contract tests
│   └── hardhat.config.ts            # Hardhat configuration
│
├── encrypted-skill-rating-frontend/ # Frontend application
│   ├── app/                         # Next.js app directory
│   │   ├── page.tsx                 # Home page
│   │   ├── dashboard/               # Dashboard page
│   │   ├── settings/                # Admin settings
│   │   ├── submit-rating/           # Rating submission
│   │   └── results/                 # Results viewing
│   ├── components/                  # React components
│   ├── hooks/                       # Custom React hooks
│   ├── fhevm/                       # FHEVM integration
│   └── abi/                         # Generated contract ABIs
│
└── README.md                        # This file
```

## 🎯 Usage Guide

### For Administrators

1. **Set Up Rating Weights**
   - Navigate to Settings page
   - Configure weights for each dimension (must sum to 100)
   - Save encrypted weights to the contract

2. **Create a New Round**
   - Click "New Round" in Settings
   - Start accepting ratings for the new round

3. **Add Team Members**
   - Enter member wallet addresses
   - Add them to the current round

### For Team Members

1. **Submit Ratings**
   - Navigate to Submit Rating page
   - Select a team member from the dropdown
   - Rate across 5 dimensions (1-100 each)
   - Submit encrypted rating (requires wallet signature)

2. **View Results**
   - Navigate to Results page
   - Select a round and member
   - Decrypt and view aggregated scores
   - View dimension breakdowns and radar chart

## 🔧 Technical Details

### Smart Contract

- **Language**: Solidity ^0.8.24
- **FHEVM Version**: v0.9.1
- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Contract Address**: See `encrypted-skill-rating-frontend/abi/SkillRatingAddresses.ts`

### Frontend

- **Framework**: Next.js 15.4.2
- **Styling**: Tailwind CSS
- **Web3**: ethers.js v6.13.0
- **FHEVM SDK**: @zama-fhe/relayer-sdk v0.3.0-5
- **Mock Utils**: @fhevm/mock-utils v0.3.0-1

### Encryption Flow

1. User inputs rating values (1-100) in the frontend
2. Frontend encrypts values using FHEVM `createEncryptedInput()`
3. Encrypted handles and proofs are submitted to the contract
4. Contract performs weighted aggregation on encrypted values
5. Results are stored encrypted on-chain
6. Users can decrypt their own results using decryption signatures

## 🌐 Deployment

### Contract Deployment

The contract is deployed on Sepolia testnet. See deployment script in `fhevm-hardhat-template/deploy/deploySkillRating.ts`.

### Frontend Deployment

The frontend is configured for static export and can be deployed to:
- **Vercel**: Already configured with `vercel.json`
- **IPFS**: Static export in `out/` directory
- **Any static hosting**: Compatible with CDN hosting

**Deployed URL**: https://encrypted-skill-rating-frontend-8nyh4kx0s.vercel.app

## 🧪 Testing

### Contract Tests

```bash
cd fhevm-hardhat-template
npm run test
```

### Frontend Tests

```bash
cd encrypted-skill-rating-frontend
npm run lint
npm run check:static
```

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the LICENSE file for details.

## 🔗 Links

- **GitHub Repository**: https://github.com/MonaDalton/zama_skill_rating
- **Live Demo**: https://encrypted-skill-rating-frontend-8nyh4kx0s.vercel.app
- **FHEVM Docs**: https://docs.zama.ai/fhevm
- **Zama Community**: https://discord.gg/zama

## ⚠️ Important Notes

- This project uses **testnet** networks. Do not use real funds.
- FHEVM operations require additional gas and may take longer to process.
- Ratings are encrypted but not anonymous - addresses are public on-chain.
- Always verify contract addresses before interacting.

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check the [FHEVM Documentation](https://docs.zama.ai/fhevm)
- Join the [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ using FHEVM by Zama**

