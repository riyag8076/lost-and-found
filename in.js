const express = require('express');
const cors=require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added for folder creation
const { User, LostItem, FoundItem, Claim } = require('./dataModels/schema.js');

const app = express();
const PORT = 3000;
const JWT_SECRET = "your_mca_secret_key";

app.use(express.json());
app.use(cors())
// Update this line in your code:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// admin
const addItemRoutes = require("./routes/additem.js");

// --- AUTOMATIC FOLDER CREATION ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log("Created 'uploads' directory");
}

// --- MONGODB CONNECTION ---
// Fixed password brackets and added database name
const dbURI = 'mongodb://gargpalak0004_db_user:CkIrdO6OTNAB4Pzs@ac-282dtke-shard-00-00.y5ywpk8.mongodb.net:27017,ac-282dtke-shard-00-01.y5ywpk8.mongodb.net:27017,ac-282dtke-shard-00-02.y5ywpk8.mongodb.net:27017/?ssl=true&replicaSet=atlas-nqcf8z-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(dbURI)
    .then(() => console.log(" Connected to MongoDB Atlas"))
    .catch(err => console.error("Connection Error:", err.message));

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB Limit
});

// --- MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
};

// --- AUTH ROUTES ---
app.post("/api/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "All fields required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: "student"
        });
        console.log("Signup password:", password);
        await user.save();

        res.json({ message: "Signup successful" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= LOGIN =================
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            "secretkey",
            { expiresIn: "1d" }
        );

        // ✅ IMPORTANT RESPONSE
        res.json({
            token,
            user: {
                name: user.name,
                email: user.email,
                id: user._id,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= TEST HASH (FOR DEBUG) =================
app.post("/api/test-hash", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.json({ error: "User not found" });

    const result = await bcrypt.compare(password.trim(), user.password);

    res.json({ result });
});

// ================= ADMIN ROUTE =================
function isAdmin(req, res, next) {
    console.log(req.user); // 👈 check this
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
    }
    next();
}

app.get("/api/admin-test", authenticate, isAdmin, (req, res) => {
    res.json({ message: "Admin access granted" });
});


// --- LOST ITEM ROUTES ---
app.post('/api/lost', authenticate, upload.single('image'), async (req, res) => {
    try {
        const {
            itemName,
            category,
            location,
            dateLost,
            description
        } = req.body;

        const newItem = new LostItem({
            itemName,
            category,
            location,
            dateLost: dateLost ? new Date(dateLost) : new Date(),
            description,
            image: req.file ? `/uploads/${req.file.filename}` : null,
            userId: req.user.id, // 👈 important
            status: "Open"
        });

        await newItem.save();

        res.json({ message: "Item reported", item: newItem });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/items/lost', authenticate, async (req, res) => {
    try {
        let query = {};

        console.log("USER:", req.user);

        // ✅ Only filter for normal users
        if (req.user.role !== "admin") {
            query = { userId: req.user.id };
        }

        console.log("QUERY:", query);

        const items = await LostItem.find(query).sort({ createdAt: -1 });

        console.log("FOUND ITEMS:", items.length);

        const formatted = items.map(item => ({
            id: item._id,
            title: item.itemName || "No title",
            description: item.description || "",
            status: item.status || "Open",
            image: item.image || "",
            location: item.location || "Unknown",
            dateLost: item.dateLost || null,
            category: item.category || "Not specified"
        }));

        res.json(formatted);

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/items/:id/status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin only" });
        }

        const { status } = req.body;

        const updated = await LostItem.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        res.json(updated);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FOUND ITEM ROUTES ---
app.post("/api/found", authenticate, upload.single("image"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { itemName, category, location, dateFound, description } = req.body;

    // ✅ validation
    if (
      !itemName?.trim() ||
      !category?.trim() ||
      !location?.trim() ||
      !dateFound
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        debug: req.body
      });
    }

    // ✅ CREATE + SAVE (IMPORTANT PART)
    const newItem = new FoundItem({
      itemName: itemName.trim(),
      category: category.trim(),
      location: location.trim(),
      dateFound: new Date(dateFound),
      description: description?.trim() || "",
      image: req.file ? `/uploads/${req.file.filename}` : null,
      finderId: req.user.id,
      status: "Open"
    });

    const savedItem = await newItem.save();

    console.log("✅ SAVED IN DB:", savedItem);

    // ✅ ONLY ONE RESPONSE
    return res.status(201).json({
      success: true,
      message: "Item posted successfully",
      data: savedItem
    });

  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("/api/items/found", async (req, res) => {
  try {
    const items = await FoundItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SEARCH & MATCH LOGIC ---
// Utility function to escape regex special characters
const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ===============================
// ROUTE 1: SEARCH FOUND ITEMS
// ===============================
app.get('/search', async (req, res) => {
    try {
        const { query, location } = req.query;

        let filter = { status: 'Open' };

        // 🔍 Search by item name (safe regex)
        if (query) {
            const safeQuery = escapeRegex(query);
            filter.itemName = { $regex: safeQuery, $options: 'i' };
        }

        // 📍 Flexible location match
        if (location && location !== 'all') {
            const safeLocation = escapeRegex(location);
            filter.location = { $regex: safeLocation, $options: 'i' };
        }

        // 📊 Sorted results (latest first)
        const items = await FoundItem.find(filter)
            .sort({ createdAt: -1 });

        res.json(items);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ===============================
// ROUTE 2: AUTOMATED MATCHING
// ===============================
app.get('/match/:lostId', async (req, res) => {
    try {
        const lostItem = await LostItem.findById(req.params.lostId);

        if (!lostItem) {
            return res.status(404).json({ error: "Report not found" });
        }

        // 🔐 Escape function
        const safeLocation = escapeRegex(lostItem.location || "");

        // 🧠 Create keywords from item name
        const keywords = (lostItem.itemName || "")
            .split(' ')
            .filter(word => word.length > 2) // ignore small words
            .map(word => new RegExp(escapeRegex(word), 'i'));

        // 🔍 Matching query
        const matches = await FoundItem.find({
            status: 'Open',
            category: lostItem.category,
            $or: [
                // 📍 Location similarity
                { location: { $regex: safeLocation, $options: 'i' } },

                // 🔤 Keyword-based matching
                { itemName: { $in: keywords } }
            ]
        })
        .sort({ createdAt: -1 }) // newest first
        .limit(5);

        res.json(matches);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLAIM LOGIC ---
app.post("/api/claims", async (req, res) => {
    try {
        console.log("BODY:", req.body); // 👈 add this

        const {
            itemId,
            itemType,
            claimerName,
            collegeEmail,
            proofDescription
        } = req.body;

        if (!itemId || !itemType || !claimerName || !collegeEmail || !proofDescription) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newClaim = new Claim({
            itemId,
            itemType,
            claimerName,
            collegeEmail,
            proofDescription
        });

        await newClaim.save();

        res.status(201).json({
            message: "Claim submitted successfully"
        });

    } catch (error) {
        console.error("ERROR 👉", error); // 👈 IMPORTANT
        res.status(500).json({
            message: error.message   // 👈 send real message
        });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: "File is too large. Maximum allowed size is 2MB." 
            });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(500).json({ error: err.message });
    }
    next();
});
// This MUST have all 4 arguments (err, req, res, next)
app.use((err, req, res, next) => {
    console.error("Global Error:", err.stack);
    res.status(500).json({ 
        error: err.message || "Internal Server Error" 
    });
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
