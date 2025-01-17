// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/bidding-platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Item Schema
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    startingBid: { type: Number, required: true },
    currentBid: { type: Number },
    currentBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    imageUrl: String,
    bidHistory: [{
        bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: Number,
        timestamp: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new Error();
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// User Routes
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            throw new Error('Invalid login credentials');
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            throw new Error('Invalid login credentials');
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Item Routes
app.post('/api/items', auth, async (req, res) => {
    try {
        const item = new Item({
            ...req.body,
            seller: req.user._id,
            currentBid: req.body.startingBid
        });
        
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find({ status: 'active' })
            .populate('seller', 'username')
            .populate('currentBidder', 'username');
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/items/:id/bid', auth, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (item.status === 'ended') {
            return res.status(400).json({ error: 'Auction has ended' });
        }
        
        if (item.seller.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Sellers cannot bid on their own items' });
        }
        
        const newBid = parseFloat(req.body.amount);
        
        if (newBid <= item.currentBid) {
            return res.status(400).json({ error: 'Bid must be higher than current bid' });
        }
        
        item.currentBid = newBid;
        item.currentBidder = req.user._id;
        item.bidHistory.push({
            bidder: req.user._id,
            amount: newBid
        });
        
        await item.save();
        
        // Populate the response with bidder information
        await item.populate('currentBidder', 'username');
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Scheduled task to end auctions
setInterval(async () => {
    try {
        const expiredItems = await Item.find({
            status: 'active',
            endTime: { $lte: new Date() }
        });
        
        for (const item of expiredItems) {
            item.status = 'ended';
            await item.save();
        }
    } catch (error) {
        console.error('Error in auction end task:', error);
    }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
