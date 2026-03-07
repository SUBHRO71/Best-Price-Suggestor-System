const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const searchRoutes = require("./routes/searchRoutes");
const compareRoutes = require("./routes/compareRoutes");
const authRoutes = require("./routes/authRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.send("Price Comparison API Running");
});

app.use("/api", authRoutes);
app.use("/api", searchRoutes);
app.use("/api", compareRoutes);
app.use("/api", wishlistRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
