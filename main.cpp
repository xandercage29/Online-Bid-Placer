// main.cpp
#include <iostream>
#include <vector>
#include <string>
#include <ctime>
#include <algorithm>
#include <fstream>

class Item {
private:
    int itemId;
    std::string name;
    double currentBid;
    std::string highestBidder;
    time_t endTime;
    bool active;

public:
    Item(int id, std::string n, double startBid, time_t end) 
        : itemId(id), name(n), currentBid(startBid), endTime(end), active(true) {}

    bool placeBid(std::string bidder, double amount) {
        if (!active || amount <= currentBid || time(nullptr) >= endTime) {
            return false;
        }
        currentBid = amount;
        highestBidder = bidder;
        return true;
    }

    // Getters
    int getId() const { return itemId; }
    std::string getName() const { return name; }
    double getCurrentBid() const { return currentBid; }
    std::string getHighestBidder() const { return highestBidder; }
    time_t getEndTime() const { return endTime; }
    bool isActive() const { return active; }

    void endAuction() { active = false; }
};

class BiddingPlatform {
private:
    std::vector<Item> items;
    std::vector<std::string> users;

public:
    void addItem(std::string name, double startBid, int durationHours) {
        time_t endTime = time(nullptr) + (durationHours * 3600);
        items.emplace_back(items.size() + 1, name, startBid, endTime);
        updateHTML();
    }

    bool placeBid(int itemId, std::string bidder, double amount) {
        auto it = std::find_if(items.begin(), items.end(),
            [itemId](const Item& item) { return item.getId() == itemId; });
        
        if (it != items.end() && it->placeBid(bidder, amount)) {
            updateHTML();
            return true;
        }
        return false;
    }

    void registerUser(std::string username) {
        users.push_back(username);
    }

    void updateHTML() {
        std::ofstream file("items.html");
        file << generateHTML();
        file.close();
    }

private:
    std::string generateHTML() {
        std::string html = R"(
<!DOCTYPE html>
<html>
<head>
    <title>Online Bidding Platform</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Active Auctions</h1>
        <div class="items-grid">
)";
        
        for (const auto& item : items) {
            if (item.isActive()) {
                html += "<div class='item-card'>\n";
                html += "<h2>" + item.getName() + "</h2>\n";
                html += "<p>Current Bid: $" + std::to_string(item.getCurrentBid()) + "</p>\n";
                html += "<p>Highest Bidder: " + item.getHighestBidder() + "</p>\n";
                html += "<form class='bid-form' action='/place-bid' method='POST'>\n";
                html += "<input type='hidden' name='itemId' value='" + std::to_string(item.getId()) + "'>\n";
                html += "<input type='number' name='bidAmount' placeholder='Your Bid' step='0.01' min='" + 
                        std::to_string(item.getCurrentBid() + 0.01) + "' required>\n";
                html += "<button type='submit'>Place Bid</button>\n";
                html += "</form>\n";
                html += "</div>\n";
            }
        }

        html += R"(
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
)";
        return html;
    }
};

int main() {
    BiddingPlatform platform;
    
    // Example usage
    platform.addItem("Vintage Watch", 100.0, 24);
    platform.addItem("Gaming Console", 250.0, 48);
    platform.registerUser("john_doe");
    platform.placeBid(1, "john_doe", 150.0);
    
    return 0;
}
