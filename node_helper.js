const NodeHelper = require("node_helper");
const Log = require("logger");
const { ethers } = require("ethers");

module.exports = NodeHelper.create({
    start: function() {
        Log.log("Starting node helper for: " + this.name);
        this.provider = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_STREAM_DATA") {
            this.fetchStreamData(payload.rpcUrl);
        }
    },

    resolveENS: async function(address) {
        try {
            const ensName = await this.provider.lookupAddress(address);
            return ensName || address;
        } catch (error) {
            Log.error("Error resolving ENS:", error);
            return address;
        }
    },

    fetchStreamData: async function(rpcUrl) {
        const contractABI = [
            {"inputs":[],"name":"recipient","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},
            {"inputs":[],"name":"tokenAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
            {"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
            {"inputs":[],"name":"stopTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
            {"inputs":[],"name":"elapsedTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
        ];

        const contractAddresses = [
            '0x494D9b602092252Cd592AC8a151beb9Df6C1b144', // Prop 729
            '0x9d1F7Cb6e8918491C9781b3FE4cA242A786510eb', // Prop 728
            '0x1304dd6Bd1cf81B6e72D334b2281A7c96A25cDA1', // Prop 707
            '0x8A78eb3f880D49418DBD18D5c5A0534BF3864fac', // Prop 634
            '0xE1653109E79A5014f62287104428e6e2a79125A2'  // Prop 471
        ];

        const contractDurations = {
            '0x494D9b602092252Cd592AC8a151beb9Df6C1b144': 12,  // 12 months
            '0x9d1F7Cb6e8918491C9781b3FE4cA242A786510eb': 12,  // 12 months
            '0x1304dd6Bd1cf81B6e72D334b2281A7c96A25cDA1': 30,  // 30 months
            '0x8A78eb3f880D49418DBD18D5c5A0534BF3864fac': 6,   // 6 months
            '0xE1653109E79A5014f62287104428e6e2a79125A2': 120  // 120 months
        };

        const contractProps = {
            '0x494D9b602092252Cd592AC8a151beb9Df6C1b144': 729,
            '0x9d1F7Cb6e8918491C9781b3FE4cA242A786510eb': 728,
            '0x1304dd6Bd1cf81B6e72D334b2281A7c96A25cDA1': 707,
            '0x8A78eb3f880D49418DBD18D5c5A0534BF3864fac': 634,
            '0xE1653109E79A5014f62287104428e6e2a79125A2': 471
        };

        const WETH_CONTRACT = '0xE1653109E79A5014f62287104428e6e2a79125A2';

        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            const newData = [];
            
            for (const address of contractAddresses) {
                const contract = new ethers.Contract(address, contractABI, this.provider);
                const recipient = await contract.recipient();
                const totalAmount = await contract.tokenAmount();
                const startTime = await contract.startTime();
                const stopTime = await contract.stopTime();
                const elapsedTime = await contract.elapsedTime();

                // Resolve ENS name for the recipient
                const resolvedRecipient = await this.resolveENS(recipient);

                const totalMonths = contractDurations[address];
                const prop = contractProps[address];
                const decimals = address === WETH_CONTRACT ? 18 : 6;
                const monthlyAmount = Number(ethers.formatUnits(totalAmount, decimals)) / totalMonths;
                const totalAmount_formatted = Number(ethers.formatUnits(totalAmount, decimals));

                const totalDuration = Number(stopTime) - Number(startTime);
                const progress = (Number(elapsedTime) * 100) / totalDuration;

                newData.push({
                    prop,
                    monthlyAmount: monthlyAmount.toFixed(2),
                    totalAmount: totalAmount_formatted.toFixed(2),
                    endDate: new Date(Number(stopTime) * 1000).toLocaleDateString(),
                    progress: Math.min(progress, 100).toFixed(2),
                    token: address === WETH_CONTRACT ? 'WETH' : 'USDC',
                    totalMonths: totalMonths,
                    recipient: recipient,
                    ensName: resolvedRecipient
                });
            }

            this.sendSocketNotification("STREAM_DATA_RESULT", newData);
        } catch (error) {
            Log.error("Error fetching stream data:", error);
            this.sendSocketNotification("STREAM_DATA_ERROR", error.toString());
        }
    }
}); 