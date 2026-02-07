---
marp: true
theme: default
paginate: true
backgroundColor: #fff
backgroundImage: url('https://marp.app/assets/hero-background.svg')
style: |
  section {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  h1 {
    color: #2c3e50;
  }
  h2 {
    color: #3498db;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
---

![width:200px](logo.png)

# Cipher Lend

**The confidential DeFi layer that lets users interact with existing protocols without exposing their positions on-chain**

Built during HackMoney 2026

---

## The Problem 

Given your **wallet address**, anyone can see all **your holdings, positions, spending history, and every transaction amount**

<div style="text-align: center;">

![width:800px](portfolio.png)

</div>

---

## The Solution 

**Use confidential tokens to enable confidential transfers**

Leveraging **Fully Homomorphic Encryption (FHE)** to encrypt user balances and amounts

<div style="text-align: center;">

![width:700px](ctransfer.png)

</div>

**We're not reinventing the wheel**

=> Brings privacy on top of existing battle-tested DeFi protocols like **Uniswap**

---

## How It Works: Round-Based Execution

<div style="text-align: center;">

![width:900px](execution.png)

</div>

**Result**: Only aggregate values visible on-chain → Individual positions remain private

**This model works for swaps, lending, and other DeFi operations**

---

## Demo

**Live on Sepolia Testnet**

### Try It Out
**Website**: [cipher-lend-five.vercel.app](https://cipher-lend-five.vercel.app)

