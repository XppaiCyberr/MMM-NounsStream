Module.register("MMM-NounsStream", {
    defaults: {
        updateInterval: 5 * 60 * 1000, // update every 5 minutes
        rpcUrl: "", // RPC URL to be set in config.js
        showAllStreams: true, // whether to show all streams or just active ones
        maxStreams: 6, // maximum number of streams to display
        showHeader: true,
        headerText: "Nouns Payroll Streams"
    },

    requiresVersion: "2.1.0",

    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.streamData = [];
        this.scheduleUpdate();
    },

    getStyles: function() {
        return ["font-awesome.css", "MMM-NounsStream.css"];
    },

    getHeader: function() {
        if (this.config.showHeader) {
            return this.config.headerText;
        }
        return null;
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-nouns-stream";

        if (!this.loaded) {
            wrapper.innerHTML = this.createLoadingDom();
            return wrapper;
        }

        if (!this.streamData.length) {
            wrapper.innerHTML = "No active streams found.";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        const tableWrapper = document.createElement("div");
        tableWrapper.className = "table-wrapper";

        const table = document.createElement("table");
        table.appendChild(this.createTableHeader());
        table.appendChild(this.createTableBody());

        tableWrapper.appendChild(table);
        wrapper.appendChild(tableWrapper);

        return wrapper;
    },

    createLoadingDom: function() {
        return '<div class="dimmed light small"><i class="fa fa-refresh fa-spin"></i> Loading streams...</div>';
    },

    createTableHeader: function() {
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        
        const headers = ["Prop", "Monthly", "Progress", "Recipient", "End Date"];
        headers.forEach(text => {
            const th = document.createElement("th");
            th.className = "light";
            th.innerHTML = text;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        return thead;
    },

    createTableBody: function() {
        const tbody = document.createElement("tbody");
        
        this.streamData.forEach(stream => {
            const row = document.createElement("tr");
            
            // Prop ID
            const propCell = document.createElement("td");
            propCell.className = "prop bright";
            propCell.innerHTML = `#${stream.prop}`;
            row.appendChild(propCell);
            
            // Monthly amount
            const amountCell = document.createElement("td");
            const monthlyText = document.createElement("div");
            monthlyText.innerHTML = `${stream.monthlyAmount} ${stream.token}`;
            monthlyText.className = "monthly";
            const totalText = document.createElement("div");
            totalText.innerHTML = `Total: ${stream.totalAmount} ${stream.token}`;
            totalText.className = "total dimmed small";
            amountCell.appendChild(monthlyText);
            amountCell.appendChild(totalText);
            row.appendChild(amountCell);
            
            // Progress
            const progressCell = document.createElement("td");
            progressCell.className = "progress";
            
            const progressWrapper = document.createElement("div");
            progressWrapper.className = "progress-wrapper";
            
            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";
            
            const progressFill = document.createElement("div");
            progressFill.className = "progress-fill";
            const progress = Math.min(stream.progress || 0, 100);
            progressFill.style.width = `${progress}%`;
            
            progressBar.appendChild(progressFill);
            progressWrapper.appendChild(progressBar);
            
            const progressText = document.createElement("div");
            progressText.className = "progress-text small";
            progressText.innerHTML = `${Math.round(progress)}%`;
            progressWrapper.appendChild(progressText);
            
            progressCell.appendChild(progressWrapper);
            row.appendChild(progressCell);
            
            // Recipient Address
            const recipientCell = document.createElement("td");
            const isEns = stream.ensName !== stream.recipient;
            const displayAddress = isEns ? 
                stream.ensName : 
                `${stream.recipient.substring(0, 4)}...${stream.recipient.slice(-4)}`;
            recipientCell.innerHTML = displayAddress;
            row.appendChild(recipientCell);
            
            // End Date
            const dateCell = document.createElement("td");
            dateCell.className = "date bright";
            dateCell.innerHTML = stream.endDate;
            row.appendChild(dateCell);
            
            tbody.appendChild(row);
        });
        
        return tbody;
    },

    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.updateStreamData();
        }, this.config.updateInterval);
        self.updateStreamData();
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "STREAM_DATA_RESULT") {
            this.streamData = payload;
            this.loaded = true;
            this.updateDom();
        } else if (notification === "STREAM_DATA_ERROR") {
            Log.error("Error fetching stream data: " + payload);
            this.loaded = false;
            this.updateDom();
        }
    },

    updateStreamData: function() {
        this.sendSocketNotification("GET_STREAM_DATA", {
            rpcUrl: this.config.rpcUrl
        });
    }
}); 